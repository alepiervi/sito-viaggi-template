/**
 * Auto-translate API responses based on cookie/header/query language.
 * Used in route.js GET handlers to wrap responses.
 */

import { translateBatch } from './translator';

// Fields to translate per collection/endpoint
const FIELDS = {
  trips: ['title', 'description', 'shortDescription', 'destination', 'highlights'],
  categories: ['name', 'description'],
  testimonials: ['comment', 'destination', 'authorRole'],
  slides: ['title', 'subtitle', 'ctaText'],
  heroBanners: ['title', 'highlight', 'subtitle'],
  homepageTabs: ['name', 'description', 'sectionTitle', 'sectionSubtitle'],
  blog: ['title', 'excerpt', 'content', 'category'],
  footer: ['aboutText', 'newsletterTitle', 'newsletterSubtitle', 'copyrightText', 'description', 'copyright', 'whatsapp'],
  generic: ['title', 'name', 'description', 'subtitle', 'content', 'excerpt'],
};

/**
 * Resolve language from request: query param > header > default 'it'
 * (cookie is intentionally ignored — client-side DomTranslator handles UI translation
 *  so backend keeps returning IT, avoiding double-translation overhead.)
 */
export function resolveLang(request, searchParams) {
  const fromQuery = searchParams?.get?.('lang');
  if (fromQuery) return String(fromQuery).toLowerCase();
  const header = request.headers?.get?.('x-tribu-lang');
  if (header) return String(header).toLowerCase();
  return 'it';
}

/**
 * Translate object's fields in place (returns new object with translated fields)
 */
async function translateObject(obj, fields, lang) {
  if (!obj || lang === 'it') return obj;
  const items = fields
    .filter(f => typeof obj[f] === 'string' && obj[f].trim().length > 0)
    .map(f => ({ id: f, text: obj[f] }));
  if (items.length === 0) return obj;
  const results = await translateBatch(items, lang, 'it');
  const next = { ...obj };
  results.forEach(r => { if (r.translated) next[r.id] = r.translated; });
  return next;
}

/**
 * Translate array of objects in batch (single AI call per object).
 */
async function translateArray(arr, fields, lang) {
  if (!Array.isArray(arr) || lang === 'it') return arr;
  // Flatten all texts in one batch
  const flat = [];
  arr.forEach((item, idx) => {
    fields.forEach(f => {
      if (typeof item?.[f] === 'string' && item[f].trim().length > 0) {
        flat.push({ id: `${idx}::${f}`, text: item[f] });
      }
    });
  });
  if (flat.length === 0) return arr;
  const results = await translateBatch(flat, lang, 'it');
  const next = arr.map(it => ({ ...it }));
  results.forEach(r => {
    if (!r.translated) return;
    const [idx, key] = r.id.split('::');
    if (next[idx]) next[idx][key] = r.translated;
  });
  return next;
}

/**
 * Auto-translate a response based on path. Returns translated data.
 */
export async function autoTranslateResponse(data, pathString, lang) {
  if (lang === 'it' || !data) return data;

  // Pick fields by path
  let fields = FIELDS.generic;
  if (pathString === 'trips' || pathString.startsWith('trips/category/')) fields = FIELDS.trips;
  else if (pathString.startsWith('trips/')) fields = FIELDS.trips;
  else if (pathString === 'categories') fields = FIELDS.categories;
  else if (pathString === 'testimonials') fields = FIELDS.testimonials;
  else if (pathString === 'slides') fields = FIELDS.slides;
  else if (pathString === 'hero-banners') fields = FIELDS.heroBanners;
  else if (pathString === 'homepage/tabs') fields = FIELDS.homepageTabs;
  else if (pathString === 'blog' || pathString.startsWith('blog/')) fields = FIELDS.blog;
  else if (pathString === 'footer') fields = FIELDS.footer;

  if (Array.isArray(data)) {
    const out = await translateArray(data, fields, lang);
    // Also translate nested trips array inside homepage/tabs items
    if (pathString === 'homepage/tabs') {
      for (const item of out) {
        if (Array.isArray(item?.trips)) {
          item.trips = await translateArray(item.trips, FIELDS.trips, lang);
        }
      }
    }
    return out;
  }

  if (typeof data === 'object') {
    let out = await translateObject(data, fields, lang);
    // Footer: translate nested columns/links and bottomLinks labels
    if (pathString === 'footer') {
      if (Array.isArray(out?.columns)) {
        out.columns = await translateArray(out.columns, ['title'], lang);
        for (const col of out.columns) {
          if (Array.isArray(col.links)) {
            col.links = await translateArray(col.links, ['label'], lang);
          }
        }
      }
      if (Array.isArray(out?.bottomLinks)) {
        out.bottomLinks = await translateArray(out.bottomLinks, ['label'], lang);
      }
      if (out?.settings) {
        const s = out.settings;
        const subFields = ['aboutText', 'newsletterTitle', 'newsletterSubtitle', 'copyrightText', 'description'];
        out.settings = await translateObject(s, subFields, lang);
      }
    }
    // Trip detail may have itinerary/included/excluded arrays of strings
    if (out?.itinerary && Array.isArray(out.itinerary)) {
      const flat = out.itinerary.map((day, i) => ({ id: `it_t_${i}`, text: day.title || '' }));
      const flatD = out.itinerary.map((day, i) => ({ id: `it_d_${i}`, text: day.description || '' }));
      const merged = [...flat, ...flatD].filter(x => x.text);
      if (merged.length) {
        const r = await translateBatch(merged, lang, 'it');
        const map = {};
        r.forEach(x => { map[x.id] = x.translated; });
        out.itinerary = out.itinerary.map((d, i) => ({
          ...d,
          title: map[`it_t_${i}`] || d.title,
          description: map[`it_d_${i}`] || d.description,
        }));
      }
    }
    // included / excluded / highlights string arrays
    for (const arrField of ['included', 'excluded', 'highlights']) {
      if (Array.isArray(out?.[arrField]) && out[arrField].every(x => typeof x === 'string')) {
        const items = out[arrField].map((t, i) => ({ id: String(i), text: t }));
        const r = await translateBatch(items, lang, 'it');
        const map = {}; r.forEach(x => { map[x.id] = x.translated; });
        out[arrField] = out[arrField].map((t, i) => map[String(i)] || t);
      }
    }
    return out;
  }

  return data;
}
