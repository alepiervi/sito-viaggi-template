'use client';

import { useRef, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Heading3,
  Undo, Redo, AlignLeft, AlignCenter, Pilcrow, Eraser, Highlighter, Baseline,
  ImagePlus, LayoutGrid,
} from 'lucide-react';
import { toHtml, plainToHtml } from '@/lib/richtext';

const TEXT_COLORS = ['#111827', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0284c7', '#7c3aed', '#db2777'];
const HILITE_COLORS = ['#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecaca'];

export default function RichTextEditor({ value, onChange, placeholder, compact = false, minHeight }) {
  const ref = useRef(null);
  const savedRange = useRef(null);
  const [focused, setFocused] = useState(false);
  const [palette, setPalette] = useState(null); // 'text' | 'hilite' | null
  const [media, setMedia] = useState(null); // null | 'image' | 'gallery'
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [galleryUrls, setGalleryUrls] = useState('');

  // Sync external value into the editor only when not actively editing (avoids caret jumps)
  // Plain text (with line breaks) is auto-converted to HTML paragraphs.
  useEffect(() => {
    if (ref.current && !focused) {
      const html = toHtml(value);
      if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
    }
  }, [value, focused]);

  const handleInput = () => { if (ref.current && onChange) onChange(ref.current.innerHTML); };

  const exec = (cmd, arg = null) => {
    ref.current?.focus();
    try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* noop */ }
    try { document.execCommand(cmd, false, arg); } catch (e) { /* noop */ }
    handleInput();
  };

  // Incolla sempre come testo semplice, convertendo gli a capo in paragrafi/<br>
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text/plain');
    if (text == null) return;
    e.preventDefault();
    exec('insertHTML', plainToHtml(text) || '');
  };

  // --- Inserimento immagini / gallerie ---
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertAtCaret = (html) => {
    if (!ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      try { sel.removeAllRanges(); sel.addRange(savedRange.current); } catch (e) { /* noop */ }
    }
    try { document.execCommand('insertHTML', false, html); } catch (e) { /* noop */ }
    handleInput();
    saveSelection();
  };

  const escAttr = (s) => String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const insertImage = () => {
    const url = imgUrl.trim();
    if (!url) return;
    const alt = escAttr(imgAlt.trim());
    const caption = imgAlt.trim()
      ? `<figcaption style="font-size:.85em;color:#6b7280;text-align:center;margin-top:.4rem;">${escAttr(imgAlt.trim())}</figcaption>`
      : '';
    insertAtCaret(
      `<figure style="margin:1.1rem 0;"><img src="${escAttr(url)}" alt="${alt}" style="width:100%;height:auto;border-radius:14px;display:block;" />${caption}</figure><p><br /></p>`
    );
    setImgUrl(''); setImgAlt(''); setMedia(null);
  };

  const insertGallery = () => {
    const urls = galleryUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;
    const imgs = urls.map(u =>
      `<img src="${escAttr(u)}" alt="" style="width:100%;height:170px;object-fit:cover;border-radius:12px;display:block;" />`
    ).join('');
    insertAtCaret(
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.6rem;margin:1.1rem 0;">${imgs}</div><p><br /></p>`
    );
    setGalleryUrls(''); setMedia(null);
  };

  const addLink = () => {
    const url = window.prompt('Inserisci URL completo (es. https://...)');
    if (url) exec('createLink', url);
  };

  const Btn = ({ onClick, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
    >{children}</button>
  );

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 bg-gray-50 border-b px-1.5 py-1">
        {!compact && (
          <>
            <Btn onClick={() => exec('formatBlock', '<h2>')} title="Titolo"><Heading2 className="w-4 h-4" /></Btn>
            <Btn onClick={() => exec('formatBlock', '<h3>')} title="Sottotitolo"><Heading3 className="w-4 h-4" /></Btn>
            <Btn onClick={() => exec('formatBlock', '<p>')} title="Paragrafo"><Pilcrow className="w-4 h-4" /></Btn>
            <span className="w-px h-5 bg-gray-300 mx-1" />
          </>
        )}
        <Btn onClick={() => exec('bold')} title="Grassetto"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('italic')} title="Corsivo"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('underline')} title="Sottolineato"><Underline className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <Btn onClick={() => exec('hiliteColor', '#fef08a')} title="Evidenzia in giallo"><Highlighter className="w-4 h-4 text-yellow-600" /></Btn>
        <Btn onClick={() => setPalette(palette === 'hilite' ? null : 'hilite')} title="Altri colori evidenziatore"><span className="w-4 h-4 block rounded-sm border bg-gradient-to-br from-yellow-200 to-pink-200" /></Btn>
        <Btn onClick={() => setPalette(palette === 'text' ? null : 'text')} title="Colore testo"><Baseline className="w-4 h-4" /></Btn>
        {!compact && (
          <>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <Btn onClick={() => exec('insertUnorderedList')} title="Elenco puntato"><List className="w-4 h-4" /></Btn>
            <Btn onClick={() => exec('insertOrderedList')} title="Elenco numerato"><ListOrdered className="w-4 h-4" /></Btn>
            <Btn onClick={() => exec('justifyLeft')} title="Allinea a sinistra"><AlignLeft className="w-4 h-4" /></Btn>
            <Btn onClick={() => exec('justifyCenter')} title="Centra"><AlignCenter className="w-4 h-4" /></Btn>
          </>
        )}
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <Btn onClick={addLink} title="Inserisci link"><Link2 className="w-4 h-4" /></Btn>
        {!compact && (
          <>
            <Btn onClick={() => { setPalette(null); setMedia(media === 'image' ? null : 'image'); }} title="Inserisci immagine"><ImagePlus className="w-4 h-4 text-ocean-600" /></Btn>
            <Btn onClick={() => { setPalette(null); setMedia(media === 'gallery' ? null : 'gallery'); }} title="Inserisci galleria di immagini"><LayoutGrid className="w-4 h-4 text-ocean-600" /></Btn>
          </>
        )}
        <Btn onClick={() => exec('removeFormat')} title="Rimuovi formattazione"><Eraser className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('undo')} title="Annulla"><Undo className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('redo')} title="Ripeti"><Redo className="w-4 h-4" /></Btn>
      </div>

      {palette && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 border-b px-2 py-1.5">
          <span className="text-xs text-gray-500">{palette === 'text' ? 'Colore testo:' : 'Evidenziatore:'}</span>
          {(palette === 'text' ? TEXT_COLORS : HILITE_COLORS).map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { exec(palette === 'text' ? 'foreColor' : 'hiliteColor', c); setPalette(null); }}
              className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition"
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { exec(palette === 'text' ? 'foreColor' : 'hiliteColor', palette === 'text' ? '#111827' : 'transparent'); setPalette(null); }}
            className="text-xs text-gray-500 underline"
          >Rimuovi</button>
        </div>
      )}
      {media === 'image' && (
        <div className="bg-ocean-50/60 border-b px-2 py-2 space-y-2">
          <p className="text-xs font-medium text-gray-600">Inserisci immagine (URL)</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://... (link immagine)"
              className="flex-1 border rounded-md px-2 py-1.5 text-sm"
            />
            <input
              value={imgAlt}
              onChange={(e) => setImgAlt(e.target.value)}
              placeholder="Didascalia (opzionale)"
              className="sm:w-56 border rounded-md px-2 py-1.5 text-sm"
            />
            <button type="button" onClick={insertImage} className="px-3 py-1.5 text-sm rounded-md bg-ocean-500 text-white hover:bg-ocean-600">Inserisci</button>
            <button type="button" onClick={() => setMedia(null)} className="px-2 py-1.5 text-sm text-gray-500">Annulla</button>
          </div>
          {imgUrl.trim() && <img src={imgUrl.trim()} alt="" className="h-24 rounded-md object-cover" />}
        </div>
      )}

      {media === 'gallery' && (
        <div className="bg-ocean-50/60 border-b px-2 py-2 space-y-2">
          <p className="text-xs font-medium text-gray-600">Inserisci galleria — un URL per riga</p>
          <textarea
            value={galleryUrls}
            onChange={(e) => setGalleryUrls(e.target.value)}
            rows={3}
            placeholder={'https://.../foto1.jpg\nhttps://.../foto2.jpg\nhttps://.../foto3.jpg'}
            className="w-full border rounded-md px-2 py-1.5 text-sm font-mono"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={insertGallery} className="px-3 py-1.5 text-sm rounded-md bg-ocean-500 text-white hover:bg-ocean-600">Inserisci galleria</button>
            <button type="button" onClick={() => setMedia(null)} className="px-2 py-1.5 text-sm text-gray-500">Annulla</button>
            <span className="text-xs text-gray-400">{galleryUrls.split('\n').filter(u => u.trim()).length} immagini</span>
          </div>
        </div>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={() => setFocused(true)}
        onBlur={() => { saveSelection(); setFocused(false); handleInput(); }}
        data-placeholder={placeholder || 'Scrivi qui il contenuto...'}
        style={{ minHeight: minHeight || (compact ? 80 : 240) }}
        className="rte-content max-h-[440px] overflow-y-auto p-3 text-sm focus:outline-none"
      />
      <style>{`
        .rte-content:empty:before{ content: attr(data-placeholder); color:#9ca3af; }
        .rte-content h2{ font-size:1.4em; font-weight:700; margin:.6em 0 .3em; }
        .rte-content h3{ font-size:1.15em; font-weight:700; margin:.5em 0 .25em; }
        .rte-content p{ margin:.45em 0; line-height:1.6; }
        .rte-content ul{ list-style:disc; padding-left:1.4em; margin:.4em 0; }
        .rte-content ol{ list-style:decimal; padding-left:1.4em; margin:.4em 0; }
        .rte-content a{ color:#2563eb; text-decoration:underline; }
        .rte-content mark{ background:#fef08a; padding:0 .1em; }
        .rte-content strong, .rte-content b{ font-weight:700; }
        .rte-content img{ max-width:100%; }
        .rte-content figure{ margin:1rem 0; }
        .rte-content figure img{ max-height:260px; object-fit:cover; }
      `}</style>
    </div>
  );
}
