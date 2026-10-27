'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  MapPin, Clock, Hotel, Euro, Plane, Check, MessageCircle, Mail,
  Phone, Star, ArrowRight, Shield, Headphones, Heart, Users,
  Calendar, ChevronDown, Sparkles, Send, X
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedObject, useTranslatedArray } from '@/lib/useT';
import { toHtml } from '@/lib/richtext';

// ==================== THEME SYSTEM ====================
const detectTheme = (destination, themeOverride) => {
  if (themeOverride && themeOverride !== 'auto') return themeOverride;
  const dest = (destination || '').toLowerCase();

  if (['maldive', 'caraibi', 'bali', 'thailandia', 'seychelles', 'mauritius', 'polinesia', 'cuba', 'dominicana', 'zanzibar', 'messico', 'tropicale', 'phuket', 'maldives'].some(k => dest.includes(k)))
    return 'tropical';
  if (['egitto', 'mar rosso', 'sharm', 'hurghada', 'marsa alam', 'dubai', 'oman', 'giordania', 'marocco', 'tunisia', 'deserto', 'cairo'].some(k => dest.includes(k)))
    return 'desert';
  if (['grecia', 'spagna', 'croazia', 'sardegna', 'sicilia', 'puglia', 'costiera', 'santorini', 'mykonos', 'turchia', 'cipro', 'malta', 'mediterraneo', 'ibiza'].some(k => dest.includes(k)))
    return 'mediterranean';
  if (['crociera', 'nave', 'msc', 'costa crociere'].some(k => dest.includes(k)))
    return 'cruise';
  if (['alpi', 'dolomiti', 'montagna', 'trentino', 'svizzera', 'austria', 'valle'].some(k => dest.includes(k)))
    return 'mountain';
  if (['parigi', 'londra', 'roma', 'new york', 'barcellona', 'amsterdam', 'praga', 'vienna', 'berlino', 'lisbona', 'tokyo', 'city'].some(k => dest.includes(k)))
    return 'city';
  if (['kenya', 'tanzania', 'sudafrica', 'safari', 'namibia', 'botswana'].some(k => dest.includes(k)))
    return 'safari';
  return 'default';
};

const themes = {
  tropical: {
    name: 'Tropicale',
    heroGradient: 'from-teal-900/80 via-teal-800/40 to-emerald-900/60',
    accentColor: 'text-teal-600',
    accentBg: 'bg-teal-600',
    accentBgHover: 'hover:bg-teal-700',
    lightBg: 'bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50',
    cardAccent: 'border-t-4 border-t-teal-500',
    badgeBg: 'bg-teal-100 text-teal-700',
    ctaBg: 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-teal-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(20,184,166,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 50%)',
    emoji: '🌴',
    highlights: ['🌊 Mare cristallino', '🐠 Barriera corallina', '🌺 Spiagge bianche', '☀️ Clima perfetto'],
  },
  desert: {
    name: 'Egitto & Deserto',
    heroGradient: 'from-amber-900/80 via-orange-800/40 to-yellow-900/60',
    accentColor: 'text-amber-700',
    accentBg: 'bg-amber-600',
    accentBgHover: 'hover:bg-amber-700',
    lightBg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
    cardAccent: 'border-t-4 border-t-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700',
    ctaBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-amber-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(217,119,6,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.1) 0%, transparent 50%)',
    emoji: '🏛️',
    highlights: ['🐫 Escursioni nel deserto', '🌅 Tramonti mozzafiato', '⭐ Storia millenaria', '🏺 Cultura unica'],
  },
  mediterranean: {
    name: 'Mediterraneo',
    heroGradient: 'from-blue-900/80 via-blue-800/40 to-sky-900/60',
    accentColor: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentBgHover: 'hover:bg-blue-700',
    lightBg: 'bg-gradient-to-br from-blue-50 via-sky-50 to-white',
    cardAccent: 'border-t-4 border-t-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700',
    ctaBg: 'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-blue-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.08) 0%, transparent 50%)',
    emoji: '🏖️',
    highlights: ['🏖️ Spiagge dorate', '🍷 Gastronomia locale', '🏛️ Borghi storici', '⛵ Mare limpido'],
  },
  cruise: {
    name: 'Crociera',
    heroGradient: 'from-slate-900/80 via-blue-900/40 to-indigo-900/60',
    accentColor: 'text-indigo-600',
    accentBg: 'bg-indigo-600',
    accentBgHover: 'hover:bg-indigo-700',
    lightBg: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    cardAccent: 'border-t-4 border-t-indigo-500',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    ctaBg: 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700',
    sectionDivider: 'bg-gradient-to-r from-transparent via-indigo-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(79,70,229,0.08) 0%, transparent 50%)',
    emoji: '🚢',
    highlights: ['🚢 Nave di lusso', '🍽️ Cucina gourmet', '🎭 Intrattenimento', '🌍 Multi-destinazione'],
  },
  mountain: {
    name: 'Montagna',
    heroGradient: 'from-green-900/80 via-emerald-800/40 to-stone-900/60',
    accentColor: 'text-green-700',
    accentBg: 'bg-green-600',
    accentBgHover: 'hover:bg-green-700',
    lightBg: 'bg-gradient-to-br from-green-50 via-emerald-50 to-stone-50',
    cardAccent: 'border-t-4 border-t-green-500',
    badgeBg: 'bg-green-100 text-green-700',
    ctaBg: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-green-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(22,163,74,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%)',
    emoji: '🏔️',
    highlights: ['🏔️ Panorami mozzafiato', '🥾 Escursioni', '❄️ Aria pura', '🌲 Natura incontaminata'],
  },
  city: {
    name: 'Città',
    heroGradient: 'from-gray-900/85 via-slate-800/50 to-zinc-900/70',
    accentColor: 'text-rose-600',
    accentBg: 'bg-rose-600',
    accentBgHover: 'hover:bg-rose-700',
    lightBg: 'bg-gradient-to-br from-gray-50 via-rose-50/30 to-slate-50',
    cardAccent: 'border-t-4 border-t-rose-500',
    badgeBg: 'bg-rose-100 text-rose-700',
    ctaBg: 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-rose-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(225,29,72,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.06) 0%, transparent 50%)',
    emoji: '🌆',
    highlights: ['🏛️ Arte e cultura', '🍕 Cucina locale', '🛍️ Shopping', '📸 Monumenti iconici'],
  },
  safari: {
    name: 'Safari',
    heroGradient: 'from-yellow-900/80 via-orange-800/40 to-stone-900/60',
    accentColor: 'text-yellow-700',
    accentBg: 'bg-yellow-600',
    accentBgHover: 'hover:bg-yellow-700',
    lightBg: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-stone-50',
    cardAccent: 'border-t-4 border-t-yellow-500',
    badgeBg: 'bg-yellow-100 text-yellow-700',
    ctaBg: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-yellow-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(202,138,4,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(234,88,12,0.08) 0%, transparent 50%)',
    emoji: '🦁',
    highlights: ['🦁 Big Five', '🌅 Savana africana', '📷 Fotosafari', '🌍 Avventura unica'],
  },
  default: {
    name: 'Classico',
    heroGradient: 'from-ocean-900/80 via-ocean-800/40 to-blue-900/60',
    accentColor: 'text-ocean-600',
    accentBg: 'bg-ocean-500',
    accentBgHover: 'hover:bg-ocean-600',
    lightBg: 'bg-gradient-to-br from-ocean-50 via-blue-50 to-sky-50',
    cardAccent: 'border-t-4 border-t-ocean-500',
    badgeBg: 'bg-ocean-100 text-ocean-700',
    ctaBg: 'bg-gradient-to-r from-ocean-500 to-blue-500 hover:from-ocean-600 hover:to-blue-600',
    sectionDivider: 'bg-gradient-to-r from-transparent via-ocean-300 to-transparent',
    decorPattern: 'radial-gradient(circle at 20% 80%, rgba(0,160,233,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 50%)',
    emoji: '✈️',
    highlights: ['✈️ Volo incluso', '🏨 Hotel selezionato', '🎯 Assistenza dedicata', '💎 Esperienza unica'],
  },
};

// ==================== MAIN COMPONENT ====================
export default function PromoLandingPage() {
  const params = useParams();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [activeGalleryImg, setActiveGalleryImg] = useState(0);
  const { t } = useT();

  // Translations (hooks must run before any early return)
  const { obj: tPromo } = useTranslatedObject(promo, ['heroTitle', 'heroSubtitle', 'offerBadge', 'detailsTitle', 'detailsSubtitle', 'destination', 'duration', 'treatment', 'transport', 'period', 'participants', 'departureCity', 'description', 'ctaTitle', 'ctaSubtitle']);
  const themeKeyTop = promo ? detectTheme(promo.destination || promo.trip?.destination, promo.themeOverride) : 'default';
  const themeTop = themes[themeKeyTop] || themes.default;
  const pIncludedSrc = (promo?.included?.length > 0 ? promo.included : (promo?.trip?.included || []));
  const { items: tIncluded } = useTranslatedArray(pIncludedSrc.map((s, i) => ({ id: i, s })), ['s']);
  const pHighlightsSrc = (promo?.highlights?.length > 0 ? promo.highlights : themeTop.highlights);
  const { items: tHighlights } = useTranslatedArray(pHighlightsSrc.map((s, i) => ({ id: i, s })), ['s']);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/promos/${params.slug}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setPromo(data);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (params.slug) load();
  }, [params.slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tripTitle: promo.heroTitle || promo.trip?.title,
          tripId: promo.tripId,
          source: 'promo_landing',
          promoSlug: promo.slug
        })
      });
      setFormSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('home.loadingOffer')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl mb-4">🔍</h1>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">{t('home.offerNotFound')}</h2>
          <p className="text-gray-500 mb-6">{t('home.offerUnavailable')}</p>
          <Link href="/#viaggi"><Button>{t('home.seeCatalog')}</Button></Link>
        </div>
      </div>
    );
  }

  const trip = promo.trip || {};
  const p = tPromo || promo;
  const themeKey = detectTheme(promo.destination || trip.destination, promo.themeOverride);
  const theme = themes[themeKey] || themes.default;
  const heroImage = promo.heroImage || trip.cardImage || trip.images?.[0] || '';
  const gallery = promo.galleryImages?.length > 0 ? promo.galleryImages : (trip.images || []);
  const included = promo.included?.length > 0 ? promo.included : (trip.included || []);
  const whatsappNumber = promo.whatsappNumber || '39XXXXXXXXXX';

  const whatsappMsg = encodeURIComponent(
    `Ciao! Ho visto la vostra promozione "${promo.heroTitle || trip.title}" e sono interessato. Potete darmi maggiori informazioni?\n\nGrazie!`
  );

  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt={promo.heroTitle} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-r ${theme.heroGradient}`}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        </div>

        {/* Back to home */}
        <Link href="/" className="absolute top-6 left-6 z-20 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full px-4 py-2 text-sm flex items-center gap-2 transition-all">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto brightness-0 invert" />
        </Link>
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
          {promo.offerBadge && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">{p.offerBadge}</span>
            </div>
          )}

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-4 leading-tight drop-shadow-lg">
            {p.heroTitle || p.title || trip.title}
          </h1>

          {promo.heroSubtitle && (
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow">
              {p.heroSubtitle}
            </p>
          )}

          {/* Price Highlight */}
          <div className="inline-flex items-center gap-4 bg-white/15 backdrop-blur-md rounded-2xl px-8 py-5 mb-8">
            {promo.originalPrice && (
              <span className="text-2xl text-white/60 line-through">€{promo.originalPrice}</span>
            )}
            <div className="text-center">
              <span className="text-sm text-white/80 block">{t('catalog.from')}</span>
              <span className="text-5xl md:text-6xl font-bold">€{promo.promoPrice || trip.priceFrom}</span>
              <span className="text-sm text-white/80 block">{t('home.perPersonLow')}</span>
            </div>
            {promo.discountPercent && (
              <Badge className="bg-red-500 text-white text-lg px-3 py-1 border-0">-{promo.discountPercent}%</Badge>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className={`${theme.ctaBg} text-white rounded-full px-10 py-6 text-lg shadow-2xl hover:scale-105 transition-all`}
              onClick={() => setShowForm(true)}
            >
              <Send className="w-5 h-5 mr-2" />
              {t('home.requestQuoteShort')}
            </Button>
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white rounded-full px-10 py-6 text-lg shadow-2xl hover:scale-105 transition-all"
              onClick={() => window.open(`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`, '_blank')}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {t('home.writeWhatsapp')}
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <ChevronDown className="w-8 h-8" />
        </div>
      </section>

      {/* ===== HIGHLIGHTS STRIP ===== */}
      <section className={`py-6 ${theme.lightBg}`} style={{ backgroundImage: theme.decorPattern }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {(tHighlights.length ? tHighlights.map(x => x.s) : (promo.highlights?.length > 0 ? promo.highlights : theme.highlights)).map((h, i) => (
              <span key={i} className={`text-sm md:text-base font-medium ${theme.accentColor}`}>{h}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRIP DETAILS ===== */}
      <section className="py-16 px-4 bg-white" style={{ backgroundImage: theme.decorPattern }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-4xl mb-3 block">{theme.emoji}</span>
            <h2 className={`text-3xl md:text-4xl font-display font-bold ${theme.accentColor} mb-3`}>
              {p.detailsTitle || t('home.tripDetails')}
            </h2>
            {promo.detailsSubtitle && <p className="text-gray-600 text-lg">{p.detailsSubtitle}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: MapPin, label: t('home.destination'), value: p.destination || trip.destination },
              { icon: Clock, label: t('home.duration'), value: p.duration || trip.duration },
              { icon: Hotel, label: t('home.treatment'), value: p.treatment || trip.treatment },
              { icon: Plane, label: t('home.transportLabel'), value: p.transport || trip.transport || t('home.flightIncluded') },
              { icon: Calendar, label: t('home.period'), value: p.period || trip.period },
              { icon: Users, label: t('home.participants'), value: p.participants || t('home.min2people') },
              { icon: MapPin, label: t('home.departureShort'), value: p.departureCity || trip.departureCity },
              { icon: Euro, label: t('home.priceFromLabel'), value: `€${promo.promoPrice || trip.priceFrom}` },
            ].filter(item => item.value).map((item, i) => (
              <Card key={i} className={`${theme.cardAccent} hover:shadow-lg transition-shadow`}>
                <CardContent className="p-4 text-center">
                  <item.icon className={`w-6 h-6 mx-auto mb-2 ${theme.accentColor}`} />
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="font-semibold text-sm">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Description */}
          {(promo.description || trip.description) && (
            <div className="max-w-3xl mx-auto mb-12">
              <div className="prose prose-lg max-w-none text-gray-600 prose-img:rounded-xl mx-auto" dangerouslySetInnerHTML={{ __html: toHtml(p.description || trip.description) }} />
            </div>
          )}

          {/* Included */}
          {included.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <h3 className={`text-xl font-semibold ${theme.accentColor} mb-4 text-center`}>{t('home.tripIncludes')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(tIncluded.length ? tIncluded.map(x => x.s) : included).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <div className={`w-6 h-6 rounded-full ${theme.accentBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className={`h-1 ${theme.sectionDivider}`}></div>

      {/* ===== GALLERY ===== */}
      {gallery.length > 1 && (
        <section className={`py-16 px-4 ${theme.lightBg}`}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-3xl font-display font-bold ${theme.accentColor} text-center mb-10`}>{t('home.galleryLabel')}</h2>
            <div className="mb-4">
              <img
                src={gallery[activeGalleryImg]}
                alt="Gallery"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-2xl shadow-xl"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGalleryImg(i)}
                  className={`flex-shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeGalleryImg ? `${theme.cardAccent.replace('border-t-4 border-t', 'border')} scale-105 shadow-md` : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== TRUST BADGES ===== */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: t('home.transparentPrices'), desc: t('home.noHiddenCosts') },
            { icon: Headphones, label: t('home.support247Short'), desc: t('home.alwaysBySide') },
            { icon: Heart, label: t('home.tailored'), desc: t('home.personalizedTrips') },
            { icon: Star, label: t('home.topQuality'), desc: t('home.selectedStructures') },
          ].map((item, i) => (
            <div key={i}>
              <div className={`w-12 h-12 mx-auto rounded-full ${theme.lightBg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-6 h-6 ${theme.accentColor}`} />
              </div>
              <h4 className="font-semibold text-sm">{item.label}</h4>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className={`py-20 px-4 ${theme.lightBg} relative`} style={{ backgroundImage: theme.decorPattern }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-5xl mb-4 block">{theme.emoji}</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
            {p.ctaTitle || t('home.dontMiss')}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {p.ctaSubtitle || t('home.contactNowLimited')}
          </p>

          <div className="inline-flex items-baseline gap-3 mb-8">
            {promo.originalPrice && (
              <span className="text-3xl text-gray-400 line-through">€{promo.originalPrice}</span>
            )}
            <span className={`text-5xl md:text-6xl font-bold ${theme.accentColor}`}>€{promo.promoPrice || trip.priceFrom}</span>
            <span className="text-gray-500">/ {t('home.perPersonFull')}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className={`${theme.ctaBg} text-white rounded-full px-10 py-6 text-lg shadow-2xl hover:scale-105 transition-all`}
              onClick={() => setShowForm(true)}
            >
              <Send className="w-5 h-5 mr-2" />
              {t('home.requestFreeQuote')}
            </Button>
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white rounded-full px-10 py-6 text-lg shadow-2xl hover:scale-105 transition-all"
              onClick={() => window.open(`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`, '_blank')}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>
            {promo.trip?.slug && (
              <Link href={`/viaggio/${promo.trip.slug}`}>
                <Button size="lg" variant="outline" className="rounded-full px-10 py-6 text-lg hover:scale-105 transition-all">
                  {t('home.fullDetails')} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ===== FOOTER MINI ===== */}
      <footer className="bg-gray-900 text-white py-6 px-4 text-center">
        <Link href="/" className="inline-block mb-2">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto brightness-0 invert mx-auto" />
        </Link>
        <p className="text-white/40 text-xs">{t('home.copyright')}</p>
      </footer>

      {/* ===== CONTACT FORM DIALOG ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-display font-bold ${theme.accentColor}`}>{t('home.requestQuote')}</h3>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className="text-gray-500 text-sm mb-6">{t('home.forLabel')} <strong>{p.heroTitle || p.title || trip.title}</strong></p>

              {formSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">{t('home.requestSent')}</h4>
                  <p className="text-gray-600">{t('home.quoteSentDetail')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{t('home.firstName')} *</Label><Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div>
                    <div><Label>{t('home.lastName')} *</Label><Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div>
                  </div>
                  <div><Label>{t('home.emailLabel')} *</Label><Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div><Label>{t('home.phone')} *</Label><Input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div><Label>{t('home.notesLabel')}</Label><Textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={t('home.datesParticipantsPh')} /></div>
                  <Button type="submit" disabled={formSubmitting} className={`w-full ${theme.ctaBg} text-white rounded-xl py-3`}>
                    {formSubmitting ? t('home.sending2') : t('home.sendRequest')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
