'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, Plane, Users, Settings, LogOut, Plus, Edit, Trash2,
  Eye, EyeOff, ExternalLink, Search, Filter, MoreVertical, Check, X, Mail, Phone, Calendar,
  MapPin, Clock, Euro, Image, FileText, Tag, Star, TrendingUp, MessageCircle,
  Compass, ChevronRight, RefreshCw, Download, Upload, Palette, Share2,
  Globe, GripVertical, Ship, Waves, Hotel, Map, Sparkles, Sun, Heart,
  BookOpen, FolderOpen, Send, StickyNote, ArrowRight, Headphones, Award,
  Quote, UserCircle, ClipboardList, Link2, Loader2, Copy, ArrowUp, ArrowDown, Lock, RotateCcw
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { stripHtml } from '@/lib/richtext';
import { useTenant } from '@/components/TenantProvider';
import ImageUploadButton from '@/components/ImageUploadButton';
import { visibleAdminTabs } from '@/lib/modules';

const SocialCreativeBuilder = dynamic(() => import('@/components/SocialCreativeBuilder'), { ssr: false });
const QuoteManager = dynamic(() => import('@/components/QuoteManager'), { ssr: false });
const WhatsAppManager = dynamic(() => import('@/components/WhatsAppManager'), { ssr: false });
const CustomersManager = dynamic(() => import('@/components/CustomersManager'), { ssr: false });
const PagesManager = dynamic(() => import('@/components/PagesManager'), { ssr: false });
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const tenant = useTenant();
  const siteName = tenant?.branding?.siteName || tenant?.name || 'Admin';
  const canSeeTab = visibleAdminTabs(tenant?.modules || []);
  const socialBuilderEnabled = (tenant?.modules || []).includes('social_builder');
  
  // Data states
  const [trips, setTrips] = useState([]);
  const [leads, setLeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showSocialBuilder, setShowSocialBuilder] = useState(false);
  const [socialBuilderTrip, setSocialBuilderTrip] = useState(null);
  
  // Lead filter
  const [leadFilter, setLeadFilter] = useState('all');
  
  // Homepage tabs management
  const [homepageTabs, setHomepageTabs] = useState([]);
  
  // Footer settings
  const [footerSettings, setFooterSettings] = useState(null);
  
  // Hero slides
  const [heroSlides, setHeroSlides] = useState([]);
  
  // Hero banners (main hero carousel)
  const [heroBanners, setHeroBanners] = useState([]);
  
  // Profile state
  const [profile, setProfile] = useState({ name: '', email: '', password: '' });

  // Quotes/Preventivi state
  const [quotes, setQuotes] = useState([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  useEffect(() => {
    // Accesso dal pannello Super Admin ("Accedi come affiliato")
    const hash = window.location.hash || '';
    if (hash.startsWith('#impersonate=')) {
      localStorage.setItem('adminToken', decodeURIComponent(hash.substring('#impersonate='.length)));
      window.history.replaceState(null, '', window.location.pathname);
    }
    const token = localStorage.getItem('adminToken');
    if (token) {
      validateToken(token);
    } else {
      setAuthLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/admin/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setIsAuthenticated(true);
        loadData(token);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      localStorage.removeItem('adminToken');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = async (token) => {
    setLoading(true);
    try {
      // Le sezioni dei moduli spenti non vengono caricate (risponderebbero 403)
      const mods = tenant?.modules || [];
      const skip = () => Promise.resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
      const get = (url, mod) => (mod && !mods.includes(mod) ? skip() : fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
      const [tripsRes, leadsRes, tabsRes, catsRes, blogRes, footerRes, slidesRes, heroBannersRes, testimonialsRes, quotesRes] = await Promise.all([
        get('/api/admin/trips'),
        get('/api/admin/leads'),
        get('/api/admin/homepage/tabs', 'homepage'),
        get('/api/admin/categories'),
        get('/api/admin/blog', 'blog'),
        get('/api/admin/footer'),
        get('/api/admin/slides', 'slider_promo'),
        get('/api/admin/hero-banners', 'hero_banner'),
        get('/api/admin/testimonials', 'recensioni'),
        get('/api/admin/quotes', 'preventivi'),
      ]);
      
      const tripsData = await tripsRes.json();
      const leadsData = await leadsRes.json();
      const tabsData = await tabsRes.json();
      const catsData = await catsRes.json();
      const blogData = await blogRes.json();
      const footerData = await footerRes.json();
      const slidesData = await slidesRes.json();
      const heroBannersData = await heroBannersRes.json();
      const testimonialsData = await testimonialsRes.json();
      const quotesData = await quotesRes.json();
      
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setHomepageTabs(Array.isArray(tabsData) ? tabsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setBlogPosts(Array.isArray(blogData) ? blogData : []);
      setFooterSettings(footerData);
      setHeroSlides(Array.isArray(slidesData) ? slidesData : []);
      setHeroBanners(Array.isArray(heroBannersData) ? heroBannersData : []);
      setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        setProfile(data.user);
        setIsAuthenticated(true);
        loadData(data.token);
      } else {
        setLoginError('Credenziali non valide');
      }
    } catch (error) {
      setLoginError('Errore di connessione');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setTrips([]);
    setLeads([]);
  };

  const getAuthToken = () => localStorage.getItem('adminToken');

  // Trip CRUD
  const saveTrip = async (tripData) => {
    const token = getAuthToken();
    const isEdit = !!tripData.id;
    try {
      const response = await fetch(
        isEdit ? `/api/admin/trips/${tripData.id}` : '/api/admin/trips',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(tripData)
        }
      );
      if (response.ok) {
        loadData(token);
        setShowTripForm(false);
        setEditingTrip(null);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  const deleteTrip = async (tripId) => {
    if (!confirm('Sei sicuro di voler eliminare questo viaggio?')) return;
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/trips/${tripId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token);
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  // Lead update
  const updateLead = async (leadId, data) => {
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      loadData(token);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('Sei sicuro di voler eliminare questa richiesta?')) return;
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/leads/${leadId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token);
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const addLeadNote = async (leadId, text) => {
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      loadData(token);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Category CRUD
  const saveCategory = async (data) => {
    const token = getAuthToken();
    const isEdit = !!data.id;
    try {
      const response = await fetch(
        isEdit ? `/api/admin/categories/${data.id}` : '/api/admin/categories',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data)
        }
      );
      if (response.ok) loadData(token);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Blog CRUD
  const saveBlogPost = async (data) => {
    const token = getAuthToken();
    const isEdit = !!data.id;
    try {
      const response = await fetch(
        isEdit ? `/api/admin/blog/${data.id}` : '/api/admin/blog',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data)
        }
      );
      if (response.ok) loadData(token);
    } catch (error) {
      console.error('Error saving blog post:', error);
    }
  };

  const deleteBlogPost = async (postId) => {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return;
    const token = getAuthToken();
    try {
      await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token);
    } catch (error) {
      console.error('Error deleting blog post:', error);
    }
  };

  // Profile update
  const updateProfile = async () => {
    const token = getAuthToken();
    try {
      const updateData = { name: profile.name, email: profile.email };
      if (profile.password) updateData.password = profile.password;
      await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });
      alert('Profilo aggiornato con successo!');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Filtered leads
  const filteredLeads = leadFilter === 'all' ? leads : leads.filter(l => l.status === leadFilter);

  // Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-900 to-ocean-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/logo.png" alt={siteName} className="h-20 w-auto mx-auto mb-4" />
            <CardTitle className="text-2xl font-display text-ocean-900">Dashboard Admin</CardTitle>
            <CardDescription>{siteName} - Area riservata</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@esempio.it" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              </div>
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <Button type="submit" className="w-full bg-ocean-500 hover:bg-ocean-600">Accedi</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard
  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'hero', icon: Image, label: 'Hero Banner' },
    { id: 'homepage', icon: Globe, label: 'Homepage' },
    { id: 'slider', icon: Sparkles, label: 'Slider Promo' },
    { id: 'trips', icon: Plane, label: 'Viaggi' },
    { id: 'categories', icon: FolderOpen, label: 'Categorie' },
    { id: 'leads', icon: Users, label: 'Richieste', badge: leads.filter(l => l.status === 'new').length },
    { id: 'blog', icon: BookOpen, label: 'Blog' },
    { id: 'pages', icon: FileText, label: 'Pagine' },
    { id: 'testimonials', icon: Quote, label: 'Recensioni' },
    { id: 'newsletter', icon: Send, label: 'Newsletter' },
    { id: 'promos', icon: Sparkles, label: 'Landing Promo' },
    { id: 'quotes', icon: ClipboardList, label: 'Preventivi' },
    { id: 'customers', icon: UserCircle, label: 'Clienti & Buoni' },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp Bot' },
    { id: 'appearance', icon: Palette, label: 'Aspetto' },
    { id: 'footer', icon: FileText, label: 'Footer' },
    { id: 'settings', icon: Settings, label: 'Impostazioni' },
  ].filter((item) => canSeeTab(item.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col">
        <div className="p-6 flex-shrink-0">
          <img src="/logo.png" alt={siteName} className="h-14 w-auto" />
        </div>
        <nav className="px-4 space-y-1 flex-1 overflow-y-auto pb-20">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                currentTab === item.id ? 'bg-ocean-50 text-ocean-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-coral-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex-shrink-0 p-4 border-t bg-white">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {/* ========== DASHBOARD TAB ========== */}
        {currentTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {[
                { label: 'Viaggi', value: trips.filter(t => t.status === 'published').length, icon: Plane, color: 'ocean' },
                { label: 'Nuove Richieste', value: leads.filter(l => l.status === 'new').length, icon: Users, color: 'coral' },
                { label: 'In Trattativa', value: leads.filter(l => l.status === 'contacted' || l.status === 'quote_sent').length, icon: MessageCircle, color: 'amber' },
                { label: 'Categorie', value: categories.length, icon: FolderOpen, color: 'green' },
                { label: 'Articoli Blog', value: blogPosts.filter(p => p.status === 'published').length, icon: BookOpen, color: 'purple' },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${stat.color}-50`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Leads */}
            <Card>
              <CardHeader>
                <CardTitle>Ultime Richieste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-ocean-50 rounded-full flex items-center justify-center text-ocean-500 font-semibold text-sm">
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                          <p className="text-xs text-gray-500">{lead.tripTitle || 'Richiesta generica'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={lead.status} />
                        <Button size="sm" variant="outline" onClick={() => setCurrentTab('leads')}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && <p className="text-center text-gray-500 py-6">Nessuna richiesta ancora</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== HERO BANNER TAB ========== */}
        {currentTab === 'hero' && (
          <HeroBannerManager 
            banners={heroBanners}
            onSave={async (banners) => {
              const token = getAuthToken();
              try {
                await fetch('/api/admin/hero-banners', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ banners })
                });
                setHeroBanners(banners);
                alert('Hero banner salvati con successo!');
              } catch (error) {
                alert('Errore nel salvataggio');
              }
            }}
          />
        )}

        {/* ========== HOMEPAGE TAB ========== */}
        {currentTab === 'homepage' && (
          <HomepageTabsManager 
            tabs={homepageTabs}
            trips={trips}
            onSave={async (newTabs) => {
              const token = getAuthToken();
              try {
                await fetch('/api/admin/homepage/tabs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ tabs: newTabs })
                });
                setHomepageTabs(newTabs);
                alert('Tabs salvati con successo!');
              } catch (error) {
                alert('Errore nel salvataggio');
              }
            }}
          />
        )}

        {/* ========== SLIDER TAB ========== */}
        {currentTab === 'slider' && (
          <SliderManager 
            slides={heroSlides}
            onSave={async (slides) => {
              const token = getAuthToken();
              try {
                await fetch('/api/admin/slides', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ slides })
                });
                setHeroSlides(slides);
                alert('Slider salvato con successo!');
              } catch (error) {
                alert('Errore nel salvataggio');
              }
            }}
          />
        )}

        {/* ========== TRIPS TAB ========== */}
        {currentTab === 'trips' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Viaggi</h2>
              <Button onClick={() => { setEditingTrip(null); setShowTripForm(true); }} className="bg-ocean-500 hover:bg-ocean-600">
                <Plus className="w-5 h-5 mr-2" /> Nuovo Viaggio
              </Button>
            </div>
            <div className="grid gap-4">
              {trips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="w-48 h-32 flex-shrink-0">
                      <img src={trip.cardImage} alt={trip.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{trip.title}</h3>
                          <Badge variant={trip.status === 'published' ? 'default' : 'secondary'}>
                            {trip.status === 'published' ? 'Pubblicato' : 'Bozza'}
                          </Badge>
                          {trip.isPromo && <Badge className="bg-coral-500 border-0">Promo</Badge>}
                          {trip.isBestSeller && <Badge className="bg-amber-500 border-0">Best Seller</Badge>}
                        </div>
                        <p className="text-gray-500 text-sm">{trip.destination} • {trip.duration} • €{trip.priceFrom}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {socialBuilderEnabled && <Button size="sm" variant="outline" className="text-purple-600 hover:bg-purple-50" onClick={() => { setSocialBuilderTrip(trip); setShowSocialBuilder(true); }}>
                          <Palette className="w-4 h-4" />
                        </Button>}
                        <Button size="sm" variant="outline" onClick={() => { setEditingTrip(trip); setShowTripForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteTrip(trip.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========== CATEGORIES TAB ========== */}
        {currentTab === 'categories' && (
          <CategoriesManager 
            categories={categories}
            onSave={saveCategory}
            onDelete={deleteCategory}
          />
        )}

        {/* ========== LEADS TAB ========== */}
        {currentTab === 'leads' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Richieste</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{filteredLeads.length} richieste</span>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'all', label: 'Tutte', count: leads.length },
                { key: 'new', label: 'Nuove', count: leads.filter(l => l.status === 'new').length },
                { key: 'contacted', label: 'Contattate', count: leads.filter(l => l.status === 'contacted').length },
                { key: 'quote_sent', label: 'Preventivo', count: leads.filter(l => l.status === 'quote_sent').length },
                { key: 'closed', label: 'Chiuse', count: leads.filter(l => l.status === 'closed').length },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setLeadFilter(f.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    leadFilter === f.key ? 'bg-ocean-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onUpdateStatus={(status) => updateLead(lead.id, { status })}
                  onAddNote={(text) => addLeadNote(lead.id, text)}
                  onDelete={() => deleteLead(lead.id)}
                />
              ))}
              {filteredLeads.length === 0 && (
                <Card><CardContent className="py-12 text-center text-gray-500">Nessuna richiesta trovata</CardContent></Card>
              )}
            </div>
          </div>
        )}

        {/* ========== BLOG TAB ========== */}
        {currentTab === 'blog' && (
          <BlogManager 
            posts={blogPosts}
            onSave={saveBlogPost}
            onDelete={deleteBlogPost}
          />
        )}

        {/* ========== PAGES TAB ========== */}
        {currentTab === 'pages' && (
          <PagesManager token={getAuthToken()} trips={trips} categories={categories} />
        )}

        {/* ========== TESTIMONIALS TAB ========== */}
        {currentTab === 'testimonials' && (
          <TestimonialManager
            testimonials={testimonials}
            token={getAuthToken()}
            onRefresh={async () => {
              const token = getAuthToken();
              const res = await fetch('/api/admin/testimonials', { headers: { Authorization: `Bearer ${token}` } });
              const data = await res.json();
              setTestimonials(Array.isArray(data) ? data : []);
            }}
          />
        )}

        {/* ========== NEWSLETTER TAB ========== */}
        {currentTab === 'newsletter' && (
          <NewsletterManager token={getAuthToken()} />
        )}

        {/* ========== PROMOS TAB ========== */}
        {currentTab === 'promos' && (
          <PromoLandingManager token={getAuthToken()} trips={trips} />
        )}

        {/* ========== PREVENTIVI/QUOTES TAB ========== */}
        {currentTab === 'quotes' && (
          <QuoteManager 
            token={getAuthToken()} 
            quotes={quotes}
            setQuotes={setQuotes}
            showForm={showQuoteForm}
            setShowForm={setShowQuoteForm}
            editing={editingQuote}
            setEditing={setEditingQuote}
            trips={trips}
            footerSettings={footerSettings}
          />
        )}

        {/* ========== WHATSAPP BOT TAB ========== */}
        {currentTab === 'whatsapp' && (
          <WhatsAppManager token={getAuthToken()} />
        )}

        {/* ========== CUSTOMERS / REFERRAL TAB ========== */}
        {currentTab === 'customers' && (
          <CustomersManager token={getAuthToken()} />
        )}

        {/* ========== FOOTER TAB ========== */}
        {currentTab === 'appearance' && <AppearanceManager token={getAuthToken()} />}

        {currentTab === 'footer' && (
          <FooterManager 
            settings={footerSettings}
            onSave={async (data) => {
              const token = getAuthToken();
              try {
                await fetch('/api/admin/footer', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify(data)
                });
                setFooterSettings(data);
                alert('Footer salvato con successo!');
              } catch (error) {
                alert('Errore nel salvataggio');
              }
            }}
          />
        )}

        {/* ========== SETTINGS TAB ========== */}
        {currentTab === 'settings' && (
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8">Impostazioni</h2>
            <div className="max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profilo Admin</CardTitle>
                  <CardDescription>Modifica le tue credenziali di accesso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Nome</Label><Input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                  <div><Label>Nuova Password</Label><Input type="password" value={profile.password || ''} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="Lascia vuoto per non modificare" /></div>
                  <Button onClick={updateProfile} className="bg-ocean-500 hover:bg-ocean-600">Salva Modifiche</Button>
                </CardContent>
              </Card>
              <MediaSettingsCard token={getAuthToken()} />
            </div>
          </div>
        )}
      </main>

      {/* Trip Form Dialog */}
      <Dialog open={showTripForm} onOpenChange={setShowTripForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTrip ? 'Modifica Viaggio' : 'Nuovo Viaggio'}</DialogTitle></DialogHeader>
          <TripForm trip={editingTrip} categories={categories} onSave={saveTrip} onCancel={() => { setShowTripForm(false); setEditingTrip(null); }} />
        </DialogContent>
      </Dialog>

      {/* Social Creative Builder Dialog */}
      <Dialog open={showSocialBuilder} onOpenChange={setShowSocialBuilder}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-purple-600" /> Crea Grafica Social</DialogTitle>
            {socialBuilderTrip && <p className="text-sm text-gray-500">{socialBuilderTrip.title}</p>}
          </DialogHeader>
          {socialBuilderTrip && <SocialCreativeBuilder trip={socialBuilderTrip} onClose={() => setShowSocialBuilder(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== STATUS BADGE COMPONENT =====
function StatusBadge({ status }) {
  const config = {
    new: { label: 'Nuovo', className: 'bg-blue-100 text-blue-700' },
    contacted: { label: 'Contattato', className: 'bg-yellow-100 text-yellow-700' },
    quote_sent: { label: 'Preventivo', className: 'bg-purple-100 text-purple-700' },
    closed: { label: 'Chiuso', className: 'bg-green-100 text-green-700' },
  };
  const c = config[status] || config.new;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>;
}

// ===== LEAD CARD COMPONENT =====
function LeadCard({ lead, onUpdateStatus, onAddNote, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmForm, setConfirmForm] = useState({
    isLastMinute: false,
    bookingAmount: '',
    departureDate: '',
    voucherCodeApplied: '',
    notes: '',
  });
  const [confirming, setConfirming] = useState(false);

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText('');
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/leads/${lead.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          isLastMinute: confirmForm.isLastMinute,
          bookingAmount: Number(confirmForm.bookingAmount) || 0,
          departureDate: confirmForm.departureDate || null,
          voucherCodeApplied: confirmForm.voucherCodeApplied.trim().toUpperCase() || '',
          notes: confirmForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let msg = '✅ Lead confermato come prenotazione!';
        if (data.referralResult?.issued) msg += `\n🎁 Buono €${data.referralResult.voucher.amount} emesso al presentatore (${data.referralResult.voucher.code})`;
        else if (data.referralResult?.reason === 'last_minute') msg += '\n⚠️ Buono referral NON emesso (partenza last-minute)';
        else if (data.referralResult?.reason === 'customer_not_new') msg += '\nℹ️ Cliente non era nuovo, referral annullato';
        else if (data.referralResult?.reason === 'no_pending_referral') msg += '\nℹ️ Nessun referral pending per questo cliente';
        alert(msg);
        setConfirmDialog(false);
        window.location.reload(); // refresh leads list
      } else {
        alert('Errore: ' + (data.error || 'sconosciuto'));
      }
    } catch (err) {
      alert('Errore di rete');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnconfirm = async () => {
    if (!confirm('Annullare la prenotazione? Eventuali buoni emessi verranno annullati.')) return;
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/admin/leads/${lead.id}/unconfirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    window.location.reload();
  };

  return (
    <Card className={`transition-all ${lead.confirmed ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : lead.status === 'new' ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-ocean-50 rounded-full flex items-center justify-center text-ocean-600 font-bold text-sm">
              {lead.firstName?.[0] || lead.name?.[0]}{lead.lastName?.[0] || lead.name?.split(' ')[1]?.[0] || ''}
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {lead.firstName ? `${lead.firstName} ${lead.lastName}` : lead.name}
                {lead.confirmed && <Badge className="bg-emerald-500 text-white">✓ Prenotato</Badge>}
                {lead.customerId && <Badge className="bg-purple-100 text-purple-700">Cliente registrato</Badge>}
                {lead.voucherApplied && <Badge className="bg-amber-100 text-amber-700">Buono €{lead.voucherApplied.amount} applicato</Badge>}
              </h3>
              <p className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!lead.confirmed ? (
              <Button size="sm" onClick={() => setConfirmDialog(true)} className="bg-emerald-500 hover:bg-emerald-600 h-9">
                <Check className="w-3.5 h-3.5 mr-1" /> Conferma prenotazione
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleUnconfirm} className="text-red-500 hover:bg-red-50 h-9">
                <X className="w-3.5 h-3.5 mr-1" /> Annulla prenotazione
              </Button>
            )}
            <Select value={lead.status} onValueChange={onUpdateStatus}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Nuovo</SelectItem>
                <SelectItem value="contacted">Contattato</SelectItem>
                <SelectItem value="quote_sent">Preventivo Inviato</SelectItem>
                <SelectItem value="converted">Convertito</SelectItem>
                <SelectItem value="closed">Chiuso</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 h-9" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-ocean-500">
            <Mail className="w-4 h-4" /> {lead.email}
          </a>
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-ocean-500">
            <Phone className="w-4 h-4" /> {lead.phone}
          </a>
          {lead.tripTitle && <span className="flex items-center gap-1.5 text-gray-600"><Plane className="w-4 h-4" /> {lead.tripTitle}</span>}
          {lead.destination && !lead.tripTitle && <span className="flex items-center gap-1.5 text-gray-600"><Plane className="w-4 h-4" /> {lead.destination}</span>}
          {lead.budget && <span className="flex items-center gap-1.5 text-gray-600"><Euro className="w-4 h-4" /> {lead.budget}</span>}
          {lead.bookingAmount > 0 && <span className="flex items-center gap-1.5 text-emerald-600 font-semibold"><Euro className="w-4 h-4" /> €{lead.bookingAmount}</span>}
        </div>

        {lead.voucherCode && !lead.confirmed && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            🎫 Cliente ha indicato codice sconto: <code className="font-bold">{lead.voucherCode}</code>
          </div>
        )}

        {lead.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{lead.notes}</p>}
        {lead.message && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{lead.message}</p>}

        {/* Expand for notes */}
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-ocean-500 hover:text-ocean-600 flex items-center gap-1 font-medium">
          <StickyNote className="w-4 h-4" />
          Note interne ({(lead.internalNotes || []).length})
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {(lead.internalNotes || []).map((note) => (
              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-yellow-800">{note.author}</span>
                  <span className="text-xs text-yellow-600">{new Date(note.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-yellow-900">{note.text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input 
                placeholder="Aggiungi una nota interna..." 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddNote} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Confirm booking dialog */}
        <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma prenotazione</DialogTitle>
              <DialogDescription>
                Marca questa richiesta come prenotazione confermata. Se il cliente è stato invitato da qualcuno, il presentatore riceverà un buono €50 (solo se non è una partenza last-minute).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Importo prenotazione (€)</Label>
                  <Input type="number" value={confirmForm.bookingAmount} onChange={(e) => setConfirmForm({ ...confirmForm, bookingAmount: e.target.value })} placeholder="1500" />
                </div>
                <div>
                  <Label>Data partenza</Label>
                  <Input type="date" value={confirmForm.departureDate} onChange={(e) => setConfirmForm({ ...confirmForm, departureDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 border-amber-200 bg-amber-50">
                  <input type="checkbox" checked={confirmForm.isLastMinute} onChange={(e) => setConfirmForm({ ...confirmForm, isLastMinute: e.target.checked })} className="rounded" />
                  <span className="text-sm font-semibold text-amber-800">⏰ Partenza Last-Minute</span>
                </Label>
                <p className="text-[10px] text-gray-500 mt-1">Se attivo, NESSUN buono referral verrà emesso e il buono cliente non sarà applicabile</p>
              </div>
              <div>
                <Label>Codice buono applicato (opzionale)</Label>
                <Input value={confirmForm.voucherCodeApplied} onChange={(e) => setConfirmForm({ ...confirmForm, voucherCodeApplied: e.target.value.toUpperCase() })} placeholder="TRBABC123" className="font-mono" />
                <p className="text-[10px] text-gray-500 mt-1">Se il cliente usa un suo buono, scrivi qui il codice — verrà marcato come usato</p>
              </div>
              <div>
                <Label>Note (opzionale)</Label>
                <Textarea value={confirmForm.notes} onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDialog(false)}>Annulla</Button>
                <Button onClick={handleConfirm} disabled={confirming} className="bg-emerald-500 hover:bg-emerald-600">
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conferma prenotazione'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ===== CATEGORIES MANAGER =====
function CategoriesManager({ categories, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Globe', description: '', order: 1 });

  const iconOptions = [
    { value: 'Ship', label: 'Crociera' }, { value: 'Waves', label: 'Mare' },
    { value: 'Hotel', label: 'Hotel' }, { value: 'Calendar', label: 'Weekend' },
    { value: 'Map', label: 'Tour' }, { value: 'Sparkles', label: 'Parchi' },
    { value: 'Globe', label: 'Mondo' }, { value: 'Sun', label: 'Sole' },
    { value: 'Heart', label: 'Romantico' }, { value: 'Star', label: 'Speciale' },
    { value: 'Plane', label: 'Aereo' }, { value: 'Compass', label: 'Avventura' },
  ];

  const iconMap = { Ship, Waves, Hotel, Calendar, Map, Sparkles, Globe, Sun, Heart, Star, Plane, Compass };

  const startEdit = (cat) => {
    setEditing(cat.id);
    setFormData({ name: cat.name, icon: cat.icon || 'Globe', description: cat.description || '', order: cat.order || 1 });
  };

  const startNew = () => {
    setEditing('new');
    setFormData({ name: '', icon: 'Globe', description: '', order: categories.length + 1 });
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    const data = editing === 'new' ? { ...formData } : { id: editing, ...formData };
    onSave(data);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Categorie</h2>
          <p className="text-gray-500 mt-1">Organizza i tipi di viaggio disponibili</p>
        </div>
        <Button onClick={startNew} className="bg-ocean-500 hover:bg-ocean-600">
          <Plus className="w-5 h-5 mr-2" /> Nuova Categoria
        </Button>
      </div>

      <div className="grid gap-4">
        {/* New/Edit form */}
        {editing && (
          <Card className="ring-2 ring-ocean-500">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Es: Crociere" />
                </div>
                <div>
                  <Label>Icona</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Breve descrizione..." />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSave} className="bg-ocean-500 hover:bg-ocean-600"><Check className="w-4 h-4 mr-1" /> Salva</Button>
                  <Button variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        {categories.map((cat) => {
          const IconComp = iconMap[cat.icon] || Globe;
          return (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ocean-50 rounded-xl flex items-center justify-center">
                    <IconComp className="w-6 h-6 text-ocean-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{cat.name}</h3>
                    <p className="text-sm text-gray-500">{cat.description || 'Nessuna descrizione'}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">{cat.slug}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(cat)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(cat.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {categories.length === 0 && !editing && (
          <Card><CardContent className="py-12 text-center text-gray-500">Nessuna categoria creata</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ===== BLOG MANAGER =====
function BlogManager({ posts, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const blogCategories = ['Consigli di Viaggio', 'Destinazioni', 'Offerte', 'Guide', 'Novità', 'Esperienze'];

  const [formData, setFormData] = useState({
    title: '', excerpt: '', content: '', category: '', coverImage: '', tags: [], readTime: '5 min', status: 'draft'
  });

  const startNew = () => {
    setEditing(null);
    setFormData({ title: '', excerpt: '', content: '', category: '', coverImage: '', tags: [], readTime: '5 min', status: 'draft' });
    setShowForm(true);
  };

  const startEdit = (post) => {
    setEditing(post);
    setFormData({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || '',
      coverImage: post.coverImage || '',
      tags: post.tags || [],
      readTime: post.readTime || '5 min',
      status: post.status || 'draft'
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;
    const data = editing ? { id: editing.id, ...formData } : { ...formData };
    onSave(data);
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Blog</h2>
          <p className="text-gray-500 mt-1">Crea e gestisci articoli per il tuo blog</p>
        </div>
        <Button onClick={startNew} className="bg-ocean-500 hover:bg-ocean-600">
          <Plus className="w-5 h-5 mr-2" /> Nuovo Articolo
        </Button>
      </div>

      {/* Blog Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifica Articolo' : 'Nuovo Articolo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titolo *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Titolo dell'articolo" />
            </div>
            <div>
              <Label>Estratto</Label>
              <Textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} placeholder="Breve anteprima dell'articolo..." />
            </div>
            <div>
              <Label>Contenuto</Label>
              <p className="text-xs text-gray-400 mb-1">Scrivi normalmente: gli a capo diventano paragrafi. Puoi inserire immagini e gallerie con i pulsanti dell'editor.</p>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
                placeholder="Scrivi qui il contenuto dell'articolo..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {blogCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo di lettura</Label>
                <Input value={formData.readTime} onChange={(e) => setFormData({ ...formData, readTime: e.target.value })} placeholder="5 min" />
              </div>
              <div>
                <Label>Stato</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bozza</SelectItem>
                    <SelectItem value="published">Pubblicato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Immagine di copertina (URL)</Label>
              <div className="flex gap-2"><Input value={formData.coverImage} onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })} placeholder="https://..." /><ImageUploadButton folder="blog" onUploaded={(url) => setFormData((f) => ({ ...f, coverImage: url }))} /></div>
              {formData.coverImage && <img src={formData.coverImage} alt="Preview" className="mt-2 h-40 object-cover rounded-lg" />}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button onClick={handleSave} className="bg-ocean-500 hover:bg-ocean-600">{editing ? 'Salva Modifiche' : 'Crea Articolo'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts List */}
      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <div className="flex">
              {post.coverImage && (
                <div className="w-48 h-32 flex-shrink-0">
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`flex-1 p-4 flex items-center justify-between ${!post.coverImage ? '' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status === 'published' ? 'Pubblicato' : 'Bozza'}
                    </Badge>
                    {post.category && <Badge variant="outline">{post.category}</Badge>}
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-1">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    {post.publishedAt && <span>{new Date(post.publishedAt).toLocaleDateString('it-IT')}</span>}
                    <span>{post.views || 0} letture</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(post)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(post.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {posts.length === 0 && (
          <Card><CardContent className="py-12 text-center text-gray-500">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Nessun articolo creato. Inizia a scrivere il tuo primo post!</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ===== TRIP FORM COMPONENT =====
function TripForm({ trip, categories, onSave, onCancel }) {
  const [formData, setFormData] = useState(trip || {
    title: '', subtitle: '', shortDescription: '', description: '', destination: '', country: '', city: '',
    category: 'mare', tags: [], priceFrom: 0, fullPrice: 0, discountPercent: 0, duration: '', period: '',
    departureCity: '', treatment: '', transport: '', hotelName: '', included: [], excluded: [],
    cardImage: '', images: [], featured: false, isPromo: false, isBestSeller: false, isLastMinute: false,
    isNew: false, status: 'draft', seoTitle: '', seoDescription: ''
  });
  const [includedInput, setIncludedInput] = useState('');
  const [excludedInput, setExcludedInput] = useState('');
  const [galleryInput, setGalleryInput] = useState('');

  // Opzioni categoria: quelle del DB + default, SENZA duplicati (bug: nome categoria mostrato 2 volte)
  const DEFAULT_CATEGORY_OPTIONS = [
    { slug: 'mare', name: 'Mare' }, { slug: 'crociere', name: 'Crociere' }, { slug: 'villaggi', name: 'Villaggi' },
    { slug: 'weekend', name: 'Weekend' }, { slug: 'tour', name: 'Tour' }, { slug: 'parchi', name: 'Parchi' },
  ];
  const categoryOptions = (() => {
    const list = [];
    const seen = new Set();
    (categories || []).forEach(c => {
      if (c?.slug && !seen.has(c.slug)) { seen.add(c.slug); list.push({ slug: c.slug, name: c.name || c.slug }); }
    });
    DEFAULT_CATEGORY_OPTIONS.forEach(d => {
      if (!seen.has(d.slug)) { seen.add(d.slug); list.push(d); }
    });
    if (formData.category && !seen.has(formData.category)) {
      list.unshift({ slug: formData.category, name: formData.category });
    }
    return list;
  })();

  // ---- Galleria immagini (array di URL) ----
  const gallery = formData.images || [];
  const setGallery = (list) => setFormData({ ...formData, images: list });
  const addGalleryImages = () => {
    const urls = galleryInput.split(/[\n,\s]+/).map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setGallery([...gallery, ...urls]);
    setGalleryInput('');
  };
  const removeGalleryImage = (i) => setGallery(gallery.filter((_, idx) => idx !== i));
  const moveGalleryImage = (i, dir) => {
    const target = i + dir;
    if (target < 0 || target >= gallery.length) return;
    const list = [...gallery];
    const [removed] = list.splice(i, 1);
    list.splice(target, 0, removed);
    setGallery(list);
  };

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const addIncluded = () => { if (includedInput.trim()) { setFormData({ ...formData, included: [...(formData.included || []), includedInput.trim()] }); setIncludedInput(''); } };
  const addExcluded = () => { if (excludedInput.trim()) { setFormData({ ...formData, excluded: [...(formData.excluded || []), excludedInput.trim()] }); setExcludedInput(''); } };

  // ---- Itinerario giorno per giorno ----
  const itinerary = formData.itinerary || [];
  const setItinerary = (list) => setFormData({ ...formData, itinerary: list.map((d, i) => ({ ...d, day: i + 1 })) });
  const addDay = () => setItinerary([...itinerary, { day: itinerary.length + 1, title: '', description: '' }]);
  const updateDay = (index, updates) => setItinerary(itinerary.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  const removeDay = (index) => setItinerary(itinerary.filter((_, i) => i !== index));
  const moveDay = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= itinerary.length) return;
    const list = [...itinerary];
    const [removed] = list.splice(index, 1);
    list.splice(target, 0, removed);
    setItinerary(list);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic">Base</TabsTrigger>
          <TabsTrigger value="details">Dettagli</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerario</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Titolo *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
            <div className="col-span-2"><Label>Sottotitolo</Label><Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Descrizione Breve <span className="text-xs text-gray-400 font-normal">(mostrata nelle card)</span></Label>
              <div className="mt-1">
                <RichTextEditor
                  compact
                  minHeight={70}
                  value={formData.shortDescription}
                  onChange={(html) => setFormData({ ...formData, shortDescription: html })}
                  placeholder="Breve frase accattivante per la card del viaggio..."
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label>Descrizione Completa</Label>
              <p className="text-xs text-gray-400 mb-1">Scrivi normalmente: gli a capo diventano paragrafi automaticamente. Usa i pulsanti per grassetto, evidenziatore ed elenchi.</p>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Descrivi il viaggio: cosa lo rende speciale, cosa vedranno i clienti..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Destinazione *</Label><Input value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} required /></div>
            <div><Label>Paese</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} /></div>
            <div><Label>Città</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Durata</Label><Input value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="Es: 8 giorni / 7 notti" /></div>
            <div><Label>Periodo</Label><Input value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} placeholder="Es: Giugno - Settembre 2025" /></div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Prezzo Da (€)</Label><Input type="number" value={formData.priceFrom} onChange={(e) => setFormData({ ...formData, priceFrom: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Prezzo Pieno (€)</Label><Input type="number" value={formData.fullPrice} onChange={(e) => setFormData({ ...formData, fullPrice: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Sconto (%)</Label><Input type="number" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Città Partenza</Label><Input value={formData.departureCity} onChange={(e) => setFormData({ ...formData, departureCity: e.target.value })} /></div>
            <div><Label>Trattamento</Label><Input value={formData.treatment} onChange={(e) => setFormData({ ...formData, treatment: e.target.value })} placeholder="Es: All Inclusive" /></div>
            <div><Label>Trasporto</Label><Input value={formData.transport} onChange={(e) => setFormData({ ...formData, transport: e.target.value })} placeholder="Es: Volo incluso" /></div>
          </div>
          <div><Label>Hotel/Struttura</Label><Input value={formData.hotelName} onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Cosa Include</Label>
              <div className="flex gap-2 mt-1"><Input value={includedInput} onChange={(e) => setIncludedInput(e.target.value)} placeholder="Aggiungi voce..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIncluded())} /><Button type="button" variant="outline" onClick={addIncluded}><Plus className="w-4 h-4" /></Button></div>
              <div className="mt-2 space-y-1">{formData.included?.map((item, i) => (<div key={i} className="flex items-center gap-2 text-sm bg-green-50 px-3 py-1 rounded"><Check className="w-4 h-4 text-green-600" />{item}<button type="button" onClick={() => setFormData({ ...formData, included: formData.included.filter((_, idx) => idx !== i) })} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>))}</div>
            </div>
            <div>
              <Label>Cosa Non Include</Label>
              <div className="flex gap-2 mt-1"><Input value={excludedInput} onChange={(e) => setExcludedInput(e.target.value)} placeholder="Aggiungi voce..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcluded())} /><Button type="button" variant="outline" onClick={addExcluded}><Plus className="w-4 h-4" /></Button></div>
              <div className="mt-2 space-y-1">{formData.excluded?.map((item, i) => (<div key={i} className="flex items-center gap-2 text-sm bg-red-50 px-3 py-1 rounded"><X className="w-4 h-4 text-red-600" />{item}<button type="button" onClick={() => setFormData({ ...formData, excluded: formData.excluded.filter((_, idx) => idx !== i) })} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>))}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { key: 'featured', label: 'In Evidenza' }, { key: 'isPromo', label: 'Promo' },
              { key: 'isBestSeller', label: 'Best Seller' }, { key: 'isLastMinute', label: 'Last Minute' },
              { key: 'isNew', label: 'Novità' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Switch checked={formData[key]} onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })} />
                <Label>{label}</Label>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="itinerary" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Itinerario giorno per giorno</Label>
              <p className="text-xs text-gray-400">Aggiungi i giorni del viaggio. La descrizione supporta grassetto, evidenziatore ed elenchi.</p>
            </div>
            <Button type="button" variant="outline" onClick={addDay}><Plus className="w-4 h-4 mr-2" /> Aggiungi Giorno</Button>
          </div>

          {itinerary.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-xl text-gray-400">
              <Map className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nessun giorno inserito. Clicca "Aggiungi Giorno" per iniziare.</p>
            </div>
          )}

          <div className="space-y-4">
            {itinerary.map((day, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-ocean-500 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0">G{i + 1}</div>
                    <Input
                      value={day.title || ''}
                      onChange={(e) => updateDay(i, { title: e.target.value })}
                      placeholder={`Titolo giorno ${i + 1} (es. Arrivo a Atene)`}
                    />
                    <div className="flex items-center gap-1">
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveDay(i, -1)} disabled={i === 0}>▲</Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveDay(i, 1)} disabled={i === itinerary.length - 1}>▼</Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => removeDay(i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <RichTextEditor
                    compact
                    minHeight={90}
                    value={day.description}
                    onChange={(html) => updateDay(i, { description: html })}
                    placeholder="Cosa succede in questo giorno..."
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 mt-4">
          <div><Label>Immagine Card (URL)</Label><div className="flex gap-2"><Input value={formData.cardImage} onChange={(e) => setFormData({ ...formData, cardImage: e.target.value })} placeholder="https://..." /><ImageUploadButton folder="viaggi" onUploaded={(url) => setFormData((f) => ({ ...f, cardImage: url }))} /></div>{formData.cardImage && <img src={formData.cardImage} alt="Preview" className="mt-2 h-40 object-cover rounded-lg" />}</div>

          <div className="border-t pt-5">
            <Label className="text-base">Galleria Immagini ({gallery.length})</Label>
            <p className="text-xs text-gray-400 mb-2">Incolla uno o più URL (uno per riga). La galleria viene mostrata nello slider in cima alla pagina del viaggio e nelle miniature.</p>
            <div className="flex gap-2">
              <Textarea
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                rows={2}
                placeholder={'https://.../foto1.jpg\nhttps://.../foto2.jpg'}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={addGalleryImages} className="self-stretch"><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
              <ImageUploadButton multiple folder="viaggi" label="Carica foto" onUploaded={(urls) => setFormData((f) => ({ ...f, images: [...(f.images || []), ...urls] }))} />
            </div>

            {gallery.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {gallery.map((img, i) => (
                  <div key={i} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                    <img src={img} alt={`Foto ${i + 1}`} className="w-full h-28 object-cover" />
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 bg-white/95 flex items-center justify-between px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-0.5">
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveGalleryImage(i, -1)} disabled={i === 0}>◀</Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveGalleryImage(i, 1)} disabled={i === gallery.length - 1}>▶</Button>
                      </div>
                      <button type="button" title="Usa come immagine card" onClick={() => setFormData({ ...formData, cardImage: img, images: gallery })} className="text-[10px] text-ocean-600 hover:underline">Card</button>
                      <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => removeGalleryImage(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-4">
          <div><Label>SEO Title</Label><Input value={formData.seoTitle} onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })} /></div>
          <div><Label>SEO Description</Label><Textarea value={formData.seoDescription} onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })} rows={3} /></div>
          <div><Label>Stato</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="draft">Bozza</SelectItem><SelectItem value="published">Pubblicato</SelectItem></SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        <Button type="submit" className="bg-ocean-500 hover:bg-ocean-600">{trip ? 'Salva Modifiche' : 'Crea Viaggio'}</Button>
      </div>
    </form>
  );
}

// ===== HOMEPAGE TABS MANAGER =====
function HomepageTabsManager({ tabs: initialTabs, trips, onSave }) {
  const [tabs, setTabs] = useState(initialTabs.length > 0 ? initialTabs : [
    { id: 'tab-1', name: 'In Evidenza', icon: 'Star', tripIds: [], active: true, bannerImage: '', description: '' },
  ]);
  const [editingTab, setEditingTab] = useState(null);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedTabForTrips, setSelectedTabForTrips] = useState(null);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [selectedTabForBanner, setSelectedTabForBanner] = useState(null);

  const iconOptions = [
    { value: 'Star', label: 'Stella', Icon: Star }, { value: 'Ship', label: 'Crociera', Icon: Ship },
    { value: 'Waves', label: 'Mare', Icon: Waves }, { value: 'Hotel', label: 'Hotel', Icon: Hotel },
    { value: 'Calendar', label: 'Calendario', Icon: Calendar }, { value: 'Map', label: 'Mappa', Icon: Map },
    { value: 'Sparkles', label: 'Parchi', Icon: Sparkles }, { value: 'Globe', label: 'Globo', Icon: Globe },
    { value: 'Heart', label: 'Cuore', Icon: Heart }, { value: 'Sun', label: 'Sole', Icon: Sun },
    { value: 'Plane', label: 'Aereo', Icon: Plane },
  ];

  const addTab = () => {
    const newTab = { id: `tab-${Date.now()}`, name: 'Nuovo Tab', icon: 'Star', tripIds: [], active: true, bannerImage: '', description: '' };
    setTabs([...tabs, newTab]);
    setEditingTab(newTab.id);
  };

  const updateTab = (tabId, updates) => { setTabs(tabs.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab)); };
  const deleteTab = (tabId) => { if (tabs.length <= 1) { alert('Devi avere almeno un tab'); return; } setTabs(tabs.filter(tab => tab.id !== tabId)); };
  const moveTab = (tabId, direction) => {
    const index = tabs.findIndex(t => t.id === tabId);
    if ((direction === -1 && index === 0) || (direction === 1 && index === tabs.length - 1)) return;
    const newTabs = [...tabs]; const [removed] = newTabs.splice(index, 1); newTabs.splice(index + direction, 0, removed); setTabs(newTabs);
  };
  const toggleTripInTab = (tabId, tripId) => {
    setTabs(tabs.map(tab => {
      if (tab.id !== tabId) return tab;
      const tripIds = tab.tripIds || [];
      return { ...tab, tripIds: tripIds.includes(tripId) ? tripIds.filter(id => id !== tripId) : [...tripIds, tripId] };
    }));
  };
  const getIconComponent = (iconName) => { const option = iconOptions.find(o => o.value === iconName); return option ? option.Icon : Star; };
  const selectedTab = tabs.find(t => t.id === selectedTabForTrips);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Homepage</h2>
          <p className="text-gray-500 mt-1">Configura i tabs e le card che appaiono nella homepage</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={addTab}><Plus className="w-4 h-4 mr-2" /> Aggiungi Tab</Button>
          <Button onClick={() => onSave(tabs)} className="bg-ocean-500 hover:bg-ocean-600"><Check className="w-4 h-4 mr-2" /> Salva</Button>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {tabs.map((tab, index) => {
          const IconComponent = getIconComponent(tab.icon);
          const isEditing = editingTab === tab.id;
          const tabTrips = trips.filter(t => (tab.tripIds || []).includes(t.id));
          return (
            <Card key={tab.id} className={isEditing ? 'ring-2 ring-ocean-500' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveTab(tab.id, -1)} disabled={index === 0}>▲</Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveTab(tab.id, 1)} disabled={index === tabs.length - 1}>▼</Button>
                  </div>
                  <div className="w-12 h-12 bg-ocean-50 rounded-xl flex items-center justify-center"><IconComponent className="w-6 h-6 text-ocean-500" /></div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-3">
                        <Input value={tab.name} onChange={(e) => updateTab(tab.id, { name: e.target.value })} className="w-48" />
                        <Select value={tab.icon} onValueChange={(value) => updateTab(tab.id, { icon: value })}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>{iconOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => setEditingTab(null)}><Check className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-lg">{tab.name}</h3>
                        <p className="text-sm text-gray-500">{tabTrips.length > 0 ? `${tabTrips.length} viaggi selezionati` : 'Nessun viaggio selezionato'}</p>
                      </div>
                    )}
                  </div>
                  {tabTrips.length > 0 && !isEditing && (
                    <div className="flex -space-x-2">
                      {tabTrips.slice(0, 5).map(t => <img key={t.id} src={t.cardImage} alt={t.title} className="w-10 h-10 rounded-lg border-2 border-white object-cover" />)}
                      {tabTrips.length > 5 && <div className="w-10 h-10 rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium">+{tabTrips.length - 5}</div>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-purple-600 hover:bg-purple-50" onClick={() => { setSelectedTabForBanner(tab.id); setShowBannerEditor(true); }}><Image className="w-4 h-4 mr-1" /> Banner</Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTabForTrips(tab.id); setShowTripSelector(true); }}><Plane className="w-4 h-4 mr-1" /> Viaggi</Button>
                    {!isEditing && <Button size="sm" variant="outline" onClick={() => setEditingTab(tab.id)}><Edit className="w-4 h-4" /></Button>}
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteTab(tab.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trip Selector Dialog */}
      <Dialog open={showTripSelector} onOpenChange={setShowTripSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Seleziona Viaggi per "{selectedTab?.name}"</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {trips.filter(t => t.status === 'published').map(trip => {
              const isSelected = (selectedTab?.tripIds || []).includes(trip.id);
              return (
                <div key={trip.id} onClick={() => toggleTripInTab(selectedTabForTrips, trip.id)} className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-ocean-500 ring-2 ring-ocean-100' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="relative h-32"><img src={trip.cardImage} alt={trip.title} className="w-full h-full object-cover" />{isSelected && <div className="absolute top-2 right-2 w-6 h-6 bg-ocean-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>}</div>
                  <div className="p-2"><p className="font-medium text-sm truncate">{trip.title}</p><p className="text-xs text-gray-500">{trip.destination} • €{trip.priceFrom}</p></div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => { if (selectedTabForTrips) updateTab(selectedTabForTrips, { tripIds: [] }); }}>Deseleziona tutti</Button>
            <Button onClick={() => setShowTripSelector(false)} className="bg-ocean-500 hover:bg-ocean-600">Fatto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Banner Editor Dialog */}
      <Dialog open={showBannerEditor} onOpenChange={setShowBannerEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Modifica Banner</DialogTitle></DialogHeader>
          {selectedTabForBanner && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Immagine Banner (URL)</Label>
                <ImageUploadButton folder="homepage" className="float-right ml-2" onUploaded={(url) => updateTab(selectedTabForBanner, { bannerImage: url })} />
                <Input value={tabs.find(t => t.id === selectedTabForBanner)?.bannerImage || ''} onChange={(e) => updateTab(selectedTabForBanner, { bannerImage: e.target.value })} placeholder="https://esempio.com/immagine.jpg" />
              </div>
              {tabs.find(t => t.id === selectedTabForBanner)?.bannerImage && (
                <img src={tabs.find(t => t.id === selectedTabForBanner)?.bannerImage} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
              )}
              <div>
                <Label>Descrizione Banner</Label>
                <Textarea value={tabs.find(t => t.id === selectedTabForBanner)?.description || ''} onChange={(e) => updateTab(selectedTabForBanner, { description: e.target.value })} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBannerEditor(false)}>Annulla</Button>
                <Button onClick={() => setShowBannerEditor(false)} className="bg-ocean-500 hover:bg-ocean-600">Salva</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ===== FOOTER MANAGER =====
// ========== FOTO E CLOUDINARY (livello Admin) ==========
// Ogni admin collega il proprio account Cloudinary: i pulsanti "Carica" del
// backend caricano lì le foto e inseriscono il link da soli.
function MediaSettingsCard({ token }) {
  const [s, setS] = useState({ cloudName: '', uploadPreset: '', folder: '' });
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testUrl, setTestUrl] = useState('');

  useEffect(() => {
    fetch('/api/admin/media-settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setS({ cloudName: d.cloudName || '', uploadPreset: d.uploadPreset || '', folder: d.folder || '' }); setStatus(d); })
      .catch(() => {});
  }, [token]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/media-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(s) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || 'Salvataggio non riuscito');
      setStatus((st) => ({ ...st, configured: out.configured }));
      setMsg({ ok: true, text: out.configured ? 'Salvato. Ora prova a caricare una foto qui sotto.' : 'Salvato. Cloudinary scollegato.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Foto e Cloudinary
          {status?.configured
            ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Collegato</Badge>
            : <Badge variant="outline" className="text-gray-500">Non collegato</Badge>}
        </CardTitle>
        <CardDescription>Collega il tuo account Cloudinary: le foto caricate dal backend finiscono lì e il link viene inserito in automatico. Puoi sempre anche incollare il link di un'immagine.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Cloud name</Label><Input value={s.cloudName} onChange={(e) => setS({ ...s, cloudName: e.target.value })} placeholder="es. viaggi-rossi" /></div>
          <div><Label>Upload preset (Unsigned)</Label><Input value={s.uploadPreset} onChange={(e) => setS({ ...s, uploadPreset: e.target.value })} placeholder="es. sito_web" /></div>
        </div>
        <div><Label>Cartella (facoltativa)</Label><Input value={s.folder} onChange={(e) => setS({ ...s, folder: e.target.value })} placeholder="es. sito" /></div>
        <details className="text-sm text-gray-600 rounded-xl bg-gray-50 p-3">
          <summary className="cursor-pointer font-medium text-gray-800">Dove trovo questi dati?</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Entra in cloudinary.com: il <b>Cloud name</b> è nella Dashboard, in alto.</li>
            <li>Vai in <b>Settings → Upload → Upload presets</b> e clicca <b>Add upload preset</b>.</li>
            <li>Imposta <b>Signing mode: Unsigned</b>, salva e copia qui il nome del preset.</li>
          </ol>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy} className="bg-ocean-500 hover:bg-ocean-600">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}</Button>
          {status?.configured && <ImageUploadButton label="Prova caricamento" folder="test" onUploaded={(url) => setTestUrl(url)} />}
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        {testUrl && (
          <div className="flex items-center gap-3 text-sm text-green-700">
            <img src={testUrl} alt="Foto di prova" className="h-12 w-12 object-cover rounded border" />
            Funziona: la foto è sul tuo Cloudinary.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== ASPETTO (livello Admin) ==========
// Colori, logo e ordine delle sezioni homepage. Le parti non permesse dallo
// sviluppatore non vengono mostrate e il server le rifiuta comunque.
const DEFAULT_PRIMARY = '#00A0E9';
const DEFAULT_ACCENT = '#F47E11';

function AppearanceColor({ label, value, fallback, onChange }) {
  const shown = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" value={shown} onChange={(e) => onChange(e.target.value)} aria-label={label}
          className="h-10 w-14 rounded-md border border-gray-200 bg-white cursor-pointer" />
        <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={`Originale (${fallback})`} className="max-w-[180px]" />
      </div>
    </div>
  );
}

function AppearanceManager({ token }) {
  const [data, setData] = useState(null);
  const [branding, setBranding] = useState({});
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/admin/appearance', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setBranding(d.branding || {}); setSections(d.homeSections || []); })
      .catch(() => setMessage({ type: 'error', text: 'Impossibile caricare le impostazioni' }));
  }, [token]);

  if (!data) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-ocean-500" /></div>;
  const { allowed = {} } = data;

  const move = (index, dir) => {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  };
  const toggle = (id, visible) => setSections(sections.map((s) => (s.id === id ? { ...s, visible } : s)));

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'branding');
      const r = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const out = await r.json();
      if (!r.ok || !out.url) throw new Error(out.error || 'Caricamento non riuscito');
      setBranding((b) => ({ ...b, logoUrl: out.url }));
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true); setMessage(null);
    const body = {};
    if (allowed.colors) body.branding = { primaryColor: branding.primaryColor || '', accentColor: branding.accentColor || '', logoUrl: branding.logoUrl || '', tagline: branding.tagline || '' };
    if (allowed.sections) body.homeSections = sections.map(({ id, visible }) => ({ id, visible }));
    try {
      const r = await fetch('/api/admin/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || 'Salvataggio non riuscito');
      if (out.homeSections) setSections(out.homeSections);
      setMessage({ type: 'ok', text: 'Salvato. Le modifiche sono visibili sul sito (ricarica la pagina).' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const primary = /^#[0-9a-fA-F]{6}$/.test(branding.primaryColor || '') ? branding.primaryColor : DEFAULT_PRIMARY;
  const accent = /^#[0-9a-fA-F]{6}$/.test(branding.accentColor || '') ? branding.accentColor : DEFAULT_ACCENT;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Aspetto del sito</h2>
          <p className="text-gray-500 mt-1">Colori, logo e ordine delle sezioni della homepage.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Vedi sito</a></Button>
          <Button onClick={save} disabled={saving} className="bg-ocean-500 hover:bg-ocean-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}</Button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
      )}

      {allowed.colors ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Colori e logo</CardTitle>
            <CardDescription>Da ogni colore vengono create in automatico tutte le sfumature usate nel sito.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AppearanceColor label="Colore principale" value={branding.primaryColor} fallback={DEFAULT_PRIMARY} onChange={(v) => setBranding({ ...branding, primaryColor: v })} />
              <AppearanceColor label="Colore di accento" value={branding.accentColor} fallback={DEFAULT_ACCENT} onChange={(v) => setBranding({ ...branding, accentColor: v })} />
            </div>
            <div className="rounded-xl border p-4 flex flex-wrap items-center gap-3" aria-label="Anteprima colori">
              <span className="text-sm text-gray-500 mr-2">Anteprima</span>
              <span className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ background: primary }}>Pulsante principale</span>
              <span className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ background: accent }}>Offerta</span>
              <span className="text-sm font-semibold" style={{ color: primary }}>Link e titoli</span>
              <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setBranding({ ...branding, primaryColor: '', accentColor: '' })}>
                <RotateCcw className="w-4 h-4 mr-1" />Colori originali
              </Button>
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <img src={branding.logoUrl || '/logo.png'} alt="Logo attuale" className="h-14 w-auto rounded border bg-white p-1" />
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-gray-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Carica logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                </label>
                {branding.logoUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setBranding({ ...branding, logoUrl: '' })}>Usa logo originale</Button>}
              </div>
              <Input className="mt-2" value={branding.logoUrl || ''} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="oppure incolla l'URL di un'immagine" />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input className="mt-1" value={branding.tagline || ''} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} placeholder="La tua agenzia viaggi di fiducia" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6"><CardContent className="p-5 text-sm text-gray-500 flex items-center gap-2"><Lock className="w-4 h-4" /> La modifica di colori e logo non è attiva per questo sito.</CardContent></Card>
      )}

      {allowed.sections ? (
        <Card>
          <CardHeader>
            <CardTitle>Sezioni della homepage</CardTitle>
            <CardDescription>Sposta le sezioni con le frecce e nascondi quelle che non ti servono. Il banner principale resta sempre in cima.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {sections.map((sec, i) => (
                <li key={sec.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${sec.allowed === false ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                  <span className="w-6 text-center text-sm text-gray-400 tabular-nums">{i + 1}</span>
                  <span className="flex-1 font-medium text-gray-900">{sec.label}</span>
                  {sec.allowed === false ? (
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Lock className="w-3.5 h-3.5" />Funzione non attiva</span>
                  ) : (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      {sec.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <Switch checked={sec.visible} onCheckedChange={(v) => toggle(sec.id, v)} aria-label={`Mostra ${sec.label}`} />
                    </label>
                  )}
                  <div className="flex">
                    <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Sposta su"><ArrowUp className="w-4 h-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label="Sposta giù"><ArrowDown className="w-4 h-4" /></Button>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-5 text-sm text-gray-500 flex items-center gap-2"><Lock className="w-4 h-4" /> La modifica delle sezioni della homepage non è attiva per questo sito.</CardContent></Card>
      )}
    </div>
  );
}

function FooterManager({ settings, onSave }) {
  const defaultFooter = {
    description: 'La tua agenzia viaggi online di fiducia. Consulenza personalizzata e assistenza dedicata.',
    columns: [
      {
        title: 'Viaggi',
        links: [
          { label: 'Crociere', url: '/categoria/crociere' },
          { label: 'Villaggi', url: '/categoria/villaggi' },
          { label: 'Tour', url: '/categoria/tour' },
          { label: 'Weekend', url: '/categoria/weekend' },
        ]
      },
      {
        title: 'Azienda',
        links: [
          { label: 'Chi siamo', url: '#chi-siamo' },
          { label: 'Blog', url: '/blog' },
          { label: 'Contatti', url: '#contatti' },
        ]
      }
    ],
    phone: '+39 XXX XXX XXXX',
    email: 'info@tribuinviaggio.it',
    whatsapp: 'WhatsApp attivo',
    whatsappNumber: '',
    contactEmail: '',
    copyright: '© 2025 Tribù in Viaggio. Tutti i diritti riservati.',
    bottomLinks: [
      { label: 'Privacy Policy', url: '#' },
      { label: 'Cookie Policy', url: '#' },
      { label: 'Termini e Condizioni', url: '#' },
    ],
    social: {
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      telegram: '',
    }
  };

  const [footer, setFooter] = useState(() => {
    const merged = { ...defaultFooter, ...(settings || {}) };
    if (!merged.columns || !Array.isArray(merged.columns)) merged.columns = defaultFooter.columns;
    if (!merged.bottomLinks || !Array.isArray(merged.bottomLinks)) merged.bottomLinks = defaultFooter.bottomLinks;
    if (!merged.social) merged.social = defaultFooter.social;
    return merged;
  });
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    if (settings) {
      const merged = { ...defaultFooter, ...settings };
      if (!merged.columns || !Array.isArray(merged.columns)) merged.columns = defaultFooter.columns;
      if (!merged.bottomLinks || !Array.isArray(merged.bottomLinks)) merged.bottomLinks = defaultFooter.bottomLinks;
      if (!merged.social) merged.social = defaultFooter.social;
      setFooter(merged);
    }
  }, [settings]);

  const updateColumn = (colIndex, field, value) => {
    const columns = [...footer.columns];
    columns[colIndex] = { ...columns[colIndex], [field]: value };
    setFooter({ ...footer, columns });
  };

  const addLinkToColumn = (colIndex) => {
    if (!newLinkLabel.trim()) return;
    const columns = [...footer.columns];
    columns[colIndex] = { 
      ...columns[colIndex], 
      links: [...columns[colIndex].links, { label: newLinkLabel, url: newLinkUrl || '#' }] 
    };
    setFooter({ ...footer, columns });
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const removeLinkFromColumn = (colIndex, linkIndex) => {
    const columns = [...footer.columns];
    columns[colIndex] = { 
      ...columns[colIndex], 
      links: columns[colIndex].links.filter((_, i) => i !== linkIndex) 
    };
    setFooter({ ...footer, columns });
  };

  const updateLinkInColumn = (colIndex, linkIndex, field, value) => {
    const columns = [...footer.columns];
    const links = [...columns[colIndex].links];
    links[linkIndex] = { ...links[linkIndex], [field]: value };
    columns[colIndex] = { ...columns[colIndex], links };
    setFooter({ ...footer, columns });
  };

  const addColumn = () => {
    setFooter({ ...footer, columns: [...footer.columns, { title: 'Nuova Colonna', links: [] }] });
  };

  const removeColumn = (colIndex) => {
    if (footer.columns.length <= 1) return;
    setFooter({ ...footer, columns: footer.columns.filter((_, i) => i !== colIndex) });
  };

  const addBottomLink = () => {
    setFooter({ ...footer, bottomLinks: [...(footer.bottomLinks || []), { label: 'Nuovo Link', url: '#' }] });
  };

  const removeBottomLink = (index) => {
    setFooter({ ...footer, bottomLinks: footer.bottomLinks.filter((_, i) => i !== index) });
  };

  const updateBottomLink = (index, field, value) => {
    const links = [...(footer.bottomLinks || [])];
    links[index] = { ...links[index], [field]: value };
    setFooter({ ...footer, bottomLinks: links });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Footer</h2>
          <p className="text-gray-500 mt-1">Modifica tutti i contenuti del footer del sito</p>
        </div>
        <Button onClick={() => onSave(footer)} className="bg-ocean-500 hover:bg-ocean-600">
          <Check className="w-4 h-4 mr-2" /> Salva Footer
        </Button>
      </div>

      <div className="space-y-6">
        {/* Brand Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-ocean-500" /> Descrizione Brand</CardTitle>
            <CardDescription>Il testo che appare sotto il logo nel footer</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={footer.description || ''} 
              onChange={(e) => setFooter({ ...footer, description: e.target.value })}
              rows={3}
              placeholder="Descrivi la tua agenzia..."
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-ocean-500" /> Informazioni di Contatto</CardTitle>
            <CardDescription>Telefono, email e WhatsApp visualizzati nel footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Telefono</Label>
                <Input value={footer.phone || ''} onChange={(e) => setFooter({ ...footer, phone: e.target.value })} placeholder="+39 XXX XXX XXXX" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input value={footer.email || ''} onChange={(e) => setFooter({ ...footer, email: e.target.value })} placeholder="info@tribuinviaggio.it" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp (testo visualizzato)</Label>
                <Input value={footer.whatsapp || ''} onChange={(e) => setFooter({ ...footer, whatsapp: e.target.value })} placeholder="WhatsApp attivo" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Number & Contact Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp e Email per Contatti</CardTitle>
            <CardDescription>Numero WhatsApp ed email utilizzati nei pulsanti CTA del sito (preventivi, richieste info)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  Numero WhatsApp (con prefisso internazionale)
                </Label>
                <Input
                  value={footer.whatsappNumber || ''}
                  onChange={(e) => setFooter({ ...footer, whatsappNumber: e.target.value })}
                  placeholder="39XXXXXXXXXX (senza + o spazi)"
                />
                <p className="text-xs text-gray-400 mt-1">Es: 393331234567 per +39 333 123 4567</p>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-coral-500" />
                  Email per ricevere richieste
                </Label>
                <Input
                  value={footer.contactEmail || ''}
                  onChange={(e) => setFooter({ ...footer, contactEmail: e.target.value })}
                  placeholder="info@tribuinviaggio.it"
                />
                <p className="text-xs text-gray-400 mt-1">Le richieste di preventivo arriveranno a questo indirizzo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5 text-ocean-500" /> Social Media</CardTitle>
            <CardDescription>Inserisci i link ai tuoi profili social. Le icone appariranno nel footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </Label>
                <Input value={footer.social?.facebook || ''} onChange={(e) => setFooter({ ...footer, social: { ...footer.social, facebook: e.target.value } })} placeholder="https://facebook.com/tribuinviaggio" />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </Label>
                <Input value={footer.social?.instagram || ''} onChange={(e) => setFooter({ ...footer, social: { ...footer.social, instagram: e.target.value } })} placeholder="https://instagram.com/tribuinviaggio" />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  TikTok
                </Label>
                <Input value={footer.social?.tiktok || ''} onChange={(e) => setFooter({ ...footer, social: { ...footer.social, tiktok: e.target.value } })} placeholder="https://tiktok.com/@tribuinviaggio" />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  YouTube
                </Label>
                <Input value={footer.social?.youtube || ''} onChange={(e) => setFooter({ ...footer, social: { ...footer.social, youtube: e.target.value } })} placeholder="https://youtube.com/@tribuinviaggio" />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </Label>
                <Input value={footer.social?.telegram || ''} onChange={(e) => setFooter({ ...footer, social: { ...footer.social, telegram: e.target.value } })} placeholder="https://t.me/tribuinviaggio" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Columns */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-ocean-500" /> Colonne di Link</CardTitle>
                <CardDescription>Gestisci le colonne di link nel footer</CardDescription>
              </div>
              <Button variant="outline" onClick={addColumn}><Plus className="w-4 h-4 mr-1" /> Aggiungi Colonna</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {footer.columns.map((col, colIndex) => (
                <div key={colIndex} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input 
                      value={col.title} 
                      onChange={(e) => updateColumn(colIndex, 'title', e.target.value)}
                      className="font-semibold text-lg w-48"
                      placeholder="Titolo colonna"
                    />
                    {footer.columns.length > 1 && (
                      <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => removeColumn(colIndex)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Links list */}
                  <div className="space-y-2">
                    {col.links.map((link, linkIndex) => (
                      <div key={linkIndex} className="flex items-center gap-2">
                        <Input 
                          value={link.label} 
                          onChange={(e) => updateLinkInColumn(colIndex, linkIndex, 'label', e.target.value)}
                          className="flex-1"
                          placeholder="Etichetta"
                        />
                        <Input 
                          value={link.url} 
                          onChange={(e) => updateLinkInColumn(colIndex, linkIndex, 'url', e.target.value)}
                          className="flex-1"
                          placeholder="URL"
                        />
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => removeLinkFromColumn(colIndex, linkIndex)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add new link */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Input 
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Nuova etichetta"
                      className="flex-1"
                    />
                    <Input 
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="URL (es: /catalogo)"
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => addLinkToColumn(colIndex)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Copyright & Bottom Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-ocean-500" /> Copyright & Link Legali</CardTitle>
            <CardDescription>Testo copyright e link alla privacy/cookie/termini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Testo Copyright</Label>
              <Input value={footer.copyright || ''} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} placeholder="© 2025 Tribù in Viaggio..." />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Link Footer (Privacy, Cookie, ecc.)</Label>
                <Button size="sm" variant="outline" onClick={addBottomLink}><Plus className="w-3 h-3 mr-1" /> Aggiungi</Button>
              </div>
              <div className="space-y-2">
                {(footer.bottomLinks || []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={link.label} onChange={(e) => updateBottomLink(i, 'label', e.target.value)} className="flex-1" placeholder="Etichetta" />
                    <Input value={link.url} onChange={(e) => updateBottomLink(i, 'url', e.target.value)} className="flex-1" placeholder="URL" />
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => removeBottomLink(i)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Footer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-ocean-900 text-white rounded-xl p-8">
              <div className="grid grid-cols-4 gap-8 mb-8">
                <div>
                  <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert mb-3" />
                  <p className="text-white/50 text-sm">{footer.description}</p>
                  {/* Social Preview */}
                  <div className="flex gap-3 mt-4">
                    {footer.social?.facebook && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div>}
                    {footer.social?.instagram && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></div>}
                    {footer.social?.tiktok && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></div>}
                    {footer.social?.youtube && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></div>}
                    {footer.social?.telegram && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></div>}
                  </div>
                </div>
                {footer.columns.map((col, i) => (
                  <div key={i}>
                    <h4 className="font-semibold mb-3 text-white/90">{col.title}</h4>
                    <ul className="space-y-1.5">
                      {col.links.map((link, j) => (
                        <li key={j} className="text-white/50 text-sm hover:text-coral-400 cursor-pointer">{link.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div>
                  <h4 className="font-semibold mb-3 text-white/90">Contattaci</h4>
                  <ul className="space-y-2 text-white/50 text-sm">
                    <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-coral-400" />{footer.phone}</li>
                    <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-coral-400" />{footer.email}</li>
                    <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-coral-400" />{footer.whatsapp}</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                <p className="text-white/30 text-xs">{footer.copyright}</p>
                <div className="flex gap-4 text-white/30 text-xs">
                  {(footer.bottomLinks || []).map((link, i) => (
                    <span key={i} className="hover:text-white cursor-pointer">{link.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


// ===== SLIDER MANAGER =====
function SliderManager({ slides: initialSlides, onSave }) {
  const defaultSlides = [
    { id: 'slide-1', title: 'Offerte Estive Imperdibili', subtitle: 'Spiagge paradisiache a prezzi incredibili. Prenota ora e risparmia fino al 30%!', ctaText: 'Scopri le Offerte', ctaLink: '#viaggi', bgGradient: 'from-coral-500 to-coral-600', icon: 'Sun', active: true },
    { id: 'slide-2', title: 'Crociere nel Mediterraneo', subtitle: 'Naviga tra le meraviglie del Mediterraneo con le nostre crociere esclusive.', ctaText: 'Esplora Crociere', ctaLink: '/categoria/crociere', bgGradient: 'from-ocean-500 to-ocean-600', icon: 'Ship', active: true },
  ];

  const [slides, setSlides] = useState(initialSlides?.length > 0 ? initialSlides : defaultSlides);
  const [editingSlide, setEditingSlide] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (initialSlides?.length > 0) setSlides(initialSlides);
  }, [initialSlides]);

  const iconOptions = [
    { value: 'Sun', label: 'Sole' }, { value: 'Ship', label: 'Crociera' },
    { value: 'Heart', label: 'Cuore' }, { value: 'Hotel', label: 'Hotel' },
    { value: 'Headphones', label: 'Assistenza' }, { value: 'Star', label: 'Stella' },
    { value: 'Globe', label: 'Globo' }, { value: 'Plane', label: 'Aereo' },
    { value: 'Waves', label: 'Mare' }, { value: 'Map', label: 'Mappa' },
    { value: 'Sparkles', label: 'Scintille' }, { value: 'Compass', label: 'Bussola' },
    { value: 'Award', label: 'Premio' },
  ];

  const gradientOptions = [
    { value: 'from-coral-500 to-coral-600', label: 'Arancione', color: '#F47E11' },
    { value: 'from-ocean-500 to-ocean-600', label: 'Azzurro', color: '#00A0E9' },
    { value: 'from-pink-500 to-rose-500', label: 'Rosa', color: '#ec4899' },
    { value: 'from-emerald-500 to-teal-500', label: 'Verde', color: '#10b981' },
    { value: 'from-ocean-800 to-ocean-900', label: 'Blu Scuro', color: '#0B1F3A' },
    { value: 'from-amber-500 to-orange-500', label: 'Ambra', color: '#f59e0b' },
    { value: 'from-purple-500 to-indigo-500', label: 'Viola', color: '#8b5cf6' },
    { value: 'from-teal-500 to-cyan-500', label: 'Teal', color: '#14b8a6' },
  ];

  const iconMap = { Sun, Ship, Heart, Hotel, Headphones, Star, Globe, Plane, Waves, Map, Sparkles, Compass, Award };

  const addSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: 'Nuova Slide',
      subtitle: 'Descrizione della slide...',
      ctaText: 'Scopri di più',
      ctaLink: '#',
      bgGradient: 'from-ocean-500 to-ocean-600',
      icon: 'Star',
      active: true
    };
    setSlides([...slides, newSlide]);
    setEditingSlide(newSlide.id);
  };

  const updateSlide = (slideId, updates) => {
    setSlides(slides.map(s => s.id === slideId ? { ...s, ...updates } : s));
  };

  const deleteSlide = (slideId) => {
    if (slides.length <= 1) { alert('Devi avere almeno una slide'); return; }
    setSlides(slides.filter(s => s.id !== slideId));
    if (editingSlide === slideId) setEditingSlide(null);
  };

  const moveSlide = (slideId, direction) => {
    const index = slides.findIndex(s => s.id === slideId);
    if ((direction === -1 && index === 0) || (direction === 1 && index === slides.length - 1)) return;
    const newSlides = [...slides];
    const [removed] = newSlides.splice(index, 1);
    newSlides.splice(index + direction, 0, removed);
    setSlides(newSlides);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Slider Promozionale</h2>
          <p className="text-gray-500 mt-1">Gestisci le slide promozionali sotto la barra di ricerca</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={addSlide}><Plus className="w-4 h-4 mr-2" /> Nuova Slide</Button>
          <Button onClick={() => onSave(slides)} className="bg-ocean-500 hover:bg-ocean-600"><Check className="w-4 h-4 mr-2" /> Salva</Button>
        </div>
      </div>

      {/* Slide Cards */}
      <div className="space-y-4 mb-8">
        {slides.map((slide, index) => {
          const SlideIcon = iconMap[slide.icon] || Star;
          const isEditing = editingSlide === slide.id;
          const gradientInfo = gradientOptions.find(g => g.value === slide.bgGradient);

          return (
            <Card key={slide.id} className={isEditing ? 'ring-2 ring-ocean-500' : ''}>
              <CardContent className="p-4">
                {!isEditing ? (
                  /* View Mode */
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveSlide(slide.id, -1)} disabled={index === 0}>▲</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveSlide(slide.id, 1)} disabled={index === slides.length - 1}>▼</Button>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: gradientInfo?.color || '#00A0E9' }}>
                      <SlideIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{slide.title}</h3>
                        {!slide.active && <Badge variant="secondary">Disattivata</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{slide.subtitle}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">{slide.ctaText} → {slide.ctaLink}</Badge>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: gradientInfo?.color || '#00A0E9' }}></div>
                        <span className="text-xs text-gray-400">{gradientInfo?.label || 'Azzurro'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={slide.active !== false} onCheckedChange={(checked) => updateSlide(slide.id, { active: checked })} />
                      <Button size="sm" variant="outline" onClick={() => setEditingSlide(slide.id)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteSlide(slide.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Titolo *</Label>
                        <Input value={slide.title} onChange={(e) => updateSlide(slide.id, { title: e.target.value })} placeholder="Titolo attrattivo" />
                      </div>
                      <div>
                        <Label>Testo CTA</Label>
                        <Input value={slide.ctaText} onChange={(e) => updateSlide(slide.id, { ctaText: e.target.value })} placeholder="Es: Scopri le Offerte" />
                      </div>
                    </div>
                    <div>
                      <Label>Sottotitolo / Descrizione</Label>
                      <Textarea value={slide.subtitle} onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })} rows={2} placeholder="Testo persuasivo..." />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Link CTA</Label>
                        <Input value={slide.ctaLink} onChange={(e) => updateSlide(slide.id, { ctaLink: e.target.value })} placeholder="Es: /categoria/crociere o #viaggi" />
                      </div>
                      <div>
                        <Label>Icona</Label>
                        <Select value={slide.icon} onValueChange={(v) => updateSlide(slide.id, { icon: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{iconOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Colore Sfondo</Label>
                        <Select value={slide.bgGradient} onValueChange={(v) => updateSlide(slide.id, { bgGradient: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {gradientOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.color }}></div>
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button variant="outline" onClick={() => setEditingSlide(null)}>Chiudi</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Anteprima Live</CardTitle>
          <CardDescription>Clicca le slide per visualizzarle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden rounded-xl" style={{ minHeight: '120px' }}>
            {slides.filter(s => s.active !== false).map((slide, index) => {
              const SlideIcon = iconMap[slide.icon] || Star;
              const gradientInfo = gradientOptions.find(g => g.value === slide.bgGradient);
              return (
                <div
                  key={slide.id}
                  className={`${index === previewIndex ? '' : 'hidden'} rounded-xl p-8 flex items-center`}
                  style={{ background: `linear-gradient(to right, ${gradientInfo?.color || '#00A0E9'}, ${gradientInfo?.color || '#00A0E9'}dd)` }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center">
                        <SlideIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{slide.title}</h3>
                        <p className="text-white/80 text-sm">{slide.subtitle}</p>
                      </div>
                    </div>
                    <Button className="bg-white/20 text-white border border-white/30 rounded-full">
                      {slide.ctaText} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {slides.filter(s => s.active !== false).map((_, index) => (
              <button
                key={index}
                onClick={() => setPreviewIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === previewIndex ? 'w-8 bg-ocean-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// ===== HERO BANNER MANAGER =====
function HeroBannerManager({ banners: initialBanners, onSave }) {
  const defaultBanners = [
    { id: 'hero-1', title: 'Il tuo prossimo viaggio', highlight: 'inizia qui', subtitle: 'Lasciati ispirare dalle nostre proposte esclusive.', bgImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80', active: true },
  ];

  const [banners, setBanners] = useState(initialBanners?.length > 0 ? initialBanners : defaultBanners);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (initialBanners?.length > 0) setBanners(initialBanners);
  }, [initialBanners]);

  const addBanner = () => {
    const newBanner = {
      id: `hero-${Date.now()}`,
      title: 'Nuovo Titolo',
      highlight: 'in evidenza',
      subtitle: 'Descrizione attrattiva per questa slide...',
      bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
      active: true
    };
    setBanners([...banners, newBanner]);
    setEditingBanner(newBanner.id);
  };

  const updateBanner = (id, updates) => {
    setBanners(banners.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBanner = (id) => {
    if (banners.length <= 1) { alert('Devi avere almeno un banner'); return; }
    setBanners(banners.filter(b => b.id !== id));
    if (editingBanner === id) setEditingBanner(null);
  };

  const moveBanner = (id, direction) => {
    const index = banners.findIndex(b => b.id === id);
    if ((direction === -1 && index === 0) || (direction === 1 && index === banners.length - 1)) return;
    const arr = [...banners];
    const [removed] = arr.splice(index, 1);
    arr.splice(index + direction, 0, removed);
    setBanners(arr);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Hero Banner</h2>
          <p className="text-gray-500 mt-1">Gestisci le slide della sezione principale con immagini di copertina</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={addBanner}><Plus className="w-4 h-4 mr-2" /> Nuova Slide</Button>
          <Button onClick={() => onSave(banners)} className="bg-ocean-500 hover:bg-ocean-600"><Check className="w-4 h-4 mr-2" /> Salva</Button>
        </div>
      </div>

      {/* Banner Cards */}
      <div className="space-y-4 mb-8">
        {banners.map((banner, index) => {
          const isEditing = editingBanner === banner.id;

          return (
            <Card key={banner.id} className={isEditing ? 'ring-2 ring-ocean-500' : ''}>
              <CardContent className="p-4">
                {!isEditing ? (
                  /* View Mode */
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveBanner(banner.id, -1)} disabled={index === 0}>▲</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveBanner(banner.id, 1)} disabled={index === banners.length - 1}>▼</Button>
                    </div>
                    <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={banner.bgImage} alt={banner.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{banner.title} <span className="text-coral-500">{banner.highlight}</span></h3>
                        {!banner.active && <Badge variant="secondary">Disattivata</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{banner.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={banner.active !== false} onCheckedChange={(checked) => updateBanner(banner.id, { active: checked })} />
                      <Button size="sm" variant="outline" onClick={() => setEditingBanner(banner.id)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteBanner(banner.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Titolo principale</Label>
                        <Input value={banner.title} onChange={(e) => updateBanner(banner.id, { title: e.target.value })} placeholder="Es: Il tuo prossimo viaggio" />
                      </div>
                      <div>
                        <Label>Testo evidenziato (arancione)</Label>
                        <Input value={banner.highlight} onChange={(e) => updateBanner(banner.id, { highlight: e.target.value })} placeholder="Es: inizia qui" />
                      </div>
                    </div>
                    <div>
                      <Label>Sottotitolo / Descrizione</Label>
                      <Textarea value={banner.subtitle} onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })} rows={2} placeholder="Testo attrattivo..." />
                    </div>
                    <div>
                      <Label>URL Immagine di Sfondo</Label>
                      <div className="flex gap-2"><Input value={banner.bgImage} onChange={(e) => updateBanner(banner.id, { bgImage: e.target.value })} placeholder="https://images.unsplash.com/..." /><ImageUploadButton folder="banner" onUploaded={(url) => updateBanner(banner.id, { bgImage: url })} /></div>
                      {banner.bgImage && (
                        <div className="mt-2 relative rounded-lg overflow-hidden h-40">
                          <img src={banner.bgImage} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 via-ocean-900/30 to-ocean-900/70 flex items-center justify-center">
                            <div className="text-center text-white">
                              <p className="text-2xl font-display font-bold">{banner.title} <span className="text-coral-400">{banner.highlight}</span></p>
                              <p className="text-white/80 text-sm mt-1">{banner.subtitle}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button variant="outline" onClick={() => setEditingBanner(null)}>Chiudi</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Anteprima Hero</CardTitle>
          <CardDescription>Così apparirà la sezione Hero nella homepage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-xl overflow-hidden" style={{ height: '300px' }}>
            {banners.filter(b => b.active !== false).map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === previewIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img src={banner.bgImage} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/60 via-ocean-900/30 to-ocean-900/70 flex items-center justify-center">
                  <div className="text-center text-white px-8">
                    <h3 className="text-3xl md:text-4xl font-display font-bold mb-2">
                      {banner.title} <span className="text-coral-400">{banner.highlight}</span>
                    </h3>
                    <p className="text-white/80 text-lg">{banner.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 mt-4">
            {banners.filter(b => b.active !== false).map((_, index) => (
              <button
                key={index}
                onClick={() => setPreviewIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === previewIndex ? 'w-10 bg-coral-400' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TestimonialManager({ testimonials: initialTestimonials, token, onRefresh }) {
  const [testimonials, setTestimonials] = useState(initialTestimonials || []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', rating: 5, text: '', imageUrl: '', tripTitle: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTestimonials(initialTestimonials || []);
  }, [initialTestimonials]);

  const resetForm = () => {
    setForm({ name: '', location: '', rating: 5, text: '', imageUrl: '', tripTitle: '' });
    setEditing(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/admin/testimonials/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form)
        });
      } else {
        await fetch('/api/admin/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form)
        });
      }
      resetForm();
      onRefresh();
    } catch (error) {
      alert('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa recensione?')) return;
    try {
      await fetch(`/api/admin/testimonials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (error) {
      alert('Errore nella cancellazione');
    }
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name || '', location: t.location || '', rating: t.rating || 5, text: t.text || '', imageUrl: t.imageUrl || '', tripTitle: t.tripTitle || '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-display font-bold text-gray-900">Gestione Recensioni</h2>
      </div>

      {/* Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{editing ? 'Modifica Recensione' : 'Nuova Recensione'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome cliente *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mario Rossi" />
            </div>
            <div>
              <Label>Provenienza</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Roma, Italia" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Viaggio</Label>
              <Input value={form.tripTitle} onChange={(e) => setForm({ ...form, tripTitle: e.target.value })} placeholder="Crociera nel Mediterraneo" />
            </div>
            <div>
              <Label>Voto (1-5)</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, rating: s })} className="p-1">
                    <Star className={`w-6 h-6 ${s <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Recensione *</Label>
            <div className="mt-1">
              <RichTextEditor
                compact
                minHeight={90}
                value={form.text}
                onChange={(html) => setForm({ ...form, text: html })}
                placeholder="Racconta l'esperienza... (puoi usare grassetto ed evidenziatore)"
              />
            </div>
          </div>
          <div>
            <Label>URL Foto (opzionale)</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || !form.name || !form.text} className="bg-ocean-500 hover:bg-ocean-600">
              {saving ? 'Salvataggio...' : editing ? 'Aggiorna' : 'Aggiungi Recensione'}
            </Button>
            {editing && <Button variant="outline" onClick={resetForm}>Annulla</Button>}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {testimonials.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Quote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nessuna recensione. Aggiungine una sopra!</p>
            </CardContent>
          </Card>
        ) : (
          testimonials.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {t.imageUrl ? (
                      <img src={t.imageUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-ocean-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{t.name}</h3>
                        {t.location && <span className="text-xs text-gray-500">- {t.location}</span>}
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= (t.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm italic">"{stripHtml(t.text)}"</p>
                      {t.tripTitle && <p className="text-xs text-ocean-500 mt-2">Viaggio: {t.tripTitle}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


function NewsletterManager({ token }) {
  const [subscribers, setSubscribers] = useState([]);
  const [settings, setSettings] = useState({ whatsappChannel: '', telegramChannel: '' });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/newsletter', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/newsletter/settings', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const subsData = await subsRes.json();
      const settingsData = await settingsRes.json();
      setSubscribers(Array.isArray(subsData) ? subsData : []);
      setSettings(settingsData || { whatsappChannel: '', telegramChannel: '' });
    } catch (error) {
      console.error('Error loading newsletter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      alert('Impostazioni canali salvate!');
    } catch (error) {
      alert('Errore nel salvataggio');
    } finally {
      setSavingSettings(false);
    }
  };

  const deleteSubscriber = async (id) => {
    if (!confirm('Rimuovere questo iscritto?')) return;
    try {
      await fetch(`/api/admin/newsletter/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscribers(subscribers.filter(s => s.id !== id));
    } catch (error) {
      alert('Errore nella cancellazione');
    }
  };

  const exportCSV = () => {
    const csv = 'Email,Data Iscrizione\n' + subscribers.map(s =>
      `${s.email},${new Date(s.subscribedAt).toLocaleDateString('it-IT')}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSubscribers = subscribers.filter(s =>
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Newsletter & Canali</h2>
          <p className="text-gray-500 mt-1">Gestisci iscritti alla newsletter e link ai canali promozioni</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Channel Links Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-ocean-500" />
              Link Canali Promozioni
            </CardTitle>
            <CardDescription>Inserisci i link ai canali WhatsApp e Telegram dove pubblichi le promozioni. Appariranno nella sezione newsletter della homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  Canale WhatsApp
                </Label>
                <Input
                  value={settings.whatsappChannel || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappChannel: e.target.value })}
                  placeholder="https://whatsapp.com/channel/..."
                />
                <p className="text-xs text-gray-400 mt-1">Link al canale WhatsApp dove pubblichi le promo</p>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Canale Telegram
                </Label>
                <Input
                  value={settings.telegramChannel || ''}
                  onChange={(e) => setSettings({ ...settings, telegramChannel: e.target.value })}
                  placeholder="https://t.me/..."
                />
                <p className="text-xs text-gray-400 mt-1">Link al canale Telegram dove pubblichi le promo</p>
              </div>
            </div>
            <Button onClick={saveSettings} disabled={savingSettings} className="bg-ocean-500 hover:bg-ocean-600">
              <Check className="w-4 h-4 mr-2" />
              {savingSettings ? 'Salvataggio...' : 'Salva Impostazioni Canali'}
            </Button>
          </CardContent>
        </Card>

        {/* Subscribers List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-coral-500" />
                  Iscritti Newsletter
                  <Badge variant="secondary" className="ml-2">{subscribers.length}</Badge>
                </CardTitle>
                <CardDescription>Lista di chi si è iscritto alla newsletter dal sito</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV} disabled={subscribers.length === 0}>
                  <Download className="w-4 h-4 mr-1" />
                  Esporta CSV
                </Button>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Aggiorna
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {subscribers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nessun iscritto alla newsletter ancora.</p>
                <p className="text-gray-400 text-sm mt-1">Gli iscritti appariranno qui quando qualcuno compila il form nella homepage.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Input
                    placeholder="Cerca per email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Data Iscrizione</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscribers.map((sub) => (
                        <tr key={sub.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{sub.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(sub.subscribedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteSubscriber(sub.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


const PROMO_THEMES = [
  { value: 'auto', label: 'Auto-detect dalla destinazione', emoji: '🔄' },
  { value: 'tropical', label: 'Tropicale (Maldive, Caraibi, Bali)', emoji: '🌴' },
  { value: 'desert', label: 'Egitto & Deserto (Sharm, Mar Rosso, Dubai)', emoji: '🏛️' },
  { value: 'mediterranean', label: 'Mediterraneo (Grecia, Spagna, Croazia)', emoji: '🏖️' },
  { value: 'cruise', label: 'Crociera (Nave, MSC, Costa)', emoji: '🚢' },
  { value: 'mountain', label: 'Montagna (Alpi, Dolomiti)', emoji: '🏔️' },
  { value: 'city', label: 'Città (Parigi, Roma, Londra)', emoji: '🌆' },
  { value: 'safari', label: 'Safari (Kenya, Tanzania)', emoji: '🦁' },
  { value: 'default', label: 'Classico', emoji: '✈️' },
];

function PromoLandingManager({ token, trips }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: '', tripId: '', themeOverride: 'auto', destination: '',
    heroTitle: '', heroSubtitle: '', heroImage: '',
    offerBadge: '', promoPrice: '', originalPrice: '', discountPercent: '',
    description: '', duration: '', treatment: '', transport: '', period: '',
    departureCity: '', participants: '',
    included: [],
    galleryImages: [],
    highlights: [],
    ctaTitle: '', ctaSubtitle: '', whatsappNumber: '',
    active: true
  });
  const [newIncluded, setNewIncluded] = useState('');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  useEffect(() => { loadPromos(); }, []);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promos', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({
      slug: '', tripId: '', themeOverride: 'auto', destination: '',
      heroTitle: '', heroSubtitle: '', heroImage: '',
      offerBadge: '', promoPrice: '', originalPrice: '', discountPercent: '',
      description: '', duration: '', treatment: '', transport: '', period: '',
      departureCity: '', participants: '',
      included: [], galleryImages: [], highlights: [],
      ctaTitle: '', ctaSubtitle: '', whatsappNumber: '', active: true
    });
    setEditing(null);
    setShowForm(false);
  };

  const fillFromTrip = (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    setForm(prev => ({
      ...prev,
      tripId,
      slug: prev.slug || `promo-${trip.slug}`,
      destination: trip.destination || '',
      heroTitle: trip.title || '',
      heroImage: trip.cardImage || '',
      promoPrice: trip.priceFrom?.toString() || '',
      originalPrice: trip.fullPrice?.toString() || '',
      description: trip.description || '',
      duration: trip.duration || '',
      treatment: trip.treatment || '',
      transport: trip.transport || '',
      period: trip.period || '',
      departureCity: trip.departureCity || '',
      included: trip.included || [],
      galleryImages: trip.images || [],
    }));
  };

  const handleSave = async () => {
    if (!form.slug || !form.heroTitle) { alert('Slug e Titolo sono obbligatori'); return; }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/admin/promos/${editing}` : '/api/admin/promos';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      resetForm();
      loadPromos();
    } catch (e) { alert('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa landing promo?')) return;
    await fetch(`/api/admin/promos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadPromos();
  };

  const startEdit = (promo) => {
    setEditing(promo.id);
    setForm({
      slug: promo.slug || '', tripId: promo.tripId || '', themeOverride: promo.themeOverride || 'auto',
      destination: promo.destination || '', heroTitle: promo.heroTitle || '', heroSubtitle: promo.heroSubtitle || '',
      heroImage: promo.heroImage || '', offerBadge: promo.offerBadge || '',
      promoPrice: promo.promoPrice?.toString() || '', originalPrice: promo.originalPrice?.toString() || '',
      discountPercent: promo.discountPercent?.toString() || '',
      description: promo.description || '', duration: promo.duration || '', treatment: promo.treatment || '',
      transport: promo.transport || '', period: promo.period || '', departureCity: promo.departureCity || '',
      participants: promo.participants || '',
      included: promo.included || [], galleryImages: promo.galleryImages || [], highlights: promo.highlights || [],
      ctaTitle: promo.ctaTitle || '', ctaSubtitle: promo.ctaSubtitle || '', whatsappNumber: promo.whatsappNumber || '',
      active: promo.active !== false
    });
    setShowForm(true);
  };

  const toggleActive = async (promo) => {
    await fetch(`/api/admin/promos/${promo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...promo, active: !promo.active })
    });
    loadPromos();
  };

  const selectedTheme = PROMO_THEMES.find(t => t.value === form.themeOverride) || PROMO_THEMES[0];

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Landing Page Promozionali</h2>
          <p className="text-gray-500 mt-1">Crea pagine di atterraggio super attrattive con temi dinamici per destinazione</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-ocean-500 hover:bg-ocean-600">
          <Plus className="w-4 h-4 mr-2" /> Nuova Landing
        </Button>
      </div>

      {/* Promo List */}
      {promos.length === 0 && !showForm ? (
        <Card className="text-center py-16">
          <CardContent>
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessuna landing promo creata</h3>
            <p className="text-gray-500 mb-6">Crea la tua prima pagina promozionale!</p>
            <Button onClick={() => setShowForm(true)} className="bg-ocean-500 hover:bg-ocean-600">
              <Plus className="w-4 h-4 mr-2" /> Crea Landing Page
            </Button>
          </CardContent>
        </Card>
      ) : !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => {
            const themeEmoji = PROMO_THEMES.find(t => t.value === p.themeOverride)?.emoji || '✈️';
            return (
              <Card key={p.id} className={`overflow-hidden ${!p.active ? 'opacity-60' : ''}`}>
                <div className="relative h-36">
                  {p.heroImage ? (
                    <img src={p.heroImage} alt={p.heroTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-5xl">{themeEmoji}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <h3 className="font-bold text-sm truncate">{p.heroTitle}</h3>
                    <p className="text-xs text-white/70">/promo/{p.slug}</p>
                  </div>
                  {!p.active && <Badge className="absolute top-2 right-2 bg-gray-500">Bozza</Badge>}
                  {p.active && <Badge className="absolute top-2 right-2 bg-green-500">Attiva</Badge>}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span>{themeEmoji}</span>
                    <span>{p.destination || 'Destinazione non specificata'}</span>
                    {p.promoPrice && <span className="ml-auto font-bold text-ocean-600">€{p.promoPrice}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(p)}>
                      <Edit className="w-3 h-3 mr-1" /> Modifica
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                      {p.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/promo/${p.slug}`, '_blank')}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">{editing ? 'Modifica Landing' : 'Nuova Landing Promo'}</h3>
            <Button variant="ghost" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Chiudi</Button>
          </div>

          {/* Step 1: Trip & Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="w-5 h-5 text-ocean-500" /> Base & Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Collega a un viaggio (opzionale)</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded-lg text-sm"
                    value={form.tripId}
                    onChange={(e) => { setForm({ ...form, tripId: e.target.value }); if (e.target.value) fillFromTrip(e.target.value); }}
                  >
                    <option value="">-- Nessuno (landing indipendente) --</option>
                    {trips.map(t => <option key={t.id} value={t.id}>{t.title} - €{t.priceFrom}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Tema visivo</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded-lg text-sm"
                    value={form.themeOverride}
                    onChange={(e) => setForm({ ...form, themeOverride: e.target.value })}
                  >
                    {PROMO_THEMES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slug URL *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400">/promo/</span>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="offerta-maldive-estate" />
                  </div>
                </div>
                <div>
                  <Label>Destinazione</Label>
                  <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Maldive, Egitto..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Hero */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">{selectedTheme.emoji} Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titolo Hero *</Label>
                <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} placeholder="Maldive da Sogno" className="text-lg" />
              </div>
              <div>
                <Label>Sottotitolo Hero</Label>
                <Input value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} placeholder="7 notti in resort 5 stelle con volo incluso" />
              </div>
              <div>
                <Label>Immagine Hero (URL)</Label>
                <div className="flex gap-2"><Input value={form.heroImage} onChange={(e) => setForm({ ...form, heroImage: e.target.value })} placeholder="https://..." /><ImageUploadButton folder="promo" onUploaded={(url) => setForm((f) => ({ ...f, heroImage: url }))} /></div>
                {form.heroImage && <img src={form.heroImage} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg" />}
              </div>
              <div>
                <Label>Badge offerta (opzionale)</Label>
                <Input value={form.offerBadge} onChange={(e) => setForm({ ...form, offerBadge: e.target.value })} placeholder="OFFERTA LIMITATA • Solo 10 posti!" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Prezzo promo €</Label><Input type="number" value={form.promoPrice} onChange={(e) => setForm({ ...form, promoPrice: e.target.value })} /></div>
                <div><Label>Prezzo originale €</Label><Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></div>
                <div><Label>Sconto %</Label><Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="w-5 h-5 text-ocean-500" /> Dettagli Viaggio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Descrizione</Label>
                <p className="text-xs text-gray-400 mb-1">Editor completo: grassetto, evidenziatore, elenchi, immagini e gallerie.</p>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Descrivi l'offerta..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Durata</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="7 notti" /></div>
                <div><Label>Trattamento</Label><Input value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="All Inclusive" /></div>
                <div><Label>Trasporto</Label><Input value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="Volo incluso" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Periodo</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Giugno - Settembre" /></div>
                <div><Label>Partenza da</Label><Input value={form.departureCity} onChange={(e) => setForm({ ...form, departureCity: e.target.value })} placeholder="Milano, Roma" /></div>
                <div><Label>N. WhatsApp</Label><Input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="39XXXXXXXXXX" /></div>
              </div>

              {/* Included */}
              <div>
                <Label>Cosa include</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newIncluded} onChange={(e) => setNewIncluded(e.target.value)} placeholder="Volo andata e ritorno" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newIncluded.trim()) { setForm({ ...form, included: [...form.included, newIncluded.trim()] }); setNewIncluded(''); } } }} />
                  <Button type="button" variant="outline" onClick={() => { if (newIncluded.trim()) { setForm({ ...form, included: [...form.included, newIncluded.trim()] }); setNewIncluded(''); } }}>+</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.included.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{item}<button onClick={() => setForm({ ...form, included: form.included.filter((_, j) => j !== i) })}><X className="w-3 h-3" /></button></Badge>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              <div>
                <Label>Galleria immagini (URL)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newGalleryUrl} onChange={(e) => setNewGalleryUrl(e.target.value)} placeholder="https://..." />
                  <Button type="button" variant="outline" onClick={() => { if (newGalleryUrl.trim()) { setForm({ ...form, galleryImages: [...form.galleryImages, newGalleryUrl.trim()] }); setNewGalleryUrl(''); } }}>+</Button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {form.galleryImages.map((url, i) => (
                    <div key={i} className="relative w-20 h-14 rounded overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setForm({ ...form, galleryImages: form.galleryImages.filter((_, j) => j !== i) })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: CTA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Send className="w-5 h-5 text-ocean-500" /> CTA & Personalizzazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Titolo CTA</Label><Input value={form.ctaTitle} onChange={(e) => setForm({ ...form, ctaTitle: e.target.value })} placeholder="Non lasciarti scappare questa offerta!" /></div>
                <div><Label>Sottotitolo CTA</Label><Input value={form.ctaSubtitle} onChange={(e) => setForm({ ...form, ctaSubtitle: e.target.value })} placeholder="Posti limitati, prenota ora!" /></div>
              </div>
              {/* Custom highlights */}
              <div>
                <Label>Highlights personalizzati (se vuoti, usa quelli del tema)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newHighlight} onChange={(e) => setNewHighlight(e.target.value)} placeholder="🌊 Mare cristallino" />
                  <Button type="button" variant="outline" onClick={() => { if (newHighlight.trim()) { setForm({ ...form, highlights: [...form.highlights, newHighlight.trim()] }); setNewHighlight(''); } }}>+</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.highlights.map((h, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{h}<button onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, j) => j !== i) })}><X className="w-3 h-3" /></button></Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving} className="bg-ocean-500 hover:bg-ocean-600 px-8">
              {saving ? 'Salvataggio...' : editing ? 'Aggiorna Landing' : 'Crea Landing Page'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Annulla</Button>
            {form.slug && (
              <Button variant="outline" onClick={() => window.open(`/promo/${form.slug}`, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" /> Anteprima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



// ============================================================

