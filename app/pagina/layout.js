import { requireModule } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export default async function PagesLayout({ children }) {
  await requireModule('pagine');
  return children;
}
