'use client';

import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Floating language switcher visible on every page EXCEPT those that already
 * embed their own LanguageSwitcher in the header (home, catalogo, blog, viaggio, admin).
 */
const HIDE_ON = ['/admin', '/superadmin', '/sviluppatore', '/', '/catalogo', '/blog', '/viaggio', '/preventivo', '/categoria', '/wishlist', '/confronta', '/pagina', '/area-clienti'];

export default function FloatingLanguageSwitcher() {
  const pathname = usePathname() || '/';
  // Hide if path matches or starts with a hidden route
  const shouldHide = HIDE_ON.some(p => p === pathname || pathname.startsWith(p + '/'));
  if (shouldHide) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] shadow-lg rounded-full bg-white">
      <LanguageSwitcher />
    </div>
  );
}
