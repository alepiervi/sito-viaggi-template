'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tr, DEFAULT_LANG, LANGS } from '@/lib/i18n';

const STORAGE_KEY = 'tribuLang';

// Stable signature for objects/arrays so effects don't loop when a NEW
// object/array identity is created on every render (e.g. `trip?.items || []`).
function sig(value) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

// Global state holder so multiple components stay in sync
let globalLang = DEFAULT_LANG;
const listeners = new Set();

function notifyAll() {
  listeners.forEach(fn => {
    try { fn(globalLang); } catch { /* ignore */ }
  });
}

export function getCurrentLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  return globalLang || localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
}

export function setCurrentLang(lang) {
  if (typeof window === 'undefined') return;
  globalLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  // Set as cookie so backend can auto-translate API responses
  document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = lang;
  notifyAll();
  // Dispatch global event so listeners (router refresh, re-fetch hooks) can react
  try {
    window.dispatchEvent(new CustomEvent('tribu:langChanged', { detail: { lang } }));
  } catch { /* ignore */ }
}

/**
 * Hook returning current language + t() function + setLang function.
 * Auto-updates when language changes anywhere in the app.
 */
export function useT() {
  const [lang, setLang] = useState(DEFAULT_LANG);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    globalLang = saved;
    setLang(saved);
    document.documentElement.lang = saved;
    const fn = (l) => setLang(l);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const t = useCallback((key, fallback) => tr(lang, key, fallback), [lang]);

  return { lang, t, setLang: setCurrentLang, langs: LANGS };
}

/**
 * Translate dynamic content (DB-backed) via /api/translate with cache.
 * Returns {text, loading}.
 */
export function useTranslated(originalText, opts = {}) {
  const { lang } = useT();
  const [translated, setTranslated] = useState(originalText);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalText) { setTranslated(''); return; }
    if (lang === 'it') { setTranslated(originalText); return; }

    let abort = false;
    setLoading(true);
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: originalText, target: lang, context: opts.context || '' }),
    })
      .then(r => r.json())
      .then(data => { if (!abort) setTranslated(data.translated || originalText); })
      .catch(() => { if (!abort) setTranslated(originalText); })
      .finally(() => { if (!abort) setLoading(false); });

    return () => { abort = true; };
  }, [originalText, lang, opts.context]);

  return { text: translated, loading };
}

/**
 * Translate an object's text fields at once.
 */
export function useTranslatedObject(obj, keys = []) {
  const { lang } = useT();
  const [translated, setTranslated] = useState(obj);
  const [loading, setLoading] = useState(false);
  const objSig = useMemo(() => sig(obj), [obj]);

  useEffect(() => {
    if (!obj) return;
    if (lang === 'it') { setTranslated(obj); return; }
    let abort = false;
    setLoading(true);

    const items = keys
      .map(k => ({ key: k, text: obj[k] }))
      .filter(it => typeof it.text === 'string' && it.text.trim().length > 0);

    if (items.length === 0) { setTranslated(obj); setLoading(false); return; }

    fetch('/api/translate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(it => ({ id: it.key, text: it.text })), target: lang }),
    })
      .then(r => r.json())
      .then(data => {
        if (abort) return;
        const next = { ...obj };
        (data.results || []).forEach(r => { next[r.id] = r.translated || obj[r.id]; });
        setTranslated(next);
      })
      .catch(() => { if (!abort) setTranslated(obj); })
      .finally(() => { if (!abort) setLoading(false); });

    return () => { abort = true; };
  }, [objSig, lang, keys.join(',')]); // eslint-disable-line

  return { obj: translated, loading };
}

/**
 * Translate an ARRAY of objects in one batch call.
 * @param {Array} items - array of objects
 * @param {Array<string>} keys - field paths to translate per item
 */
export function useTranslatedArray(items, keys = []) {
  const { lang } = useT();
  const [translated, setTranslated] = useState(items);
  const [loading, setLoading] = useState(false);
  const itemsSig = useMemo(() => sig(items), [items]);

  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0) { setTranslated(items || []); return; }
    if (lang === 'it') { setTranslated(items); return; }
    let abort = false;
    setLoading(true);

    // Build flat list of texts to translate
    const flat = [];
    items.forEach((item, idx) => {
      keys.forEach(k => {
        const v = item?.[k];
        if (typeof v === 'string' && v.trim().length > 0) {
          flat.push({ id: `${idx}::${k}`, text: v });
        }
      });
    });

    if (flat.length === 0) { setTranslated(items); setLoading(false); return; }

    fetch('/api/translate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: flat, target: lang }),
    })
      .then(r => r.json())
      .then(data => {
        if (abort) return;
        const next = items.map(it => ({ ...it }));
        (data.results || []).forEach(r => {
          const [idx, key] = r.id.split('::');
          if (next[idx] && r.translated) next[idx][key] = r.translated;
        });
        setTranslated(next);
      })
      .catch(() => { if (!abort) setTranslated(items); })
      .finally(() => { if (!abort) setLoading(false); });

    return () => { abort = true; };
  }, [itemsSig, lang, keys.join(',')]); // eslint-disable-line

  return { items: translated, loading };
}

