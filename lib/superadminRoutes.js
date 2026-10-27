/**
 * API della piattaforma (non legate a un singolo affiliato):
 *   /api/superadmin/*          pannello Super Admin
 *   /api/platform/domain-check verifica domini per il certificato SSL automatico (Caddy)
 */
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getRawDatabase } from './mongodb';
import { hashPassword, verifyPassword } from './auth';
import { MODULES, PLANS } from './modules';
import {
  createTenant, updateTenant, listTenantsWithStats, setTenantOwnerPassword,
  getTenantById, normalizeDomain, resolveTenantFromHeaders, isSingleSiteMode,
} from './tenant';
import { loginSuperadmin, validateSuperadmin, validatePlatformKey, audit } from './superadmin';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Platform-Key',
  'Cache-Control': 'no-store',
};
const json = (data, status = 200) => NextResponse.json(data, { status, headers });
const fail = (e) => json({ error: e.message || 'Errore' }, e.status || 500);

export function isPlatformPath(pathString) {
  return pathString === 'superadmin' || pathString.startsWith('superadmin/') || pathString.startsWith('platform/');
}

export async function handlePlatformRequest(request, path, method) {
  const p = path.join('/');
  try {
    // --- Verifica dominio per Caddy "on demand TLS" ---
    if (p === 'platform/domain-check' && method === 'GET') {
      const domain = normalizeDomain(new URL(request.url).searchParams.get('domain'));
      if (!domain) return json({ ok: false }, 400);
      const db = await getRawDatabase();
      await resolveTenantFromHeaders(new Headers({ host: domain })); // assicura migrazione/master
      const t = await db.collection('tenants').findOne({ domains: domain, status: { $ne: 'suspended' } });
      return t ? json({ ok: true }) : json({ ok: false }, 404);
    }

    if (p === 'superadmin/login' && method === 'POST') {
      const { email, password } = await request.json();
      const r = await loginSuperadmin(email, password);
      if (r.error) return json({ error: r.error }, r.status);
      await audit('login', r.user.email);
      return json(r);
    }

    // Creazione affiliato via API (CRM) con chiave di piattaforma
    const byKey = p === 'superadmin/tenants' && method === 'POST' && validatePlatformKey(request);
    const sa = byKey ? { email: 'platform-api-key' } : await validateSuperadmin(request);
    if (!sa) return json({ error: 'Non autorizzato' }, 401);
    const actor = sa.email;

    if (p === 'superadmin/me' && method === 'GET') {
      return json({ id: sa.id, email: sa.email, name: sa.name, mode: isSingleSiteMode() ? 'single' : 'multi' });
    }

    if (p === 'superadmin/password' && method === 'PUT') {
      const { currentPassword, newPassword } = await request.json();
      if (!newPassword || newPassword.length < 10) return json({ error: 'La nuova password deve avere almeno 10 caratteri' }, 400);
      if (!(await verifyPassword(String(currentPassword || ''), sa.password))) return json({ error: 'Password attuale errata' }, 400);
      const db = await getRawDatabase();
      await db.collection('superadmins').updateOne({ id: sa.id }, { $set: { password: await hashPassword(newPassword), updatedAt: new Date() } });
      await audit('password_changed', actor);
      return json({ success: true });
    }

    if (p === 'superadmin/modules' && method === 'GET') {
      return json({
        modules: MODULES.map(({ code, label, description, core }) => ({ code, label, description: description || '', core: !!core })),
        plans: PLANS,
      });
    }

    if (p === 'superadmin/tenants' && method === 'GET') {
      return json(await listTenantsWithStats());
    }

    if (p === 'superadmin/tenants' && method === 'POST') {
      if (isSingleSiteMode()) return json({ error: 'Questa installazione gestisce un solo sito (SITE_MODE=single)' }, 403);
      const body = await request.json();
      const t = await createTenant(body);
      await audit('tenant_created', actor, { tenantId: t.id, slug: t.slug, domains: t.domains });
      const { _id, ...rest } = t;
      return json(rest, 201);
    }

    if (path[0] === 'superadmin' && path[1] === 'tenants' && path[2]) {
      const id = path[2];

      if (path.length === 3 && method === 'GET') {
        const t = await getTenantById(id);
        if (!t) return json({ error: 'Affiliato non trovato' }, 404);
        const { _id, ...rest } = t;
        return json(rest);
      }

      if (path.length === 3 && method === 'PUT') {
        const body = await request.json();
        if (isSingleSiteMode()) delete body.domains; // un solo sito: il dominio non serve
        const t = await updateTenant(id, body);
        await audit('tenant_updated', actor, { tenantId: id, fields: Object.keys(body) });
        const { _id, ...rest } = t;
        return json(rest);
      }

      if (path[3] === 'owner' && method === 'POST') {
        const body = await request.json();
        const r = await setTenantOwnerPassword(id, body);
        await audit('tenant_owner_password', actor, { tenantId: id, email: r.email });
        return json(r);
      }

      // "Accedi come affiliato": token admin temporaneo (1 ora) per l'assistenza
      if (path[3] === 'impersonate' && method === 'POST') {
        const t = await getTenantById(id);
        if (!t) return json({ error: 'Affiliato non trovato' }, 404);
        const db = await getRawDatabase();
        const admin = await db.collection('admins').findOne({ tenantId: id });
        if (!admin) return json({ error: 'Questo affiliato non ha ancora un utente admin' }, 400);
        const secret = process.env.JWT_SECRET || 'fallback-secret-key';
        const token = jwt.sign({ userId: admin.id, email: admin.email, tenantId: id, impersonatedBy: actor }, secret, { expiresIn: '1h' });
        await audit('tenant_impersonate', actor, { tenantId: id, adminEmail: admin.email });
        return json({ token, url: `https://${t.domains[0]}/admin#impersonate=${token}` });
      }
    }

    if (p === 'superadmin/audit' && method === 'GET') {
      const db = await getRawDatabase();
      const rows = await db.collection('platform_audit').find({}).sort({ at: -1 }).limit(200).toArray();
      return json(rows.map(({ _id, ...r }) => r));
    }

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error('[platform]', e);
    return fail(e);
  }
}
