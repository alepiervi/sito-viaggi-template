/**
 * Autenticazione del Super Admin (gestore della piattaforma).
 *
 * Il primo Super Admin viene creato dalle variabili d'ambiente
 * SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD. Non esiste nessuna password di
 * default: se le variabili non sono impostate, il pannello resta chiuso.
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getRawDatabase } from './mongodb';
import { hashPassword, verifyPassword } from './auth';

const ISSUER = 'tribu-superadmin';

function secret() {
  return process.env.SUPERADMIN_JWT_SECRET || process.env.JWT_SECRET || null;
}

export function superadminConfigured() {
  return !!secret();
}

async function ensureBootstrapSuperadmin(db) {
  const coll = db.collection('superadmins');
  const count = await coll.countDocuments();
  if (count > 0) return;
  // DEVELOPER_* è il nome usato nella modalità "un sito per installazione"
  const email = (process.env.DEVELOPER_EMAIL || process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.DEVELOPER_PASSWORD || process.env.SUPERADMIN_PASSWORD || '';
  if (!email || password.length < 8) return;
  await coll.createIndex({ email: 1 }, { unique: true });
  try {
    await coll.insertOne({ id: uuidv4(), email, password: await hashPassword(password), name: 'Super Admin', createdAt: new Date() });
    console.log('[superadmin] Super Admin iniziale creato:', email);
  } catch (e) {
    if (e?.code !== 11000) throw e;
  }
}

export async function loginSuperadmin(email, password) {
  if (!secret()) return { error: 'Imposta JWT_SECRET (o SUPERADMIN_JWT_SECRET) nelle variabili d\'ambiente', status: 503 };
  const db = await getRawDatabase();
  await ensureBootstrapSuperadmin(db);
  const user = await db.collection('superadmins').findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user || !(await verifyPassword(String(password || ''), user.password))) {
    return { error: 'Credenziali non valide', status: 401 };
  }
  const token = jwt.sign({ superadminId: user.id, email: user.email, kind: 'superadmin' }, secret(), { expiresIn: '12h', issuer: ISSUER });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function validateSuperadmin(request) {
  if (!secret()) return null;
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.substring(7), secret(), { issuer: ISSUER });
    if (decoded.kind !== 'superadmin') return null;
    const db = await getRawDatabase();
    return db.collection('superadmins').findOne({ id: decoded.superadminId });
  } catch {
    return null;
  }
}

/** Chiave per chiamate macchina-macchina (es. il CRM che crea affiliati). */
export function validatePlatformKey(request) {
  const key = process.env.PLATFORM_API_KEY;
  if (!key || key.length < 24) return false;
  return request.headers.get('x-platform-key') === key;
}

export async function audit(action, actor, details = {}) {
  try {
    const db = await getRawDatabase();
    await db.collection('platform_audit').insertOne({ id: uuidv4(), action, actor, details, at: new Date() });
  } catch (e) {
    console.error('[audit]', e);
  }
}
