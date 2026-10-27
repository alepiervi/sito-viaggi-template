import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './mongodb';
import { v4 as uuidv4 } from 'uuid';
import { currentTenant } from './tenantContext';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
// Use distinct issuer claim so admin & customer tokens are not interchangeable
const CUSTOMER_ISSUER = 'tribu-customer';

export function generateCustomerToken(customerId, email) {
  return jwt.sign(
    { customerId, email, kind: 'customer', tenantId: currentTenant()?.id || null },
    JWT_SECRET,
    { expiresIn: '30d', issuer: CUSTOMER_ISSUER }
  );
}

export function verifyCustomerToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: CUSTOMER_ISSUER });
    if (decoded.kind !== 'customer') return null;
    const tenant = currentTenant();
    if (tenant) {
      if (decoded.tenantId && decoded.tenantId !== tenant.id) return null;
      if (!decoded.tenantId && !tenant.isMaster) return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function validateCustomer(token) {
  const decoded = verifyCustomerToken(token);
  if (!decoded) return null;
  const db = await getDatabase();
  const customer = await db.collection('customers').findOne({ id: decoded.customerId });
  return customer;
}

export function getCustomerTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.substring(7);
  return null;
}

// Generate referral code: 3 letters from first name + 4 random alphanumeric
export function generateReferralCode(firstName) {
  const prefix = (firstName || 'TRB')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 3)
    .padEnd(3, 'X');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${suffix}`;
}

export async function generateUniqueReferralCode(firstName) {
  const db = await getDatabase();
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode(firstName);
    const exists = await db.collection('customers').findOne({ referralCode: code });
    if (!exists) return code;
  }
  // Fallback ultra-unique
  return `TRB-${uuidv4().substring(0, 6).toUpperCase()}`;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}
