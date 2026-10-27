import { requireModule } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export default async function PromoLayout({ children }) {
  await requireModule('landing_promo');
  return children;
}
