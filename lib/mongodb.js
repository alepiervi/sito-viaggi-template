import { MongoClient } from 'mongodb';
import { currentTenant } from './tenantContext';
import { scopeDb } from './tenantDb';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'tribu_in_viaggio';

let client;
let clientPromise;

if (!MONGO_URL) {
  throw new Error('Please add your Mongo URI to .env');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGO_URL);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGO_URL);
  clientPromise = client.connect();
}

/**
 * Database completo, senza filtri. Da usare SOLO per le funzioni di
 * piattaforma (super admin, risoluzione tenant, migrazioni).
 */
export async function getRawDatabase() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

/**
 * Database del sito corrente. Durante una richiesta di un affiliato
 * restituisce automaticamente la versione filtrata per tenant, quindi tutto il
 * codice esistente (route, referral, WhatsApp bot, ...) resta invariato.
 */
export async function getDatabase() {
  const db = await getRawDatabase();
  const tenant = currentTenant();
  return tenant ? scopeDb(db, tenant.id) : db;
}

export default clientPromise;
