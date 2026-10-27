'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, MapPin, Calendar, Users, Plane, Ship, Hotel, Sparkles, 
  Heart, Star, Clock, Phone, Mail, MessageCircle, ChevronRight,
  ArrowRight, Check, Menu, X, Globe, Shield, Headphones, Award,
  Sun, Waves, Map, Compass, Send, Zap, ChevronDown, BarChart3
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useModule, useHomeLayout } from '@/components/TenantProvider';
import { useT, useTranslatedObject, useTranslatedArray } from '@/lib/useT';
import { toInlineHtml } from '@/lib/richtext';

export default function HomePage() {
  const { t, lang } = useT();
  // Funzioni attivate dal Super Admin per questo sito
  const hasBlog = useModule('blog');
  const home = useHomeLayout();
  const hasCustomers = useModule('clienti_buoni');
  const hasQuickQuote = useModule('preventivo_rapido');
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [homepageTabs, setHomepageTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [footerData, setFooterData] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroBanners, setHeroBanners] = useState([]);
  const [activeHeroBanner, setActiveHeroBanner] = useState(0);
  // Translated versions for non-IT languages
  const { items: translatedHeroBanners } = useTranslatedArray(heroBanners, ['title', 'highlight', 'subtitle']);
  const { items: translatedCategories } = useTranslatedArray(categories, ['name', 'description']);
  const { items: translatedTestimonials } = useTranslatedArray(testimonials, ['text', 'location', 'trip']);
  const { items: translatedSlides } = useTranslatedArray(heroSlides, ['title', 'subtitle', 'ctaText']);
  const { items: translatedHomepageTabs } = useTranslatedArray(homepageTabs, ['name', 'sectionTitle', 'sectionSubtitle']);
  const heroBannersToShow = translatedHeroBanners;
  const categoriesToShow = translatedCategories;
  const testimonialsToShow = translatedTestimonials;
  const slidesToShow = translatedSlides;
  const tabsToShow = translatedHomepageTabs;
  // Translate the selected trip preview dialog (stable, no flicker)
  const { obj: tSelectedTrip } = useTranslatedObject(selectedTrip, ['title', 'subtitle', 'destination', 'duration', 'period', 'treatment', 'description']);
  const selIncluded = useMemo(() => (selectedTrip?.included || []).map((s, i) => ({ k: String(i), text: s })), [selectedTrip]);
  const selExcluded = useMemo(() => (selectedTrip?.excluded || []).map((s, i) => ({ k: String(i), text: s })), [selectedTrip]);
  const { items: tIncluded } = useTranslatedArray(selIncluded, ['text']);
  const { items: tExcluded } = useTranslatedArray(selExcluded, ['text']);
  const dlgTrip = tSelectedTrip || selectedTrip;
  // Quick Quote wizard options: stored value stays canonical (IT) for backend; label is translated
  const qqTripTypes = [
    { value: 'Crociera', icon: Ship, label: t('qq.typeCruise') },
    { value: 'Mare & Relax', icon: Waves, label: t('qq.typeSeaRelax') },
    { value: 'Tour Culturale', icon: Map, label: t('qq.typeCultural') },
    { value: 'Weekend Romantico', icon: Heart, label: t('qq.typeRomantic') },
    { value: 'Villaggi Famiglia', icon: Hotel, label: t('qq.typeFamily') },
    { value: 'Parchi Divertimento', icon: Sparkles, label: t('qq.typeParks') },
  ];
  const qqWhenOptions = (() => {
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const now = new Date();
    const opts = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = cap(d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }));
      const label = lang === 'en'
        ? cap(d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
        : value;
      opts.push({ value, label });
    }
    opts.push({ value: `Inverno ${now.getFullYear()}`, label: lang === 'en' ? `Winter ${now.getFullYear()}` : `Inverno ${now.getFullYear()}` });
    opts.push({ value: 'Date flessibili', label: t('qq.whenFlexible') });
    return opts;
  })();
  const qqBudgetOptions = [
    { value: 'Fino a €500', label: t('qq.budgetUpTo500') },
    { value: '€500 - €1000', label: t('qq.budget5001000') },
    { value: '€1000 - €2000', label: t('qq.budget10002000') },
    { value: 'Oltre €2000', label: t('qq.budgetOver2000') },
  ];
  const qqLabelOf = (opts, val) => (opts.find((o) => o.value === val)?.label) || val;
  // Footer translation (description + copyright, and nested columns/links)
  const { obj: tFooterData } = useTranslatedObject(footerData, ['description', 'copyright', 'whatsapp']);
  const footerColsRaw = footerData?.columns || null;
  const footerFlatStrings = useMemo(() => {
    if (!footerColsRaw) return [];
    const arr = [];
    footerColsRaw.forEach((c) => {
      arr.push({ s: c?.title || '' });
      (c?.links || []).forEach((l) => arr.push({ s: l?.label || '' }));
    });
    return arr;
  }, [footerColsRaw]);
  const { items: tFooterFlat } = useTranslatedArray(footerFlatStrings, ['s']);
  const { items: tFooterBottom } = useTranslatedArray(footerData?.bottomLinks || [], ['label']);
  const tFooterColumns = useMemo(() => {
    if (!footerColsRaw) return null;
    let idx = 0;
    return footerColsRaw.map((c) => {
      const title = tFooterFlat[idx]?.s ?? c?.title; idx++;
      const links = (c?.links || []).map((l) => {
        const label = tFooterFlat[idx]?.s ?? l?.label; idx++;
        return { ...l, label };
      });
      return { ...c, title, links };
    });
  }, [footerColsRaw, tFooterFlat]);
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const [quoteStep, setQuoteStep] = useState(0);
  const [quoteData, setQuoteData] = useState({
    tripType: '', when: '', travelers: '', budget: '',
    firstName: '', lastName: '', email: '', phone: '', notes: ''
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [channelLinks, setChannelLinks] = useState({ whatsappChannel: '', telegramChannel: '' });
  const [isMobile, setIsMobile] = useState(false);

  // Icon mapping for tabs
  const iconMap = {
    Star, Ship, Waves, Hotel, Calendar, Map, Sparkles, Globe, Heart, Sun, Plane, Compass
  };

  useEffect(() => {
    const initData = async () => {
      try {
        // Fetch data
        const [tabsRes, categoriesRes, testimonialsRes, footerRes, slidesRes, heroBannersRes, channelRes] = await Promise.all([
          fetch('/api/homepage/tabs'),
          fetch('/api/categories'),
          fetch('/api/testimonials'),
          fetch('/api/footer'),
          fetch('/api/slides'),
          fetch('/api/hero-banners'),
          fetch('/api/newsletter/settings')
        ]);
        
        const tabsData = await tabsRes.json();
        const categoriesData = await categoriesRes.json();
        const testimonialsData = await testimonialsRes.json();
        const footerConfig = await footerRes.json();
        const slidesData = await slidesRes.json();
        const heroBannersData = await heroBannersRes.json();
        const channelData = await channelRes.json();
        
        setHomepageTabs(Array.isArray(tabsData) ? tabsData : []);
        setTrips(tabsData[0]?.trips || []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);
        setFooterData(footerConfig);
        setHeroSlides(Array.isArray(slidesData) ? slidesData : []);
        setHeroBanners(Array.isArray(heroBannersData) ? heroBannersData : []);
        setChannelLinks(channelData || { whatsappChannel: '', telegramChannel: '' });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);


  // Auto-rotate slides
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Auto-rotate hero banners
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroBanner(prev => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  // Handle tab change
  const handleTabChange = (index) => {
    setActiveTabIndex(index);
    setTrips(homepageTabs[index]?.trips || []);
  };

  const getTabIcon = (iconName) => {
    const Icon = iconMap[iconName] || Globe;
    return Icon;
  };

  // Banner descriptions based on tab name
  const getBannerDescription = (tabName) => {
    const descriptions = {
      'In Evidenza': 'Le migliori offerte selezionate dal nostro team per un\'esperienza di viaggio indimenticabile.',
      'Offerte': 'Approfitta delle promozioni speciali e delle offerte last minute per risparmiare sul tuo prossimo viaggio.',
      'Crociere': 'Esplora il mondo via mare con le nostre crociere esclusive nel Mediterraneo e oltre.',
      'Mare': 'Spiagge paradisiache e acque cristalline ti aspettano nelle destinazioni balneari più belle.',
      'Villaggi': 'Relax totale in villaggi all-inclusive con animazione e servizi per tutta la famiglia.',
      'Weekend': 'Fughe romantiche e city break perfetti per staccare dalla routine.',
      'Tour': 'Viaggi organizzati con guida per scoprire culture e tradizioni in tutto il mondo.',
      'Parchi': 'Divertimento assicurato per grandi e piccini nei migliori parchi a tema.',
    };
    return descriptions[tabName] || t('home.bannerDefault');
  };

  // Banner images based on tab name
  const getBannerImage = (tabName) => {
    const images = {
      'In Evidenza': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
      'Offerte': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600',
      'Crociere': 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=600',
      'Mare': 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=600',
      'Villaggi': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600',
      'Weekend': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600',
      'Tour': 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=600',
      'Parchi': 'https://images.unsplash.com/photo-1528566401806-917f86c1fc2d?w=600',
    };
    return images[tabName] || 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600';
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
          tripId: selectedTrip?.id,
          tripTitle: selectedTrip?.title,
          source: 'website'
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

  const generateWhatsAppLink = (trip) => {
    const whatsappNum = footerData?.whatsappNumber || '39XXXXXXXXXX';
    const message = encodeURIComponent(
      `Ciao! Sono interessato al viaggio: ${trip?.title || 'il vostro catalogo'}.\nVorrei ricevere maggiori informazioni e un preventivo personalizzato.\n\nGrazie!`
    );
    return `https://wa.me/${whatsappNum}?text=${message}`;
  };

  const categoryIcons = {
    Ship, Waves, Hotel, Calendar, Map, Sparkles
  };

  // Newsletter subscribe
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      if (res.ok) {
        setNewsletterSuccess(true);
        setNewsletterEmail('');
        setTimeout(() => setNewsletterSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Newsletter error:', e);
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  // Quick Quote submit
  const handleQuickQuoteSubmit = async () => {
    setQuoteSubmitting(true);
    try {
      const res = await fetch('/api/quick-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteData,
          tripTitle: `Preventivo Rapido - ${quoteData.tripType}`,
        })
      });
      if (res.ok) {
        setQuoteSuccess(true);
        setTimeout(() => {
          setShowQuickQuote(false);
          setQuoteSuccess(false);
          setQuoteStep(0);
          setQuoteData({ tripType: '', when: '', travelers: '', budget: '', firstName: '', lastName: '', email: '', phone: '', notes: '' });
        }, 3000);
      }
    } catch (e) {
      console.error('Quick quote error:', e);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const getCategoryIcon = (iconName) => {
    const Icon = categoryIcons[iconName] || Globe;
    return <Icon className="w-8 h-8" />;
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-ocean-700 font-medium">Caricamento in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-12 sm:h-14 w-auto"
              />
            </a>

            {/* Desktop Menu - centered nav links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-7">
              <a href="#viaggi" className="text-sm text-ocean-900 hover:text-ocean-500 font-medium transition-colors">{t('nav.viaggi')}</a>
              <a href="#categorie" className="text-sm text-ocean-900 hover:text-ocean-500 font-medium transition-colors">{t('nav.categorie')}</a>
              {hasBlog && <a href="/blog" className="text-sm text-ocean-900 hover:text-ocean-500 font-medium transition-colors">{t('nav.blog')}</a>}
              <a href="#chi-siamo" className="text-sm text-ocean-900 hover:text-ocean-500 font-medium transition-colors">{t('nav.chiSiamo')}</a>
              <button onClick={() => setShowContactForm(true)} className="text-sm text-ocean-900 hover:text-ocean-500 font-medium transition-colors">{t('nav.contatti')}</button>
            </div>

            {/* Right side actions */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <a href="/wishlist" className="p-2 rounded-full text-ocean-900 hover:text-ocean-500 hover:bg-ocean-50 transition-colors" title={t('nav.wishlist')}>
                <Heart className="w-5 h-5" />
              </a>
              <a href="/confronta" className="p-2 rounded-full text-ocean-900 hover:text-ocean-500 hover:bg-ocean-50 transition-colors" title={t('nav.confronta')}>
                <BarChart3 className="w-5 h-5" />
              </a>
              <div className="h-6 w-px bg-gray-200 mx-1.5" />
              <CustomerNavLink />
              <LanguageSwitcher />
              <Button 
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-sm ml-1.5"
                onClick={() => window.open(generateWhatsAppLink(null), '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                {t('nav.whatsapp')}
              </Button>
            </div>

            {/* Mobile menu button + lang on mobile */}
            <div className="md:hidden flex items-center gap-1">
              <LanguageSwitcher variant="minimal" />
              <button 
                className="p-2 text-ocean-900"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <a href="#viaggi" className="block py-2 text-ocean-900 font-medium">{t('nav.viaggi')}</a>
              <a href="#categorie" className="block py-2 text-ocean-900 font-medium">{t('nav.categorie')}</a>
              <a href="#chi-siamo" className="block py-2 text-ocean-900 font-medium">{t('nav.chiSiamo')}</a>
              <a href="#contatti" className="block py-2 text-ocean-900 font-medium">{t('nav.contatti')}</a>
              <a href="/confronta" className="block py-2 text-ocean-900 font-medium">{t('nav.confronta')}</a>
              {hasCustomers && <a href="/area-clienti" className="block py-2 text-ocean-900 font-medium">{t('nav.areaClienti')}</a>}
              <a href="/admin" className="block py-2 text-gray-400 text-sm">Admin</a>
              <div className="pt-3 flex flex-col gap-2">
                <Button className="w-full bg-green-500 hover:bg-green-600 rounded-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Dynamic Carousel */}
      <section className="relative min-h-screen md:h-screen md:min-h-[700px] flex items-start md:items-center justify-center overflow-hidden">
        {/* Background Images - Carousel */}
        {heroBanners.length > 0 ? (
          heroBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === activeHeroBanner ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
              }`}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${banner.bgImage}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/70 via-ocean-900/40 to-ocean-900/80"></div>
              </div>
            </div>
          ))
        ) : (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/70 via-ocean-900/40 to-ocean-900/80"></div>
          </div>
        )}

        {/* Content - Dynamic text per banner */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center pt-28 pb-8 md:pt-0 md:pb-0 w-full">
          <div className="animate-fade-in">
            <span className="inline-block px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs md:text-sm font-medium mb-3 md:mb-6 border border-white/20">
              {t('hero.tagline')}
            </span>
            
            {/* Dynamic title based on active banner */}
            {heroBannersToShow.length > 0 ? (
              heroBannersToShow.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`transition-all duration-700 ease-in-out ${
                    index === activeHeroBanner ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                  }`}
                  style={index !== activeHeroBanner ? { position: 'absolute', left: 0, right: 0 } : {}}
                >
                  <h1 className="text-3xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-2 md:mb-6 leading-tight">
                    {banner.title}<br />
                    <span className="text-coral-400">{banner.highlight}</span>
                  </h1>
                  <p className="text-base md:text-2xl text-white/90 mb-4 md:mb-10 max-w-3xl mx-auto font-light">
                    {banner.subtitle}
                  </p>
                </div>
              ))
            ) : (
              <>
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-2 md:mb-6 leading-tight">
                  {t('hero.title1')}<br />
                  <span className="text-coral-400">{t('hero.title2')}</span>
                </h1>
                <p className="text-base md:text-2xl text-white/90 mb-4 md:mb-10 max-w-3xl mx-auto font-light">
                  {t('hero.subtitle')}
                </p>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 md:p-6 shadow-2xl max-w-4xl mx-auto animate-slide-up relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-500" />
                <Input 
                  placeholder={t('hero.destinationPlaceholder')} 
                  className="pl-10 h-10 md:h-12 border-gray-200 focus:border-ocean-500 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-500" />
                <Input 
                  type="text" 
                  placeholder={t('hero.whenPlaceholder')} 
                  className="pl-10 h-10 md:h-12 border-gray-200 focus:border-ocean-500 rounded-xl"
                />
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-500" />
                <Input 
                  placeholder={t('hero.whoPlaceholder')} 
                  className="pl-10 h-10 md:h-12 border-gray-200 focus:border-ocean-500 rounded-xl"
                />
              </div>
              <Button 
                onClick={() => window.location.href = `/catalogo?q=${searchQuery}`}
                className="h-10 md:h-12 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
                <Search className="w-5 h-5 mr-2" />
                {t('hero.search')}
              </Button>
            </div>
          </div>

          {/* Hero Banner Indicators */}
          {heroBannersToShow.length > 1 && (
            <div className="flex justify-center gap-3 mt-3 md:mt-8 relative z-20">
              {heroBannersToShow.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveHeroBanner(index)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === activeHeroBanner ? 'w-10 bg-coral-400' : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="hidden md:flex flex-wrap justify-center gap-8 mt-8 text-white relative z-20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-coral-400" />
              <span className="font-light">{t('hero.paymentsSafe')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-coral-400" />
              <span className="font-light">{t('hero.support247')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-coral-400" />
              <span className="font-light">{t('hero.qualityGuaranteed')}</span>
            </div>
          </div>
        </div>

        {/* End of hero content */}
      </section>

      {/* Sezioni della homepage: ordine e visibilità scelti dall'admin (Aspetto) */}
      <div className="flex flex-col">
      {home.show('slider') && (<div style={{ order: home.order('slider') }}>
      {/* Promo Slides Carousel */}
      {slidesToShow.length > 0 && (
        <section className="py-6 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ minHeight: '120px' }}>
              {slidesToShow.map((slide, index) => {
                const slideIcons = { Sun, Ship, Heart, Hotel, Headphones, Star, Globe, Plane, Waves, Map, Sparkles, Compass, Award };
                const SlideIcon = slideIcons[slide.icon] || Sparkles;
                
                // Use pre-defined gradient classes
                const gradientMap = {
                  'from-coral-500 to-coral-600': 'bg-gradient-to-r from-coral-500 to-coral-600',
                  'from-ocean-500 to-ocean-600': 'bg-gradient-to-r from-ocean-500 to-ocean-600',
                  'from-pink-500 to-rose-500': 'bg-gradient-to-r from-pink-500 to-rose-500',
                  'from-emerald-500 to-teal-500': 'bg-gradient-to-r from-emerald-500 to-teal-500',
                  'from-ocean-800 to-ocean-900': 'bg-gradient-to-r from-ocean-800 to-ocean-900',
                  'from-amber-500 to-orange-500': 'bg-gradient-to-r from-amber-500 to-orange-500',
                  'from-purple-500 to-indigo-500': 'bg-gradient-to-r from-purple-500 to-indigo-500',
                  'from-teal-500 to-cyan-500': 'bg-gradient-to-r from-teal-500 to-cyan-500',
                };
                const bgClass = gradientMap[slide.bgGradient] || 'bg-gradient-to-r from-ocean-500 to-ocean-600';
                
                return (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 ${bgClass} transition-all duration-700 ease-in-out flex items-center ${
                      index === activeSlide ? 'opacity-100 translate-x-0' : index < activeSlide ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
                    }`}
                  >
                    {/* Desktop layout */}
                    <div className="hidden md:flex items-center justify-between w-full px-16">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                          <SlideIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-display font-bold text-white mb-1">
                            {slide.title}
                          </h3>
                          <p className="text-white/80 text-base max-w-lg">
                            {slide.subtitle}
                          </p>
                        </div>
                      </div>
                      <a href={slide.ctaLink} className="flex-shrink-0 ml-6">
                        <Button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 rounded-full px-6 font-semibold transition-all">
                          {slide.ctaText}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    </div>

                    {/* Mobile layout */}
                    <div className="flex md:hidden items-center w-full px-4 py-3 gap-3">
                      <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                        <SlideIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white leading-tight truncate">
                          {slide.title}
                        </h3>
                        <p className="text-white/80 text-xs leading-tight line-clamp-1 mt-0.5">
                          {slide.subtitle}
                        </p>
                      </div>
                      <a href={slide.ctaLink} className="flex-shrink-0">
                        <Button size="sm" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 rounded-full px-3 text-xs font-semibold">
                          {slide.ctaText}
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Slide indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === activeSlide ? 'w-8 bg-ocean-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      </div>)}

      {home.show('viaggi') && (<div style={{ order: home.order('viaggi') }}>
      {/* Featured Trips Section */}
      <section id="viaggi" className="py-20 px-4 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-coral-50 text-coral-500 rounded-full text-sm font-semibold mb-4">
              {t('sections.ourProposals')}
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-ocean-900 mb-4">
              {t('sections.discoverTrips')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('sections.discoverTripsSubtitle')}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {tabsToShow.map((tab, index) => {
                const IconComponent = getTabIcon(tab.icon);
                const isActive = activeTabIndex === index;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(index)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-ocean-500 text-white shadow-brand'
                        : 'bg-white text-gray-600 hover:bg-ocean-50 hover:text-ocean-600 border border-gray-200'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-ocean-400'}`} />
                    <span className="text-sm">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner with Image */}
          {tabsToShow[activeTabIndex] && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="flex flex-col md:flex-row h-48 md:h-56">
                {/* Text Content - Smaller */}
                <div className="md:w-[320px] flex-shrink-0 bg-gradient-to-br from-ocean-900 to-ocean-800 p-6 flex flex-col justify-center">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-2">
                    {tabsToShow[activeTabIndex].name}
                  </h3>
                  <p className="text-white/80 text-sm mb-4 line-clamp-2">
                    {tabsToShow[activeTabIndex].description || getBannerDescription(tabsToShow[activeTabIndex].name)}
                  </p>
                  <a 
                    href={`/catalogo?categoria=${tabsToShow[activeTabIndex].name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white text-xs px-4 rounded-full">
                      {t('sections.viewAll')}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                </div>
                {/* Image - Larger */}
                <div className="flex-1 relative">
                  <img 
                    src={homepageTabs[activeTabIndex].bannerImage || getBannerImage(homepageTabs[activeTabIndex].name)}
                    alt={homepageTabs[activeTabIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Trip Cards - Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trips.length > 0 ? (
              trips.slice(-(isMobile ? 4 : 5)).map((trip) => (
                <TripCardElegant 
                  key={trip.id}
                  trip={trip} 
                  onSelect={() => setSelectedTrip(trip)}
                  onWhatsApp={() => window.open(generateWhatsAppLink(trip), '_blank')}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">{t('home.noTrips')}</p>
              </div>
            )}
          </div>
        </div>
      </section>
      </div>)}

      {home.show('categorie') && (<div style={{ order: home.order('categorie') }}>
      {/* Categories Section */}
      <section id="categorie" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-ocean-50 text-ocean-500 rounded-full text-sm font-semibold mb-4">
              {t('home.exploreByType')}
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-ocean-900 mb-4">
              {t('home.whatTrip')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('home.whatTripSub')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {categoriesToShow.map((category, index) => (
              <a
                key={category.id}
                href={`/categoria/${category.slug}`}
                className="group p-6 bg-gray-50 rounded-2xl text-center hover:bg-gradient-to-br hover:from-ocean-500 hover:to-ocean-600 transition-all duration-300 hover:shadow-brand hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center text-ocean-500 group-hover:text-white group-hover:bg-white/20 transition-all duration-300 shadow-sm">
                  {getCategoryIcon(category.icon)}
                </div>
                <h3 className="font-semibold text-ocean-900 group-hover:text-white transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-white/80 mt-1 transition-colors">
                  {category.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
      </div>)}

      {home.show('chi_siamo') && (<div style={{ order: home.order('chi_siamo') }}>
      {/* Why Choose Us Section */}
      <section id="chi-siamo" className="py-20 px-4 bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-4 border border-white/20">
              {t('home.whyChooseUs')}
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              {t('home.difference')}
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              {t('home.differenceSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Headphones, title: t('home.feat1Title'), desc: t('home.feat1Desc') },
              { icon: Shield, title: t('home.feat2Title'), desc: t('home.feat2Desc') },
              { icon: Heart, title: t('home.feat3Title'), desc: t('home.feat3Desc') },
              { icon: Award, title: t('home.feat4Title'), desc: t('home.feat4Desc') },
            ].map((item, index) => (
              <div key={index} className="text-center p-6 rounded-2xl hover:bg-white/5 transition-colors">
                <div className="w-16 h-16 mx-auto mb-4 bg-coral-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-coral-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>)}

      {home.show('recensioni') && (<div style={{ order: home.order('recensioni') }}>
      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-ocean-50 text-ocean-500 rounded-full text-sm font-semibold mb-4">
              {t('home.reviews')}
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-ocean-900 mb-4">
              {t('home.whatTheySay')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialsToShow.map((testimonial) => (
              <Card key={testimonial.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-coral-400 text-coral-400" />
                    ))}
                  </div>
                  <div className="text-gray-600 mb-6 italic leading-relaxed [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: `&ldquo;${toInlineHtml(testimonial.text)}&rdquo;` }} />
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-ocean-500 to-ocean-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-ocean-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.location} • {testimonial.trip}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      </div>)}

      {home.show('whatsapp') && (<div style={{ order: home.order('whatsapp') }}>
      {/* WhatsApp CTA Banner */}
      <section className="py-16 px-4 bg-gradient-to-r from-green-500 to-green-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <MessageCircle className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('home.needHelp')}
          </h2>
          <p className="text-xl mb-8 text-white/90 font-light">
            {t('home.needHelpSub')}
          </p>
          <Button 
            size="lg"
            className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-6 text-lg rounded-full shadow-lg"
            onClick={() => window.open(generateWhatsAppLink(null), '_blank')}
          >
            <MessageCircle className="w-6 h-6 mr-2" />
            {t('home.chatWhatsApp')}
          </Button>
        </div>
      </section>
      </div>)}

      {home.show('newsletter') && (<div style={{ order: home.order('newsletter') }}>
      {/* Newsletter Section */}
      <section id="contatti" className="py-20 px-4 bg-ocean-50/50">
        <div className="max-w-4xl mx-auto text-center">
          <Send className="w-12 h-12 mx-auto mb-6 text-ocean-500" />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ocean-900 mb-4">
            {t('home.newsletterTitle')}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('home.newsletterSub')}
          </p>

          {newsletterSuccess ? (
            <div className="max-w-xl mx-auto bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-semibold">{t('home.subscribeDone')}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-6">
              <Input 
                type="email" 
                placeholder={t('home.yourEmail')}
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="h-12 flex-1 bg-white rounded-xl"
              />
              <Button 
                type="submit"
                disabled={newsletterSubmitting}
                className="h-12 bg-coral-500 hover:bg-coral-600 text-white px-8 rounded-xl shadow-md"
              >
                {newsletterSubmitting ? t('home.sending') : t('home.subscribe')}
              </Button>
            </form>
          )}

          <p className="text-sm text-gray-500 mb-8">
            {t('home.noSpam')}
          </p>

          {/* Channel Buttons */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-ocean-700">{t('home.followChannels')}</p>
            <div className="flex flex-wrap justify-center gap-4">
              {channelLinks.whatsappChannel && (
                <a
                  href={channelLinks.whatsappChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold">{t('home.whatsappChannelBtn')}</span>
                </a>
              )}
              {channelLinks.telegramChannel && (
                <a
                  href={channelLinks.telegramChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  <span className="font-semibold">{t('home.telegramChannelBtn')}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>)}
      </div>
      {!home.show('newsletter') && <div id="contatti" />}

      {/* Footer - Dynamic */}
      <footer className="bg-ocean-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`grid grid-cols-1 md:grid-cols-${(footerData?.columns?.length || 2) + 2} gap-12 mb-12`}>
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <a href="/" aria-label="Torna alla homepage">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="h-16 w-auto brightness-0 invert"
                  />
                </a>
              </div>
              <p className="text-white/50 mb-4 text-sm leading-relaxed">
                {tFooterData?.description || t('home.footerDesc')}
              </p>
              {/* Social Icons */}
              <div className="flex gap-3 mt-4">
                {footerData?.social?.facebook && (
                  <a href={footerData.social.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {footerData?.social?.instagram && (
                  <a href={footerData.social.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {footerData?.social?.tiktok && (
                  <a href={footerData.social.tiktok} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  </a>
                )}
                {footerData?.social?.youtube && (
                  <a href={footerData.social.youtube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                )}
                {footerData?.social?.telegram && (
                  <a href={footerData.social.telegram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </a>
                )}
              </div>
            </div>

            {/* Dynamic Link Columns */}
            {(tFooterColumns || [
              { title: t('nav.viaggi'), links: [{ label: 'Crociere', url: '#' }, { label: 'Villaggi', url: '#' }, { label: 'Tour', url: '#' }, { label: 'Weekend', url: '#' }] },
              { title: t('home.company'), links: [{ label: t('nav.chiSiamo'), url: '#' }, ...(hasBlog ? [{ label: 'Blog', url: '/blog' }] : []), { label: t('nav.contatti'), url: '#contatti' }] }
            ]).map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4 text-white/90">{col.title}</h4>
                <ul className="space-y-2 text-white/50">
                  {col.links.map((link, j) => (
                    <li key={j}><a href={link.url} className="hover:text-coral-400 transition-colors">{link.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-white/90">{t('nav.contattaci')}</h4>
              <ul className="space-y-3 text-white/50">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-coral-400" />
                  <span>{footerData?.phone || '+39 XXX XXX XXXX'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-coral-400" />
                  <span>{footerData?.email || ''}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-coral-400" />
                  <span>{tFooterData?.whatsapp || footerData?.whatsapp || 'WhatsApp attivo'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-sm">
              {tFooterData?.copyright || t('home.copyright')}
            </p>
            <div className="flex gap-6 text-white/30 text-sm">
              {((footerData?.bottomLinks ? tFooterBottom : null) || [
                { label: t('footer.privacy'), url: '#' },
                { label: t('footer.cookies'), url: '#' },
                { label: t('footer.terms'), url: '#' },
              ]).map((link, i) => (
                <a key={i} href={link.url} className="hover:text-white transition-colors">{link.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Trip Detail Dialog */}
      <Dialog open={!!selectedTrip && !showContactForm} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTrip && (
            <>
              <div className="relative h-64 -mx-6 -mt-6 mb-6">
                <img 
                  src={dlgTrip.cardImage} 
                  alt={dlgTrip.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/80 to-transparent"></div>
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <div className="flex gap-2 mb-2">
                    {dlgTrip.isPromo && <Badge className="bg-coral-500 border-0">Promo</Badge>}
                    {dlgTrip.isBestSeller && <Badge className="bg-amber-500 text-gray-900 border-0">Best Seller</Badge>}
                    {dlgTrip.isLastMinute && <Badge className="bg-red-500 border-0">Last Minute</Badge>}
                    {dlgTrip.isNew && <Badge className="bg-teal-500 border-0">{lang === 'en' ? 'New' : 'Novità'}</Badge>}
                  </div>
                  <h2 className="text-2xl font-display font-bold">{dlgTrip.title}</h2>
                  <p className="text-white/80">{dlgTrip.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-ocean-50 p-3 rounded-xl text-center">
                  <MapPin className="w-5 h-5 mx-auto text-ocean-500 mb-1" />
                  <p className="text-xs text-gray-500">{t('home.destination')}</p>
                  <p className="font-semibold text-sm text-ocean-900">{dlgTrip.destination}</p>
                </div>
                <div className="bg-ocean-50 p-3 rounded-xl text-center">
                  <Clock className="w-5 h-5 mx-auto text-ocean-500 mb-1" />
                  <p className="text-xs text-gray-500">{t('home.duration')}</p>
                  <p className="font-semibold text-sm text-ocean-900">{dlgTrip.duration}</p>
                </div>
                <div className="bg-ocean-50 p-3 rounded-xl text-center">
                  <Calendar className="w-5 h-5 mx-auto text-ocean-500 mb-1" />
                  <p className="text-xs text-gray-500">{t('home.period')}</p>
                  <p className="font-semibold text-sm text-ocean-900">{dlgTrip.period}</p>
                </div>
                <div className="bg-ocean-50 p-3 rounded-xl text-center">
                  <Hotel className="w-5 h-5 mx-auto text-ocean-500 mb-1" />
                  <p className="text-xs text-gray-500">{t('home.treatment')}</p>
                  <p className="font-semibold text-sm text-ocean-900">{dlgTrip.treatment}</p>
                </div>
              </div>

              <div className="prose prose-sm max-w-none mb-6" dangerouslySetInnerHTML={{ __html: dlgTrip.description }} />

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-ocean-700 mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" /> {t('home.quotaIncludes')}
                  </h4>
                  <ul className="space-y-2">
                    {tIncluded?.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-ocean-700 mb-3 flex items-center gap-2">
                    <X className="w-5 h-5 text-red-500" /> {t('home.quotaExcludes')}
                  </h4>
                  <ul className="space-y-2">
                    {tExcluded?.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Price and CTA */}
              <div className="bg-gradient-to-r from-ocean-50 to-ocean-100 p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('home.startingFrom')}</p>
                    <div className="flex items-baseline gap-2">
                      {dlgTrip.fullPrice > dlgTrip.priceFrom && (
                        <span className="text-lg text-gray-400 line-through">€{dlgTrip.fullPrice}</span>
                      )}
                      <span className="text-4xl font-display font-bold text-ocean-600">€{dlgTrip.priceFrom}</span>
                      <span className="text-gray-500">/ {t('home.perPerson')}</span>
                    </div>
                    {dlgTrip.discountPercent > 0 && (
                      <Badge className="mt-2 bg-coral-500 border-0">-{dlgTrip.discountPercent}% {t('home.discount')}</Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg"
                      className="bg-green-500 hover:bg-green-600 rounded-xl shadow-md"
                      onClick={() => window.open(generateWhatsAppLink(selectedTrip), '_blank')}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      WhatsApp
                    </Button>
                    <Button 
                      size="lg"
                      className="bg-coral-500 hover:bg-coral-600 rounded-xl shadow-md"
                      onClick={() => setShowContactForm(true)}
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      {t('home.requestQuoteShort')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-ocean-900">{t('home.requestQuote')}</DialogTitle>
            <DialogDescription>
              {selectedTrip ? (
                <>{t('home.fillFormFor')} <strong>{dlgTrip.title}</strong></>
              ) : (
                t('home.needInfo')
              )}
            </DialogDescription>
          </DialogHeader>

          {formSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-ocean-900 mb-2">{t('home.requestSent')}</h3>
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
                  <Label htmlFor="participants">{t('home.participants')}</Label>
                  <Select 
                    value={contactForm.participants} 
                    onValueChange={(value) => setContactForm({ ...contactForm, participants: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('home.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, '6+'].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? t('home.person') : t('home.people')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget">{t('home.budgetIndicative')}</Label>
                  <Select 
                    value={contactForm.budget} 
                    onValueChange={(value) => setContactForm({ ...contactForm, budget: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('home.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under500">{lang === 'en' ? 'Up to €500' : 'Fino a €500'}</SelectItem>
                      <SelectItem value="500-1000">€500 - €1000</SelectItem>
                      <SelectItem value="1000-2000">€1000 - €2000</SelectItem>
                      <SelectItem value="2000-3000">€2000 - €3000</SelectItem>
                      <SelectItem value="over3000">{lang === 'en' ? 'Over €3000' : 'Oltre €3000'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="preferredDate">{t('home.preferredDate')}</Label>
                <Input 
                  id="preferredDate"
                  type="text"
                  placeholder={t('home.preferredDatePh')}
                  value={contactForm.preferredDate}
                  onChange={(e) => setContactForm({ ...contactForm, preferredDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">{t('home.notesLabel')}</Label>
                <Textarea 
                  id="notes"
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
                className="w-full bg-coral-500 hover:bg-coral-600 text-white rounded-xl"
                disabled={formSubmitting || !contactForm.privacy}
              >
                {formSubmitting ? t('forms.submitting') : t('home.sendRequest')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ====== QUICK QUOTE WIZARD ====== */}
      {/* Floating Button */}
      {hasQuickQuote && <button
        onClick={() => setShowQuickQuote(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-coral-500 to-coral-600 text-white rounded-full px-6 py-4 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold group"
      >
        <Zap className="w-5 h-5 group-hover:animate-pulse" />
        <span className="hidden sm:inline">{t('home.quickQuote')}</span>
      </button>}

      {/* Quick Quote Dialog */}
      <Dialog open={showQuickQuote} onOpenChange={setShowQuickQuote}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-ocean-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-coral-500" />
              {t('qq.title')}
            </DialogTitle>
            <DialogDescription>
              {t('qq.subtitle')}
            </DialogDescription>
          </DialogHeader>

          {quoteSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-ocean-900 mb-2">{t('qq.successTitle')}</h3>
              <p className="text-gray-600">{t('qq.successMsg')}</p>
            </div>
          ) : (
            <div>
              {/* Progress */}
              <div className="flex gap-1 mb-6">
                {[0, 1, 2, 3].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= quoteStep ? 'bg-coral-500' : 'bg-gray-200'}`} />
                ))}
              </div>

              {/* Step 0: Trip Type */}
              {quoteStep === 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('qq.step0Title')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {qqTripTypes.map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => { setQuoteData({ ...quoteData, tripType: value }); setQuoteStep(1); }}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:border-ocean-400 hover:bg-ocean-50 ${
                          quoteData.tripType === value ? 'border-ocean-500 bg-ocean-50' : 'border-gray-200'
                        }`}
                      >
                        <Icon className="w-6 h-6 text-ocean-500 mb-2" />
                        <p className="font-medium text-sm">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: When & Travelers */}
              {quoteStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('qq.step1Title')}</h3>
                  <div>
                    <Label>{t('qq.whenLabel')}</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {qqWhenOptions.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setQuoteData({ ...quoteData, when: value })}
                          className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                            quoteData.when === value ? 'border-ocean-500 bg-ocean-50 text-ocean-700' : 'border-gray-200 hover:border-ocean-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>{t('qq.howMany')}</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {['1', '2', '3-4', '5+'].map((n) => (
                        <button
                          key={n}
                          onClick={() => setQuoteData({ ...quoteData, travelers: n })}
                          className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                            quoteData.travelers === n ? 'border-ocean-500 bg-ocean-50 text-ocean-700' : 'border-gray-200 hover:border-ocean-300'
                          }`}
                        >
                          {n} {t('qq.persAbbr')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>{t('qq.budgetPP')}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {qqBudgetOptions.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setQuoteData({ ...quoteData, budget: value })}
                          className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                            quoteData.budget === value ? 'border-ocean-500 bg-ocean-50 text-ocean-700' : 'border-gray-200 hover:border-ocean-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setQuoteStep(0)} className="flex-1">{t('qq.backBtn')}</Button>
                    <Button
                      onClick={() => setQuoteStep(2)}
                      disabled={!quoteData.when || !quoteData.travelers}
                      className="flex-1 bg-ocean-500 hover:bg-ocean-600"
                    >
                      {t('qq.nextBtn')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Contact Info */}
              {quoteStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('qq.step2Title')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t('home.firstName')} *</Label>
                      <Input value={quoteData.firstName} onChange={(e) => setQuoteData({ ...quoteData, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label>{t('home.lastName')} *</Label>
                      <Input value={quoteData.lastName} onChange={(e) => setQuoteData({ ...quoteData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>{t('home.emailLabel')} *</Label>
                    <Input type="email" value={quoteData.email} onChange={(e) => setQuoteData({ ...quoteData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('home.phone')} *</Label>
                    <Input type="tel" value={quoteData.phone} onChange={(e) => setQuoteData({ ...quoteData, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('qq.notesLabel')}</Label>
                    <Textarea value={quoteData.notes} onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })} placeholder={t('qq.notesPh')} rows={2} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setQuoteStep(1)} className="flex-1">{t('qq.backBtn')}</Button>
                    <Button
                      onClick={() => setQuoteStep(3)}
                      disabled={!quoteData.firstName || !quoteData.email || !quoteData.phone}
                      className="flex-1 bg-ocean-500 hover:bg-ocean-600"
                    >
                      {t('qq.summaryBtn')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Summary */}
              {quoteStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('qq.summaryTitle')}</h3>
                  <div className="bg-ocean-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumTripType')}</span><span className="font-medium">{qqLabelOf(qqTripTypes, quoteData.tripType)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumPeriod')}</span><span className="font-medium">{qqLabelOf(qqWhenOptions, quoteData.when)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumTravelers')}</span><span className="font-medium">{quoteData.travelers}</span></div>
                    {quoteData.budget && <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumBudget')}</span><span className="font-medium">{qqLabelOf(qqBudgetOptions, quoteData.budget)}</span></div>}
                    <hr className="border-ocean-200" />
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumName')}</span><span className="font-medium">{quoteData.firstName} {quoteData.lastName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumEmail')}</span><span className="font-medium">{quoteData.email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('qq.sumPhone')}</span><span className="font-medium">{quoteData.phone}</span></div>
                    {quoteData.notes && <div><span className="text-gray-600">{t('qq.sumNotes')}</span> <span className="font-medium">{quoteData.notes}</span></div>}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setQuoteStep(2)} className="flex-1">{t('qq.editBtn')}</Button>
                    <Button
                      onClick={handleQuickQuoteSubmit}
                      disabled={quoteSubmitting}
                      className="flex-1 bg-coral-500 hover:bg-coral-600"
                    >
                      {quoteSubmitting ? t('qq.sending') : t('qq.sendBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


function CustomerNavLink() {
  const { t } = useT();
  const enabled = useModule('clienti_buoni');
  const [isLogged, setIsLogged] = useState(false);
  const [customerName, setCustomerName] = useState('');
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('customerToken') : null;
    const data = typeof window !== 'undefined' ? localStorage.getItem('customerData') : null;
    if (token && data) {
      setIsLogged(true);
      try { setCustomerName(JSON.parse(data).firstName); } catch { /* ignore */ }
    }
  }, []);
  if (!enabled) return null;
  if (isLogged) {
    return (
      <a href="/area-clienti" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium text-sm shadow-sm hover:shadow-md transition-shadow">
        <span>🎁</span><span>{customerName || t('nav.areaClienti')}</span>
      </a>
    );
  }
  return (
    <a href="/accedi" className="text-ocean-900 hover:text-ocean-500 font-medium text-sm transition-colors">
      {t('nav.accedi')}
    </a>
  );
}

// Elegant Trip Card Component - Clean and Linear Design
function TripCardElegant({ trip: originalTrip, onSelect, onWhatsApp }) {
  const { t } = useT();
  // Translate dynamic trip fields when language is not Italian
  const { obj: trip } = useTranslatedObject(originalTrip, ['title', 'description', 'destination', 'shortDescription', 'duration', 'treatment']);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('tribuWishlist');
    if (saved) {
      const ids = JSON.parse(saved);
      setIsWishlisted(ids.includes(trip.id));
    }
    const compare = localStorage.getItem('tribuCompare');
    if (compare) {
      const ids = JSON.parse(compare);
      setIsCompared(ids.includes(trip.id));
    }
  }, [trip.id]);

  // Countdown for promo trips
  useEffect(() => {
    if (!trip.promoExpiry && !trip.isLastMinute) return;
    const expiry = trip.promoExpiry ? new Date(trip.promoExpiry) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const tick = () => {
      const now = new Date();
      const diff = expiry - now;
      if (diff <= 0) { setCountdown(null); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown({ days, hours, mins });
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [trip.promoExpiry, trip.isLastMinute]);

  const toggleWishlist = (e) => {
    e.stopPropagation();
    const saved = localStorage.getItem('tribuWishlist');
    let ids = saved ? JSON.parse(saved) : [];
    if (ids.includes(trip.id)) {
      ids = ids.filter(id => id !== trip.id);
    } else {
      ids.push(trip.id);
    }
    localStorage.setItem('tribuWishlist', JSON.stringify(ids));
    setIsWishlisted(!isWishlisted);
  };

  const toggleCompare = (e) => {
    e.stopPropagation();
    const saved = localStorage.getItem('tribuCompare');
    let ids = saved ? JSON.parse(saved) : [];
    if (ids.includes(trip.id)) {
      ids = ids.filter(id => id !== trip.id);
    } else {
      if (ids.length >= 3) {
        alert('Puoi confrontare massimo 3 viaggi');
        return;
      }
      ids.push(trip.id);
    }
    localStorage.setItem('tribuCompare', JSON.stringify(ids));
    setIsCompared(!isCompared);
  };

  return (
    <div 
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-brand transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1"
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img 
          src={trip.cardImage} 
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        
        {/* Wishlist Heart */}
        <button
          onClick={toggleWishlist}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>

        {/* Compare Button */}
        <button
          onClick={toggleCompare}
          className={`absolute top-2 left-11 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${
            isCompared ? 'bg-ocean-500 text-white' : 'bg-white/80 text-gray-500 hover:bg-white'
          }`}
          title={isCompared ? 'Rimuovi dal confronto' : 'Aggiungi al confronto'}
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        {/* Single Badge - Top Right */}
        {(trip.isPromo || trip.isBestSeller || trip.isLastMinute) && (
          <div className="absolute top-2 right-2">
            {trip.isPromo ? (
              <span className="px-2 py-1 bg-coral-500 text-white text-xs font-semibold rounded">
                -{trip.discountPercent}%
              </span>
            ) : trip.isBestSeller ? (
              <span className="px-2 py-1 bg-amber-500 text-gray-900 text-xs font-semibold rounded">
                Top
              </span>
            ) : trip.isLastMinute ? (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                Last
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Destination */}
        <p className="text-xs text-ocean-500 font-semibold mb-1 truncate">
          {trip.destination}
        </p>
        
        {/* Title */}
        <h3 className="font-semibold text-ocean-900 text-sm leading-tight line-clamp-2 mb-2 min-h-[40px]">
          {trip.title}
        </h3>

        {/* Info Row */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-ocean-400" />
            {trip.duration?.split('/')[0]?.trim()}
          </span>
          <span className="text-gray-300">•</span>
          <span className="truncate">{trip.treatment?.split(' ').slice(0, 2).join(' ')}</span>
        </div>

        {/* Price Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-gray-400">{t('home.fromShort')}</span>
            {trip.fullPrice > trip.priceFrom && (
              <span className="text-xs text-gray-400 line-through">€{trip.fullPrice}</span>
            )}
            <span className="text-lg font-bold text-ocean-600">€{trip.priceFrom}</span>
          </div>
          
          {/* View Trip Button */}
          <a 
            href={`/viaggio/${trip.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-ocean-500 hover:bg-ocean-600 flex items-center justify-center text-white transition-colors shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
