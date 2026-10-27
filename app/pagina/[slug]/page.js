'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Compass, ArrowLeft, Phone, Heart, Clock, Hotel, ChevronRight, MessageCircle, Home,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function StaticPage() {
  const params = useParams();
  const slug = params.slug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [footer, setFooter] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pages/${slug}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setPage(data);
      } catch (e) { setNotFound(true); } finally { setLoading(false); }
    };
    load();
    fetch('/api/footer').then((r) => r.json()).then(setFooter).catch(() => {});
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tribuWishlist') : null;
    if (saved) setWishlist(JSON.parse(saved));
  }, [slug]);

  const toggleWishlist = (id) => {
    const next = wishlist.includes(id) ? wishlist.filter((x) => x !== id) : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem('tribuWishlist', JSON.stringify(next));
  };

  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-ocean-500 hover:text-ocean-600">
          <ArrowLeft className="w-5 h-5" /><span className="hidden sm:inline">Torna al sito</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/"><Button size="sm" variant="outline"><Home className="w-4 h-4" /></Button></Link>
        </div>
      </div>
    </header>
  );

  const SiteFooter = () => (
    <footer className="bg-ocean-900 text-white/80 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm">
        <p>{footer?.copyright || ''}</p>
        {footer?.bottomLinks && (
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            {footer.bottomLinks.map((l, i) => (
              <a key={i} href={l.url || '#'} className="hover:text-white">{l.label}</a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-3">Pagina non trovata</h1>
          <p className="text-gray-500 mb-6">La pagina che stai cercando non esiste o non è più disponibile.</p>
          <Link href="/"><Button className="bg-ocean-500 hover:bg-ocean-600">Torna alla home</Button></Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const trips = Array.isArray(page.trips) ? page.trips : [];

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      <Header />

      {/* Hero */}
      {page.heroImage ? (
        <div className="relative h-72 bg-cover bg-center" style={{ backgroundImage: `url(${page.heroImage})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-8">
            <h1 className="text-4xl font-display font-bold text-white">{page.title}</h1>
            {page.subtitle && <p className="text-white/85 text-lg mt-1">{page.subtitle}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-ocean-500 to-teal-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-display font-bold">{page.title}</h1>
            {page.subtitle && <p className="text-white/85 text-lg mt-2">{page.subtitle}</p>}
          </div>
        </div>
      )}

      <main className="flex-1">
        {page.layout === 'trips' ? (
          <div className="max-w-7xl mx-auto px-4 py-10">
            {page.intro && <p className="text-gray-600 max-w-3xl mb-8">{page.intro}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-gray-900">{trips.length} viaggi disponibili</h2>
            </div>
            {trips.length === 0 ? (
              <Card className="text-center py-12"><CardContent>
                <p className="text-gray-500 mb-4">Nessun viaggio disponibile al momento.</p>
                <Link href="/#viaggi"><Button>Vedi tutti i viaggi</Button></Link>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <div key={trip.id} className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="relative h-48 overflow-hidden">
                      <img src={trip.cardImage} alt={trip.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {trip.isPromo && <Badge className="bg-coral-500">-{trip.discountPercent}%</Badge>}
                        {trip.isBestSeller && <Badge className="bg-amber-500">Best Seller</Badge>}
                      </div>
                      <button onClick={() => toggleWishlist(trip.id)} className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${wishlist.includes(trip.id) ? 'bg-coral-500 text-white' : 'bg-white/90 text-gray-600 hover:text-coral-500'}`}>
                        <Heart className={`w-4 h-4 ${wishlist.includes(trip.id) ? 'fill-current' : ''}`} />
                      </button>
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-sm text-white/80">{trip.destination}</p>
                        <h3 className="font-display font-bold">{trip.title}</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {trip.duration}</span>
                        <span className="flex items-center gap-1"><Hotel className="w-4 h-4" /> {trip.treatment}</span>
                      </div>
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-500">da</p>
                          <div className="flex items-baseline gap-1">
                            {trip.fullPrice > trip.priceFrom && <span className="text-sm text-gray-400 line-through">€{trip.fullPrice}</span>}
                            <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/viaggio/${trip.slug}`} className="flex-1">
                          <Button className="w-full bg-ocean-500 hover:bg-ocean-600" size="sm">Scopri <ChevronRight className="w-4 h-4 ml-1" /></Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-10">
            <article className="static-page-content bg-white rounded-2xl shadow-sm p-6 md:p-10" dangerouslySetInnerHTML={{ __html: page.content || '<p>Contenuto non disponibile.</p>' }} />
          </div>
        )}
      </main>

      <SiteFooter />

      <style>{`
        .static-page-content h2{ font-size:1.6rem; font-weight:700; color:#0f172a; margin:1.2rem 0 .6rem; }
        .static-page-content h3{ font-size:1.25rem; font-weight:700; color:#0f172a; margin:1rem 0 .5rem; }
        .static-page-content p{ margin:.7rem 0; line-height:1.75; color:#374151; }
        .static-page-content ul{ list-style:disc; padding-left:1.6rem; margin:.7rem 0; color:#374151; }
        .static-page-content ol{ list-style:decimal; padding-left:1.6rem; margin:.7rem 0; color:#374151; }
        .static-page-content li{ margin:.3rem 0; line-height:1.7; }
        .static-page-content a{ color:#2563eb; text-decoration:underline; }
        .static-page-content strong{ font-weight:700; }
      `}</style>
    </div>
  );
}
