import { findTenantDoc, buildMetadata, siteNameOf, plainText } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tenant, doc: promo } = await findTenantDoc('promo_pages', { slug: params.slug, active: true });
  if (!promo) return buildMetadata({ tenant, title: siteNameOf(tenant) });
  return buildMetadata({
    tenant,
    title: `${promo.heroTitle || promo.destination || 'Offerta'} | ${siteNameOf(tenant)}`,
    description: plainText(promo.heroSubtitle || promo.description),
    image: promo.heroImage,
    path: `/promo/${promo.slug}`,
  });
}

export default function PromoPageLayout({ children }) {
  return children;
}
