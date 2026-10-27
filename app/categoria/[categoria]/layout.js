import { findTenantDoc, buildMetadata, siteNameOf, plainText } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tenant, doc: cat } = await findTenantDoc('categories', { slug: params.categoria });
  const name = cat?.name || params.categoria;
  return buildMetadata({
    tenant,
    title: `${name.charAt(0).toUpperCase()}${name.slice(1)} | ${siteNameOf(tenant)}`,
    description: plainText(cat?.description) || `Offerte di viaggio: ${name}.`,
    path: `/categoria/${params.categoria}`,
  });
}

export default function CategoryLayout({ children }) {
  return children;
}
