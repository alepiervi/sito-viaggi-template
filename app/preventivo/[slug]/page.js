'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/TenantProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Calendar, Users, Clock, ChevronLeft, ChevronRight, 
  Phone, Mail, MessageCircle, Shield, Plane, Headphones,
  Star, CheckCircle, X, ExternalLink, Heart, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useT, useTranslatedObject, useTranslatedArray } from '@/lib/useT';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function QuotePage() {
  const params = useParams();
  const { t, lang } = useT();
  const tenantInfo = useTenant();
  const [rawQuote, setRawQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [footer, setFooter] = useState(null);
  const [showItinerary, setShowItinerary] = useState(false);

  useEffect(() => {
    if (params.slug) {
      fetch(`/api/quotes/${params.slug}`)
        .then(r => { if (!r.ok) throw new Error('Non trovato'); return r.json(); })
        .then(data => { setRawQuote(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    }
    fetch('/api/footer').then(r => r.json()).then(setFooter).catch(() => {});
  }, [params.slug]);

  // Translate dynamic DB content (text fields) stably via React state
  const { obj: translatedQuote } = useTranslatedObject(rawQuote, ['title', 'subtitle', 'description', 'itinerary', 'clientNotes', 'dates', 'duration', 'departure']);
  const { items: translatedServices } = useTranslatedArray(rawQuote?.services || [], ['name']);
  const quote = translatedQuote ? { ...translatedQuote, services: translatedServices } : rawQuote;
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg text-gray-500 font-medium">{t('home.loadingQuote')}</p>
      </div>
    </div>
  );

  if (error || !quote) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <Card className="p-10 text-center max-w-md shadow-xl">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">{t('home.quoteNotFound')}</h1>
        <p className="text-gray-500 mb-6">{t('home.linkExpired')}</p>
        <Link href="/"><Button className="bg-ocean-500 hover:bg-ocean-600">{t('home.backHomepage')}</Button></Link>
      </Card>
    </div>
  );

  const images = quote.images?.filter(Boolean) || [];
  const adults = quote.adults || quote.participants?.map(p => ({ name: p.name })) || [];
  const children = quote.children || [];
  const totalPax = adults.length + children.length;
  const whatsappNumber = quote.contactWhatsapp || footer?.contactInfo?.whatsappNumber || '';
  const contactEmail = quote.contactEmail || footer?.contactInfo?.email || '';
  const whatsappMsg = encodeURIComponent(`Ciao! Sono ${quote.clientName || 'interessato/a'}. Vorrei confermare il preventivo "${quote.title}". Potete darmi maggiori informazioni?`);
  
  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();
  const discount = quote.fullPrice && quote.discountedPrice ? Math.round(((quote.fullPrice - quote.discountedPrice) / quote.fullPrice) * 100) : 0;

  const daysLeft = quote.validUntil ? Math.ceil((new Date(quote.validUntil) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const nextImage = () => setActiveImage(prev => (prev + 1) % images.length);
  const prevImage = () => setActiveImage(prev => (prev - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-white">
      
      {/* ===== HERO HEADER ===== */}
      <div className="relative">
        {/* Background Image */}
        {images.length > 0 && (
          <div className="absolute inset-0 h-[420px] md:h-[500px]">
            <img src={images[0]} alt={quote.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/80 via-ocean-900/50 to-ocean-900/90" />
          </div>
        )}
        {!images.length && (
          <div className="absolute inset-0 h-[420px] md:h-[500px] bg-gradient-to-br from-ocean-800 to-ocean-600" />
        )}

        {/* Top Navigation */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-12 drop-shadow-lg" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Badge className="bg-white/15 backdrop-blur-sm text-white border border-white/20 px-4 py-1.5">
              {t('home.personalizedQuoteBadge')}
            </Badge>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-16 md:pt-16 md:pb-24 text-white">
          {isExpired && (
            <Badge className="bg-red-500 text-white mb-4 text-sm px-4 py-1.5">
              <AlertCircle className="w-4 h-4 mr-1" /> {t('home.quoteExpired')}
            </Badge>
          )}
          {!isExpired && daysLeft && daysLeft <= 7 && daysLeft > 0 && (
            <Badge className="bg-amber-500 text-white mb-4 text-sm px-4 py-1.5 animate-pulse">
              <Clock className="w-4 h-4 mr-1" /> {t('home.expiresInLabel')} {daysLeft} {t('home.daysWord')}
            </Badge>
          )}

          {quote.clientName && (
            <p className="text-white/70 text-lg mb-1">
              {t('home.preparedFor')}
            </p>
          )}
          {quote.clientName && (
            <p className="text-2xl md:text-3xl font-bold text-coral-400 mb-4">
              {quote.clientName}
            </p>
          )}
          
          <h1 className="text-4xl md:text-6xl font-black mb-3 leading-tight tracking-tight">
            {quote.title}
          </h1>
          {quote.subtitle && (
            <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl">{quote.subtitle}</p>
          )}

          {/* Quick Info Strips */}
          <div className="flex flex-wrap gap-3 mt-8">
            {quote.dates && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Calendar className="w-4 h-4 text-coral-400" /> <span className="text-sm font-medium">{quote.dates}</span>
              </div>
            )}
            {quote.duration && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Clock className="w-4 h-4 text-coral-400" /> <span className="text-sm font-medium">{quote.duration}</span>
              </div>
            )}
            {quote.departure && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Plane className="w-4 h-4 text-coral-400" /> <span className="text-sm font-medium">{quote.departure}</span>
              </div>
            )}
            {totalPax > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Users className="w-4 h-4 text-coral-400" /> 
                <span className="text-sm font-medium">
                  {adults.length} {t('home.adultsLabel')}
                  {children.length > 0 && ` + ${children.length} ${t('home.childrenLabel')}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Image Gallery */}
            {images.length > 1 && (
              <Card className="overflow-hidden shadow-xl border-0">
                <div className="relative group cursor-pointer" onClick={() => setLightbox(true)}>
                  <div className="aspect-[16/9]">
                    <img src={images[activeImage]} alt={`${quote.title} - Foto ${activeImage + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {discount > 0 && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-red-500 text-white px-5 py-2.5 rounded-2xl font-black text-xl shadow-lg transform -rotate-3">
                        -{discount}%
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                    {activeImage + 1} / {images.length}
                  </div>
                </div>
                
                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-3 top-[25%] bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-3 top-[25%] bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Thumbnails */}
                <div className="flex gap-1.5 p-3 overflow-x-auto bg-gray-50">
                  {images.slice(0, 12).map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        i === activeImage ? 'border-ocean-500 shadow-md scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}>
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => e.target.parentElement.style.display = 'none'} />
                    </button>
                  ))}
                  {images.length > 12 && (
                    <div className="flex-shrink-0 w-20 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 cursor-pointer" onClick={() => setLightbox(true)}>
                      +{images.length - 12}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Description */}
            {quote.description && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-8 bg-ocean-500 rounded-full" />
                    {t('home.tripDescriptionTitle')}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                    {quote.description}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Itinerary */}
            {quote.itinerary && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                      <div className="w-1.5 h-8 bg-coral-500 rounded-full" />
                      {t('home.itineraryTab')}
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => setShowItinerary(!showItinerary)}>
                      {showItinerary ? t('home.hideLabel') : t('home.showAllLabel')}
                    </Button>
                  </div>
                  <div className={`prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-line transition-all ${
                    !showItinerary ? 'max-h-[300px] overflow-hidden relative' : ''
                  }`}>
                    {quote.itinerary}
                    {!showItinerary && (
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {quote.services && quote.services.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                    {t('home.includedServicesTitle')}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {quote.services.map((svc, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-700">{svc.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            {(adults.length > 0 || children.length > 0) && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-8 bg-ocean-500 rounded-full" />
                    {t('home.theTravelersTitle')}
                  </h2>
                  
                  {/* Adults */}
                  {adults.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <Users className="w-4 h-4 inline mr-1" /> {t('home.adultsLabel')} ({adults.length})
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {adults.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-ocean-50 rounded-xl border border-ocean-100">
                            <div className="w-11 h-11 bg-gradient-to-br from-ocean-400 to-ocean-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                              {a.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-700">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Children */}
                  {children.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <Heart className="w-4 h-4 inline mr-1 text-rose-400" /> {t('home.childrenLabel')} ({children.length})
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {children.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                              <Heart className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 block">{c.name}</span>
                              <span className="text-xs text-amber-600 font-medium">{c.age} {t('home.yearsWord')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {quote.clientNotes && (
              <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-xl font-bold text-amber-800 mb-3">{t('home.importantNotesTitle')}</h2>
                  <p className="text-amber-700 whitespace-pre-line">{quote.clientNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Pricing Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card className="sticky top-6 shadow-2xl border-0 overflow-hidden">
              {/* Price Header */}
              <div className="bg-gradient-to-br from-ocean-600 via-ocean-700 to-ocean-800 text-white p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <p className="text-sm font-medium text-ocean-200 mb-3 relative z-10">{t('home.yourPersonalPrice')}</p>
                
                {quote.fullPrice && quote.discountedPrice && Number(quote.fullPrice) > Number(quote.discountedPrice) ? (
                  <div className="relative z-10">
                    <p className="text-xl line-through text-white/40">€{Number(quote.fullPrice).toLocaleString(locale)}</p>
                    <p className="text-6xl font-black mt-1 tracking-tight">€{Number(quote.discountedPrice).toLocaleString(locale)}</p>
                    <div className="mt-3">
                      <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-base px-4 py-1.5 font-bold shadow-lg">
                        {t('home.youSave')} €{(Number(quote.fullPrice) - Number(quote.discountedPrice)).toLocaleString(locale)}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-6xl font-black mt-1 tracking-tight relative z-10">
                    €{Number(quote.discountedPrice || quote.fullPrice || 0).toLocaleString(locale)}
                  </p>
                )}
                {quote.pricePerPerson && <p className="text-sm text-ocean-200 mt-2 relative z-10">{t('home.perPersonLow')}</p>}
              </div>

              <CardContent className="p-6 space-y-5">
                {/* Trip Summary */}
                <div className="space-y-3">
                  {[
                    { icon: Calendar, text: quote.dates, color: 'text-ocean-500' },
                    { icon: Clock, text: quote.duration, color: 'text-ocean-500' },
                    { icon: Plane, text: quote.departure, color: 'text-ocean-500' },
                  ].filter(i => i.text).map(({ icon: Icon, text, color }, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                      <span className="font-medium">{text}</span>
                    </div>
                  ))}
                  {totalPax > 0 && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-ocean-500 flex-shrink-0" />
                      <span className="font-medium">
                        {adults.length} {t('home.adultsLabel')}
                        {children.length > 0 && `, ${children.length} ${t('home.childrenLabel')}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Validity */}
                {quote.validUntil && (
                  <div className={`text-center py-3 rounded-xl text-sm font-bold ${
                    isExpired ? 'bg-red-50 text-red-600 border border-red-200' : 
                    daysLeft && daysLeft <= 3 ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isExpired ? t('home.quoteExpired') : `${t('home.validUntilLabel')} ${new Date(quote.validUntil).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`}
                  </div>
                )}

                {/* CTA Buttons */}
                {!isExpired && (
                  <div className="space-y-3 pt-2">
                    {whatsappNumber && (
                      <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-lg py-7 shadow-xl hover:shadow-2xl transition-all font-bold rounded-xl">
                          <MessageCircle className="w-5 h-5 mr-2" /> {t('home.confirmWhatsapp')}
                        </Button>
                      </a>
                    )}
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}?subject=Preventivo: ${quote.title}&body=Ciao, sono ${quote.clientName || ''}. Vorrei confermare il preventivo "${quote.title}".`}>
                        <Button variant="outline" className="w-full text-lg py-7 border-2 border-ocean-200 text-ocean-700 hover:bg-ocean-50 font-bold rounded-xl mt-2">
                          <Mail className="w-5 h-5 mr-2" /> {t('home.writeEmail')}
                        </Button>
                      </a>
                    )}
                    {whatsappNumber && (
                      <a href={`tel:${whatsappNumber.replace(/\D/g, '')}`} className="block">
                        <Button variant="ghost" className="w-full text-gray-500 hover:text-ocean-600 mt-1">
                          <Phone className="w-4 h-4 mr-2" /> {t('home.callUsColon')} {whatsappNumber}
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, text: t('home.securePaymentsShort'), color: 'text-emerald-500' },
                { icon: Headphones, text: t('home.support247Short'), color: 'text-ocean-500' },
                { icon: Star, text: t('home.qualityGuaranteedShort'), color: 'text-amber-500' },
                { icon: CheckCircle, text: t('home.priceLocked'), color: 'text-emerald-500' },
              ].map(({ icon: Icon, text, color }, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <span className="text-xs font-bold text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== LIGHTBOX ===== */}
      {lightbox && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-6 right-6 text-white/70 hover:text-white z-50">
            <X className="w-8 h-8" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-50">
            <ChevronLeft className="w-12 h-12" />
          </button>
          <img src={images[activeImage]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-50">
            <ChevronRight className="w-12 h-12" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeImage ? 'bg-white scale-125' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="bg-gradient-to-br from-ocean-900 to-ocean-800 text-white py-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Link href="/"><img src="/logo.png" alt="Logo" className="h-14 mx-auto mb-4 drop-shadow-lg" /></Link>
          <p className="text-ocean-200 font-medium">{t('home.quoteCreatedBy')}</p>
          <p className="text-ocean-300/50 text-sm mt-2">© {new Date().getFullYear()} {tenantInfo?.branding?.siteName || tenantInfo?.name}. {lang === 'en' ? 'All rights reserved.' : 'Tutti i diritti riservati.'}</p>
          {quote.sourceUrl && (
            <a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-ocean-300/40 hover:text-ocean-200 mt-3">
              <ExternalLink className="w-3 h-3" /> {t('home.originalSource')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
