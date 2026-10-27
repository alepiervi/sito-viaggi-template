'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Wrapper that re-mounts children when language changes.
 * - Listens to tribu:langChanged event
 * - Forces a key change → ALL client components inside re-mount and re-fetch
 * - Also triggers router.refresh() for server components
 * - NO full page reload → instant + state preserved at layout level
 */
export default function I18nKeyProvider({ children }) {
  const [langKey, setLangKey] = useState(() => {
    if (typeof window === 'undefined') return 'it';
    return localStorage.getItem('tribuLang') || 'it';
  });
  const router = useRouter();

  useEffect(() => {
    const onLangChange = (e) => {
      const newLang = e?.detail?.lang || localStorage.getItem('tribuLang') || 'it';
      setLangKey(newLang);
      // Refresh server-rendered parts (does not unmount client components)
      try { router.refresh(); } catch { /* ignore */ }
    };
    window.addEventListener('tribu:langChanged', onLangChange);
    return () => window.removeEventListener('tribu:langChanged', onLangChange);
  }, [router]);

  // Re-mount on language change so all useEffect-based fetches re-run with new cookie
  return <div key={langKey}>{children}</div>;
}
