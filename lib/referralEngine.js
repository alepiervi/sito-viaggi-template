/**
 * Referral & Voucher engine
 * - On customer signup with a ref code → create a pending referral
 * - On lead "confirmed" by admin (non last-minute) → if lead was made by a referred-new customer:
 *     issue a €50 voucher to the referrer, mark referral as 'converted'
 * - Voucher rules:
 *     - 12 months expiry
 *     - cannot be used on last-minute departures
 *     - not cumulative (one voucher per booking)
 */

import { getDatabase } from './mongodb';
import { v4 as uuidv4 } from 'uuid';

export const REFERRAL_REWARD_AMOUNT = 50;
export const VOUCHER_VALIDITY_MONTHS = 12;

function plusMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TRB';
  for (let i = 0; i < 8; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

async function uniqueVoucherCode(db) {
  for (let i = 0; i < 10; i++) {
    const code = generateVoucherCode();
    const exists = await db.collection('vouchers').findOne({ code });
    if (!exists) return code;
  }
  return `TRB${uuidv4().substring(0, 11).toUpperCase().replace(/-/g, '')}`;
}

/**
 * Create a pending referral on signup, if the new customer used a referral code
 * @returns {string|null} The referrer customer id or null
 */
export async function createPendingReferral({ newCustomer, referralCodeUsed }) {
  if (!referralCodeUsed) return null;
  const db = await getDatabase();
  const referrer = await db.collection('customers').findOne({ referralCode: referralCodeUsed });
  if (!referrer) return null;
  if (referrer.id === newCustomer.id) return null; // self-referral guard

  // Avoid duplicate
  const existing = await db.collection('referrals').findOne({
    referrerCustomerId: referrer.id,
    referredCustomerId: newCustomer.id,
  });
  if (existing) return referrer.id;

  await db.collection('referrals').insertOne({
    id: uuidv4(),
    referrerCustomerId: referrer.id,
    referredCustomerId: newCustomer.id,
    referredEmail: newCustomer.email,
    referredName: `${newCustomer.firstName} ${newCustomer.lastName}`.trim(),
    referralCodeUsed,
    status: 'pending', // pending -> converted | expired | cancelled
    createdAt: new Date(),
    convertedAt: null,
    voucherId: null,
    leadId: null,
  });
  return referrer.id;
}

/**
 * Issue a €50 voucher to a customer (used by referral conversion + by admin manual issue)
 */
export async function issueVoucher({ customerId, source = 'referral', sourceRefId = null, amount = REFERRAL_REWARD_AMOUNT, note = '' }) {
  const db = await getDatabase();
  const code = await uniqueVoucherCode(db);
  const now = new Date();
  const voucher = {
    id: uuidv4(),
    customerId,
    code,
    amount,
    currency: 'EUR',
    source, // 'referral' | 'manual' | 'promo'
    sourceRefId,
    note,
    status: 'active', // active | used | expired | cancelled
    rules: {
      excludeLastMinute: true,
      cumulative: false,
      minBookingAmount: 0,
    },
    issuedAt: now,
    expiresAt: plusMonths(now, VOUCHER_VALIDITY_MONTHS),
    usedAt: null,
    usedOnLeadId: null,
  };
  await db.collection('vouchers').insertOne(voucher);
  return voucher;
}

/**
 * Triggered when admin confirms a lead as booked.
 * lead.confirmed = true, optionally lead.isLastMinute true/false.
 * - If lead has customerId AND there's a pending referral with referredCustomerId == customerId
 *   AND the referred customer never had ANY previous CONFIRMED lead (i.e. truly new) → issue voucher
 */
export async function onLeadConfirmed(lead) {
  const db = await getDatabase();
  if (!lead?.customerId) return { issued: false, reason: 'no_customer' };

  // Find pending referral pointing to this customer
  const referral = await db.collection('referrals').findOne({
    referredCustomerId: lead.customerId,
    status: 'pending',
  });
  if (!referral) return { issued: false, reason: 'no_pending_referral' };

  // Verify that the referred customer is truly "new":
  // they shouldn't have any OTHER confirmed lead before this one.
  const previousConfirmed = await db.collection('leads').findOne({
    customerId: lead.customerId,
    confirmed: true,
    id: { $ne: lead.id },
  });
  if (previousConfirmed) {
    await db.collection('referrals').updateOne(
      { id: referral.id },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'customer_not_new' } }
    );
    return { issued: false, reason: 'customer_not_new' };
  }

  // Issue the voucher
  const voucher = await issueVoucher({
    customerId: referral.referrerCustomerId,
    source: 'referral',
    sourceRefId: referral.id,
    note: `Buono referral: ${referral.referredName || referral.referredEmail} ha prenotato`,
  });

  await db.collection('referrals').updateOne(
    { id: referral.id },
    { $set: { status: 'converted', convertedAt: new Date(), voucherId: voucher.id, leadId: lead.id } }
  );

  return { issued: true, voucher, referrerCustomerId: referral.referrerCustomerId };
}

/**
 * Compute wallet stats for a customer
 */
export async function getWalletStats(customerId) {
  const db = await getDatabase();
  const now = new Date();
  // Mark expired
  await db.collection('vouchers').updateMany(
    { customerId, status: 'active', expiresAt: { $lt: now } },
    { $set: { status: 'expired' } }
  );
  const vouchers = await db.collection('vouchers').find({ customerId }).sort({ issuedAt: -1 }).toArray();
  const totals = vouchers.reduce((acc, v) => {
    if (v.status === 'active') acc.active += v.amount;
    if (v.status === 'used') acc.used += v.amount;
    if (v.status === 'expired') acc.expired += v.amount;
    return acc;
  }, { active: 0, used: 0, expired: 0 });
  return { vouchers, totals };
}
