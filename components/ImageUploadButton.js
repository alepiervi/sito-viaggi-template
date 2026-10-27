'use client';

/**
 * Pulsante "Carica" accanto ai campi immagine del backend.
 * Carica la foto sul Cloudinary dell'admin (configurato in Impostazioni)
 * e restituisce il link, che viene inserito nel campo da solo.
 */
import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

export default function ImageUploadButton({ onUploaded, multiple = false, folder = 'sito', label = 'Carica', className = '' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setBusy(true); setError('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const urls = [];
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const r = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const out = await r.json().catch(() => ({}));
        if (!r.ok || !out.url) throw new Error(out.error || 'Caricamento non riuscito');
        urls.push(out.url);
      }
      onUploaded(multiple ? urls : urls[0]);
    } catch (e) {
      setError(e.message);
      if (urls.length) onUploaded(multiple ? urls : urls[0]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-input bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {label}
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => upload(e.target.files)} />
      {error && <span className="text-xs text-red-600 mt-1 max-w-[220px]">{error}</span>}
    </span>
  );
}
