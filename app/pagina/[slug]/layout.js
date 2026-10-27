import { findTenantDoc, buildMetadata, siteNameOf, plainText } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tenant, doc: page } = await findTenantDoc('static_pages', { slug: params.slug, status: 'published' });
  if (!page) return buildMetadata({ tenant, title: `Pagina non trovata | ${siteNameOf(tenant)}` });
  return buildMetadata({
    tenant,
    title: page.metaTitle || `${page.title} | ${siteNameOf(tenant)}`,
    description: page.metaDescription || plainText(page.intro || page.subtitle || page.content),
    image: page.heroImage,
    path: `/pagina/${page.slug}`,
  });
}

export default function PageLayout({ children }) {
  return children;
}
