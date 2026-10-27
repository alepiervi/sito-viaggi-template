// Utility per gestire testo semplice vs HTML nei campi descrittivi (viaggi, pagine, itinerari)

const HTML_TAG_RE = /<\/?(p|div|br|ul|ol|li|h[1-6]|strong|b|em|i|u|span|a|mark|blockquote|table|img|font)\b[^>]*>/i;

export function looksLikeHtml(str) {
  if (!str || typeof str !== 'string') return false;
  return HTML_TAG_RE.test(str);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Converte testo semplice (con a capo) in HTML:
 * - righe vuote => nuovo paragrafo <p>
 * - singolo a capo => <br />
 */
export function plainToHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => `<p>${escapeHtml(b).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/** Restituisce sempre HTML valido, convertendo il testo semplice se necessario */
export function toHtml(value) {
  if (!value || typeof value !== 'string') return '';
  return looksLikeHtml(value) ? value : plainToHtml(value);
}

/** Come toHtml ma senza wrappare in paragrafi (per testi inline tipo recensioni) */
export function toInlineHtml(value) {
  if (!value || typeof value !== 'string') return '';
  if (looksLikeHtml(value)) return value;
  return escapeHtml(value).replace(/\n/g, '<br />');
}

/** Rimuove i tag HTML: utile per card, meta tag e testi di condivisione */
export function stripHtml(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
