// I preventivi sono link privati inviati al cliente: mai indicizzati
import { requireModule, siteNameOf } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await requireModule('preventivi');
  return { title: `Il tuo preventivo | ${siteNameOf(tenant)}`, robots: { index: false, follow: false } };
}

export default async function QuoteLayout({ children }) {
  await requireModule('preventivi');
  return children;
}
