/**
 * Sezioni della homepage che l'admin può riordinare e nascondere.
 * L'hero resta sempre in cima. Una sezione legata a un modulo spento
 * dallo sviluppatore non compare mai, anche se l'admin la attiva.
 * (File usato sia dal server sia dal browser.)
 */
export const HOME_SECTIONS = [
  { id: 'slider', label: 'Slider promozionale', module: 'slider_promo' },
  { id: 'viaggi', label: 'Viaggi in evidenza' },
  { id: 'categorie', label: 'Categorie' },
  { id: 'chi_siamo', label: 'Perché sceglierci' },
  { id: 'recensioni', label: 'Recensioni', module: 'recensioni' },
  { id: 'whatsapp', label: 'Banner WhatsApp' },
  { id: 'newsletter', label: 'Newsletter e canali', module: 'newsletter' },
];

const IDS = HOME_SECTIONS.map((s) => s.id);

/** Normalizza quanto salvato: ordine valido, nessun doppione, sezioni nuove in fondo. */
export function normalizeHomeSections(saved) {
  const list = Array.isArray(saved) ? saved : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = typeof item === 'string' ? item : item?.id;
    if (!IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, visible: typeof item === 'object' ? item.visible !== false : true });
  }
  for (const id of IDS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}

/** Layout effettivo considerando i moduli attivi. */
export function effectiveHomeLayout(saved, modules = []) {
  const active = new Set(modules);
  return normalizeHomeSections(saved).map((s, index) => {
    const def = HOME_SECTIONS.find((d) => d.id === s.id);
    const allowed = !def.module || active.has(def.module);
    return { ...s, label: def.label, module: def.module || null, allowed, show: allowed && s.visible, order: index + 1 };
  });
}
