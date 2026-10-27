/**
 * Colori per affiliato.
 * Il tema usa le scale Tailwind "ocean" (colore principale) e "coral"
 * (colore di accento) definite come variabili CSS in globals.css.
 * Da un singolo colore esadecimale generiamo tutta la scala 50-900.
 */

const STEPS = {
  50: ['w', 0.9], 100: ['w', 0.8], 200: ['w', 0.6], 300: ['w', 0.4], 400: ['w', 0.2],
  500: ['w', 0], 600: ['b', 0.2], 700: ['b', 0.35], 800: ['b', 0.5], 900: ['b', 0.72],
};

export function isHexColor(v) {
  return typeof v === 'string' && /^#?[0-9a-fA-F]{6}$/.test(v.trim());
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function mix(rgb, target, amount) {
  return rgb.map((c, i) => Math.round(c + (target[i] - c) * amount));
}

export function scaleFromHex(hex) {
  const base = hexToRgb(hex);
  const out = {};
  for (const [step, [dir, amt]] of Object.entries(STEPS)) {
    const rgb = mix(base, dir === 'w' ? [255, 255, 255] : [0, 0, 0], amt);
    out[step] = rgb.join(' ');
  }
  return out;
}

/** CSS da iniettare nel <head> per sovrascrivere i colori di default. */
export function tenantThemeCss(branding) {
  if (!branding) return '';
  const lines = [];
  if (isHexColor(branding.primaryColor)) {
    const s = scaleFromHex(branding.primaryColor);
    for (const [k, v] of Object.entries(s)) lines.push(`--ocean-${k}: ${v};`);
  }
  if (isHexColor(branding.accentColor)) {
    const s = scaleFromHex(branding.accentColor);
    for (const [k, v] of Object.entries(s)) lines.push(`--coral-${k}: ${v};`);
  }
  return lines.length ? `:root:root{${lines.join('')}}` : '';
}
