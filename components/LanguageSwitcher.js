'use client';

import { useState, useRef, useEffect } from 'react';
import { useT } from '@/lib/useT';
import { ChevronDown } from 'lucide-react';
import { Flag } from '@/components/Flags';
import { useModule } from '@/components/TenantProvider';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { lang, setLang, langs } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Modulo "multilingua" spento per questo sito: niente selettore, solo italiano
  const multilingua = useModule('multilingua');
  useEffect(() => {
    if (!multilingua && lang !== 'it') setLang('it');
  }, [multilingua, lang, setLang]);
  if (!multilingua) return null;

  const current = langs.find(l => l.code === lang) || langs[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-colors ${
          variant === 'minimal'
            ? 'text-gray-600 hover:bg-gray-100'
            : 'border border-gray-200 hover:border-ocean-300 bg-white text-gray-700 hover:text-ocean-600'
        }`}
        aria-label="Cambia lingua"
      >
        <Flag code={current.code} size={16} />
        <span className="text-xs font-semibold uppercase">{current.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                l.code === lang ? 'bg-ocean-50 text-ocean-600 font-semibold' : 'text-gray-700'
              }`}
            >
              <Flag code={l.code} size={18} />
              <span className="flex-1 text-left">{l.name}</span>
              {l.code === lang && <span className="text-ocean-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
