// Blog visibile solo se il modulo "blog" è attivo per questo sito
import { requireModule, buildMetadata, siteNameOf } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await requireModule('blog');
  return buildMetadata({ tenant, title: `Blog | ${siteNameOf(tenant)}`, description: 'Consigli di viaggio, destinazioni e novità.', path: '/blog' });
}

export default async function BlogLayout({ children }) {
  await requireModule('blog');
  return children;
}
