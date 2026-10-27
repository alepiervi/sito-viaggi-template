'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Heart, Clock, Hotel, MapPin, ChevronRight, MessageCircle, 
  Compass, ArrowLeft, Phone, Ship, Waves, Sparkles, Map, Calendar
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedObject, useTranslatedArray } from '@/lib/useT';

const CATEGORY_INFO = {
  crociere: {
    title: 'Crociere',
    subtitle: 'Viaggia per mare in tutto comfort',
    description: 'Scopri le nostre crociere nel Mediterraneo, nei Caraibi e nelle destinazioni più esclusive del mondo. A bordo di navi moderne e lussuose, vivrai un\'esperienza indimenticabile.',
    icon: Ship,
    heroImage: 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1920',
    faqs: [
      { q: 'Cosa è incluso in una crociera?', a: 'Le nostre crociere includono generalmente cabina, pasti a bordo, intrattenimento e accesso alle strutture della nave.' },
      { q: 'Quali documenti servono?', a: 'Per crociere nel Mediterraneo basta la carta d\'identità. Per destinazioni extra-UE serve il passaporto.' },
      { q: 'È adatta alle famiglie?', a: 'Assolutamente sì! Le navi moderne hanno aree dedicate ai bambini e attività per tutte le età.' }
    ]
  },
  mare: {
    title: 'Mare',
    subtitle: 'Le spiagge più belle del mondo',
    description: 'Dalle Maldive alla Sardegna, dal Mar Rosso alle Canarie. Trova la tua spiaggia da sogno e vivi una vacanza di puro relax tra acque cristalline e sabbia dorata.',
    icon: Waves,
    heroImage: 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=1920',
    faqs: [
      { q: 'Qual è il periodo migliore?', a: 'Dipende dalla destinazione. Il Mediterraneo è ideale da maggio a settembre, mentre destinazioni tropicali sono perfette tutto l\'anno.' },
      { q: 'Cosa significa All Inclusive?', a: 'Include pasti, bevande e spesso anche snack e attività sportive. Verifica sempre i dettagli nel pacchetto.' }
    ]
  },
  villaggi: {
    title: 'Villaggi',
    subtitle: 'Relax in villaggi all inclusive',
    description: 'I migliori villaggi turistici selezionati per te: animazione, sport, relax e divertimento per tutta la famiglia in strutture di qualità.',
    icon: Hotel,
    heroImage: 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1920',
    faqs: [
      { q: 'Ci sono villaggi per famiglie?', a: 'Sì, molti villaggi hanno miniclub, animazione per bambini e spiagge attrezzate.' },
      { q: 'L\'animazione è obbligatoria?', a: 'No, puoi sempre scegliere di goderti la tua vacanza in totale relax.' }
    ]
  },
  weekend: {
    title: 'Weekend',
    subtitle: 'Fughe romantiche e city break',
    description: 'Non serve andare lontano per vivere un\'esperienza indimenticabile. Scopri le nostre proposte per weekend romantici, culturali o di puro relax.',
    icon: Calendar,
    heroImage: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1920',
    faqs: [
      { q: 'Quanto costa un weekend tipo?', a: 'I nostri weekend partono da €200-300 a persona e includono volo e hotel.' },
      { q: 'Quali sono le destinazioni più richieste?', a: 'Parigi, Barcellona, Amsterdam, Praga e le capitali europee sono le più amate.' }
    ]
  },
  tour: {
    title: 'Tour Organizzati',
    subtitle: 'Viaggi organizzati con guida',
    description: 'Tour guidati nelle destinazioni più affascinanti del mondo. Con guida italiana, trasporti inclusi e itinerari studiati per farti vivere esperienze autentiche.',
    icon: Map,
    heroImage: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1920',
    faqs: [
      { q: 'I tour sono in italiano?', a: 'Sì, tutti i nostri tour hanno guide che parlano italiano.' },
      { q: 'Quanto è impegnativo un tour?', a: 'Offriamo tour di diversa intensità: da rilassati a più avventurosi. Ogni scheda indica il livello.' }
    ]
  },
  parchi: {
    title: 'Parchi Divertimento',
    subtitle: 'Divertimento per tutta la famiglia',
    description: 'Disneyland Paris, Gardaland, Europa Park e molto altro. Pacchetti completi con biglietti, hotel e trasporti per vivere la magia dei parchi a tema.',
    icon: Sparkles,
    heroImage: 'https://images.unsplash.com/photo-1528566401806-917f86c1fc2d?w=1920',
    faqs: [
      { q: 'I biglietti sono inclusi?', a: 'Sì, i nostri pacchetti includono sempre i biglietti d\'ingresso ai parchi.' },
      { q: 'Qual è l\'età consigliata?', a: 'I parchi sono adatti a tutte le età, ma sono particolarmente amati da famiglie con bambini dai 3 ai 12 anni.' }
    ]
  }
};

export default function CategoriaPage() {
  const params = useParams();
  const { t } = useT();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  
  const categorySlug = params.categoria;
  const categoryInfo = CATEGORY_INFO[categorySlug] || {
    title: categorySlug,
    subtitle: '',
    description: '',
    heroImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920',
    faqs: []
  };
  const IconComponent = categoryInfo.icon || Compass;

  // Translations
  const { obj: tCategory } = useTranslatedObject(categoryInfo, ['title', 'subtitle', 'description']);
  const ci = tCategory || categoryInfo;
  const { items: tFaqs } = useTranslatedArray(categoryInfo.faqs || [], ['q', 'a']);
  const { items: tTrips } = useTranslatedArray(trips, ['title', 'destination', 'duration', 'treatment']);

  useEffect(() => {
    loadData();
    const saved = localStorage.getItem('tribuWishlist');
    if (saved) setWishlist(JSON.parse(saved));
  }, [categorySlug]);

  const loadData = async () => {
    try {
      const response = await fetch(`/api/trips/category/${categorySlug}`);
      const data = await response.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = (tripId) => {
    const newWishlist = wishlist.includes(tripId)
      ? wishlist.filter(id => id !== tripId)
      : [...wishlist, tripId];
    setWishlist(newWishlist);
    localStorage.setItem('tribuWishlist', JSON.stringify(newWishlist));
  };

  const generateWhatsAppLink = (trip) => {
    const message = encodeURIComponent(
      `Ciao! Sono interessato al viaggio: ${trip?.title}.\nVorrei ricevere maggiori informazioni.\n\nGrazie!`
    );
    return `https://wa.me/39XXXXXXXXXX?text=${message}`;
  };

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-ocean-500 hover:text-ocean-600">
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button className="bg-green-500 hover:bg-green-600" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                {t('nav.contattaci')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div 
        className="relative h-80 bg-cover bg-center"
        style={{ backgroundImage: `url(${categoryInfo.heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20"></div>
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold text-white">{ci.title}</h1>
              <p className="text-white/80 text-lg">{ci.subtitle}</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl">{ci.description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Trips */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-gray-900">
              {trips.length} {t('home.tripsAvailable')}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : trips.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-500 mb-4">{t('home.noTripsCategory')}</p>
                <Link href="/#viaggi">
                  <Button>{t('home.seeAllTrips')}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip, idx) => {
                const dt = tTrips[idx] || trip;
                return (
                <div key={trip.id} className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={trip.cardImage} 
                      alt={dt.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {trip.isPromo && <Badge className="bg-coral-500">-{trip.discountPercent}%</Badge>}
                      {trip.isBestSeller && <Badge className="bg-amber-500">Best Seller</Badge>}
                    </div>
                    
                    {/* Wishlist */}
                    <button 
                      onClick={() => toggleWishlist(trip.id)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        wishlist.includes(trip.id) 
                          ? 'bg-coral-500 text-white' 
                          : 'bg-white/90 text-gray-600 hover:text-coral-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${wishlist.includes(trip.id) ? 'fill-current' : ''}`} />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-sm text-white/80">{dt.destination}</p>
                      <h3 className="font-display font-bold">{dt.title}</h3>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {dt.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hotel className="w-4 h-4" /> {dt.treatment}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500">{t('catalog.from')}</p>
                        <div className="flex items-baseline gap-1">
                          {trip.fullPrice > trip.priceFrom && (
                            <span className="text-sm text-gray-400 line-through">€{trip.fullPrice}</span>
                          )}
                          <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/viaggio/${trip.slug}`} className="flex-1">
                        <Button className="w-full bg-ocean-500 hover:bg-ocean-600" size="sm">
                          {t('catalog.discover')} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-600"
                        onClick={() => window.open(generateWhatsAppLink(trip), '_blank')}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAQ */}
        {categoryInfo.faqs && categoryInfo.faqs.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
              {t('home.faqAbout')} {ci.title}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {(tFaqs.length ? tFaqs : categoryInfo.faqs).map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-ocean-500 to-teal-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-display font-bold mb-2">{t('home.notFindLooking')}</h3>
          <p className="text-white/80 mb-6">{t('home.contactFreeAdvice')}</p>
          <div className="flex justify-center gap-4">
            <Button className="bg-white text-ocean-600 hover:bg-gray-100">
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white/10">
              <Phone className="w-5 h-5 mr-2" />
              {t('home.callUs')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
