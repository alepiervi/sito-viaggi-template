/**
 * Gestione degli affiliati (tenant): riconoscimento dal dominio, creazione,
 * migrazione dei dati esistenti al sito master.
 */
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import { getRawDatabase } from './mongodb';
import { scopeDb, TENANT_COLLECTIONS } from './tenantDb';
import { activeModules, OPTIONAL_MODULES, PLANS, MODULE_CODES } from './modules';
import { isHexColor } from './branding';
import { hashPassword } from './auth';
import { buildTenantStarterContent } from './seed';
import { normalizeHomeSections } from './homeSections';

/**
 * SITE_MODE=single -> "un sito per installazione": lo stesso codice viene
 * pubblicato più volte (es. un progetto Emergent per affiliato), ognuno con il
 * proprio database. Il dominio non conta: c'è sempre un solo sito.
 * Qualsiasi altro valore (o nessuno) -> multi-sito, il sito si sceglie dal dominio.
 */
export function isSingleSiteMode() {
  return process.env.SITE_MODE === 'single';
}

export const DEFAULT_LOGO = '/brand/tribu-logo.png';
const CACHE_TTL_MS = 30 * 1000;
const cache = globalThis.__tribuTenantCache || (globalThis.__tribuTenantCache = new Map());

// ---------------------------------------------------------------------------
// Domini
// ---------------------------------------------------------------------------

export function normalizeDomain(value) {
  let d = String(value || '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').split('/')[0].split(',')[0].trim();
  d = d.replace(/:\d+$/, '').replace(/\.$/, '').replace(/^www\./, '');
  return d;
}

export function hostFromHeaders(h) {
  return normalizeDomain(h.get('x-forwarded-host') || h.get('host') || '');
}

function cookieFromHeaders(h, name) {
  const raw = h.get('cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function masterDomainsFromEnv() {
  const list = (process.env.MASTER_DOMAINS || 'tribuinviaggio.com,tribuinviaggio.it,localhost')
    .split(',').map(normalizeDomain).filter(Boolean);
  if (process.env.NEXT_PUBLIC_BASE_URL) list.push(normalizeDomain(process.env.NEXT_PUBLIC_BASE_URL));
  return [...new Set(list)];
}

// ---------------------------------------------------------------------------
// Avvio piattaforma e migrazione (idempotente)
// ---------------------------------------------------------------------------

async function ensurePlatform(db) {
  if (globalThis.__tribuPlatformReady) return;

  const tenants = db.collection('tenants');
  await tenants.createIndex({ slug: 1 }, { unique: true });
  await tenants.createIndex({ domains: 1 });
  await tenants.createIndex({ id: 1 }, { unique: true });

  let master = await tenants.findOne({ isMaster: true });
  if (!master) {
    // Valori iniziali dalle variabili d'ambiente: così una nuova installazione
    // dello stesso codice nasce già con il nome giusto, senza toccare il codice.
    const siteName = (process.env.SITE_NAME || 'Tribù in Viaggio').trim();
    const envPlan = PLANS[process.env.SITE_PLAN] ? process.env.SITE_PLAN : null;
    master = {
      id: uuidv4(),
      slug: slugify(process.env.SITE_SLUG || (process.env.SITE_NAME ? siteName : 'tribuinviaggio'), { lower: true, strict: true }) || 'sito',
      name: siteName,
      isMaster: true,
      status: 'active',
      plan: envPlan || 'completo',
      modules: envPlan ? [...PLANS[envPlan].modules] : [...OPTIONAL_MODULES],
      domains: masterDomainsFromEnv(),
      branding: { siteName, logoUrl: '', primaryColor: '', accentColor: '', tagline: process.env.SITE_NAME ? '' : 'Agenzia Viaggi Online' },
      contacts: {},
      layout: { homeSections: normalizeHomeSections([]) },
      seo: process.env.SITE_NAME
        ? { title: `${siteName} | Agenzia Viaggi`, description: '' }
        : {
          title: 'Tribù in Viaggio | Agenzia Viaggi Online',
          description: 'Scopri le migliori offerte di viaggio: crociere, villaggi, weekend romantici, tour guidati e molto altro. Consulenza personalizzata e assistenza dedicata.',
        },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      await tenants.insertOne(master);
      console.log('[tenant] Creato sito master:', master.domains.join(', '));
    } catch (e) {
      if (e?.code !== 11000) throw e; // creato in parallelo da un'altra richiesta
      master = await tenants.findOne({ isMaster: true });
    }
  }

  const meta = db.collection('platform_meta');
  const migrated = await meta.findOne({ key: 'migration_v1' });
  if (!migrated) {
    const report = {};
    for (const name of TENANT_COLLECTIONS) {
      const r = await db.collection(name).updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: master.id } });
      report[name] = r.modifiedCount;
      await db.collection(name).createIndex({ tenantId: 1, id: 1 });
    }
    for (const name of ['trips', 'blog_posts', 'static_pages', 'promo_pages', 'quotes', 'categories']) {
      await db.collection(name).createIndex({ tenantId: 1, slug: 1 });
    }
    await db.collection('site_settings').createIndex({ tenantId: 1, key: 1 });
    await db.collection('customers').createIndex({ tenantId: 1, email: 1 });
    await db.collection('admins').createIndex({ tenantId: 1, email: 1 });
    await meta.updateOne(
      { key: 'migration_v1' },
      { $set: { key: 'migration_v1', masterTenantId: master.id, report, at: new Date() } },
      { upsert: true }
    );
    console.log('[tenant] Migrazione dati al sito master completata', report);
  }

  // Database nuovo (installazione appena creata): categorie e footer di partenza
  const starter = await meta.findOne({ key: 'starter_v1' });
  if (!starter) {
    const mdb = scopeDb(db, master.id);
    const [cats, trips] = await Promise.all([
      mdb.collection('categories').countDocuments({}),
      mdb.collection('trips').countDocuments({}),
    ]);
    if (cats === 0 && trips === 0) {
      const content = buildTenantStarterContent({ siteName: master.name });
      await mdb.collection('categories').insertMany(content.categories);
      const hasFooter = await mdb.collection('site_settings').findOne({ key: 'footer' });
      if (!hasFooter) {
        await mdb.collection('site_settings').insertOne({
          key: 'footer', description: `${master.name} - la tua agenzia viaggi.`,
          columns: [{ title: 'Viaggi', links: [{ label: 'Catalogo', url: '/catalogo' }] }],
          phone: '', email: '', whatsapp: '',
          copyright: `${new Date().getFullYear()} ${master.name}. Tutti i diritti riservati.`,
          bottomLinks: [], updatedAt: new Date(),
        });
      }
      console.log('[tenant] Contenuti di partenza creati per', master.name);
    }
    await meta.updateOne({ key: 'starter_v1' }, { $set: { key: 'starter_v1', at: new Date() } }, { upsert: true });
  }

  globalThis.__tribuPlatformReady = true;
}

// ---------------------------------------------------------------------------
// Risoluzione del tenant
// ---------------------------------------------------------------------------

export function clearTenantCache() {
  cache.clear();
}

async function findTenantBy(db, filter) {
  return db.collection('tenants').findOne(filter);
}

/**
 * Trova il tenant per la richiesta.
 * Ordine: anteprima (solo se TENANT_OVERRIDE=true) -> dominio -> comportamento
 * per domini sconosciuti (UNKNOWN_HOST=master|404, default master).
 */
export async function resolveTenantFromHeaders(h) {
  const db = await getRawDatabase();
  await ensurePlatform(db);

  if (isSingleSiteMode()) {
    const hit = cache.get('single');
    if (hit && hit.exp > Date.now()) return hit.tenant;
    const tenant = await findTenantBy(db, { isMaster: true });
    cache.set('single', { tenant, exp: Date.now() + CACHE_TTL_MS });
    return tenant;
  }

  const host = hostFromHeaders(h);
  const override = process.env.TENANT_OVERRIDE === 'true'
    ? (h.get('x-tenant') || cookieFromHeaders(h, 'tenant_preview'))
    : null;
  const cacheKey = override ? `slug:${override}` : `host:${host}`;

  const hit = cache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.tenant;

  let tenant = null;
  if (override) tenant = await findTenantBy(db, { slug: String(override).toLowerCase() });
  if (!tenant && host) tenant = await findTenantBy(db, { domains: host });
  if (!tenant) {
    const fallback = process.env.UNKNOWN_HOST || 'master';
    if (fallback === 'master') tenant = await findTenantBy(db, { isMaster: true });
    else if (fallback !== '404') tenant = await findTenantBy(db, { slug: fallback });
  }

  cache.set(cacheKey, { tenant, exp: Date.now() + CACHE_TTL_MS });
  return tenant;
}

export async function getTenantById(id) {
  const db = await getRawDatabase();
  await ensurePlatform(db);
  return db.collection('tenants').findOne({ id });
}

/** Database filtrato per un tenant specifico (uso server: layout, sitemap). */
export async function getTenantDatabase(tenant) {
  const db = await getRawDatabase();
  return scopeDb(db, tenant.id);
}

/** Dati del tenant esposti al browser (niente informazioni riservate). */
export function publicTenantConfig(tenant) {
  if (!tenant) return null;
  const b = tenant.branding || {};
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    isMaster: !!tenant.isMaster,
    status: tenant.status,
    modules: activeModules(tenant),
    branding: {
      siteName: b.siteName || tenant.name,
      logoUrl: b.logoUrl || DEFAULT_LOGO,
      primaryColor: b.primaryColor || '',
      accentColor: b.accentColor || '',
      tagline: b.tagline || '',
    },
    contacts: tenant.contacts || {},
    homeSections: normalizeHomeSections(tenant.layout?.homeSections),
  };
}

export function tenantBaseUrl(tenant, h) {
  const proto = (h?.get?.('x-forwarded-proto') || 'https').split(',')[0].trim();
  const host = h ? (h.get('x-forwarded-host') || h.get('host')) : null;
  if (host) return `${proto}://${host.split(',')[0].trim()}`;
  const d = tenant?.domains?.[0];
  return d ? `https://${d}` : (process.env.NEXT_PUBLIC_BASE_URL || '');
}

// ---------------------------------------------------------------------------
// Creazione / modifica affiliati (usato dal pannello Super Admin e dall'API CRM)
// ---------------------------------------------------------------------------

function cleanModules(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter((c) => OPTIONAL_MODULES.includes(c)))];
}

function cleanBranding(b = {}, fallbackName = '') {
  return {
    siteName: String(b.siteName || fallbackName || '').trim(),
    logoUrl: String(b.logoUrl || '').trim(),
    primaryColor: isHexColor(b.primaryColor) ? '#' + b.primaryColor.replace('#', '') : '',
    accentColor: isHexColor(b.accentColor) ? '#' + b.accentColor.replace('#', '') : '',
    tagline: String(b.tagline || '').trim(),
  };
}

function cleanContacts(c = {}) {
  const pick = (k) => String(c[k] || '').trim();
  return { phone: pick('phone'), email: pick('email'), whatsapp: pick('whatsapp'), address: pick('address') };
}

async function assertDomainsFree(db, domains, exceptTenantId) {
  for (const d of domains) {
    const other = await db.collection('tenants').findOne({ domains: d, ...(exceptTenantId ? { id: { $ne: exceptTenantId } } : {}) });
    if (other) {
      const err = new Error(`Il dominio ${d} è già usato da "${other.name}"`);
      err.status = 409;
      throw err;
    }
  }
}

export function normalizeDomainList(domains) {
  const list = Array.isArray(domains) ? domains : String(domains || '').split(/[\s,]+/);
  return [...new Set(list.map(normalizeDomain).filter((d) => d && /^[a-z0-9.-]+$/.test(d)))];
}

export async function createTenant(input) {
  const db = await getRawDatabase();
  await ensurePlatform(db);

  const name = String(input.name || '').trim();
  if (!name) throw Object.assign(new Error('Nome obbligatorio'), { status: 400 });
  const slug = slugify(input.slug || name, { lower: true, strict: true });
  if (!slug) throw Object.assign(new Error('Slug non valido'), { status: 400 });
  if (await db.collection('tenants').findOne({ slug })) {
    throw Object.assign(new Error(`Lo slug "${slug}" esiste già`), { status: 409 });
  }

  const domains = normalizeDomainList(input.domains);
  if (domains.length === 0) throw Object.assign(new Error('Indica almeno un dominio'), { status: 400 });
  await assertDomainsFree(db, domains);

  const ownerEmail = String(input.ownerEmail || '').toLowerCase().trim();
  const ownerPassword = String(input.ownerPassword || '');
  if (!ownerEmail || ownerPassword.length < 8) {
    throw Object.assign(new Error('Email del titolare e password (minimo 8 caratteri) obbligatorie'), { status: 400 });
  }

  const plan = PLANS[input.plan] ? input.plan : 'base';
  const modules = input.modules ? cleanModules(input.modules) : [...PLANS[plan].modules];
  const branding = cleanBranding(input.branding, name);
  const contacts = cleanContacts(input.contacts);

  const tenant = {
    id: uuidv4(),
    slug,
    name,
    isMaster: false,
    status: ['draft', 'active', 'suspended'].includes(input.status) ? input.status : 'draft',
    plan,
    modules,
    domains,
    branding,
    contacts,
    seo: { title: String(input.seo?.title || `${name} | Agenzia Viaggi`), description: String(input.seo?.description || '') },
    crmCode: String(input.crmCode || '').trim(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('tenants').insertOne(tenant);

  // Contenuti iniziali, tutti di proprietà del nuovo affiliato
  const tdb = scopeDb(db, tenant.id);
  await tdb.collection('admins').insertOne({
    id: uuidv4(),
    email: ownerEmail,
    password: await hashPassword(ownerPassword),
    name: String(input.ownerName || name).trim(),
    role: 'owner',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const starter = buildTenantStarterContent({ siteName: name, withDemoTrips: !!input.withDemoTrips });
  if (starter.categories.length) await tdb.collection('categories').insertMany(starter.categories);
  if (starter.trips.length) await tdb.collection('trips').insertMany(starter.trips);
  await tdb.collection('site_settings').insertOne({
    key: 'footer',
    description: branding.tagline || `${name} - la tua agenzia viaggi.`,
    columns: [
      { title: 'Viaggi', links: [{ label: 'Catalogo', url: '/catalogo' }, { label: 'Crociere', url: '/categoria/crociere' }, { label: 'Villaggi', url: '/categoria/villaggi' }] },
      { title: 'Azienda', links: [{ label: 'Contatti', url: '#contatti' }] },
    ],
    phone: contacts.phone, email: contacts.email, whatsapp: contacts.whatsapp,
    copyright: `${new Date().getFullYear()} ${name}. Tutti i diritti riservati.`,
    bottomLinks: [{ label: 'Privacy Policy', url: '#' }, { label: 'Cookie Policy', url: '#' }],
    updatedAt: new Date(),
  });

  clearTenantCache();
  return tenant;
}

export async function updateTenant(id, input) {
  const db = await getRawDatabase();
  await ensurePlatform(db);
  const existing = await db.collection('tenants').findOne({ id });
  if (!existing) throw Object.assign(new Error('Affiliato non trovato'), { status: 404 });

  const set = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = String(input.name).trim() || existing.name;
  if (input.domains !== undefined) {
    const domains = normalizeDomainList(input.domains);
    if (domains.length === 0) throw Object.assign(new Error('Indica almeno un dominio'), { status: 400 });
    await assertDomainsFree(db, domains, id);
    set.domains = domains;
  }
  if (input.status !== undefined) {
    if (!['draft', 'active', 'suspended'].includes(input.status)) throw Object.assign(new Error('Stato non valido'), { status: 400 });
    if (existing.isMaster && input.status === 'suspended') throw Object.assign(new Error('Il sito master non può essere sospeso'), { status: 400 });
    set.status = input.status;
  }
  if (input.plan !== undefined && PLANS[input.plan]) set.plan = input.plan;
  if (input.modules !== undefined) set.modules = cleanModules(input.modules);
  if (input.branding !== undefined) set.branding = cleanBranding({ ...existing.branding, ...input.branding }, set.name || existing.name);
  if (input.contacts !== undefined) set.contacts = cleanContacts({ ...existing.contacts, ...input.contacts });
  if (input.seo !== undefined) set.seo = { title: String(input.seo.title || ''), description: String(input.seo.description || '') };
  if (input.crmCode !== undefined) set.crmCode = String(input.crmCode || '').trim();

  await db.collection('tenants').updateOne({ id }, { $set: set });
  clearTenantCache();
  return db.collection('tenants').findOne({ id });
}

/**
 * Modifiche dell'aspetto fatte dall'ADMIN del sito (livello 2).
 * Solo i campi permessi dai moduli che lo sviluppatore ha attivato.
 */
export async function updateTenantAppearance(id, input, { colors, sections }) {
  const db = await getRawDatabase();
  const existing = await db.collection('tenants').findOne({ id });
  if (!existing) throw Object.assign(new Error('Sito non trovato'), { status: 404 });
  const set = { updatedAt: new Date() };
  if (input.branding !== undefined) {
    if (!colors) throw Object.assign(new Error('La personalizzazione di colori e logo non è attiva per questo sito'), { status: 403 });
    const b = input.branding || {};
    set.branding = cleanBranding({
      ...existing.branding,
      ...(b.primaryColor !== undefined ? { primaryColor: b.primaryColor } : {}),
      ...(b.accentColor !== undefined ? { accentColor: b.accentColor } : {}),
      ...(b.logoUrl !== undefined ? { logoUrl: b.logoUrl } : {}),
      ...(b.tagline !== undefined ? { tagline: b.tagline } : {}),
    }, existing.name);
  }
  if (input.homeSections !== undefined) {
    if (!sections) throw Object.assign(new Error("La modifica delle sezioni non è attiva per questo sito"), { status: 403 });
    set['layout.homeSections'] = normalizeHomeSections(input.homeSections);
  }
  await db.collection('tenants').updateOne({ id }, { $set: set });
  clearTenantCache();
  return db.collection('tenants').findOne({ id });
}

export async function listTenantsWithStats() {
  const db = await getRawDatabase();
  await ensurePlatform(db);
  const tenants = await db.collection('tenants').find({}).sort({ isMaster: -1, createdAt: 1 }).toArray();
  return Promise.all(tenants.map(async (t) => {
    const tdb = scopeDb(db, t.id);
    const [trips, leads, newLeads, admins] = await Promise.all([
      tdb.collection('trips').countDocuments({}),
      tdb.collection('leads').countDocuments({}),
      tdb.collection('leads').countDocuments({ status: 'new' }),
      tdb.collection('admins').find({}, { projection: { email: 1, name: 1, role: 1, id: 1 } }).toArray(),
    ]);
    const { _id, ...rest } = t;
    return { ...rest, stats: { trips, leads, newLeads }, admins: admins.map(({ _id: x, ...a }) => a) };
  }));
}

export async function setTenantOwnerPassword(tenantId, { email, password, name }) {
  const db = await getRawDatabase();
  const tenant = await db.collection('tenants').findOne({ id: tenantId });
  if (!tenant) throw Object.assign(new Error('Affiliato non trovato'), { status: 404 });
  if (!password || String(password).length < 8) throw Object.assign(new Error('Password di almeno 8 caratteri'), { status: 400 });
  const tdb = scopeDb(db, tenantId);
  const emailNorm = String(email || '').toLowerCase().trim();
  const existing = emailNorm ? await tdb.collection('admins').findOne({ email: emailNorm }) : await tdb.collection('admins').findOne({});
  const hashed = await hashPassword(String(password));
  if (existing) {
    await tdb.collection('admins').updateOne({ id: existing.id }, { $set: { password: hashed, updatedAt: new Date() } });
    return { updated: true, email: existing.email };
  }
  if (!emailNorm) throw Object.assign(new Error('Email obbligatoria'), { status: 400 });
  await tdb.collection('admins').insertOne({
    id: uuidv4(), email: emailNorm, password: hashed, name: name || tenant.name, role: 'owner',
    createdAt: new Date(), updatedAt: new Date(),
  });
  return { created: true, email: emailNorm };
}

export { MODULE_CODES };
