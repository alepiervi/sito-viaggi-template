'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download, RefreshCw, Palette, Type, Layers, Image as ImageIcon,
  Copy, MapPin, Tag, Move, RotateCcw, Sliders, Square
} from 'lucide-react';
import html2canvas from 'html2canvas';

// ==========================================
// FEATURE ICONS
// ==========================================
const SVG_ICONS = {
  ship: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M8 40l4-16h40l4 16H8z" fill="none" stroke={c} strokeWidth="3.5" strokeLinejoin="round"/><path d="M24 24V14h16v10" fill="none" stroke={c} strokeWidth="3.5"/><line x1="32" y1="14" x2="32" y2="8" stroke={c} strokeWidth="3.5"/><path d="M32 8l10 6" fill="none" stroke={c} strokeWidth="3"/><path d="M4 48c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0 8-3 12 0" fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round"/></svg>),
  plane: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M52 14L28 28l-14-6-4 4 10 10-8 8-6-2-4 4 10 6 6 10 4-4-2-6 8-8 10 10 4-4-6-14 14-24 2-2-2-2z" fill={c}/></svg>),
  bed: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M8 24v26" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M8 46h48v8" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none"/><path d="M8 36h48a8 8 0 018 8v2" stroke={c} strokeWidth="4" fill="none" strokeLinecap="round"/><rect x="14" y="26" width="16" height="10" rx="4" fill={c} opacity="0.9"/></svg>),
  people: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="22" cy="22" r="9" fill={c}/><circle cx="44" cy="24" r="8" fill={c} opacity="0.9"/><path d="M6 52c0-9 7-16 16-16s16 7 16 16" fill={c}/><path d="M36 52c0-7 4-13 12-13 7 0 12 5 12 13" fill={c} opacity="0.9"/></svg>),
  calendar: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="10" y="14" width="44" height="40" rx="5" fill="none" stroke={c} strokeWidth="4"/><line x1="10" y1="26" x2="54" y2="26" stroke={c} strokeWidth="4"/><line x1="20" y1="8" x2="20" y2="18" stroke={c} strokeWidth="4" strokeLinecap="round"/><line x1="44" y1="8" x2="44" y2="18" stroke={c} strokeWidth="4" strokeLinecap="round"/><circle cx="22" cy="38" r="4" fill={c}/><circle cx="42" cy="38" r="4" fill={c}/></svg>),
  euro: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M44 18a18 18 0 100 28" fill="none" stroke={c} strokeWidth="4.5" strokeLinecap="round"/><line x1="12" y1="28" x2="38" y2="28" stroke={c} strokeWidth="4.5" strokeLinecap="round"/><line x1="12" y1="38" x2="34" y2="38" stroke={c} strokeWidth="4.5" strokeLinecap="round"/></svg>),
  clock: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="22" fill="none" stroke={c} strokeWidth="4"/><path d="M32 18v15l10 7" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  mappin: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M32 6C22 6 14 14 14 24c0 14 18 34 18 34s18-20 18-34C50 14 42 6 32 6z" fill="none" stroke={c} strokeWidth="4"/><circle cx="32" cy="24" r="7" fill={c}/></svg>),
  utensils: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M18 8v14c0 4 4 7 8 7v27" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M42 8c0 0 6 3 6 14s-6 13-6 13v21" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/></svg>),
  shield: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M32 6L10 16v16c0 14 10 22 22 28 12-6 22-14 22-28V16L32 6z" fill="none" stroke={c} strokeWidth="4"/><path d="M24 32l6 6 12-12" fill="none" stroke={c} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  headphones: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M14 34V28c0-10 8-18 18-18s18 8 18 18v6" fill="none" stroke={c} strokeWidth="4"/><rect x="8" y="32" width="10" height="18" rx="4" fill={c}/><rect x="46" y="32" width="10" height="18" rx="4" fill={c}/></svg>),
  hotel: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="12" width="40" height="44" rx="2" fill="none" stroke={c} strokeWidth="4"/><rect x="26" y="40" width="12" height="16" rx="1" fill="none" stroke={c} strokeWidth="3.5"/><rect x="18" y="18" width="8" height="7" rx="1" fill={c} opacity="0.7"/><rect x="38" y="18" width="8" height="7" rx="1" fill={c} opacity="0.7"/></svg>),
  beach: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><line x1="32" y1="8" x2="32" y2="56" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M32 8c-16 0-22 14-22 14h44S48 8 32 8z" fill={c} opacity="0.75"/><path d="M4 56h56" stroke={c} strokeWidth="4" strokeLinecap="round"/></svg>),
  cocktail: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M14 12h36L32 36v18" fill="none" stroke={c} strokeWidth="4" strokeLinejoin="round"/><line x1="22" y1="54" x2="42" y2="54" stroke={c} strokeWidth="4" strokeLinecap="round"/><circle cx="42" cy="18" r="4" fill={c} opacity="0.7"/></svg>),
  pool: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M4 42c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M4 52c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><circle cx="22" cy="16" r="6" fill="none" stroke={c} strokeWidth="4"/></svg>),
  spa: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M32 10c0 0-18 10-18 28 0 10 8 18 18 18s18-8 18-18C50 20 32 10 32 10z" fill="none" stroke={c} strokeWidth="4"/><line x1="32" y1="22" x2="32" y2="44" stroke={c} strokeWidth="3.5" strokeLinecap="round"/></svg>),
  sun: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="11" fill={c}/><g stroke={c} strokeWidth="4" strokeLinecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/><line x1="13" y1="51" x2="19" y2="45"/><line x1="45" y1="19" x2="51" y2="13"/></g></svg>),
  heart: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M32 56S6 38 6 22c0-8 6-14 14-14 5 0 9 2.5 12 7 3-4.5 7-7 12-7 8 0 14 6 14 14 0 16-26 34-26 34z" fill="none" stroke={c} strokeWidth="4"/></svg>),
  wifi: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M10 26c12-12 32-12 44 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M18 36c8-8 20-8 28 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><path d="M26 46c4-4 8-4 12 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"/><circle cx="32" cy="52" r="3" fill={c}/></svg>),
  bus: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="10" width="40" height="38" rx="5" fill="none" stroke={c} strokeWidth="4"/><line x1="12" y1="28" x2="52" y2="28" stroke={c} strokeWidth="3.5"/><circle cx="22" cy="52" r="4" fill={c}/><circle cx="42" cy="52" r="4" fill={c}/></svg>),
  luggage: (c = '#fff') => (<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="16" y="20" width="32" height="32" rx="3" fill="none" stroke={c} strokeWidth="4"/><path d="M24 20V14a4 4 0 014-4h8a4 4 0 014 4v6" fill="none" stroke={c} strokeWidth="4"/></svg>),
};

const ICON_LIST = [
  { id: 'ship', label: 'Nave' }, { id: 'plane', label: 'Aereo' }, { id: 'bed', label: 'Letto / Cabina' },
  { id: 'people', label: 'Persone' }, { id: 'calendar', label: 'Calendario' }, { id: 'euro', label: 'Euro / Prezzo' },
  { id: 'clock', label: 'Durata' }, { id: 'mappin', label: 'Località' }, { id: 'utensils', label: 'Pasti' },
  { id: 'shield', label: 'Assicurazione' }, { id: 'headphones', label: 'Assistenza' }, { id: 'hotel', label: 'Hotel' },
  { id: 'beach', label: 'Spiaggia' }, { id: 'cocktail', label: 'All Inclusive' }, { id: 'pool', label: 'Piscina' },
  { id: 'spa', label: 'Spa' }, { id: 'sun', label: 'Sole & Mare' }, { id: 'heart', label: 'Luna di Miele' },
  { id: 'wifi', label: 'Wi-Fi' }, { id: 'bus', label: 'Bus / Transfer' }, { id: 'luggage', label: 'Bagaglio' },
];

const FORMATS = {
  instagram: { width: 1080, height: 1080, label: 'Instagram', desc: '1080×1080' },
  whatsapp: { width: 800, height: 800, label: 'WhatsApp', desc: '800×800' },
  story: { width: 1080, height: 1920, label: 'Story / Reel', desc: '1080×1920' },
  facebook: { width: 1200, height: 628, label: 'Facebook', desc: '1200×628' },
  landscape: { width: 1920, height: 1080, label: 'Orizzontale', desc: '1920×1080' },
};

const FONTS = [
  { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap' },
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap' },
  { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap' },
  { name: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap' },
  { name: 'Bebas Neue', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap' },
  { name: 'Anton', url: 'https://fonts.googleapis.com/css2?family=Anton&display=swap' },
  { name: 'Archivo Black', url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap' },
  { name: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&display=swap' },
  { name: 'Pacifico', url: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap' },
  { name: 'Dancing Script', url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&display=swap' },
  { name: 'Caveat', url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&display=swap' },
];

const DEFAULT_POSITIONS = {
  decor0: { x: 36, y: 968 }, decor1: { x: 120, y: 1000 }, decor2: { x: 700, y: 120 }, decor3: { x: 560, y: 980 },
  photo: { x: 300, y: 250 },
  logo: { x: 24, y: 22 }, title: { x: 296, y: 48 }, banner: { x: 300, y: 176 },
  features: { x: 26, y: 462 }, offer: { x: 60, y: 712 }, itinerary: { x: 700, y: 560 },
  cta: { x: 150, y: 946 }, phone: { x: 60, y: 1014 }, tagline: { x: 600, y: 1022 },
};

const DEFAULT_SIZES = {
  title: 84, banner: 36, pillText: 28, pillIcon: 66, price: 96, priceSuffix: 32,
  itinTitle: 28, itinItem: 23, cta: 30, phone: 44, tagline: 28,
};

const PhoneGlyph = ({ color = '#fff', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

function ensureLink(id, href) {
  if (typeof document === 'undefined' || !href) return;
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('link'); el.id = id; el.rel = 'stylesheet'; document.head.appendChild(el); }
  if (el.href !== href) el.href = href;
}

export default function SocialCreativeBuilder({ trip, onClose }) {
  const previewRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('instagram');
  const [footerData, setFooterData] = useState(null);

  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);

  const [content, setContent] = useState({
    title: (trip?.title || trip?.destination || 'TITOLO VIAGGIO').toUpperCase(),
    dateBanner: trip?.period ? trip.period.toUpperCase() : 'DAL 15 AL 22 MAGGIO',
    features: [
      { icon: 'ship', text: 'Da Civitavecchia' },
      { icon: 'bed', text: 'Cabina interna doppia' },
      { icon: 'people', text: '€748 a coppia' },
    ],
    offerLabel: 'OFFERTA SPECIALE!',
    price: trip?.priceFrom ? `€${trip.priceFrom}` : '€748',
    priceSuffix: 'a coppia',
    itineraryTitle: 'ITINERARIO',
    itineraryText: 'Civitavecchia\nNavigazione\nMykonos\nKusadasi\nMarmaris\nNavigazione\nNapoli\nCivitavecchia',
    ctaText: 'Contattaci per prenotare!',
    phone: '',
    tagline: 'Il tuo viaggio, la nostra passione!',
    imageUrl: trip?.cardImage || trip?.images?.[0] || '',
    logoUrl: '/logo.png',
  });

  // Per-element font overrides ('' = usa font principale)
  const [elFont, setElFont] = useState({
    title: '', banner: '', pillText: '', offerLabel: '', price: '', priceSuffix: '',
    itinTitle: '', itinItem: '', cta: '', phone: '', tagline: '',
  });
  // Per-element color overrides ('' = usa colore automatico del box)
  const [elColor, setElColor] = useState({
    title: '', banner: '', pillText: '', offerLabel: '', price: '', priceSuffix: '',
    itinTitle: '', itinItem: '', cta: '', phone: '', tagline: '',
  });

  useEffect(() => { fetch('/api/footer').then(r => r.json()).then(d => setFooterData(d)).catch(() => {}); }, []);
  useEffect(() => { if (footerData) setContent(prev => ({ ...prev, phone: prev.phone || footerData.contactInfo?.whatsappNumber || footerData.phone || '375 827 0755' })); }, [footerData]);

  const [styles, setStyles] = useState({
    bgTop: '#2C9BE2', bgBottom: '#39C0D6',
    primaryColor: '#0A3D91', accentColor: '#F47A20',
    titleColor: '#FFFFFF', footerColor: '#0A3D91',
    overlay: 0,
    fontMain: 'Poppins', fontScript: 'Dancing Script',
    customFontName: '', customFontUrl: '',
    bannerVariant: 'tilted', pillVariant: 'classic', itinVariant: 'split', offerVariant: 'classic',
    logoShape: 'circle', logoBg: '#FFFFFF', logoSize: 248,
    decor: [
      { show: false, color: '#0A3D91', w: 560, h: 130, radius: 24 },
      { show: false, color: '#F47A20', w: 320, h: 96, radius: 20 },
      { show: false, color: '#ffffff', w: 380, h: 84, radius: 18 },
    ],
    showLogo: true, showDateBanner: true, showImage: true, showFeatures: true,
    showOffer: true, showItinerary: true, showCta: true, showPhone: true, showTagline: true,
  });

  // Load fonts (main, script, custom + per-element selections)
  useEffect(() => { const f = FONTS.find(x => x.name === styles.fontMain); if (f) ensureLink('scb-font-main', f.url); }, [styles.fontMain]);
  useEffect(() => { const f = FONTS.find(x => x.name === styles.fontScript); if (f) ensureLink('scb-font-script', f.url); }, [styles.fontScript]);
  useEffect(() => { if (styles.customFontUrl) ensureLink('scb-font-custom', styles.customFontUrl); }, [styles.customFontUrl]);
  useEffect(() => {
    Object.values(elFont).filter(Boolean).forEach((name) => {
      const f = FONTS.find(x => x.name === name);
      if (f) ensureLink('scb-font-' + name.replace(/\s+/g, '-'), f.url);
    });
  }, [elFont]);

  const format = FORMATS[selectedFormat];
  const previewScale = Math.min(460 / format.width, 560 / format.height);
  const D = Math.min(format.width, format.height);
  const s = D / 1080;
  const px = (v) => Math.round(v * s);
  const offsetX = (format.width - D) / 2;
  const offsetY = (format.height - D) / 2;

  const stops = content.itineraryText.split('\n').map(v => v.trim()).filter(Boolean);
  const activeFeatures = content.features.filter(f => f.text && f.text.trim());
  const shadow = '0 10px 30px rgba(0,0,0,0.25)';

  const activeMainFont = (styles.customFontName && styles.customFontUrl) ? styles.customFontName : styles.fontMain;
  const mainFF = `'${activeMainFont}', 'Inter', system-ui, sans-serif`;
  const scriptFF = `'${styles.fontScript}', cursive`;

  // Resolve per-element font family ('' = fallback)
  const elFF = (k, fallback) => (elFont[k] ? `'${elFont[k]}', sans-serif` : fallback);
  // Resolve per-element color ('' = automatic/box default)
  const elC = (k, fallback) => (elColor[k] || fallback);

  const updateFeature = (i, key, val) => setContent(prev => { const features = [...prev.features]; features[i] = { ...features[i], [key]: val }; return { ...prev, features }; });
  const updateDecor = (i, key, val) => setStyles(prev => { const decor = prev.decor.map((d, idx) => idx === i ? { ...d, [key]: val } : d); return { ...prev, decor }; });
  const setSize = (k, v) => setSizes(prev => ({ ...prev, [k]: v }));
  const setEF = (k, v) => setElFont(prev => ({ ...prev, [k]: v }));
  const setEC = (k, v) => setElColor(prev => ({ ...prev, [k]: v }));
  const onLogoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setContent(prev => ({ ...prev, logoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const startDrag = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const orig = positions[id];
    const f = s * previewScale;
    const move = (ev) => setPositions(p => ({ ...p, [id]: { x: Math.round(orig.x + (ev.clientX - startX) / f), y: Math.round(orig.y + (ev.clientY - startY) / f) } }));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const wrap = (id, width, children) => (
    <div className="scb-block" onPointerDown={(e) => startDrag(e, id)} style={{ position: 'absolute', left: px(positions[id].x), top: px(positions[id].y), width: width ? px(width) : 'auto', touchAction: 'none', userSelect: 'none' }}>
      {children}
    </div>
  );

  const generateImage = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, width: format.width, height: format.height });
      const link = document.createElement('a');
      link.download = `${(content.title || 'locandina').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedFormat}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) { console.error(e); alert('Errore nella generazione. Se usi un URL immagine esterno, assicurati che supporti il CORS.'); }
    finally { setIsGenerating(false); }
  };

  const copyToClipboard = async () => {
    if (!previewRef.current) return;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, allowTaint: true, width: format.width, height: format.height });
      canvas.toBlob(async (blob) => { if (blob) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('Immagine copiata!'); } });
    } catch (e) { alert('Errore nella copia.'); }
  };

  const PhoneCircle = ({ d, bg, icon }) => (
    <div style={{ width: d, height: d, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <PhoneGlyph color={icon} size={Math.round(d * 0.55)} />
    </div>
  );

  // ===== Variant renderers =====
  const renderBanner = () => {
    const v = styles.bannerVariant;
    const tStyle = { fontSize: px(sizes.banner), fontWeight: 900, color: elC('banner', '#fff'), textTransform: 'uppercase', letterSpacing: px(1), fontFamily: elFF('banner', mainFF) };
    if (v === 'pill') return <div style={{ display: 'inline-block', background: styles.accentColor, borderRadius: 999, padding: `${px(9)}px ${px(30)}px`, boxShadow: shadow }}><span style={tStyle}>{content.dateBanner}</span></div>;
    if (v === 'outline') return <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.95)', border: `${px(4)}px solid ${styles.accentColor}`, borderRadius: px(10), padding: `${px(7)}px ${px(26)}px`, boxShadow: shadow }}><span style={{ ...tStyle, color: elC('banner', styles.accentColor) }}>{content.dateBanner}</span></div>;
    if (v === 'tab') return <div style={{ display: 'inline-block', background: styles.accentColor, borderRadius: `${px(4)}px ${px(24)}px ${px(24)}px ${px(4)}px`, padding: `${px(9)}px ${px(30)}px`, boxShadow: shadow }}><span style={tStyle}>{content.dateBanner}</span></div>;
    return <div style={{ display: 'inline-block', background: styles.accentColor, transform: 'rotate(-2.5deg)', borderRadius: px(10), padding: `${px(8)}px ${px(26)}px`, boxShadow: shadow }}><span style={tStyle}>{content.dateBanner}</span></div>;
  };

  const pillColors = () => {
    const v = styles.pillVariant;
    if (v === 'solid') return { bg: styles.primaryColor, border: 'none', circle: '#fff', icon: styles.primaryColor, text: '#fff' };
    if (v === 'accent') return { bg: styles.accentColor, border: 'none', circle: '#fff', icon: styles.accentColor, text: '#fff' };
    if (v === 'outline') return { bg: 'rgba(255,255,255,0.16)', border: `${px(3)}px solid #fff`, circle: styles.accentColor, icon: '#fff', text: '#fff' };
    return { bg: '#fff', border: 'none', circle: styles.accentColor, icon: '#fff', text: styles.primaryColor };
  };

  const renderItinerary = () => {
    const v = styles.itinVariant;
    const headerBg = v === 'split' ? styles.accentColor : (v === 'splitBlue' ? styles.primaryColor : 'transparent');
    const bodyBg = v === 'solid' ? styles.primaryColor : '#fff';
    const itemColor = v === 'solid' ? '#fff' : styles.primaryColor;
    const numBg = v === 'solid' ? '#fff' : styles.primaryColor;
    const numColor = v === 'solid' ? styles.primaryColor : '#fff';
    const headerColor = '#fff';
    return (
      <div style={{ borderRadius: px(20), overflow: 'hidden', boxShadow: shadow, width: '100%', background: bodyBg }}>
        <div style={{ background: headerBg, padding: `${px(8)}px ${px(12)}px`, textAlign: 'center' }}>
          <span style={{ fontSize: px(sizes.itinTitle), fontWeight: 900, color: elC('itinTitle', v === 'solid' ? '#fff' : headerColor), textTransform: 'uppercase', letterSpacing: px(1), fontFamily: elFF('itinTitle', mainFF) }}>{content.itineraryTitle}</span>
        </div>
        <div style={{ padding: `${px(10)}px ${px(14)}px`, display: 'flex', flexDirection: 'column', gap: px(3) }}>
          {stops.map((st, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
              <div style={{ width: px(28), height: px(28), borderRadius: '50%', background: numBg, color: numColor, fontWeight: 900, fontSize: px(14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: px(sizes.itinItem), fontWeight: 700, color: elC('itinItem', itemColor), lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: elFF('itinItem', mainFF) }}>{st}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOffer = () => {
    const v = styles.offerVariant;
    let ribbonBg = styles.primaryColor, ribbonColor = '#fff', ribbonBorder = 'none', priceBg = styles.accentColor, priceColor = '#fff', priceBorder = 'none';
    if (v === 'invert') { ribbonBg = styles.accentColor; priceBg = styles.primaryColor; }
    if (v === 'outline') { ribbonBg = 'rgba(255,255,255,0.95)'; ribbonColor = styles.accentColor; ribbonBorder = `${px(3)}px solid ${styles.accentColor}`; priceBg = '#fff'; priceColor = styles.primaryColor; priceBorder = `${px(4)}px solid ${styles.accentColor}`; }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: px(10) }}>
        {content.offerLabel && (
          <div style={{ background: ribbonBg, color: elC('offerLabel', ribbonColor), border: ribbonBorder, fontWeight: 900, fontSize: px(26), padding: `${px(7)}px ${px(20)}px`, borderRadius: 999, textTransform: 'uppercase', letterSpacing: px(1), boxShadow: shadow, fontFamily: elFF('offerLabel', mainFF) }}>✦ {content.offerLabel} ✦</div>
        )}
        <div style={{ background: priceBg, border: priceBorder, borderRadius: px(20), padding: `${px(8)}px ${px(34)}px ${px(12)}px`, textAlign: 'center', boxShadow: shadow }}>
          <div style={{ fontSize: px(sizes.price), fontWeight: 900, color: elC('price', priceColor), lineHeight: 0.95, textShadow: priceColor === '#fff' ? '2px 2px 6px rgba(0,0,0,0.25)' : 'none', fontFamily: elFF('price', mainFF) }}>{content.price}</div>
          {content.priceSuffix && <div style={{ fontSize: px(sizes.priceSuffix), fontWeight: 800, color: elC('priceSuffix', priceColor), marginTop: px(2), fontFamily: elFF('priceSuffix', mainFF) }}>{content.priceSuffix}</div>}
        </div>
      </div>
    );
  };

  const pc = pillColors();

  return (
    <div className="h-full overflow-auto">
      <style>{`.scb-block{cursor:grab;} .scb-block:active{cursor:grabbing;} .scb-block:hover{outline:2px dashed rgba(255,255,255,0.95); outline-offset:3px;}`}</style>
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ===== CONTROLS ===== */}
        <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Layers className="w-4 h-4" /> Formato</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(FORMATS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setSelectedFormat(key)} className={`p-2 rounded-lg border-2 text-center transition-all ${selectedFormat === key ? 'border-ocean-600 bg-ocean-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium text-[10px] leading-tight">{fmt.label}</p><p className="text-[9px] text-gray-400">{fmt.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Foto di sfondo</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={content.imageUrl} onChange={(e) => setContent({ ...content, imageUrl: e.target.value })} placeholder="URL della foto di sfondo..." className="text-xs" />
              {trip?.images && trip.images.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {trip.images.map((img, i) => (
                    <button key={i} onClick={() => setContent({ ...content, imageUrl: img })} className={`flex-shrink-0 w-12 h-9 rounded overflow-hidden border-2 transition-all ${content.imageUrl === img ? 'border-ocean-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2"><Label className="text-[10px] w-24">Velo scuro {styles.overlay}%</Label><input type="range" min="0" max="70" value={styles.overlay} onChange={(e) => setStyles({ ...styles, overlay: Number(e.target.value) })} className="flex-1" /></div>
            </CardContent>
          </Card>

          {/* LOGO */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logo</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={content.logoUrl} onChange={(e) => setContent({ ...content, logoUrl: e.target.value })} placeholder="URL del logo (es. /logo.png)" className="text-xs h-8" />
              <div className="flex items-center gap-2">
                <label className="text-[11px] cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-gray-50 hover:bg-gray-100">
                  <ImageIcon className="w-3.5 h-3.5" /> Carica logo
                  <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
                </label>
                {content.logoUrl && <div className="w-8 h-8 rounded border bg-white flex items-center justify-center overflow-hidden"><img src={content.logoUrl} alt="" className="max-w-full max-h-full object-contain" /></div>}
                <button onClick={() => setContent({ ...content, logoUrl: '/logo.png' })} className="text-[10px] text-ocean-600 hover:underline ml-auto">Logo predefinito</button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                <div><Label className="text-[10px]">Forma sotto al logo</Label>
                  <select value={styles.logoShape} onChange={(e) => setStyles({ ...styles, logoShape: e.target.value })} className="text-xs border rounded-md h-8 px-1 w-full">
                    <option value="circle">Cerchio</option>
                    <option value="rounded">Quadrato arrotondato</option>
                    <option value="square">Quadrato</option>
                    <option value="none">Nessuna (solo logo)</option>
                  </select>
                </div>
                <div><Label className="text-[10px]">Colore forma</Label>
                  <div className="flex items-center gap-2 h-8">
                    <input type="color" value={styles.logoBg} onChange={(e) => setStyles({ ...styles, logoBg: e.target.value })} disabled={styles.logoShape === 'none'} className="w-7 h-7 rounded cursor-pointer border disabled:opacity-40" />
                    <span className="text-[10px] text-gray-500">{styles.logoShape === 'none' ? 'n/d' : styles.logoBg}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2"><Label className="text-[10px] w-20">Dimensione</Label><input type="range" min="120" max="420" value={styles.logoSize} onChange={(e) => setStyles({ ...styles, logoSize: Number(e.target.value) })} className="flex-1" /><span className="text-[9px] text-gray-400 w-7 text-right">{styles.logoSize}</span></div>
            </CardContent>
          </Card>

          {/* FONT */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Type className="w-4 h-4" /> Font</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Font principale</Label>
                  <select value={styles.fontMain} onChange={(e) => setStyles({ ...styles, fontMain: e.target.value })} className="text-xs border rounded-md h-8 px-1 w-full">
                    {FONTS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
                <div><Label className="text-[10px]">Font claim (corsivo)</Label>
                  <select value={styles.fontScript} onChange={(e) => setStyles({ ...styles, fontScript: e.target.value })} className="text-xs border rounded-md h-8 px-1 w-full">
                    {FONTS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-1 border-t">
                <Label className="text-[10px] font-semibold">Font esterno (Google Fonts)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input value={styles.customFontName} onChange={(e) => setStyles({ ...styles, customFontName: e.target.value })} placeholder="Nome font (es. Lobster)" className="text-xs h-8" />
                  <Input value={styles.customFontUrl} onChange={(e) => setStyles({ ...styles, customFontUrl: e.target.value })} placeholder="URL CSS @font-face" className="text-xs h-8" />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Incolla l'URL CSS di Google Fonts (es. https://fonts.googleapis.com/css2?family=Lobster&display=swap) e il nome esatto del font.</p>
              </div>
            </CardContent>
          </Card>

          {/* PER-ELEMENT FONT & COLOR */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Palette className="w-4 h-4" /> Font & Colore per ogni elemento</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-[10px] text-gray-400">Per ogni testo scegli un font e un colore liberi. Lascia "Auto" per usare il font principale e il colore predefinito del box.</p>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1.5 items-center">
                <span className="text-[9px] font-semibold text-gray-400 uppercase">Elemento</span>
                <span className="text-[9px] font-semibold text-gray-400 uppercase text-center">Font</span>
                <span className="text-[9px] font-semibold text-gray-400 uppercase text-center">Colore</span>
                {[
                  ['title', 'Titolo'], ['banner', 'Banner data'], ['pillText', 'Caratteristiche'],
                  ['offerLabel', 'Etichetta offerta'], ['price', 'Prezzo'], ['priceSuffix', 'Sotto prezzo'],
                  ['itinTitle', 'Titolo elenco'], ['itinItem', 'Voci elenco'], ['cta', 'CTA'],
                  ['phone', 'Telefono'], ['tagline', 'Claim'],
                ].map(([k, label]) => (
                  <Fragment key={k}>
                    <Label className="text-[10px] truncate">{label}</Label>
                    <select value={elFont[k]} onChange={(e) => setEF(k, e.target.value)} className="text-[10px] border rounded-md h-7 px-1 w-28">
                      <option value="">Auto</option>
                      {FONTS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <input type="color" value={elColor[k] || '#000000'} onChange={(e) => setEC(k, e.target.value)} className="w-6 h-6 rounded cursor-pointer border" title="Scegli colore" />
                      <button onClick={() => setEC(k, '')} className={`text-[9px] px-1 rounded ${elColor[k] ? 'text-ocean-600 hover:underline' : 'text-gray-300'}`} title="Ripristina colore automatico">auto</button>
                    </div>
                  </Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SIZES */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Sliders className="w-4 h-4" /> Dimensioni testo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {[
                  { k: 'title', label: 'Titolo', min: 30, max: 140 },
                  { k: 'banner', label: 'Banner data', min: 16, max: 70 },
                  { k: 'pillText', label: 'Testo pill', min: 16, max: 46 },
                  { k: 'pillIcon', label: 'Icone pill', min: 36, max: 110 },
                  { k: 'price', label: 'Prezzo', min: 40, max: 160 },
                  { k: 'priceSuffix', label: 'Sotto prezzo', min: 16, max: 56 },
                  { k: 'itinTitle', label: 'Titolo elenco', min: 16, max: 56 },
                  { k: 'itinItem', label: 'Voci elenco', min: 14, max: 44 },
                  { k: 'cta', label: 'CTA', min: 16, max: 52 },
                  { k: 'phone', label: 'Telefono', min: 20, max: 80 },
                  { k: 'tagline', label: 'Claim', min: 14, max: 56 },
                ].map(({ k, label, min, max }) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <Label className="text-[10px] w-20 flex-shrink-0">{label}</Label>
                    <input type="range" min={min} max={max} value={sizes[k]} onChange={(e) => setSize(k, Number(e.target.value))} className="flex-1 min-w-0" />
                    <span className="text-[9px] text-gray-400 w-6 text-right">{sizes[k]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* STYLES / VARIANTS */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Square className="w-4 h-4" /> Stili dei box</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { key: 'bannerVariant', label: 'Banner data', opts: [['tilted', 'Inclinato (foto)'], ['pill', 'Pillola'], ['tab', 'Linguetta'], ['outline', 'Contorno']] },
                { key: 'pillVariant', label: 'Caratteristiche', opts: [['classic', 'Bianco (foto)'], ['solid', 'Blu pieno'], ['accent', 'Arancio pieno'], ['outline', 'Trasparente']] },
                { key: 'itinVariant', label: 'Riquadro elenco', opts: [['split', 'Titolo arancio (foto)'], ['splitBlue', 'Titolo blu'], ['solid', 'Tutto blu']] },
                { key: 'offerVariant', label: 'Offerta/Prezzo', opts: [['classic', 'Blu+Arancio (foto)'], ['invert', 'Arancio+Blu'], ['outline', 'Contorno']] },
              ].map(({ key, label, opts }) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="text-[10px] w-24 flex-shrink-0">{label}</Label>
                  <select value={styles[key]} onChange={(e) => setStyles({ ...styles, [key]: e.target.value })} className="text-[11px] border rounded-md h-8 px-1 flex-1">
                    {opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* DECOR */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Square className="w-4 h-4" /> Forme decorative (sfondo box)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[10px] text-gray-400">Box colorati che fanno da base sotto i testi. Attivali, scegli colore/dimensione e trascinali nell'anteprima.</p>
              {styles.decor.map((d, i) => (
                <div key={i} className="space-y-1 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer w-20"><input type="checkbox" checked={d.show} onChange={(e) => updateDecor(i, 'show', e.target.checked)} /> Box {i + 1}</label>
                    <input type="color" value={d.color} onChange={(e) => updateDecor(i, 'color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border" />
                    <div className="flex items-center gap-1 flex-1"><span className="text-[9px] text-gray-400">L</span><input type="range" min="100" max="1000" value={d.w} onChange={(e) => updateDecor(i, 'w', Number(e.target.value))} className="flex-1 min-w-0" /></div>
                    <div className="flex items-center gap-1 flex-1"><span className="text-[9px] text-gray-400">A</span><input type="range" min="40" max="400" value={d.h} onChange={(e) => updateDecor(i, 'h', Number(e.target.value))} className="flex-1 min-w-0" /></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* TEXTS */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Type className="w-4 h-4" /> Testi principali</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-[10px] font-semibold">Titolo</Label><Input value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} className="text-xs h-8" /></div>
              <div><Label className="text-[10px]">Banner data / sottotitolo</Label><Input value={content.dateBanner} onChange={(e) => setContent({ ...content, dateBanner: e.target.value })} className="text-xs h-8" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">Etichetta offerta</Label><Input value={content.offerLabel} onChange={(e) => setContent({ ...content, offerLabel: e.target.value })} className="text-xs h-8" /></div>
                <div><Label className="text-[10px] font-bold">Prezzo</Label><Input value={content.price} onChange={(e) => setContent({ ...content, price: e.target.value })} className="text-xs h-8 font-bold" /></div>
                <div><Label className="text-[10px]">Sotto prezzo</Label><Input value={content.priceSuffix} onChange={(e) => setContent({ ...content, priceSuffix: e.target.value })} className="text-xs h-8" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Caratteristiche (pill con icona)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {content.features.map((f, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <select value={f.icon} onChange={(e) => updateFeature(i, 'icon', e.target.value)} className="text-[11px] border rounded-md h-8 px-1 w-28 flex-shrink-0">{ICON_LIST.map(ic => <option key={ic.id} value={ic.id}>{ic.label}</option>)}</select>
                  <Input value={f.text} onChange={(e) => updateFeature(i, 'text', e.target.value)} placeholder={`Testo ${i + 1} (vuoto = nascosto)`} className="text-xs h-8" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Riquadro elenco</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-[10px]">Titolo riquadro</Label><Input value={content.itineraryTitle} onChange={(e) => setContent({ ...content, itineraryTitle: e.target.value })} className="text-xs h-8" /></div>
              <div><Label className="text-[10px]">Voci (una per riga)</Label><Textarea value={content.itineraryText} onChange={(e) => setContent({ ...content, itineraryText: e.target.value })} rows={6} className="text-xs" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Type className="w-4 h-4" /> Parte bassa</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-[10px]">Testo CTA</Label><Input value={content.ctaText} onChange={(e) => setContent({ ...content, ctaText: e.target.value })} className="text-xs h-8" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Telefono</Label><Input value={content.phone} onChange={(e) => setContent({ ...content, phone: e.target.value })} className="text-xs h-8" /></div>
                <div><Label className="text-[10px]">Claim finale</Label><Input value={content.tagline} onChange={(e) => setContent({ ...content, tagline: e.target.value })} className="text-xs h-8" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Palette className="w-4 h-4" /> Colori & Visibilità</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'primaryColor', label: 'Blu (pannelli)' }, { key: 'accentColor', label: 'Arancio (accento)' },
                  { key: 'titleColor', label: 'Titolo' }, { key: 'footerColor', label: 'Telefono/Claim' },
                  { key: 'bgTop', label: 'Sfondo alto (no foto)' }, { key: 'bgBottom', label: 'Sfondo basso (no foto)' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2"><input type="color" value={styles[key]} onChange={(e) => setStyles({ ...styles, [key]: e.target.value })} className="w-6 h-6 rounded cursor-pointer border border-gray-200" /><span className="text-[10px] text-gray-600">{label}</span></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-2 border-t">
                {[
                  { key: 'showLogo', label: 'Logo' }, { key: 'showDateBanner', label: 'Banner data' }, { key: 'showImage', label: 'Foto sfondo' },
                  { key: 'showFeatures', label: 'Caratteristiche' }, { key: 'showOffer', label: 'Offerta/Prezzo' }, { key: 'showItinerary', label: 'Riquadro elenco' },
                  { key: 'showCta', label: 'CTA' }, { key: 'showPhone', label: 'Telefono' }, { key: 'showTagline', label: 'Claim' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 text-[11px] cursor-pointer"><input type="checkbox" checked={styles[key]} onChange={(e) => setStyles({ ...styles, [key]: e.target.checked })} className="rounded" />{label}</label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pb-4">
            <Button onClick={generateImage} disabled={isGenerating} className="flex-1 bg-ocean-500 hover:bg-ocean-700">{isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Scarica PNG</Button>
            <Button variant="outline" onClick={copyToClipboard} title="Copia"><Copy className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* ===== PREVIEW ===== */}
        <div className="flex flex-col items-center sticky top-0">
          <div className="flex items-center justify-between w-full max-w-md mb-2">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Move className="w-3.5 h-3.5" /> Trascina i blocchi per impaginare</p>
            <button onClick={() => { setPositions(DEFAULT_POSITIONS); setSizes(DEFAULT_SIZES); }} className="text-xs text-ocean-600 flex items-center gap-1 hover:underline"><RotateCcw className="w-3 h-3" /> Reset</button>
          </div>
          <div className="border shadow-lg overflow-hidden bg-gray-100 rounded-lg" style={{ width: format.width * previewScale, height: format.height * previewScale }}>
            <div ref={previewRef} style={{ width: format.width, height: format.height, transform: `scale(${previewScale})`, transformOrigin: 'top left', position: 'relative', overflow: 'hidden', fontFamily: mainFF }}>

              {styles.showImage && content.imageUrl ? (
                <img src={content.imageUrl} alt="" crossOrigin="anonymous" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(170deg, ${styles.bgTop} 0%, ${styles.bgBottom} 100%)` }} />
              )}
              {styles.overlay > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${styles.overlay / 100})` }} />}

              <div style={{ position: 'absolute', left: offsetX, top: offsetY, width: D, height: D }}>

                {/* DECOR (behind) */}
                {styles.decor.map((d, i) => d.show && (
                  <div key={`d${i}`}>{wrap(`decor${i}`, null, (
                    <div style={{ width: px(d.w), height: px(d.h), background: d.color, borderRadius: px(d.radius), boxShadow: shadow }} />
                  ))}</div>
                ))}

                {/* LOGO */}
                {styles.showLogo && wrap('logo', null, (
                  styles.logoShape === 'none' ? (
                    <img src={content.logoUrl} alt="logo" crossOrigin="anonymous" style={{ width: px(styles.logoSize), height: px(styles.logoSize), objectFit: 'contain', filter: `drop-shadow(${px(2)}px ${px(4)}px ${px(8)}px rgba(0,0,0,0.3))` }} />
                  ) : (
                    <div style={{ width: px(styles.logoSize), height: px(styles.logoSize), borderRadius: styles.logoShape === 'circle' ? '50%' : (styles.logoShape === 'rounded' ? px(36) : 0), background: styles.logoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: shadow, border: `${px(6)}px solid rgba(255,255,255,0.85)` }}>
                      <img src={content.logoUrl} alt="logo" crossOrigin="anonymous" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                    </div>
                  )
                ))}

                {/* TITLE */}
                {wrap('title', 760, (
                  <h1 style={{ margin: 0, fontSize: px(sizes.title), fontWeight: 900, color: elC('title', styles.titleColor), textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: px(1), textShadow: `${px(3)}px ${px(4)}px ${px(6)}px rgba(0,0,0,0.35)`, wordBreak: 'break-word', fontFamily: elFF('title', mainFF) }}>{content.title}</h1>
                ))}

                {/* BANNER */}
                {styles.showDateBanner && content.dateBanner && wrap('banner', null, renderBanner())}

                {/* FEATURES (equal width pills, bigger icons) */}
                {styles.showFeatures && activeFeatures.length > 0 && wrap('features', 500, (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: px(14) }}>
                    {activeFeatures.slice(0, 4).map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(16), background: pc.bg, border: pc.border, borderRadius: 999, padding: `${px(8)}px ${px(24)}px ${px(8)}px ${px(8)}px`, boxShadow: shadow, width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ width: px(sizes.pillIcon), height: px(sizes.pillIcon), borderRadius: '50%', background: pc.circle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: px(sizes.pillIcon * 0.58), height: px(sizes.pillIcon * 0.58) }}>{SVG_ICONS[f.icon] ? SVG_ICONS[f.icon](pc.icon) : null}</div>
                        </div>
                        <span style={{ fontSize: px(sizes.pillText), fontWeight: 800, color: elC('pillText', pc.text), lineHeight: 1.05, fontFamily: elFF('pillText', mainFF) }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* OFFER */}
                {styles.showOffer && wrap('offer', null, renderOffer())}

                {/* ITINERARY */}
                {styles.showItinerary && stops.length > 0 && wrap('itinerary', 350, renderItinerary())}

                {/* CTA */}
                {styles.showCta && content.ctaText && wrap('cta', 780, (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(14), background: styles.primaryColor, borderRadius: 999, padding: `${px(13)}px ${px(24)}px`, boxShadow: shadow, boxSizing: 'border-box', width: '100%' }}>
                    <PhoneCircle d={px(44)} bg="#fff" icon={styles.primaryColor} />
                    <span style={{ fontSize: px(sizes.cta), fontWeight: 900, color: elC('cta', '#fff'), textTransform: 'uppercase', fontFamily: elFF('cta', mainFF) }}>{content.ctaText}</span>
                    <span style={{ color: styles.accentColor, fontWeight: 900, fontSize: px(sizes.cta + 2) }}>»</span>
                  </div>
                ))}

                {/* PHONE */}
                {styles.showPhone && content.phone && wrap('phone', null, (
                  <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                    <PhoneCircle d={px(52)} bg={styles.accentColor} icon="#fff" />
                    <span style={{ fontSize: px(sizes.phone), fontWeight: 900, color: elC('phone', styles.footerColor), textShadow: '0 2px 6px rgba(255,255,255,0.5)', fontFamily: elFF('phone', mainFF) }}>{content.phone}</span>
                  </div>
                ))}

                {/* TAGLINE */}
                {styles.showTagline && content.tagline && wrap('tagline', 470, (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: px(sizes.tagline), fontWeight: 700, fontFamily: elFF('tagline', scriptFF), color: elC('tagline', styles.footerColor), textShadow: '0 2px 6px rgba(255,255,255,0.5)' }}>{content.tagline} <span style={{ color: '#E0395B' }}>♥</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 w-full max-w-md">
            <Button onClick={generateImage} disabled={isGenerating} className="flex-1 bg-ocean-500 hover:bg-ocean-700" size="sm">{isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Scarica PNG</Button>
            <Button variant="outline" onClick={copyToClipboard} size="sm"><Copy className="w-4 h-4 mr-1" /> Copia</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
