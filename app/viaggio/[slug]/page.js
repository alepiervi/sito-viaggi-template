'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedObject, useTranslatedArray } from '@/lib/useT';
import { toHtml, stripHtml } from '@/lib/richtext';
import { 
  MapPin, Calendar, Clock, Hotel, Plane, Heart, Star, Check, X,
  ChevronRight, ChevronLeft, MessageCircle, Mail, Phone, Share2,
  Compass, Users, Euro, Shield, Info, Camera, ArrowLeft
} from 'lucide-react';

export default function ViaggioPage() {
  const params = useParams();
  const { t } = useT();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [relatedTrips, setRelatedTrips] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    participants: '',
    budget: '',
    preferredDate: '',
    notes: '',
    privacy: false
  });

  useEffect(() => {
    loadTrip();
    checkWishlist();
    loadCategories();
    loadRelated();
  }, [params.slug]);

  const loadRelated = async () => {
    try {
      const res = await fetch(`/api/trips/${params.slug}/related?limit=4`);
      if (res.ok) {
        const data = await res.json();
        setRelatedTrips(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading related trips:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTrip = async () => {
    try {
      const response = await fetch(`/api/trips/${params.slug}`);
      if (response.ok) {
        const data = await response.json();
        setTrip(data);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWishlist = () => {
    const savedWishlist = localStorage.getItem('tribuWishlist');
    if (savedWishlist) {
      const wishlist = JSON.parse(savedWishlist);
      setIsWishlisted(wishlist.includes(params.slug));
    }
  };

  const toggleWishlist = () => {
    const savedWishlist = localStorage.getItem('tribuWishlist');
    let wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
    
    if (isWishlisted) {
      wishlist = wishlist.filter(id => id !== trip?.id);
    } else {
      wishlist.push(trip?.id);
    }
    
    localStorage.setItem('tribuWishlist', JSON.stringify(wishlist));
    setIsWishlisted(!isWishlisted);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.privacy) return;
    
    setFormSubmitting(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          tripId: trip?.id,
          tripTitle: trip?.title,
          source: 'trip-page'
        })
      });
      
      if (response.ok) {
        setFormSuccess(true);
        setTimeout(() => {
          setShowContactForm(false);
          setFormSuccess(false);
          setContactForm({
            firstName: '', lastName: '', email: '', phone: '',
            participants: '', budget: '', preferredDate: '', notes: '', privacy: false
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const generateWhatsAppLink = () => {
    const message = encodeURIComponent(
      `Ciao! Sono interessato al viaggio: ${trip?.title}.\n\nDestinazione: ${trip?.destination}\nDurata: ${trip?.duration}\nPrezzo da: €${trip?.priceFrom}\n\nVorrei ricevere maggiori informazioni e un preventivo personalizzato.\n\nGrazie!`
    );
    return `https://wa.me/39XXXXXXXXXX?text=${message}`;
  };

  const shareTrip = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip?.title,
          text: stripHtml(trip?.shortDescription),
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  // Galleria: immagine card + immagini galleria (senza duplicati)
  const images = [trip?.cardImage, ...(trip?.images || [])]
    .filter(Boolean)
    .filter((u, i, arr) => arr.indexOf(u) === i);

  // Link "torna alla sezione": porta alla categoria del viaggio (es. Crociere), altrimenti alla home
  const tripCategorySlug = trip?.category || '';
  const categoryName = categories.find(c => c.slug === tripCategorySlug)?.name
    || (tripCategorySlug ? tripCategorySlug.charAt(0).toUpperCase() + tripCategorySlug.slice(1) : '');
  const backHref = tripCategorySlug ? `/categoria/${tripCategorySlug}` : '/';
  const backLabel = categoryName ? `Torna a ${categoryName}` : 'Torna alla home';

  // Translate trip content for display (logic/filtering still uses raw `trip`)
  const { obj: tTrip } = useTranslatedObject(trip, ['title', 'subtitle', 'destination', 'country', 'duration', 'period', 'treatment', 'description', 'departureCity', 'transport', 'hotelName']);
  const v = tTrip || trip || {};
  const { items: tIncluded } = useTranslatedArray((trip?.included || []).map((s, i) => ({ id: i, s })), ['s']);
  const { items: tExcluded } = useTranslatedArray((trip?.excluded || []).map((s, i) => ({ id: i, s })), ['s']);
  const { items: tItinerary } = useTranslatedArray(trip?.itinerary || [], ['title', 'description']);
  const { items: tFaqs } = useTranslatedArray(trip?.faqs || [], ['question', 'answer']);
  const { items: tRelated } = useTranslatedArray(relatedTrips, ['title', 'destination', 'duration']);

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ocean-600 font-medium">{t('home.loadingTrip')}</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">{t('home.tripNotFound')}</h1>
          <Link href="/">
            <Button>Torna alla home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={backHref} className="flex items-center gap-2 text-ocean-500 hover:text-ocean-600">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={shareTrip}>
                <Share2 className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleWishlist}
                className={isWishlisted ? 'text-coral-500' : ''}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Gallery */}
      <div className="relative h-[50vh] md:h-[60vh] bg-gray-900">
        <img 
          src={images[currentImageIndex]} 
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        {/* Gallery Navigation */}
        {images.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {trip.isPromo && <Badge className="bg-coral-500">-{trip.discountPercent}% Promo</Badge>}
          {trip.isBestSeller && <Badge className="bg-amber-500 text-gray-900">Best Seller</Badge>}
          {trip.isLastMinute && <Badge className="bg-red-500">Last Minute</Badge>}
          {trip.isNew && <Badge className="bg-teal-500">{t('catalog.novelty')}</Badge>}
        </div>

        {/* Gallery counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
          <Camera className="w-4 h-4" />
          {currentImageIndex + 1} / {images.length}
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-white/80 text-sm md:text-base mb-2">{v.destination}, {v.country}</p>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-2">{v.title}</h1>
            <p className="text-white/80 text-lg max-w-2xl">{v.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Gallery thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mt-2 mb-6">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                  index === currentImageIndex ? 'border-ocean-500 ring-2 ring-ocean-200' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`${trip.title} foto ${index + 1}`} className="w-28 h-20 object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center p-4">
                <MapPin className="w-6 h-6 mx-auto text-ocean-500 mb-2" />
                <p className="text-xs text-gray-500">{t('home.destination')}</p>
                <p className="font-semibold">{v.destination}</p>
              </Card>
              <Card className="text-center p-4">
                <Clock className="w-6 h-6 mx-auto text-ocean-500 mb-2" />
                <p className="text-xs text-gray-500">{t('home.duration')}</p>
                <p className="font-semibold">{v.duration}</p>
              </Card>
              <Card className="text-center p-4">
                <Calendar className="w-6 h-6 mx-auto text-ocean-500 mb-2" />
                <p className="text-xs text-gray-500">{t('home.period')}</p>
                <p className="font-semibold text-sm">{v.period}</p>
              </Card>
              <Card className="text-center p-4">
                <Hotel className="w-6 h-6 mx-auto text-ocean-500 mb-2" />
                <p className="text-xs text-gray-500">{t('home.treatment')}</p>
                <p className="font-semibold text-sm">{v.treatment}</p>
              </Card>
            </div>

            {/* Tabs Content */}
            <Tabs defaultValue="overview" className="bg-white rounded-2xl shadow-sm">
              <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-ocean-600 py-4 px-6">
                  {t('home.overview')}
                </TabsTrigger>
                <TabsTrigger value="includes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-ocean-600 py-4 px-6">
                  {t('home.whatIncluded')}
                </TabsTrigger>
                <TabsTrigger value="itinerary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-ocean-600 py-4 px-6">
                  {t('home.itineraryTab')}
                </TabsTrigger>
                <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-ocean-600 py-4 px-6">
                  {t('home.infoTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6">
                <div className="prose prose-ocean max-w-none" dangerouslySetInnerHTML={{ __html: toHtml(v.description) }} />
                
                {trip.hotelName && (
                  <div className="mt-6 p-4 bg-sand-50 rounded-xl">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Hotel className="w-5 h-5 text-ocean-500" />
                      {t('home.structure')}
                    </h4>
                    <p className="text-gray-700">{v.hotelName}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="includes" className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-lg text-green-700 mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      {t('home.quotaIncludes')}
                    </h3>
                    <ul className="space-y-3">
                      {(tIncluded.length ? tIncluded.map(x => x.s) : (trip.included || [])).map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-red-700 mb-4 flex items-center gap-2">
                      <X className="w-5 h-5" />
                      {t('home.quotaExcludes')}
                    </h3>
                    <ul className="space-y-3">
                      {(tExcluded.length ? tExcluded.map(x => x.s) : (trip.excluded || [])).map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="itinerary" className="p-6">
                <h3 className="font-semibold text-lg mb-4">{t('home.program')}</h3>
                <div className="space-y-4">
                  {(tItinerary.length ? tItinerary : (trip.itinerary || [])).map((day, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-sand-50 rounded-xl">
                      <div className="w-16 h-16 bg-ocean-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                        {typeof day.day === 'number' ? `G${day.day}` : day.day}
                      </div>
                      <div>
                        <h4 className="font-semibold text-ocean-900">{day.title}</h4>
                        <div className="prose prose-sm max-w-none text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: toHtml(day.description) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="info" className="p-6">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-sand-50 rounded-xl">
                      <p className="text-sm text-gray-500">{t('home.departureFrom')}</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Plane className="w-4 h-4 text-ocean-500" />
                        {v.departureCity}
                      </p>
                    </div>
                    <div className="p-4 bg-sand-50 rounded-xl">
                      <p className="text-sm text-gray-500">{t('home.transportLabel')}</p>
                      <p className="font-semibold">{v.transport}</p>
                    </div>
                  </div>

                  {trip.faqs?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">{t('home.faq')}</h3>
                      <Accordion type="single" collapsible>
                        {(tFaqs.length ? tFaqs : trip.faqs).map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>{faq.answer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Sticky CTA */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              {/* Price */}
              <div className="text-center mb-6 pb-6 border-b">
                <p className="text-sm text-gray-500 mb-1">{t('catalog.from')}</p>
                <div className="flex items-baseline justify-center gap-2">
                  {trip.fullPrice > trip.priceFrom && (
                    <span className="text-xl text-gray-400 line-through">€{trip.fullPrice}</span>
                  )}
                  <span className="text-4xl font-display font-bold text-ocean-600">€{trip.priceFrom}</span>
                </div>
                <p className="text-gray-500">{t('home.perPersonFull')}</p>
                {trip.discountPercent > 0 && (
                  <Badge className="mt-2 bg-coral-500">{t('home.youSave')} {trip.discountPercent}%</Badge>
                )}
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-6 text-lg"
                  onClick={() => window.open(generateWhatsAppLink(), '_blank')}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t('catalog.contactWhatsapp')}
                </Button>
                
                <Button 
                  className="w-full bg-gradient-to-r from-coral-500 to-coral-400 hover:from-coral-600 hover:to-coral-500 py-6 text-lg"
                  onClick={() => setShowContactForm(true)}
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {t('home.requestQuoteShort')}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full py-6"
                  onClick={() => window.location.href = 'tel:+39XXXXXXXXXX'}
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {t('home.callUs')}
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>{t('home.securePaymentsFull')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Users className="w-5 h-5 text-ocean-500" />
                  <span>{t('home.support247Full')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>{t('home.happyClients')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== VIAGGI CORRELATI ===== */}
      {relatedTrips.length > 0 && (
        <section className="bg-white border-t mt-8">
          <div className="max-w-7xl mx-auto px-4 py-12 pb-28 lg:pb-12">
            <div className="flex items-end justify-between mb-6 gap-4">
              <div>
                <p className="text-ocean-500 font-medium text-sm mb-1">Continua a esplorare</p>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-ocean-900">
                  Viaggi simili che potrebbero piacerti
                </h2>
              </div>
              <Link href={backHref} className="hidden md:inline-flex items-center gap-1 text-ocean-500 hover:text-ocean-600 text-sm font-medium shrink-0">
                {categoryName ? `Vedi altri viaggi (${categoryName})` : 'Vedi tutti i viaggi'} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedTrips.map((rt, i) => {
                const r = tRelated[i] || rt;
                return (
                  <Link
                    key={rt.id}
                    href={`/viaggio/${rt.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="relative h-40 overflow-hidden bg-gray-100">
                      {(rt.cardImage || rt.images?.[0]) && (
                        <img
                          src={rt.cardImage || rt.images?.[0]}
                          alt={r.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {rt.isPromo && rt.discountPercent > 0 && <Badge className="bg-coral-500">-{rt.discountPercent}%</Badge>}
                        {rt.isLastMinute && <Badge className="bg-red-500">Last Minute</Badge>}
                        {rt.isNew && !rt.isPromo && <Badge className="bg-teal-500">Novità</Badge>}
                      </div>
                      <p className="absolute bottom-2 left-3 text-white/90 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {r.destination}
                      </p>
                    </div>

                    <div className="p-4">
                      <h3 className="font-display font-semibold text-ocean-900 leading-snug line-clamp-2 min-h-[2.9rem] group-hover:text-ocean-600 transition-colors">
                        {r.title}
                      </h3>
                      {r.duration && (
                        <p className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <Clock className="w-3.5 h-3.5" /> {r.duration}
                        </p>
                      )}
                      <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-50">
                        <div>
                          <span className="block text-[11px] text-gray-400">{t('catalog.from')}</span>
                          <span className="text-lg font-bold text-ocean-600">€{rt.priceFrom}</span>
                        </div>
                        <span className="text-ocean-500 text-sm font-medium flex items-center gap-0.5">
                          Scopri <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs text-gray-500">{t('catalog.from')}</p>
            <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="lg"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => window.open(generateWhatsAppLink(), '_blank')}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              className="bg-coral-500 hover:bg-coral-600"
              onClick={() => setShowContactForm(true)}
            >
              {t('home.quoteBtn')}
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{t('home.requestQuote')}</DialogTitle>
            <DialogDescription>
              {t('home.fillFormFor')} <strong>{v.title}</strong>
            </DialogDescription>
          </DialogHeader>

          {formSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.requestSent')}</h3>
              <p className="text-gray-600">{t('home.contactSoon')}</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('home.firstName')} *</Label>
                  <Input 
                    id="firstName"
                    required
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('home.lastName')} *</Label>
                  <Input 
                    id="lastName"
                    required
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('home.emailLabel')} *</Label>
                <Input 
                  id="email"
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('home.phone')} *</Label>
                <Input 
                  id="phone"
                  type="tel"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('home.participants')}</Label>
                  <Select 
                    value={contactForm.participants} 
                    onValueChange={(value) => setContactForm({ ...contactForm, participants: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('home.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, '6+'].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('home.preferredDate')}</Label>
                  <Input 
                    type="text"
                    placeholder={t('home.preferredDatePh')}
                    value={contactForm.preferredDate}
                    onChange={(e) => setContactForm({ ...contactForm, preferredDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>{t('home.notesLabel')}</Label>
                <Textarea 
                  placeholder={t('home.notesPh')}
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox 
                  id="privacy"
                  checked={contactForm.privacy}
                  onCheckedChange={(checked) => setContactForm({ ...contactForm, privacy: checked })}
                />
                <Label htmlFor="privacy" className="text-sm text-gray-600 leading-tight">
                  {t('home.gdprConsent')} *
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-coral-500 to-coral-400 hover:from-coral-600 hover:to-coral-500"
                disabled={formSubmitting || !contactForm.privacy}
              >
                {formSubmitting ? t('home.sending2') : t('home.sendRequest')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
