/**
 * Registro delle funzioni (moduli) che il Super Admin può attivare o
 * disattivare per ogni affiliato.
 *
 * - `core: true`  -> sempre attivo, non si può spegnere
 * - `adminTabs`   -> voci della barra laterale del backend legate al modulo
 * - `api`         -> prefissi delle API (pubbliche e admin) bloccate se il modulo è spento
 * - `emptyPublic` -> risposta "vuota" per le API pubbliche di elenco, così il sito
 *                    pubblico semplicemente non mostra la sezione invece di andare in errore
 *
 * Questo file è importato sia dal server sia dal browser: niente import di Node qui.
 */

export const MODULES = [
  // ---- Sempre attivi ----
  { code: 'dashboard', label: 'Dashboard', core: true, adminTabs: ['dashboard'], api: [] },
  { code: 'viaggi', label: 'Viaggi e Categorie', core: true, adminTabs: ['trips', 'categories'], api: [] },
  { code: 'richieste', label: 'Richieste', core: true, adminTabs: ['leads'], api: [] },
  { code: 'footer', label: 'Footer', core: true, adminTabs: ['footer'], api: [] },
  { code: 'impostazioni', label: 'Impostazioni', core: true, adminTabs: ['settings'], api: [] },

  // ---- Attivabili ----
  {
    code: 'hero_banner', label: 'Hero Banner', description: 'Banner a tutta pagina in cima alla homepage',
    adminTabs: ['hero'], api: ['hero-banners', 'admin/hero-banners'],
    emptyPublic: { 'hero-banners': [] },
  },
  {
    code: 'homepage', label: 'Homepage a schede', description: 'Schede di viaggi personalizzabili in homepage',
    adminTabs: ['homepage'], api: ['homepage', 'admin/homepage'],
    emptyPublic: { 'homepage/tabs': [] },
  },
  {
    code: 'slider_promo', label: 'Slider Promo', description: 'Slider promozionale in homepage',
    adminTabs: ['slider'], api: ['slides', 'admin/slides'],
    emptyPublic: { slides: [] },
  },
  {
    code: 'blog', label: 'Blog', description: 'Articoli e pagina blog pubblica',
    adminTabs: ['blog'], api: ['blog', 'admin/blog'],
    emptyPublic: { blog: { posts: [], total: 0, page: 1, pages: 0 } },
  },
  {
    code: 'pagine', label: 'Pagine personalizzate', description: 'Pagine libere (chi siamo, privacy, pagine di viaggi)',
    adminTabs: ['pages'], api: ['pages', 'admin/pages'],
  },
  {
    code: 'recensioni', label: 'Recensioni', description: 'Recensioni dei clienti in homepage',
    adminTabs: ['testimonials'], api: ['testimonials', 'admin/testimonials'],
    emptyPublic: { testimonials: [] },
  },
  {
    code: 'newsletter', label: 'Newsletter', description: 'Iscrizioni newsletter e canali WhatsApp/Telegram',
    adminTabs: ['newsletter'], api: ['newsletter', 'admin/newsletter'],
    emptyPublic: { 'newsletter/settings': { whatsappChannel: '', telegramChannel: '' } },
  },
  {
    code: 'landing_promo', label: 'Landing Promo', description: 'Landing page promozionali dedicate',
    adminTabs: ['promos'], api: ['promos', 'admin/promos'],
  },
  {
    code: 'preventivi', label: 'Preventivi', description: 'Preventivi online con link da inviare al cliente',
    adminTabs: ['quotes'], api: ['quotes', 'admin/quotes'],
  },
  {
    code: 'preventivo_rapido', label: 'Preventivo rapido', description: 'Wizard "preventivo rapido" in homepage',
    adminTabs: [], api: ['quick-quote'],
  },
  {
    code: 'clienti_buoni', label: 'Area clienti, Inviti e Buoni', description: 'Registrazione clienti, area riservata, inviti e buoni da 50 €',
    adminTabs: ['customers'], api: ['customer', 'admin/customers', 'admin/referrals', 'admin/vouchers'],
  },
  {
    code: 'social_builder', label: 'Creatività Social', description: 'Generatore di grafiche social dai viaggi',
    adminTabs: [], api: [],
  },
  {
    code: 'multilingua', label: 'Multilingua (traduzione AI)', description: 'Sito in italiano e inglese con traduzione automatica (consuma crediti AI)',
    adminTabs: [], api: ['translate'],
  },
  {
    code: 'aspetto', label: 'Personalizza colori e logo', description: "L'admin può cambiare colori, logo e slogan del sito",
    adminTabs: ['appearance'], api: [],
  },
  {
    code: 'sezioni_home', label: 'Ordine sezioni homepage', description: "L'admin può spostare e nascondere le sezioni della homepage",
    adminTabs: ['appearance'], api: [],
  },
  {
    code: 'whatsapp_bot', label: 'WhatsApp Bot', description: 'Risposte automatiche AI su WhatsApp Business. Usa il numero configurato sul server: per ora attivalo solo sul sito master',
    adminTabs: ['whatsapp'], api: ['whatsapp', 'admin/whatsapp'],
  },
];

export const MODULE_CODES = MODULES.map((m) => m.code);
export const CORE_MODULES = MODULES.filter((m) => m.core).map((m) => m.code);
export const OPTIONAL_MODULES = MODULES.filter((m) => !m.core).map((m) => m.code);

/** Pacchetti predefiniti: il Super Admin può poi aggiungere/togliere singoli moduli. */
export const PLANS = {
  base: {
    label: 'Base',
    modules: ['hero_banner', 'homepage', 'pagine', 'recensioni', 'preventivo_rapido', 'aspetto'],
  },
  plus: {
    label: 'Plus',
    modules: ['hero_banner', 'homepage', 'slider_promo', 'pagine', 'recensioni', 'preventivo_rapido',
      'blog', 'landing_promo', 'newsletter', 'social_builder', 'aspetto', 'sezioni_home'],
  },
  completo: {
    label: 'Completo',
    // il WhatsApp Bot resta fuori finché ogni affiliato non avrà il proprio numero
    modules: OPTIONAL_MODULES.filter((c) => c !== 'whatsapp_bot'),
  },
};

/** Moduli effettivamente attivi di un tenant (core sempre inclusi). */
export function activeModules(tenant) {
  const enabled = Array.isArray(tenant?.modules) ? tenant.modules : [];
  return [...new Set([...CORE_MODULES, ...enabled.filter((c) => MODULE_CODES.includes(c))])];
}

export function isModuleActive(tenant, code) {
  if (CORE_MODULES.includes(code)) return true;
  return Array.isArray(tenant?.modules) && tenant.modules.includes(code);
}

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(prefix + '/');
}

/** Restituisce il modulo che "possiede" un percorso API, oppure null. */
export function moduleForApiPath(pathString) {
  for (const m of MODULES) {
    if (m.core) continue;
    if (m.api.some((p) => matchesPrefix(pathString, p))) return m;
  }
  return null;
}

/** Voci della sidebar admin visibili per il tenant. */
export function visibleAdminTabs(modules) {
  const active = new Set(modules);
  const allowed = new Set();
  const owned = new Set();
  for (const m of MODULES) {
    for (const tab of m.adminTabs) {
      owned.add(tab);
      if (active.has(m.code)) allowed.add(tab);
    }
  }
  return (tabId) => !owned.has(tabId) || allowed.has(tabId);
}
