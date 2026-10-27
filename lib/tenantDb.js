/**
 * Database "a compartimenti": ogni operazione su una collezione di contenuto
 * viene filtrata automaticamente per tenantId.
 *
 * - le letture (find, findOne, countDocuments, aggregate, distinct) vedono
 *   solo i documenti del tenant;
 * - le scritture (insert) ricevono sempre il tenantId corretto;
 * - gli update/delete toccano solo documenti del tenant e non possono mai
 *   cambiare il tenantId (anche se il body della richiesta lo contiene).
 *
 * Qualsiasi metodo non previsto lancia un errore invece di passare al driver,
 * così un nuovo pezzo di codice non può aggirare il filtro per sbaglio.
 */

// Collezioni condivise dalla piattaforma (NON filtrate per tenant)
export const GLOBAL_COLLECTIONS = new Set([
  'tenants',
  'superadmins',
  'platform_meta',
  'platform_audit',
  'translations', // cache traduzioni AI: testo -> traduzione, nessun dato riservato
]);

// Collezioni di contenuto, una "copia logica" per ogni affiliato
export const TENANT_COLLECTIONS = [
  'admins', 'trips', 'categories', 'testimonials', 'homepage_tabs', 'blog_posts',
  'static_pages', 'site_settings', 'leads', 'promo_pages', 'newsletter_subscribers',
  'quotes', 'customers', 'referrals', 'vouchers', 'wa_conversations', 'wa_messages',
];

function scopeFilter(filter, tenantId) {
  return { ...(filter || {}), tenantId };
}

function stripTenantFromUpdate(update) {
  if (!update || typeof update !== 'object' || Array.isArray(update)) return update;
  const out = { ...update };
  for (const op of ['$set', '$setOnInsert', '$unset', '$inc', '$push', '$rename']) {
    if (out[op] && typeof out[op] === 'object' && 'tenantId' in out[op]) {
      const copy = { ...out[op] };
      delete copy.tenantId;
      out[op] = copy;
    }
  }
  return out;
}

// Come fa il driver con _id, il tenantId viene scritto anche sull'oggetto
// passato: così anche la risposta API mostra il valore reale salvato.
function withTenant(doc, tenantId) {
  if (doc && typeof doc === 'object') {
    doc.tenantId = tenantId;
    return doc;
  }
  return doc;
}

function scopeCollection(coll, tenantId) {
  const api = {
    collectionName: coll.collectionName,
    find: (filter, options) => coll.find(scopeFilter(filter, tenantId), options),
    findOne: (filter, options) => coll.findOne(scopeFilter(filter, tenantId), options),
    countDocuments: (filter, options) => coll.countDocuments(scopeFilter(filter, tenantId), options),
    distinct: (key, filter, options) => coll.distinct(key, scopeFilter(filter, tenantId), options),
    aggregate: (pipeline = [], options) => coll.aggregate([{ $match: { tenantId } }, ...pipeline], options),
    insertOne: (doc, options) => coll.insertOne(withTenant(doc, tenantId), options),
    insertMany: (docs, options) => coll.insertMany((docs || []).map((d) => withTenant(d, tenantId)), options),
    updateOne: (filter, update, options) => coll.updateOne(scopeFilter(filter, tenantId), stripTenantFromUpdate(update), options),
    updateMany: (filter, update, options) => coll.updateMany(scopeFilter(filter, tenantId), stripTenantFromUpdate(update), options),
    findOneAndUpdate: (filter, update, options) => coll.findOneAndUpdate(scopeFilter(filter, tenantId), stripTenantFromUpdate(update), options),
    replaceOne: (filter, doc, options) => coll.replaceOne(scopeFilter(filter, tenantId), withTenant(doc, tenantId), options),
    deleteOne: (filter, options) => coll.deleteOne(scopeFilter(filter, tenantId), options),
    deleteMany: (filter, options) => coll.deleteMany(scopeFilter(filter, tenantId), options),
    createIndex: (...args) => coll.createIndex(...args),
  };
  return new Proxy(api, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      throw new Error(`[tenantDb] Metodo "${String(prop)}" non consentito su collezione filtrata "${coll.collectionName}"`);
    },
  });
}

/**
 * Restituisce un oggetto con la stessa interfaccia di `db` (solo .collection())
 * ma con tutte le collezioni di contenuto filtrate per tenantId.
 */
export function scopeDb(db, tenantId) {
  if (!tenantId) throw new Error('[tenantDb] tenantId mancante');
  return {
    databaseName: db.databaseName,
    tenantId,
    collection(name) {
      const coll = db.collection(name);
      if (GLOBAL_COLLECTIONS.has(name)) return coll;
      return scopeCollection(coll, tenantId);
    },
  };
}
