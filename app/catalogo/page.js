'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedArray } from '@/lib/useT';
import { stripHtml } from '@/lib/richtext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Search, MapPin, Calendar, Clock, Hotel, Plane, Heart, Star,
  Filter, Grid, List, ChevronRight, MessageCircle, X, SlidersHorizontal,
  Compass, Phone, ArrowUpDown
} from 'lucide-react';

export default function CatalogoPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    category: searchParams.get('categoria') || 'all',
    destination: searchParams.get('destinazione') || '',
    priceRange: [0, 5000],
    duration: 'all',
    treatment: 'all',
    badges: {
      promo: false,
      bestSeller: false,
      lastMinute: false,
      new: false
    }
  });
  
  const [sortBy, setSortBy] = useState('order');

  // Translate DB trips for display (filtering still uses raw `trips`)
  const { items: translatedTrips } = useTranslatedArray(trips, ['title', 'destination', 'country', 'shortDescription', 'duration', 'treatment']);
  const tripMap = useMemo(() => {
    const m = {};
    translatedTrips.forEach((tr) => { if (tr?.id) m[tr.id] = tr; });
    return m;
  }, [translatedTrips]);

  useEffect(() => {
    const savedWishlist = localStorage.getItem('tribuWishlist');
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist));
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsRes, categoriesRes] = await Promise.all([
        fetch('/api/trips'),
        fetch('/api/categories')
      ]);
      
      const tripsData = await tripsRes.json();
      const categoriesData = await categoriesRes.json();
      
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const filteredTrips = trips
    .filter(trip => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!trip.title.toLowerCase().includes(searchLower) &&
            !trip.destination.toLowerCase().includes(searchLower) &&
            !trip.country?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (filters.category !== 'all' && trip.category !== filters.category) {
        return false;
      }
      
      // Destination filter
      if (filters.destination && !trip.destination.toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      
      // Price filter
      if (trip.priceFrom < filters.priceRange[0] || trip.priceFrom > filters.priceRange[1]) {
        return false;
      }
      
      // Duration filter
      if (filters.duration !== 'all') {
        const days = parseInt(trip.duration) || 0;
        if (filters.duration === 'short' && days > 4) return false;
        if (filters.duration === 'medium' && (days < 5 || days > 7)) return false;
        if (filters.duration === 'long' && days < 8) return false;
      }
      
      // Treatment filter
      if (filters.treatment !== 'all') {
        const treatmentLower = trip.treatment?.toLowerCase() || '';
        if (filters.treatment === 'all-inclusive' && !treatmentLower.includes('all inclusive')) return false;
        if (filters.treatment === 'half-board' && !treatmentLower.includes('mezza pensione')) return false;
        if (filters.treatment === 'bb' && !treatmentLower.includes('colazione')) return false;
      }
      
      // Badge filters
      if (filters.badges.promo && !trip.isPromo) return false;
      if (filters.badges.bestSeller && !trip.isBestSeller) return false;
      if (filters.badges.lastMinute && !trip.isLastMinute) return false;
      if (filters.badges.new && !trip.isNew) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.priceFrom - b.priceFrom;
        case 'price-desc':
          return b.priceFrom - a.priceFrom;
        case 'name':
          return a.title.localeCompare(b.title);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return (a.order || 0) - (b.order || 0);
      }
    });

  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      destination: '',
      priceRange: [0, 5000],
      duration: 'all',
      treatment: 'all',
      badges: { promo: false, bestSeller: false, lastMinute: false, new: false }
    });
  };

  const generateWhatsAppLink = (trip) => {
    const message = encodeURIComponent(
      `Ciao! Sono interessato al viaggio: ${trip?.title}.\nVorrei ricevere maggiori informazioni e un preventivo.\n\nGrazie!`
    );
    return `https://wa.me/39XXXXXXXXXX?text=${message}`;
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">{t('catalog.search')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('catalog.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">{t('catalog.category')}</Label>
        <Select 
          value={filters.category} 
          onValueChange={(value) => setFilters({ ...filters, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('catalog.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('catalog.allCategories')}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          {t('catalog.budget')}: €{filters.priceRange[0]} - €{filters.priceRange[1]}
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => setFilters({ ...filters, priceRange: value })}
          min={0}
          max={5000}
          step={100}
          className="mt-4"
        />
      </div>

      {/* Duration */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">{t('catalog.duration')}</Label>
        <Select 
          value={filters.duration} 
          onValueChange={(value) => setFilters({ ...filters, duration: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('catalog.anyDuration')}</SelectItem>
            <SelectItem value="short">{t('catalog.short') || 'Breve (1-4 giorni)'}</SelectItem>
            <SelectItem value="medium">{t('catalog.medium') || 'Media (5-7 giorni)'}</SelectItem>
            <SelectItem value="long">{t('catalog.long') || 'Lunga (8+ giorni)'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Treatment */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">{t('catalog.treatment')}</Label>
        <Select 
          value={filters.treatment} 
          onValueChange={(value) => setFilters({ ...filters, treatment: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('catalog.any')}</SelectItem>
            <SelectItem value="all-inclusive">All Inclusive</SelectItem>
            <SelectItem value="half-board">{t('catalog.halfBoard') || 'Mezza Pensione'}</SelectItem>
            <SelectItem value="bb">{t('catalog.bb') || 'Pernottamento e Colazione'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Badge Filters */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">{t('catalog.filterBy')}</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="promo" checked={filters.badges.promo}
              onCheckedChange={(checked) => setFilters({ ...filters, badges: { ...filters.badges, promo: checked } })} />
            <Label htmlFor="promo" className="text-sm cursor-pointer">{t('catalog.onlyPromo')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bestSeller" checked={filters.badges.bestSeller}
              onCheckedChange={(checked) => setFilters({ ...filters, badges: { ...filters.badges, bestSeller: checked } })} />
            <Label htmlFor="bestSeller" className="text-sm cursor-pointer">{t('catalog.bestSeller')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="lastMinute" checked={filters.badges.lastMinute}
              onCheckedChange={(checked) => setFilters({ ...filters, badges: { ...filters.badges, lastMinute: checked } })} />
            <Label htmlFor="lastMinute" className="text-sm cursor-pointer">{t('catalog.lastMinute')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="new" checked={filters.badges.new}
              onCheckedChange={(checked) => setFilters({ ...filters, badges: { ...filters.badges, new: checked } })} />
            <Label htmlFor="new" className="text-sm cursor-pointer">{t('catalog.novelty')}</Label>
          </div>
        </div>
      </div>

      {/* Reset */}
      <Button variant="outline" onClick={resetFilters} className="w-full">
        <X className="w-4 h-4 mr-2" />
        {t('catalog.resetFilters')}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ocean-600 font-medium">{t('catalog.loadingTrips')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link href="/wishlist">
                <Button variant="outline" size="sm" className="relative">
                  <Heart className="w-4 h-4 mr-2" />
                  {t('catalog.favorites')}
                  {wishlist.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-coral-500 text-white text-xs rounded-full flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </Button>
              </Link>
              <Button className="bg-green-500 hover:bg-green-600" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                {t('catalog.contact')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('catalog.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {t('catalog.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-ocean-500" />
                {t('catalog.filters')}
              </h2>
              <FilterSidebar />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      {t('catalog.filters')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>{t('catalog.filters')}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterSidebar />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-gray-600">
                  <span className="font-semibold text-ocean-600">{filteredTrips.length}</span> {t('catalog.tripsFound')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">{t('catalog.recommended')}</SelectItem>
                    <SelectItem value="price-asc">{t('catalog.priceLowToHigh')}</SelectItem>
                    <SelectItem value="price-desc">{t('catalog.priceHighToLow')}</SelectItem>
                    <SelectItem value="name">A-Z</SelectItem>
                    <SelectItem value="newest">{t('catalog.newest')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden sm:flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-ocean-50 text-ocean-600' : 'bg-white'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-ocean-50 text-ocean-600' : 'bg-white'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Trips Grid/List */}
            {filteredTrips.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('catalog.noTripsFound')}</h3>
                <p className="text-gray-500 mb-4">{t('catalog.tryAdjustFilters')}</p>
                <Button onClick={resetFilters} variant="outline">
                  {t('catalog.resetFilters')}
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTrips.map((trip) => (
                  <TripCard 
                    key={trip.id} 
                    trip={tripMap[trip.id] || trip}
                    isWishlisted={wishlist.includes(trip.id)}
                    onToggleWishlist={() => toggleWishlist(trip.id)}
                    onWhatsApp={() => window.open(generateWhatsAppLink(trip), '_blank')}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTrips.map((trip) => (
                  <TripCardList 
                    key={trip.id} 
                    trip={tripMap[trip.id] || trip}
                    isWishlisted={wishlist.includes(trip.id)}
                    onToggleWishlist={() => toggleWishlist(trip.id)}
                    onWhatsApp={() => window.open(generateWhatsAppLink(trip), '_blank')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Grid Card Component
function TripCard({ trip, isWishlisted, onToggleWishlist, onWhatsApp }) {
  const { t } = useT();
  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={trip.cardImage} 
          alt={trip.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {trip.isPromo && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-coral-500 to-coral-400 text-white text-xs font-semibold rounded-full">
              -{trip.discountPercent}%
            </span>
          )}
          {trip.isBestSeller && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 text-xs font-semibold rounded-full">
              Best Seller
            </span>
          )}
          {trip.isLastMinute && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-semibold rounded-full">
              Last Minute
            </span>
          )}
          {trip.isNew && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-semibold rounded-full">
              {t('catalog.novelty')}
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button 
          onClick={(e) => { e.preventDefault(); onToggleWishlist(); }}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isWishlisted 
              ? 'bg-coral-500 text-white' 
              : 'bg-white/90 text-gray-600 hover:text-coral-500 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-sm text-white/80">{trip.destination}, {trip.country}</p>
          <h3 className="text-lg font-display font-bold leading-tight">{trip.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-ocean-500" />
            <span>{trip.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hotel className="w-4 h-4 text-ocean-500" />
            <span className="truncate">{trip.treatment}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">{t('catalog.from')}</p>
            <div className="flex items-baseline gap-1.5">
              {trip.fullPrice > trip.priceFrom && (
                <span className="text-sm text-gray-400 line-through">€{trip.fullPrice}</span>
              )}
              <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Link href={`/viaggio/${trip.slug}`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700" size="sm">
              {t('catalog.discover')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Button 
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50"
            onClick={onWhatsApp}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// List Card Component
function TripCardList({ trip, isWishlisted, onToggleWishlist, onWhatsApp }) {
  const { t } = useT();
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex">
      {/* Image */}
      <div className="relative w-72 flex-shrink-0">
        <img 
          src={trip.cardImage} 
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20"></div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {trip.isPromo && (
            <span className="px-2 py-0.5 bg-coral-500 text-white text-xs font-semibold rounded">
              -{trip.discountPercent}%
            </span>
          )}
          {trip.isBestSeller && (
            <span className="px-2 py-0.5 bg-amber-500 text-gray-900 text-xs font-semibold rounded">
              Best Seller
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button 
          onClick={onToggleWishlist}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isWishlisted ? 'bg-coral-500 text-white' : 'bg-white/90 text-gray-600 hover:text-coral-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <p className="text-sm text-ocean-500 mb-1">{trip.destination}, {trip.country}</p>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">{trip.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">{stripHtml(trip.shortDescription)}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-ocean-500" />
              {trip.duration}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-ocean-500" />
              {trip.period?.split(' ')[0]}
            </div>
            <div className="flex items-center gap-1.5">
              <Hotel className="w-4 h-4 text-ocean-500" />
              {trip.treatment}
            </div>
            <div className="flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-ocean-500" />
              {trip.departureCity?.split('/')[0]}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="text-xs text-gray-500">{t('catalog.from')}</p>
            <div className="flex items-baseline gap-2">
              {trip.fullPrice > trip.priceFrom && (
                <span className="text-base text-gray-400 line-through">€{trip.fullPrice}</span>
              )}
              <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
              <span className="text-gray-500">{t('catalog.perPerson')}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={onWhatsApp}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Link href={`/viaggio/${trip.slug}`}>
              <Button className="bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700">
                {t('catalog.discoverTrip')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
