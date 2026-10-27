/**
 * Helper per componenti server (layout, generateMetadata, sitemap):
 * tenant della richiesta corrente, controllo moduli e metadati SEO.
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveTenantFromHeaders, getTenantDatabase, tenantBaseUrl } from './tenant';
import { isModuleActive } from './modules';

export async function getRequestTenant() {
  return resolveTenantFromHeaders(headers());
}

/** Da usare in un layout: pagina 404 se il modulo è spento per questo sito. */
export async function requireModule(code) {
  const tenant = await getRequestTenant();
  if (!tenant || !isModuleActive(tenant, code)) notFound();
  return tenant;
}

export function siteNameOf(tenant) {
  return tenant?.branding?.siteName || tenant?.name || '';
}

export function baseUrlOf(tenant) {
  return tenantBaseUrl(tenant, headers());
}

export function plainText(html, max = 160) {
  const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

/** Legge un documento pubblicato del tenant corrente (per i metadati SEO). */
export async function findTenantDoc(collection, filter) {
  const tenant = await getRequestTenant();
  if (!tenant) return { tenant: null, doc: null };
  const db = await getTenantDatabase(tenant);
  const doc = await db.collection(collection).findOne(filter);
  return { tenant, doc };
}

export function buildMetadata({ tenant, title, description, image, path }) {
  const siteName = siteNameOf(tenant);
  const fullTitle = title || siteName;
  const indexable = tenant?.status === 'active';
  return {
    title: fullTitle,
    description: description || undefined,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      title: fullTitle,
      description: description || undefined,
      siteName,
      locale: 'it_IT',
      type: 'website',
      url: path,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: description || undefined, images: image ? [image] : undefined },
    robots: { index: indexable, follow: indexable },
  };
}

export function jsonLd(data) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
