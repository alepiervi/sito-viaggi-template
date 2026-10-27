import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './mongodb';
import { currentTenant } from './tenantContext';

if (!process.env.JWT_SECRET) {
  console.warn('[auth] ATTENZIONE: JWT_SECRET non impostato, uso una chiave di ripiego. Impostalo nelle variabili d\'ambiente.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/** Il token admin è legato al sito (tenant) su cui è stato emesso. */
export function generateToken(userId, email, tenantId = currentTenant()?.id || null) {
  return jwt.sign(
    { userId, email, tenantId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Crea l'admin iniziale solo per il sito master e solo se ADMIN_PASSWORD è
 * impostata. Gli admin degli affiliati vengono creati dal Super Admin.
 */
export async function initializeAdmin() {
  const tenant = currentTenant();
  if (!tenant?.isMaster) return;
  if (!process.env.ADMIN_PASSWORD) return;
  const db = await getDatabase();
  const admins = db.collection('admins');

  const existingAdmin = await admins.findOne({});
  if (!existingAdmin) {
    const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD);
    await admins.insertOne({
      id: crypto.randomUUID(),
      email: process.env.ADMIN_EMAIL || 'admin@tribuinviaggio.it',
      password: hashedPassword,
      name: 'Admin',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin account initialized');
  }
}

export async function validateAdmin(token) {
  const decoded = verifyToken(token);
  if (!decoded || decoded.kind === 'customer' || decoded.kind === 'superadmin') return null;

  const tenant = currentTenant();
  // Token emessi prima del multi-sito non hanno tenantId: validi solo sul master
  const tokenTenant = decoded.tenantId || null;
  if (tenant) {
    if (tokenTenant && tokenTenant !== tenant.id) return null;
    if (!tokenTenant && !tenant.isMaster) return null;
  }

  const db = await getDatabase();
  const admin = await db.collection('admins').findOne({ id: decoded.userId });
  return admin;
}
