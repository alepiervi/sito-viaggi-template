/**
 * Sitemap per dominio: ogni affiliato ha la sua, con i propri viaggi,
 * categorie, articoli e pagine pubblicate.
 */
import { resolveTenantFromHeaders, getTenantDatabase, tenantBaseUrl } from '@/lib/tenant';
import { isModuleActive } from '@/lib/modules';

export const dynamic = 'force-dynamic';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(request) {
  const tenant = await resolveTenantFromHeaders(request.headers);
  if (!tenant || tenant.status !== 'active') {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { headers: { 'Content-Type': 'application/xml' } });
  }
  const base = tenantBaseUrl(tenant, request.headers);
  const db = await getTenantDatabase(tenant);
  const now = new Date();
  const urls = [
    { loc: '/', changefreq: 'daily', priority: 1.0, lastmod: now },
    { loc: '/catalogo', changefreq: 'daily', priority: 0.9, lastmod: now },
  ];

  const trips = await db.collection('trips').find({ status: 'published' }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
  trips.forEach((t) => urls.push({ loc: `/viaggio/${t.slug}`, changefreq: 'weekly', priority: 0.8, lastmod: t.updatedAt }));
  const cats = await db.collection('categories').find({}, { projection: { slug: 1 } }).toArray();
  cats.forEach((c) => urls.push({ loc: `/categoria/${c.slug}`, changefreq: 'weekly', priority: 0.7 }));

  if (isModuleActive(tenant, 'blog')) {
    urls.push({ loc: '/blog', changefreq: 'weekly', priority: 0.7, lastmod: now });
    const posts = await db.collection('blog_posts').find({ status: 'published' }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    posts.forEach((p) => urls.push({ loc: `/blog/${p.slug}`, changefreq: 'monthly', priority: 0.6, lastmod: p.updatedAt }));
  }
  if (isModuleActive(tenant, 'pagine')) {
    const pages = await db.collection('static_pages').find({ status: 'published' }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    pages.forEach((p) => urls.push({ loc: `/pagina/${p.slug}`, changefreq: 'monthly', priority: 0.5, lastmod: p.updatedAt }));
  }
  if (isModuleActive(tenant, 'landing_promo')) {
    const promos = await db.collection('promo_pages').find({ active: true }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    promos.filter((p) => p.slug).forEach((p) => urls.push({ loc: `/promo/${p.slug}`, changefreq: 'weekly', priority: 0.6, lastmod: p.updatedAt }));
  }

  const body = urls.map((u) => {
    const lastmod = u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : '';
    return `<url><loc>${esc(base + u.loc)}</loc>${lastmod}<changefreq>${u.changefreq}</changefreq><priority>${u.priority.toFixed(1)}</priority></url>`;
  }).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } }
  );
}
