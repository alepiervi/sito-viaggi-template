'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/lib/useT';

/**
 * In-place DOM translator (Google Translate-style).
 * - Walks the DOM after every language change AND mutation
 * - Translates text nodes + attributes (placeholder, title, aria-label, alt)
 * - Caches per-text → no API round-trip on retranslation
 * - Stores originals on each node so it can switch BACK to Italian instantly
 * - Skips <script>, <style>, <code>, <pre>, [data-no-translate], [translate="no"]
 * - NO page reload, NO React re-mount
 *
 * FLICKER-FREE STRATEGY:
 * React re-renders (auto-rotating hero/slides, useTranslatedArray updates) keep
 * resetting text nodes back to Italian. To avoid a visible flash we re-apply the
 * ALREADY-CACHED translations SYNCHRONOUSLY on every mutation (coalesced via
 * requestAnimationFrame). The expensive API fetch for genuinely-new strings is
 * debounced separately. We disconnect/reconnect the observer around our own DOM
 * writes so we never enter an infinite loop and never miss external mutations.
 */

const ATTR_TRANSLATABLE = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'PATH', 'RECT', 'CIRCLE', 'POLYGON', 'TEXTAREA']);

// In-memory cache: `${lang}|${text}` -> translated text
const cache = new Map();
// Inflight requests dedup
const inflight = new Map();
// Set of every translated OUTPUT string per language. Used to recognise text
// that is ALREADY translated so we never re-capture it as a "source" (which
// would corrupt the stored original and cause IT<->EN mix-ups).
const translatedValues = new Map(); // lang -> Set<string>

function rememberTranslation(lang, source, translated) {
  cache.set(`${lang}|${source}`, translated);
  let set = translatedValues.get(lang);
  if (!set) { set = new Set(); translatedValues.set(lang, set); }
  set.add(translated);
}

function isAlreadyTranslated(lang, text) {
  const set = translatedValues.get(lang);
  return !!(set && set.has(text));
}

let currentLang = 'it';
let observer = null;

function shouldSkipParent(node) {
  let p = node.parentElement;
  while (p) {
    if (SKIP_TAGS.has(p.tagName)) return true;
    if (p.hasAttribute && p.hasAttribute('data-no-translate')) return true;
    if (p.getAttribute && p.getAttribute('translate') === 'no') return true;
    p = p.parentElement;
  }
  return false;
}

function isTranslatableText(s) {
  if (!s) return false;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (t.length < 2) return false; // skip "&", "·", etc.
  // skip pure numbers, prices, dates, codes
  if (/^[\d\s.,:€$%\-+/()]+$/.test(t)) return false;
  // skip emails, urls
  if (/^https?:\/\//.test(t) || /@[\w.-]+\.\w+/.test(t)) return false;
  return true;
}

function collectTextNodes(root) {
  const list = [];
  if (!root || (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11)) return list;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !isTranslatableText(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      if (shouldSkipParent(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) list.push(n);
  return list;
}

function collectAttrTargets(root) {
  const targets = [];
  const all = (root && (root.nodeType === 1 || root.nodeType === 9))
    ? root.querySelectorAll('[placeholder], [title], [aria-label], [alt]')
    : [];
  all.forEach(el => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.hasAttribute('data-no-translate') || el.getAttribute('translate') === 'no') return;
    ATTR_TRANSLATABLE.forEach(attr => {
      const v = el.getAttribute(attr);
      if (v && isTranslatableText(v)) {
        targets.push({ el, attr, original: v });
      }
    });
  });
  return targets;
}

async function batchTranslate(unique, lang) {
  const items = Array.from(unique).map((text, i) => ({ id: String(i), text }));
  if (items.length === 0) return {};
  try {
    const res = await fetch('/api/translate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, target: lang, source: 'it' }),
    });
    const data = await res.json();
    const out = {};
    (data.results || []).forEach((r, idx) => {
      out[items[idx].text] = r.translated || items[idx].text;
    });
    return out;
  } catch {
    return {};
  }
}

function applyToTextNode(node, lang) {
  if (lang === 'it') {
    if (node.__tribuOrig != null) node.nodeValue = node.__tribuOrig;
    return;
  }
  const raw = node.nodeValue;
  if (!raw) return;
  const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const lead = m ? m[1] : '';
  const trail = m ? m[3] : '';
  const core = m ? m[2] : raw;
  if (!isTranslatableText(core)) return;
  // If the current text is ALREADY a translation we produced, leave it alone.
  // This prevents corrupting __tribuOrig with translated text when React reuses
  // DOM nodes during re-renders.
  if (isAlreadyTranslated(lang, core)) return;
  const key = `${lang}|${core}`;
  const translated = cache.get(key);
  if (translated && translated !== core) {
    const next = lead + translated + trail;
    if (node.nodeValue !== next) {
      if (node.__tribuOrig == null) node.__tribuOrig = raw;
      node.nodeValue = next;
    }
  }
}

function applyToAttrTarget({ el, attr, original }, lang) {
  if (lang === 'it') {
    const orig = el.__tribuOrigAttrs && el.__tribuOrigAttrs[attr];
    if (orig != null) el.setAttribute(attr, orig);
    return;
  }
  // Already-translated value? leave it (avoid corrupting stored original).
  if (isAlreadyTranslated(lang, original)) return;
  const key = `${lang}|${original}`;
  const translated = cache.get(key);
  if (translated && translated !== original) {
    if (!el.__tribuOrigAttrs) el.__tribuOrigAttrs = {};
    if (el.__tribuOrigAttrs[attr] == null) el.__tribuOrigAttrs[attr] = original;
    if (el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
  }
}

const OBSERVE_OPTS = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ATTR_TRANSLATABLE,
};

function reconnectObserver() {
  if (!observer) return;
  // discard records produced by our own writes, then resume observing
  observer.takeRecords();
  observer.observe(document.body, OBSERVE_OPTS);
}

/**
 * Apply ONLY cached translations (and IT restores) synchronously.
 * Disconnect/reconnect the observer around our writes to avoid self-trigger loops.
 * This is cheap (map lookups) and kills the flicker on React re-renders.
 */
function applyCached(lang, root = document.body) {
  if (!root) return;
  currentLang = lang;
  if (observer) observer.disconnect();
  try {
    const textNodes = collectTextNodes(root);
    textNodes.forEach(n => applyToTextNode(n, lang));
    const attrTargets = collectAttrTargets(root);
    attrTargets.forEach(t => applyToAttrTarget(t, lang));
  } finally {
    reconnectObserver();
  }
}

/**
 * Full pass: apply cached immediately, then fetch any missing strings via API
 * and apply them once resolved.
 */
async function runFull(lang, root = document.body) {
  if (!root) return;
  currentLang = lang;
  if (lang === 'it') {
    applyCached('it', root);
    return;
  }

  // 1) Apply what we already have (instant)
  applyCached(lang, root);

  // 2) Find missing strings (observer still connected here; that's fine — read-only)
  const textNodes = collectTextNodes(root);
  const attrTargets = collectAttrTargets(root);
  const missing = new Set();
  const collectMissing = (text) => {
    const core = (text || '').replace(/^\s+|\s+$/g, '');
    if (!isTranslatableText(core)) return;
    const key = `${lang}|${core}`;
    if (!cache.has(key) && !inflight.has(key)) missing.add(core);
  };
  textNodes.forEach(n => collectMissing(n.nodeValue));
  attrTargets.forEach(t => collectMissing(t.original));

  if (missing.size === 0) return;

  // 3) Fetch & cache
  const items = [...missing];
  items.forEach(text => inflight.set(`${lang}|${text}`, true));
  const map = await batchTranslate(items, lang);
  items.forEach(text => {
    const key = `${lang}|${text}`;
    inflight.delete(key);
    if (map[text]) rememberTranslation(lang, text, map[text]);
  });

  // 4) Re-apply (only if language is still the same)
  if (currentLang === lang) applyCached(lang, document.body);
}

let rafId = null;
function scheduleCacheApply(lang) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (currentLang === lang && lang !== 'it') applyCached(lang, document.body);
  });
}

let fetchTimer = null;
function scheduleFetch(lang) {
  if (fetchTimer) clearTimeout(fetchTimer);
  fetchTimer = setTimeout(() => {
    if (currentLang === lang && lang !== 'it') runFull(lang, document.body);
  }, 150);
}

export default function DomTranslator() {
  const { lang } = useT();
  const langRef = useRef(lang);

  // React to language changes
  useEffect(() => {
    langRef.current = lang;
    currentLang = lang;
    runFull(lang, document.body);
  }, [lang]);

  // Observe DOM mutations + periodic safety sweep
  useEffect(() => {
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        const l = langRef.current;
        if (l === 'it') return;
        let needs = false;
        for (const m of mutations) {
          if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) { needs = true; break; }
          if (m.type === 'characterData') { needs = true; break; }
          if (m.type === 'attributes') { needs = true; break; }
        }
        if (!needs) return;
        // Instant: re-apply cached translations (no flicker)
        scheduleCacheApply(l);
        // Debounced: fetch any brand-new strings
        scheduleFetch(l);
      });
      observer.observe(document.body, OBSERVE_OPTS);
    }

    // Safety-net sweep: runs on a fixed cadence regardless of mutation storms.
    // Applies cached translations instantly AND fetches any strings that the
    // debounced fetch may have repeatedly postponed (e.g. transient banner text
    // like "per mare" that only appears during auto-rotation).
    const sweep = setInterval(() => {
      const l = langRef.current;
      if (l && l !== 'it') runFull(l, document.body);
    }, 1800);

    return () => {
      clearInterval(sweep);
      if (observer) { observer.disconnect(); observer = null; }
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (fetchTimer) { clearTimeout(fetchTimer); fetchTimer = null; }
    };
  }, []);

  return null;
}
