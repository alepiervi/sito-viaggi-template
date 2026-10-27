// Area clienti visibile solo se il modulo "clienti_buoni" è attivo
import { requireModule } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: true } };

export default async function CustomerAreaLayout({ children }) {
  await requireModule('clienti_buoni');
  return children;
}
