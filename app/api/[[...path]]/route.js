import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, verifyToken, initializeAdmin, validateAdmin } from '@/lib/auth';
import {
  generateCustomerToken, validateCustomer, getCustomerTokenFromRequest,
  generateUniqueReferralCode, hashPassword as hashCustomerPassword, verifyPassword as verifyCustomerPassword,
} from '@/lib/customerAuth';
import {
  createPendingReferral, onLeadConfirmed, getWalletStats, issueVoucher, REFERRAL_REWARD_AMOUNT,
} from '@/lib/referralEngine';
import { translateText, translateBatch } from '@/lib/translator';
import { resolveLang, autoTranslateResponse } from '@/lib/i18nMiddleware';
import { seedDatabase } from '@/lib/seed';
import { uploadImage, deleteImage, uploadToSiteCloudinary, validCloudinarySettings } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import * as cheerio from 'cheerio';
import {
  verifyWebhook as waVerifyWebhook,
  validateSignature as waValidateSignature,
  handleIncomingWebhook as waHandleIncomingWebhook,
  sendWhatsAppText,
} from '@/lib/whatsappBot';
import { runWithTenant, currentTenant } from '@/lib/tenantContext';
import { resolveTenantFromHeaders, publicTenantConfig, tenantBaseUrl, updateTenantAppearance } from '@/lib/tenant';
import { effectiveHomeLayout } from '@/lib/homeSections';
import { moduleForApiPath, isModuleActive, activeModules } from '@/lib/modules';
import { isPlatformPath, handlePlatformRequest } from '@/lib/superadminRoutes';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.substring(7);
  return null;
}

// Default footer object used when the footer doc does not yet exist
const DEFAULT_FOOTER = {
  key: 'footer',
  description: 'La tua agenzia viaggi online di fiducia.',
  columns: [
    { title: 'Viaggi', links: [{ label: 'Crociere', url: '/categoria/crociere' }, { label: 'Villaggi', url: '/categoria/villaggi' }, { label: 'Tour', url: '/categoria/tour' }] },
    { title: 'Azienda', links: [{ label: 'Chi siamo', url: '#chi-siamo' }, { label: 'Blog', url: '/blog' }, { label: 'Contatti', url: '#contatti' }] },
  ],
  phone: '+39 XXX XXX XXXX', email: 'info@tribuinviaggio.it', whatsapp: 'WhatsApp attivo',
  copyright: '2025 Tribu in Viaggio. Tutti i diritti riservati.',
  bottomLinks: [{ label: 'Privacy Policy', url: '#' }, { label: 'Cookie Policy', url: '#' }, { label: 'Termini e Condizioni', url: '#' }],
};

// Auto-link legal pages (privacy/cookie/terms) into footer bottomLinks
async function syncFooterPageLink(db, page) {
  try {
    if (!page) return;
    const keywords = { privacy: 'privacy', cookie: 'cookie', terms: 'termini' };
    const labels = { privacy: 'Privacy Policy', cookie: 'Cookie Policy', terms: 'Termini e Condizioni' };
    const kw = keywords[page.pageType];
    if (!kw) return; // only auto-link legal page types
    const url = `/pagina/${page.slug}`;
    const existing = await db.collection('site_settings').findOne({ key: 'footer' });
    const footer = existing || JSON.parse(JSON.stringify(DEFAULT_FOOTER));
    const bottomLinks = Array.isArray(footer.bottomLinks) ? footer.bottomLinks.slice() : [];
    const idx = bottomLinks.findIndex((l) => (l.label || '').toLowerCase().includes(kw) || (l.url || '').includes(`/pagina/${page.slug}`));
    if (page.status === 'published') {
      if (idx >= 0) bottomLinks[idx] = { ...bottomLinks[idx], label: bottomLinks[idx].label || labels[page.pageType], url };
      else bottomLinks.push({ label: labels[page.pageType], url });
    } else if (idx >= 0 && (bottomLinks[idx].url || '').includes(`/pagina/${page.slug}`)) {
      // page unpublished -> reset link to placeholder
      bottomLinks[idx] = { ...bottomLinks[idx], url: '#' };
    }
    await db.collection('site_settings').updateOne(
      { key: 'footer' },
      { $set: { ...footer, key: 'footer', bottomLinks, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) { console.error('syncFooterPageLink error', e); }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ==================== MULTI-SITO ====================
// Ogni richiesta viene associata all'affiliato (tenant) del dominio chiamato.
// Il database restituito da getDatabase() è poi filtrato automaticamente.
async function dispatch(request, ctx, handler, method) {
  const path = ctx?.params?.path || [];
  const pathString = path.join('/');

  if (isPlatformPath(pathString)) return handlePlatformRequest(request, path, method);

  let tenant;
  try {
    tenant = await resolveTenantFromHeaders(request.headers);
  } catch (e) {
    console.error('Tenant resolve error:', e);
    return NextResponse.json({ error: 'Errore di configurazione del sito' }, { status: 500, headers: corsHeaders });
  }
  if (!tenant) return NextResponse.json({ error: 'Sito non trovato' }, { status: 404, headers: corsHeaders });
  if (tenant.status === 'suspended') {
    return NextResponse.json({ error: 'Sito sospeso' }, { status: 403, headers: corsHeaders });
  }

  if (pathString === 'tenant/config' && method === 'GET') {
    return NextResponse.json(publicTenantConfig(tenant), { headers: corsHeaders });
  }

  const mod = moduleForApiPath(pathString);
  if (mod && !isModuleActive(tenant, mod.code)) {
    if (method === 'GET' && mod.emptyPublic && Object.prototype.hasOwnProperty.call(mod.emptyPublic, pathString)) {
      return NextResponse.json(mod.emptyPublic[pathString], { headers: corsHeaders });
    }
    return NextResponse.json(
      { error: 'Funzione non attiva per questo sito', module: mod.code },
      { status: pathString.startsWith('admin/') ? 403 : 404, headers: corsHeaders }
    );
  }

  return runWithTenant(tenant, () => handler(request, ctx));
}

export async function GET(request, ctx) { return dispatch(request, ctx, handleGET, 'GET'); }
export async function POST(request, ctx) { return dispatch(request, ctx, handlePOST, 'POST'); }
export async function PUT(request, ctx) { return dispatch(request, ctx, handlePUT, 'PUT'); }
export async function DELETE(request, ctx) { return dispatch(request, ctx, handleDELETE, 'DELETE'); }

// ==================== GET ====================
async function handleGET(request, { params }) {
  const path = params?.path || [];
  const pathString = path.join('/');
  const { searchParams } = new URL(request.url);

  try {
    await initializeAdmin();

    if (pathString === 'seed') {
      const seedAdmin = await validateAdmin(getTokenFromRequest(request));
      if (!seedAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const result = await seedDatabase();
      return NextResponse.json(result, { headers: corsHeaders });
    }

    if (pathString === 'health') {
      return NextResponse.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // Resolve language from cookie/header/query for auto-translation
    const reqLang = isModuleActive(currentTenant(), 'multilingua') ? resolveLang(request, searchParams) : 'it';
    const i18n = async (data) => (reqLang === 'it' ? data : await autoTranslateResponse(data, pathString, reqLang));

    // --- PUBLIC: Trips ---
    if (pathString === 'trips') {
      const db = await getDatabase();
      const trips = await db.collection('trips').find({ status: 'published' }).sort({ order: 1, createdAt: -1 }).toArray();
      return NextResponse.json(await i18n(trips), { headers: corsHeaders });
    }

    if (pathString === 'trips/featured') {
      const db = await getDatabase();
      const trips = await db.collection('trips').find({ status: 'published', featured: true }).sort({ order: 1 }).limit(6).toArray();
      return NextResponse.json(await i18n(trips), { headers: corsHeaders });
    }

    if (pathString.startsWith('trips/category/')) {
      const category = path[2];
      const db = await getDatabase();
      const trips = await db.collection('trips').find({ status: 'published', category }).sort({ order: 1 }).toArray();
      return NextResponse.json(await i18n(trips), { headers: corsHeaders });
    }

    if (pathString === 'trips/search') {
      const db = await getDatabase();
      const query = searchParams.get('q') || '';
      const category = searchParams.get('category');
      const filter = { status: 'published' };
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { destination: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ];
      }
      if (category) filter.category = category;
      const trips = await db.collection('trips').find(filter).sort({ order: 1 }).toArray();
      return NextResponse.json(await i18n(trips), { headers: corsHeaders });
    }

    // --- PUBLIC: Related trips (same category > same country > same destination > featured) ---
    if (pathString.startsWith('trips/') && path.length === 3 && path[2] === 'related') {
      const slug = path[1];
      const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 12);
      const db = await getDatabase();
      const current = await db.collection('trips').findOne({ slug, status: 'published' });
      if (!current) return NextResponse.json([], { headers: corsHeaders });

      const others = await db.collection('trips')
        .find({ status: 'published', id: { $ne: current.id } })
        .toArray();

      const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
      const scored = others.map(t => {
        let score = 0;
        if (norm(t.category) && norm(t.category) === norm(current.category)) score += 50;
        if (norm(t.country) && norm(t.country) === norm(current.country)) score += 25;
        if (norm(t.destination) && norm(t.destination) === norm(current.destination)) score += 20;
        const curTags = Array.isArray(current.tags) ? current.tags.map(norm) : [];
        const tTags = Array.isArray(t.tags) ? t.tags.map(norm) : [];
        score += tTags.filter(tag => tag && curTags.includes(tag)).length * 5;
        // Price proximity bonus (max 10)
        const cp = Number(current.priceFrom) || 0;
        const tp = Number(t.priceFrom) || 0;
        if (cp > 0 && tp > 0) {
          const diff = Math.abs(cp - tp) / cp;
          if (diff <= 0.5) score += Math.round((1 - diff) * 10);
        }
        if (t.featured) score += 3;
        if (t.isPromo) score += 2;
        return { trip: t, score };
      });

      scored.sort((a, b) => b.score - a.score || (Number(a.trip.priceFrom) || 0) - (Number(b.trip.priceFrom) || 0));
      const related = scored.slice(0, limit).map(s => s.trip);
      return NextResponse.json(await i18n(related), { headers: corsHeaders });
    }

    if (pathString.startsWith('trips/') && path.length === 2) {
      const slug = path[1];
      const db = await getDatabase();
      const trip = await db.collection('trips').findOne({ slug, status: 'published' });
      if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404, headers: corsHeaders });
      return NextResponse.json(await i18n(trip), { headers: corsHeaders });
    }

    // --- PUBLIC: Categories ---
    if (pathString === 'categories') {
      const db = await getDatabase();
      const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
      return NextResponse.json(await i18n(categories), { headers: corsHeaders });
    }

    // --- PUBLIC: Testimonials ---
    if (pathString === 'testimonials') {
      const db = await getDatabase();
      const testimonials = await db.collection('testimonials').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(await i18n(testimonials), { headers: corsHeaders });
    }

    // --- PUBLIC: Homepage Tabs ---
    if (pathString === 'homepage/tabs') {
      const db = await getDatabase();
      let tabs = await db.collection('homepage_tabs').find({}).sort({ order: 1 }).toArray();
      if (tabs.length === 0) {
        tabs = [
          { id: 'tab-1', name: 'In Evidenza', icon: 'Star', tripIds: [], order: 1, active: true },
          { id: 'tab-2', name: 'Offerte', icon: 'Tag', tripIds: [], order: 2, active: true },
          { id: 'tab-3', name: 'Crociere', icon: 'Ship', tripIds: [], order: 3, active: true },
          { id: 'tab-4', name: 'Mare', icon: 'Waves', tripIds: [], order: 4, active: true },
        ];
      }
      const allTrips = await db.collection('trips').find({ status: 'published' }).toArray();
      const tabsWithTrips = tabs.map(tab => {
        let tabTrips = [];
        if (tab.tripIds && tab.tripIds.length > 0) {
          tabTrips = tab.tripIds.map(id => allTrips.find(t => t.id === id)).filter(Boolean);
        } else {
          if (tab.name === 'In Evidenza') tabTrips = allTrips.filter(t => t.featured).slice(0, 10);
          else if (tab.name === 'Offerte') tabTrips = allTrips.filter(t => t.isPromo || t.isLastMinute || t.discountPercent > 0).slice(0, 10);
          else tabTrips = allTrips.filter(t => t.category === tab.name.toLowerCase()).slice(0, 10);
        }
        return { ...tab, trips: tabTrips };
      });
      return NextResponse.json(await i18n(tabsWithTrips), { headers: corsHeaders });
    }

    // --- PUBLIC: Blog ---
    if (pathString === 'blog') {
      const db = await getDatabase();
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '12');
      const category = searchParams.get('category');
      const filter = { status: 'published' };
      if (category) filter.category = category;
      const total = await db.collection('blog_posts').countDocuments(filter);
      const posts = await db.collection('blog_posts').find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
      const translatedPosts = await i18n(posts);
      return NextResponse.json({ posts: translatedPosts, total, page, pages: Math.ceil(total / limit) }, { headers: corsHeaders });
    }

    if (pathString.startsWith('blog/') && path.length === 2) {
      const slug = path[1];
      const db = await getDatabase();
      const post = await db.collection('blog_posts').findOne({ slug, status: 'published' });
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404, headers: corsHeaders });
      await db.collection('blog_posts').updateOne({ id: post.id }, { $inc: { views: 1 } });
      return NextResponse.json(await i18n(post), { headers: corsHeaders });
    }

    // --- PUBLIC: Static Page by slug ---
    if (pathString.startsWith('pages/') && path.length === 2) {
      const slug = path[1];
      const db = await getDatabase();
      const pageDoc = await db.collection('static_pages').findOne({ slug, status: 'published' });
      if (!pageDoc) return NextResponse.json({ error: 'Page not found' }, { status: 404, headers: corsHeaders });
      const result = { ...pageDoc };
      delete result._id;
      if (pageDoc.layout === 'trips') {
        let trips = [];
        if (pageDoc.tripSource === 'manual' && Array.isArray(pageDoc.tripIds) && pageDoc.tripIds.length) {
          trips = await db.collection('trips').find({ id: { $in: pageDoc.tripIds }, status: 'published' }).toArray();
          trips.sort((a, b) => pageDoc.tripIds.indexOf(a.id) - pageDoc.tripIds.indexOf(b.id));
        } else if (pageDoc.tripSource === 'category' && pageDoc.tripCategory) {
          trips = await db.collection('trips').find({ status: 'published', category: pageDoc.tripCategory }).sort({ order: 1, createdAt: -1 }).toArray();
        } else {
          trips = await db.collection('trips').find({ status: 'published' }).sort({ order: 1, createdAt: -1 }).toArray();
        }
        result.trips = trips.map((t) => { const { _id, ...rest } = t; return rest; });
      }
      return NextResponse.json(await i18n(result), { headers: corsHeaders });
    }

    // --- PUBLIC: Hero Banners ---
    if (pathString === 'hero-banners') {
      const db = await getDatabase();
      let doc = await db.collection('site_settings').findOne({ key: 'hero_banners' });
      if (!doc) {
        // First run only: persist defaults so they appear in the admin dashboard and can be edited/removed
        const banners = [
          { id: 'hero-1', title: 'Il tuo prossimo viaggio', highlight: 'inizia qui', subtitle: 'Lasciati ispirare dalle nostre proposte esclusive. Consulenza gratuita e assistenza dedicata.', bgImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80', active: true },
          { id: 'hero-2', title: 'Esplora il Mediterraneo', highlight: 'via mare', subtitle: 'Crociere esclusive tra isole greche, coste italiane e meraviglie del Mediterraneo.', bgImage: 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1920&q=80', active: true },
          { id: 'hero-3', title: 'Spiagge da sogno', highlight: 'ti aspettano', subtitle: 'Maldive, Caraibi, Zanzibar. Scopri le destinazioni balneari piu esclusive del mondo.', bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', active: true },
          { id: 'hero-4', title: 'Avventure uniche', highlight: 'nel mondo', subtitle: 'Tour organizzati tra culture, tradizioni e paesaggi mozzafiato.', bgImage: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1920&q=80', active: true },
        ];
        await db.collection('site_settings').updateOne({ key: 'hero_banners' }, { $set: { key: 'hero_banners', banners, updatedAt: new Date() } }, { upsert: true });
        doc = { banners };
      }
      return NextResponse.json(await i18n((doc.banners || []).filter(b => b.active !== false)), { headers: corsHeaders });
    }

    // --- PUBLIC: Promo Slides ---
    if (pathString === 'slides') {
      const db = await getDatabase();
      let doc = await db.collection('site_settings').findOne({ key: 'hero_slides' });
      if (!doc) {
        // First run only: persist defaults so they appear in the admin dashboard and can be edited/removed
        const slides = [
          { id: 'slide-1', title: 'Offerte Estive Imperdibili', subtitle: 'Spiagge paradisiache a prezzi incredibili.', ctaText: 'Scopri le Offerte', ctaLink: '#viaggi', bgGradient: 'from-coral-500 to-coral-600', icon: 'Sun', active: true },
          { id: 'slide-2', title: 'Crociere nel Mediterraneo', subtitle: 'Naviga tra le meraviglie del Mediterraneo.', ctaText: 'Esplora Crociere', ctaLink: '/categoria/crociere', bgGradient: 'from-ocean-500 to-ocean-600', icon: 'Ship', active: true },
          { id: 'slide-3', title: 'Weekend Romantici', subtitle: 'Fughe da sogno per due.', ctaText: 'Vedi Weekend', ctaLink: '/categoria/weekend', bgGradient: 'from-pink-500 to-rose-500', icon: 'Heart', active: true },
          { id: 'slide-4', title: 'Villaggi All Inclusive', subtitle: 'Relax totale con tutto incluso.', ctaText: 'Scopri Villaggi', ctaLink: '/categoria/villaggi', bgGradient: 'from-emerald-500 to-teal-500', icon: 'Hotel', active: true },
          { id: 'slide-5', title: 'Consulenza Gratuita', subtitle: 'I nostri esperti ti aiutano!', ctaText: 'Contattaci', ctaLink: '#contatti', bgGradient: 'from-ocean-800 to-ocean-900', icon: 'Headphones', active: true },
        ];
        await db.collection('site_settings').updateOne({ key: 'hero_slides' }, { $set: { key: 'hero_slides', slides, updatedAt: new Date() } }, { upsert: true });
        doc = { slides };
      }
      return NextResponse.json(await i18n((doc.slides || []).filter(s => s.active !== false)), { headers: corsHeaders });
    }

    // --- PUBLIC: Footer ---
    if (pathString === 'footer') {
      const db = await getDatabase();
      const footer = await db.collection('site_settings').findOne({ key: 'footer' });
      if (!footer) {
        const ft = currentTenant();
        if (ft && !ft.isMaster) {
          return NextResponse.json({
            description: ft.branding?.tagline || '', columns: [],
            phone: ft.contacts?.phone || '', email: ft.contacts?.email || '', whatsapp: ft.contacts?.whatsapp || '',
            copyright: `${new Date().getFullYear()} ${ft.branding?.siteName || ft.name}. Tutti i diritti riservati.`,
            bottomLinks: [],
          }, { headers: corsHeaders });
        }
        return NextResponse.json(await i18n({
          description: 'La tua agenzia viaggi online di fiducia.',
          columns: [
            { title: 'Viaggi', links: [{ label: 'Crociere', url: '/categoria/crociere' }, { label: 'Villaggi', url: '/categoria/villaggi' }, { label: 'Tour', url: '/categoria/tour' }] },
            { title: 'Azienda', links: [{ label: 'Chi siamo', url: '#chi-siamo' }, { label: 'Blog', url: '/blog' }, { label: 'Contatti', url: '#contatti' }] }
          ],
          phone: '+39 XXX XXX XXXX', email: 'info@tribuinviaggio.it', whatsapp: 'WhatsApp attivo',
          copyright: '2025 Tribu in Viaggio. Tutti i diritti riservati.',
          bottomLinks: [{ label: 'Privacy Policy', url: '#' }, { label: 'Cookie Policy', url: '#' }, { label: 'Termini e Condizioni', url: '#' }]
        }), { headers: corsHeaders });
      }
      return NextResponse.json(await i18n(footer), { headers: corsHeaders });
    }

    // --- ADMIN: Auth required ---
    if (pathString === 'admin/trips') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const trips = await db.collection('trips').find({}).sort({ order: 1, createdAt: -1 }).toArray();
      return NextResponse.json(trips, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/trips/') && path.length === 3) {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const tripId = path[2];
      const db = await getDatabase();
      const trip = await db.collection('trips').findOne({ id: tripId });
      if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404, headers: corsHeaders });
      return NextResponse.json(trip, { headers: corsHeaders });
    }

    if (pathString === 'admin/leads') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const status = searchParams.get('status');
      const filter = {};
      if (status && status !== 'all') filter.status = status;
      const leads = await db.collection('leads').find(filter).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(leads, { headers: corsHeaders });
    }

    if (pathString === 'admin/categories') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
      return NextResponse.json(categories, { headers: corsHeaders });
    }

    if (pathString === 'admin/blog') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const posts = await db.collection('blog_posts').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(posts, { headers: corsHeaders });
    }

    // --- ADMIN: Static Pages ---
    if (pathString === 'admin/pages') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const pages = await db.collection('static_pages').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(pages, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/pages/') && path.length === 3) {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const pageDoc = await db.collection('static_pages').findOne({ id: path[2] });
      if (!pageDoc) return NextResponse.json({ error: 'Page not found' }, { status: 404, headers: corsHeaders });
      return NextResponse.json(pageDoc, { headers: corsHeaders });
    }

    if (pathString === 'admin/homepage/tabs') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const tabs = await db.collection('homepage_tabs').find({}).sort({ order: 1 }).toArray();
      return NextResponse.json(tabs, { headers: corsHeaders });
    }

    if (pathString === 'admin/footer') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const footer = await db.collection('site_settings').findOne({ key: 'footer' });
      return NextResponse.json(footer || {}, { headers: corsHeaders });
    }

    if (pathString === 'admin/slides') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const doc = await db.collection('site_settings').findOne({ key: 'hero_slides' });
      return NextResponse.json(doc?.slides || [], { headers: corsHeaders });
    }

    if (pathString === 'admin/hero-banners') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const doc = await db.collection('site_settings').findOne({ key: 'hero_banners' });
      return NextResponse.json(doc?.banners || [], { headers: corsHeaders });
    }

    // --- ADMIN: Promo Landing Pages ---
    if (pathString === 'admin/promos') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const promos = await db.collection('promo_pages').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(promos, { headers: corsHeaders });
    }

    // --- PUBLIC: Single Promo Page by slug ---
    if (pathString.startsWith('promos/') && path.length === 2) {
      const slug = path[1];
      const db = await getDatabase();
      const promo = await db.collection('promo_pages').findOne({ slug, active: true });
      if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      if (promo.tripId) {
        const trip = await db.collection('trips').findOne({ id: promo.tripId });
        promo.trip = trip || null;
      }
      return NextResponse.json(promo, { headers: corsHeaders });
    }

    // --- ADMIN: Testimonials ---
    if (pathString === 'admin/testimonials') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const testimonials = await db.collection('testimonials').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(testimonials, { headers: corsHeaders });
    }

    // --- PUBLIC: Sitemap data ---
    if (pathString === 'sitemap-data') {
      const db = await getDatabase();
      const trips = await db.collection('trips').find({ status: 'published' }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
      const categories = await db.collection('categories').find({}, { projection: { slug: 1 } }).toArray();
      const posts = await db.collection('blog_posts').find({ status: 'published' }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
      return NextResponse.json({ trips, categories, posts }, { headers: corsHeaders });
    }

    // --- ADMIN: Newsletter Subscribers ---
    if (pathString === 'admin/newsletter') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const subscribers = await db.collection('newsletter_subscribers').find({}).sort({ subscribedAt: -1 }).toArray();
      return NextResponse.json(subscribers, { headers: corsHeaders });
    }

    // --- ADMIN: Newsletter Settings (channel links) ---
    if (pathString === 'admin/newsletter/settings') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const doc = await db.collection('site_settings').findOne({ key: 'newsletter_settings' });
      return NextResponse.json(doc?.settings || { whatsappChannel: '', telegramChannel: '' }, { headers: corsHeaders });
    }

    // --- PUBLIC: Single Quote/Preventivo by slug ---
    if (pathString.startsWith('quotes/') && path.length === 2) {
      const slug = path[1];
      const db = await getDatabase();
      const quote = await db.collection('quotes').findOne({ slug, status: { $in: ['active', 'draft'] } });
      if (!quote) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404, headers: corsHeaders });
      await db.collection('quotes').updateOne({ id: quote.id }, { $inc: { views: 1 } });
      return NextResponse.json(quote, { headers: corsHeaders });
    }

    // --- ADMIN: List Quotes ---
    if (pathString === 'admin/quotes') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const quotes = await db.collection('quotes').find({}).sort({ createdAt: -1 }).toArray();
      return NextResponse.json(quotes, { headers: corsHeaders });
    }

    // --- PUBLIC: Newsletter Settings (for homepage) ---
    if (pathString === 'newsletter/settings') {
      const db = await getDatabase();
      const doc = await db.collection('site_settings').findOne({ key: 'newsletter_settings' });
      return NextResponse.json(doc?.settings || { whatsappChannel: '', telegramChannel: '' }, { headers: corsHeaders });
    }

    // --- ADMIN: Cloudinary dell'admin per il caricamento foto ---
    if (pathString === 'admin/media-settings') {
      const admin = await validateAdmin(getTokenFromRequest(request));
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const doc = await db.collection('site_settings').findOne({ key: 'cloudinary' });
      return NextResponse.json({
        cloudName: doc?.cloudName || '', uploadPreset: doc?.uploadPreset || '', folder: doc?.folder || '',
        configured: validCloudinarySettings(doc),
        serverFallback: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      }, { headers: corsHeaders });
    }

    // --- ADMIN: Aspetto del sito (colori, logo, ordine sezioni homepage) ---
    if (pathString === 'admin/appearance') {
      const admin = await validateAdmin(getTokenFromRequest(request));
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const t = currentTenant();
      return NextResponse.json({
        branding: t.branding || {},
        homeSections: effectiveHomeLayout(t.layout?.homeSections, activeModules(t)),
        allowed: { colors: isModuleActive(t, 'aspetto'), sections: isModuleActive(t, 'sezioni_home') },
      }, { headers: corsHeaders });
    }

    if (pathString === 'admin/profile') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      return NextResponse.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role || 'owner' }, { headers: corsHeaders });
    }

    // ====== WhatsApp Webhook Verification (Meta) ======
    if (pathString === 'whatsapp/webhook') {
      const result = waVerifyWebhook(searchParams);
      if (result.ok) {
        return new NextResponse(result.challenge, { status: 200 });
      }
      return new NextResponse('Forbidden', { status: 403 });
    }

    // ====== ADMIN: WhatsApp Conversations List ======
    if (pathString === 'admin/whatsapp/conversations') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const conversations = await db.collection('wa_conversations')
        .find({}).sort({ lastMessageAt: -1 }).limit(200).toArray();
      return NextResponse.json(conversations, { headers: corsHeaders });
    }

    // ====== ADMIN: WhatsApp Messages by conversation ======
    if (pathString.startsWith('admin/whatsapp/conversations/') && path.length === 4) {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const conversationId = path[3];
      const db = await getDatabase();
      const conv = await db.collection('wa_conversations').findOne({ id: conversationId });
      if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      const messages = await db.collection('wa_messages')
        .find({ conversationId }).sort({ createdAt: 1 }).toArray();
      return NextResponse.json({ conversation: conv, messages }, { headers: corsHeaders });
    }

    // ====== ADMIN: WhatsApp config status ======
    if (pathString === 'admin/whatsapp/status') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const convCount = await db.collection('wa_conversations').countDocuments();
      const msgCount = await db.collection('wa_messages').countDocuments();
      const leadCount = await db.collection('leads').countDocuments({ source: 'whatsapp-bot' });
      return NextResponse.json({
        configured: {
          phoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
          appSecret: !!process.env.WHATSAPP_APP_SECRET,
          verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || null,
          llmKey: !!(process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY),
          model: process.env.CHAT_MODEL || 'gpt-4o-mini',
        },
        webhookUrl: `${tenantBaseUrl(currentTenant(), request.headers)}/api/whatsapp/webhook`,
        stats: { conversations: convCount, messages: msgCount, leads: leadCount },
      }, { headers: corsHeaders });
    }

    // ============================================================
    // CUSTOMER (MEMBER) ENDPOINTS
    // ============================================================

    // --- CUSTOMER: get own profile ---
    if (pathString === 'customer/me') {
      const token = getCustomerTokenFromRequest(request);
      const customer = await validateCustomer(token);
      if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const { password, ...safe } = customer;
      return NextResponse.json(safe, { headers: corsHeaders });
    }

    // --- CUSTOMER: full dashboard data ---
    if (pathString === 'customer/dashboard') {
      const token = getCustomerTokenFromRequest(request);
      const customer = await validateCustomer(token);
      if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const [walletData, referrals, leads] = await Promise.all([
        getWalletStats(customer.id),
        db.collection('referrals').find({ referrerCustomerId: customer.id }).sort({ createdAt: -1 }).toArray(),
        db.collection('leads').find({ customerId: customer.id }).sort({ createdAt: -1 }).limit(50).toArray(),
      ]);
      const baseUrl = tenantBaseUrl(currentTenant(), request.headers);
      const { password, ...safe } = customer;
      return NextResponse.json({
        customer: safe,
        referralLink: `${baseUrl}/registrati?ref=${customer.referralCode}`,
        wallet: walletData,
        referrals,
        leads,
        stats: {
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter(r => r.status === 'converted').length,
          pendingReferrals: referrals.filter(r => r.status === 'pending').length,
          activeVouchers: walletData.totals.active,
          usedVouchers: walletData.totals.used,
        },
      }, { headers: corsHeaders });
    }

    // --- CUSTOMER: validate a voucher code (used in lead form) ---
    if (pathString === 'customer/voucher/validate') {
      const code = searchParams.get('code');
      if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400, headers: corsHeaders });
      const db = await getDatabase();
      const voucher = await db.collection('vouchers').findOne({ code: code.trim().toUpperCase() });
      if (!voucher) return NextResponse.json({ valid: false, reason: 'not_found' }, { headers: corsHeaders });
      if (voucher.status !== 'active') return NextResponse.json({ valid: false, reason: voucher.status }, { headers: corsHeaders });
      if (new Date(voucher.expiresAt) < new Date()) return NextResponse.json({ valid: false, reason: 'expired' }, { headers: corsHeaders });
      return NextResponse.json({
        valid: true, code: voucher.code, amount: voucher.amount,
        expiresAt: voucher.expiresAt, rules: voucher.rules,
      }, { headers: corsHeaders });
    }

    // ============================================================
    // ADMIN: Customers, Referrals, Vouchers
    // ============================================================
    if (pathString === 'admin/customers') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const customers = await db.collection('customers').find({}).sort({ createdAt: -1 }).toArray();
      // Hide password
      const enriched = await Promise.all(customers.map(async (c) => {
        const { password, ...safe } = c;
        const [voucherCount, referralCount] = await Promise.all([
          db.collection('vouchers').countDocuments({ customerId: c.id }),
          db.collection('referrals').countDocuments({ referrerCustomerId: c.id }),
        ]);
        return { ...safe, voucherCount, referralCount };
      }));
      return NextResponse.json(enriched, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/customers/') && path.length === 3) {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const c = await db.collection('customers').findOne({ id: path[2] });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      const { password, ...safe } = c;
      const [vouchers, referrals, leads] = await Promise.all([
        db.collection('vouchers').find({ customerId: c.id }).sort({ issuedAt: -1 }).toArray(),
        db.collection('referrals').find({ referrerCustomerId: c.id }).sort({ createdAt: -1 }).toArray(),
        db.collection('leads').find({ customerId: c.id }).sort({ createdAt: -1 }).toArray(),
      ]);
      return NextResponse.json({ customer: safe, vouchers, referrals, leads }, { headers: corsHeaders });
    }

    if (pathString === 'admin/referrals') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      const referrals = await db.collection('referrals').find({}).sort({ createdAt: -1 }).toArray();
      // Enrich with referrer name
      const enriched = await Promise.all(referrals.map(async (r) => {
        const ref = await db.collection('customers').findOne({ id: r.referrerCustomerId });
        return {
          ...r,
          referrerName: ref ? `${ref.firstName} ${ref.lastName}` : '—',
          referrerEmail: ref?.email || '',
        };
      }));
      return NextResponse.json(enriched, { headers: corsHeaders });
    }

    if (pathString === 'admin/vouchers') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const db = await getDatabase();
      // Mark expired
      await db.collection('vouchers').updateMany(
        { status: 'active', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      );
      const vouchers = await db.collection('vouchers').find({}).sort({ issuedAt: -1 }).toArray();
      const enriched = await Promise.all(vouchers.map(async (v) => {
        const c = await db.collection('customers').findOne({ id: v.customerId });
        return { ...v, customerName: c ? `${c.firstName} ${c.lastName}` : '—', customerEmail: c?.email || '' };
      }));
      return NextResponse.json(enriched, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Not found', path: pathString }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ==================== POST ====================
async function handlePOST(request, { params }) {
  const path = params?.path || [];
  const pathString = path.join('/');

  try {
    await initializeAdmin();

    // ====== WhatsApp Webhook receive (Meta) — must be FIRST and not require auth ======
    if (pathString === 'whatsapp/webhook') {
      const rawBody = await request.text();
      const signature = request.headers.get('x-hub-signature-256');
      if (!waValidateSignature(rawBody, signature)) {
        console.warn('[WA] Invalid signature for webhook');
        // Always respond 200 to avoid retries blocking your account, but log it
        return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 200 });
      }
      let payload;
      try { payload = JSON.parse(rawBody); } catch { payload = null; }
      if (payload) {
        // Fire-and-forget (but await to ensure logs in dev)
        try {
          await waHandleIncomingWebhook(payload);
        } catch (err) {
          console.error('[WA] Handler error:', err);
        }
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ====== ADMIN: send manual WhatsApp message ======
    if (pathString === 'admin/whatsapp/send') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const { to, body } = await request.json();
      if (!to || !body) {
        return NextResponse.json({ error: 'to and body required' }, { status: 400, headers: corsHeaders });
      }
      const result = await sendWhatsAppText(to, body);
      // Save outbound message
      const db = await getDatabase();
      const conv = await db.collection('wa_conversations').findOne({ phoneNumber: to });
      if (conv) {
        await db.collection('wa_messages').insertOne({
          id: uuidv4(),
          conversationId: conv.id,
          phoneNumber: to,
          direction: 'out',
          content: body,
          createdAt: new Date(),
          manual: true,
          adminId: admin.id,
        });
        await db.collection('wa_conversations').updateOne(
          { id: conv.id },
          { $set: { lastMessageAt: new Date() }, $inc: { messageCount: 1 } }
        );
      }
      return NextResponse.json({ success: true, result }, { headers: corsHeaders });
    }

    if (pathString === 'admin/login') {
      const { email, password } = await request.json();
      const db = await getDatabase();
      const admin = await db.collection('admins').findOne({ email });
      if (!admin || !(await verifyPassword(password, admin.password))) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
      }
      const token = generateToken(admin.id, admin.email);
      return NextResponse.json({ token, user: { id: admin.id, email: admin.email, name: admin.name } }, { headers: corsHeaders });
    }

    if (pathString === 'leads') {
      const data = await request.json();
      const db = await getDatabase();
      // Auto-link to customer if email matches a registered one
      let customerId = data.customerId || null;
      if (!customerId && data.email) {
        const c = await db.collection('customers').findOne({ email: String(data.email).toLowerCase().trim() });
        if (c) customerId = c.id;
      }
      // Normalize voucherCode (uppercase) if provided
      const voucherCode = data.voucherCode ? String(data.voucherCode).trim().toUpperCase() : '';
      const lead = {
        id: uuidv4(),
        ...data,
        customerId,
        voucherCode,
        status: 'new',
        confirmed: false,
        internalNotes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('leads').insertOne(lead);
      return NextResponse.json({ success: true, lead }, { status: 201, headers: corsHeaders });
    }

    if (pathString === 'admin/trips') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const trip = { id: uuidv4(), ...data, slug: data.slug || slugify(data.title, { lower: true, strict: true }), createdAt: new Date(), updatedAt: new Date() };
      await db.collection('trips').insertOne(trip);
      return NextResponse.json(trip, { status: 201, headers: corsHeaders });
    }

    if (pathString === 'admin/upload') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const formData = await request.formData();
      const file = formData.get('file');
      const sub = String(formData.get('folder') || 'trips').replace(/[^a-z0-9_-]/gi, '');
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Immagine troppo grande (massimo 10 MB)' }, { status: 400, headers: corsHeaders });
      if (!String(file.type || '').startsWith('image/')) return NextResponse.json({ error: 'Il file deve essere un\'immagine' }, { status: 400, headers: corsHeaders });
      const bytes = await file.arrayBuffer();
      const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
      const db = await getDatabase();
      // 1) Cloudinary dell'admin (Impostazioni del backend)  2) Cloudinary dello sviluppatore (variabili d'ambiente)
      const media = await db.collection('site_settings').findOne({ key: 'cloudinary' });
      try {
        if (validCloudinarySettings(media)) {
          const result = await uploadToSiteCloudinary(media, base64, media.folder || sub);
          return NextResponse.json(result, { headers: corsHeaders });
        }
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          const result = await uploadImage(base64, `${currentTenant()?.slug || 'master'}/${sub}`);
          return NextResponse.json(result, { headers: corsHeaders });
        }
      } catch (e) {
        return NextResponse.json({ error: e.message || 'Caricamento non riuscito' }, { status: e.status || 502, headers: corsHeaders });
      }
      return NextResponse.json({ error: 'Collega il tuo Cloudinary in Impostazioni per caricare le foto, oppure incolla il link dell\'immagine.' }, { status: 400, headers: corsHeaders });
    }

    if (pathString === 'admin/categories') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const category = { id: uuidv4(), ...data, slug: data.slug || slugify(data.name, { lower: true, strict: true }), createdAt: new Date() };
      await db.collection('categories').insertOne(category);
      return NextResponse.json(category, { status: 201, headers: corsHeaders });
    }

    if (pathString === 'admin/blog') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const post = { id: uuidv4(), ...data, slug: data.slug || slugify(data.title, { lower: true, strict: true }), author: admin.name || 'Admin', views: 0, publishedAt: data.status === 'published' ? new Date() : null, createdAt: new Date(), updatedAt: new Date() };
      await db.collection('blog_posts').insertOne(post);
      return NextResponse.json(post, { status: 201, headers: corsHeaders });
    }

    // --- ADMIN: Create Static Page ---
    if (pathString === 'admin/pages') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      let baseSlug = (data.slug || slugify(data.title || 'pagina', { lower: true, strict: true })) || 'pagina';
      // ensure unique slug
      let slug = baseSlug, n = 1;
      while (await db.collection('static_pages').findOne({ slug })) { slug = `${baseSlug}-${n++}`; }
      const pageDoc = {
        id: uuidv4(),
        title: data.title || 'Nuova pagina',
        slug,
        layout: data.layout === 'trips' ? 'trips' : 'content',
        pageType: data.pageType || 'custom',
        content: data.content || '',
        subtitle: data.subtitle || '',
        heroImage: data.heroImage || '',
        intro: data.intro || '',
        tripSource: data.tripSource || 'all',
        tripCategory: data.tripCategory || '',
        tripIds: Array.isArray(data.tripIds) ? data.tripIds : [],
        status: data.status === 'published' ? 'published' : 'draft',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        createdAt: new Date(), updatedAt: new Date(),
      };
      await db.collection('static_pages').insertOne(pageDoc);
      await syncFooterPageLink(db, pageDoc);
      return NextResponse.json(pageDoc, { status: 201, headers: corsHeaders });
    }

    if (pathString.startsWith('admin/leads/') && pathString.endsWith('/notes') && path.length === 4) {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const leadId = path[2];
      const { text } = await request.json();
      const db = await getDatabase();
      const note = { id: uuidv4(), text, author: admin.name || admin.email, createdAt: new Date() };
      await db.collection('leads').updateOne({ id: leadId }, { $push: { internalNotes: note }, $set: { updatedAt: new Date() } });
      const lead = await db.collection('leads').findOne({ id: leadId });
      return NextResponse.json(lead, { headers: corsHeaders });
    }

    if (pathString === 'admin/homepage/tabs') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const { tabs } = await request.json();
      const db = await getDatabase();
      await db.collection('homepage_tabs').deleteMany({});
      if (tabs && tabs.length > 0) {
        const tabsToInsert = tabs.map((tab, index) => ({ ...tab, id: tab.id || uuidv4(), order: index + 1, updatedAt: new Date() }));
        await db.collection('homepage_tabs').insertMany(tabsToInsert);
      }
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Create Testimonial ---
    if (pathString === 'admin/testimonials') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const testimonial = { id: uuidv4(), ...data, createdAt: new Date() };
      await db.collection('testimonials').insertOne(testimonial);
      return NextResponse.json(testimonial, { status: 201, headers: corsHeaders });
    }

    // --- ADMIN: Create Promo Landing Page ---
    if (pathString === 'admin/promos') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const promo = { id: uuidv4(), ...data, active: true, createdAt: new Date(), updatedAt: new Date() };
      await db.collection('promo_pages').insertOne(promo);
      return NextResponse.json(promo, { status: 201, headers: corsHeaders });
    }

    // --- PUBLIC: Quick Quote Lead ---
    if (pathString === 'quick-quote') {
      const data = await request.json();
      const db = await getDatabase();
      const lead = {
        id: uuidv4(),
        ...data,
        source: 'quick_quote',
        status: 'new',
        internalNotes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('leads').insertOne(lead);
      return NextResponse.json({ success: true, lead }, { status: 201, headers: corsHeaders });
    }

    // --- PUBLIC: Newsletter Subscribe ---
    if (pathString === 'newsletter/subscribe') {
      const { email } = await request.json();
      if (!email) return NextResponse.json({ error: 'Email richiesta' }, { status: 400, headers: corsHeaders });
      const db = await getDatabase();
      const existing = await db.collection('newsletter_subscribers').findOne({ email: email.toLowerCase() });
      if (existing) return NextResponse.json({ success: true, message: 'Già iscritto' }, { headers: corsHeaders });
      const subscriber = {
        id: uuidv4(),
        email: email.toLowerCase(),
        subscribedAt: new Date(),
        active: true
      };
      await db.collection('newsletter_subscribers').insertOne(subscriber);
      return NextResponse.json({ success: true, subscriber }, { status: 201, headers: corsHeaders });
    }

    // --- ADMIN: Scrape URL for Quote ---
    if (pathString === 'admin/quotes/scrape') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const { url } = await request.json();
      if (!url) return NextResponse.json({ error: 'URL richiesto' }, { status: 400, headers: corsHeaders });
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        // --- Extract Title ---
        const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text() || '';

        // --- Extract ALL images ---
        const images = [];
        const seenUrls = new Set();
        const addImage = (src) => {
          if (!src || src.length < 10) return;
          if (!src.startsWith('http')) {
            try { src = new URL(src, url).href; } catch(e) { return; }
          }
          // Filter only tracking pixels, not content images
          if (src.includes('pixel') || src.includes('tracking') || src.includes('analytics') || src.includes('beacon') || src.includes('1x1') || src.includes('.gif') && src.includes('spacer')) return;
          if (seenUrls.has(src)) return;
          seenUrls.add(src);
          images.push(src);
        };

        // OG images first (highest quality)
        $('meta[property="og:image"]').each((i, el) => addImage($(el).attr('content')));
        $('meta[property="og:image:secure_url"]').each((i, el) => addImage($(el).attr('content')));
        
        // Images from srcset (often highest resolution)
        $('img[srcset], source[srcset]').each((i, el) => {
          const srcset = $(el).attr('srcset') || '';
          srcset.split(',').forEach(entry => {
            const parts = entry.trim().split(/\s+/);
            if (parts[0]) addImage(parts[0]);
          });
        });

        // All img tags - src, data-src, data-lazy-src, data-original
        $('img').each((i, el) => {
          const attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-bg', 'data-image'];
          attrs.forEach(attr => {
            const val = $(el).attr(attr);
            if (val) addImage(val);
          });
        });

        // Background images in style attributes
        $('[style*="background"]').each((i, el) => {
          const style = $(el).attr('style') || '';
          const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (match) addImage(match[1]);
        });

        // Picture/source elements
        $('picture source').each((i, el) => {
          const srcset = $(el).attr('srcset') || '';
          srcset.split(',').forEach(entry => {
            const parts = entry.trim().split(/\s+/);
            if (parts[0]) addImage(parts[0]);
          });
        });

        // Links to image files
        $('a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"], a[href$=".webp"]').each((i, el) => {
          addImage($(el).attr('href'));
        });

        // --- Extract full structured content ---
        $('script, style, iframe, noscript, svg').remove();
        
        // Try to get structured sections
        const sections = [];
        
        // Get meta description
        const metaDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
        
        // Extract headings and their content
        const contentArea = $('main, article, [class*="content"], [class*="detail"], [class*="product"], [class*="description"], [id*="content"]').first();
        const contentRoot = contentArea.length ? contentArea : $('body');
        
        // Get all text organized by headings
        let fullText = '';
        const headings = [];
        
        contentRoot.find('h1, h2, h3, h4, h5, p, li, td, span, div').each((i, el) => {
          const tag = $(el).prop('tagName')?.toLowerCase();
          const text = $(el).clone().children().remove().end().text().trim();
          if (!text || text.length < 3) return;
          
          if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
            headings.push(text);
            fullText += `\n\n## ${text}\n`;
          } else if (tag === 'li') {
            fullText += `\n• ${text}`;
          } else if (tag === 'p') {
            fullText += `\n\n${text}`;
          } else if (text.length > 20) {
            fullText += `\n${text}`;
          }
        });

        // Clean up text
        fullText = fullText.replace(/\n{3,}/g, '\n\n').trim();
        if (fullText.length < 100) {
          // Fallback: get all text from body
          fullText = contentRoot.text().replace(/\s+/g, ' ').trim();
        }

        // Try to extract specific travel-related sections
        const itinerary = [];
        contentRoot.find('[class*="itinerar"], [class*="program"], [class*="giorn"], [class*="day"], [id*="itinerar"], [id*="program"]').each((i, el) => {
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          if (text.length > 20) itinerary.push(text);
        });

        // Extract includes/services
        const includes = [];
        contentRoot.find('[class*="includ"], [class*="inclus"], [class*="serviz"], [class*="incluso"], li').each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 5 && text.length < 200) {
            if (text.toLowerCase().includes('inclus') || text.toLowerCase().includes('compres') || text.toLowerCase().includes('serviz') || $(el).prop('tagName')?.toLowerCase() === 'li') {
              includes.push(text);
            }
          }
        });

        // Try to find price
        let priceFound = '';
        contentRoot.find('[class*="price"], [class*="prezz"], [class*="cost"], [class*="tariffa"]').each((i, el) => {
          const text = $(el).text().trim();
          const priceMatch = text.match(/[€$]?\s*[\d.,]+/);
          if (priceMatch && !priceFound) priceFound = priceMatch[0];
        });

        return NextResponse.json({
          title: title.trim(),
          description: metaDesc.trim(),
          fullText: fullText.substring(0, 15000),
          images: images,
          headings: headings.slice(0, 30),
          itinerary: itinerary.join('\n\n').substring(0, 5000),
          includes: [...new Set(includes)].slice(0, 30),
          priceFound: priceFound,
          sourceUrl: url,
          totalImages: images.length,
        }, { headers: corsHeaders });
      } catch (scrapeError) {
        console.error('Scrape error:', scrapeError.message);
        return NextResponse.json({ error: 'Impossibile scaricare la pagina. Controlla l\'URL.', details: scrapeError.message }, { status: 400, headers: corsHeaders });
      }
    }

    // --- ADMIN: Create Quote ---
    if (pathString === 'admin/quotes') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const baseSlug = slugify(`${data.clientName || 'cliente'}-${data.title || 'preventivo'}`, { lower: true, strict: true });
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const quote = {
        id: uuidv4(),
        ...data,
        slug,
        views: 0,
        status: data.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('quotes').insertOne(quote);
      return NextResponse.json(quote, { status: 201, headers: corsHeaders });
    }

    // ============================================================
    // TRANSLATION (public, with AI + cache)
    // ============================================================
    if (pathString === 'translate') {
      const { text, target, source = 'it', context = '' } = await request.json();
      if (!text || !target) {
        return NextResponse.json({ error: 'text and target required' }, { status: 400, headers: corsHeaders });
      }
      const translated = await translateText(text, target, source, context);
      return NextResponse.json({ translated, target, source }, { headers: corsHeaders });
    }

    if (pathString === 'translate/batch') {
      const { items, target, source = 'it' } = await request.json();
      if (!Array.isArray(items) || !target) {
        return NextResponse.json({ error: 'items[] and target required' }, { status: 400, headers: corsHeaders });
      }
      const results = await translateBatch(items, target, source);
      return NextResponse.json({ results, target, source }, { headers: corsHeaders });
    }

    // ============================================================
    // CUSTOMER (MEMBER) AUTH
    // ============================================================
    if (pathString === 'customer/register') {
      const body = await request.json();
      const { firstName, lastName, email, password, phone, referralCode } = body || {};
      if (!firstName || !lastName || !email || !password || !phone) {
        return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400, headers: corsHeaders });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password deve avere almeno 6 caratteri' }, { status: 400, headers: corsHeaders });
      }
      const emailNorm = String(email).toLowerCase().trim();
      const db = await getDatabase();
      const existing = await db.collection('customers').findOne({ email: emailNorm });
      if (existing) {
        return NextResponse.json({ error: 'Email già registrata' }, { status: 409, headers: corsHeaders });
      }
      const refCode = await generateUniqueReferralCode(firstName);
      const hashed = await hashCustomerPassword(password);
      const customer = {
        id: uuidv4(),
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: emailNorm,
        phone: String(phone).trim(),
        password: hashed,
        referralCode: refCode,
        referredByCode: referralCode ? String(referralCode).trim().toUpperCase() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      };
      await db.collection('customers').insertOne(customer);

      // Auto-link any past leads by email
      await db.collection('leads').updateMany(
        { email: emailNorm, $or: [{ customerId: null }, { customerId: { $exists: false } }] },
        { $set: { customerId: customer.id } }
      );

      // Create pending referral if applicable
      if (customer.referredByCode) {
        await createPendingReferral({ newCustomer: customer, referralCodeUsed: customer.referredByCode });
      }

      const token = generateCustomerToken(customer.id, customer.email);
      const { password: _, ...safe } = customer;
      return NextResponse.json({ token, customer: safe }, { status: 201, headers: corsHeaders });
    }

    if (pathString === 'customer/login') {
      const { email, password } = await request.json();
      if (!email || !password) {
        return NextResponse.json({ error: 'Email e password obbligatori' }, { status: 400, headers: corsHeaders });
      }
      const db = await getDatabase();
      const customer = await db.collection('customers').findOne({ email: String(email).toLowerCase().trim() });
      if (!customer || !(await verifyCustomerPassword(password, customer.password))) {
        return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401, headers: corsHeaders });
      }
      if (customer.status === 'blocked') {
        return NextResponse.json({ error: 'Account bloccato' }, { status: 403, headers: corsHeaders });
      }
      const token = generateCustomerToken(customer.id, customer.email);
      const { password: _, ...safe } = customer;
      return NextResponse.json({ token, customer: safe }, { headers: corsHeaders });
    }

    // ============================================================
    // ADMIN: mark a lead as CONFIRMED (booking happened) → trigger referral
    // ============================================================
    if (pathString.startsWith('admin/leads/') && path.length === 4 && path[3] === 'confirm') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const leadId = path[2];
      const body = await request.json().catch(() => ({}));
      const { isLastMinute = false, bookingAmount = 0, voucherCodeApplied = '', departureDate = null, notes = '' } = body;
      const db = await getDatabase();
      const lead = await db.collection('leads').findOne({ id: leadId });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404, headers: corsHeaders });

      // Optionally consume an applied voucher (one-shot)
      let voucherApplied = null;
      if (voucherCodeApplied) {
        const v = await db.collection('vouchers').findOne({ code: voucherCodeApplied.trim().toUpperCase() });
        if (v && v.status === 'active' && new Date(v.expiresAt) > new Date()) {
          if (isLastMinute && v.rules?.excludeLastMinute) {
            return NextResponse.json({ error: 'Buono non utilizzabile su partenze last minute' }, { status: 400, headers: corsHeaders });
          }
          await db.collection('vouchers').updateOne(
            { id: v.id },
            { $set: { status: 'used', usedAt: new Date(), usedOnLeadId: leadId } }
          );
          voucherApplied = { code: v.code, amount: v.amount };
        }
      }

      const updateFields = {
        confirmed: true,
        confirmedAt: new Date(),
        confirmedBy: admin.id,
        isLastMinute,
        bookingAmount: Number(bookingAmount) || 0,
        departureDate: departureDate ? new Date(departureDate) : null,
        status: 'converted',
        updatedAt: new Date(),
      };
      if (voucherApplied) updateFields.voucherApplied = voucherApplied;
      if (notes) updateFields.confirmationNotes = notes;

      await db.collection('leads').updateOne({ id: leadId }, { $set: updateFields });
      const updatedLead = await db.collection('leads').findOne({ id: leadId });

      // Trigger referral reward (only if not last-minute)
      let referralResult = { issued: false, reason: 'last_minute' };
      if (!isLastMinute) {
        referralResult = await onLeadConfirmed(updatedLead);
      } else {
        // mark eventual pending referral as 'on_hold' (will be re-evaluated if another booking comes)
        // Actually rule says new client; if last-minute we simply don't issue but keep referral pending? Decision: keep pending
        referralResult = { issued: false, reason: 'last_minute' };
      }

      return NextResponse.json({ lead: updatedLead, referralResult }, { headers: corsHeaders });
    }

    // ADMIN: unconfirm / rollback (in case of mistake)
    if (pathString.startsWith('admin/leads/') && path.length === 4 && path[3] === 'unconfirm') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const leadId = path[2];
      const db = await getDatabase();
      const lead = await db.collection('leads').findOne({ id: leadId });
      if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      // Revert applied voucher (if any)
      if (lead.voucherApplied?.code) {
        await db.collection('vouchers').updateOne(
          { code: lead.voucherApplied.code, usedOnLeadId: leadId },
          { $set: { status: 'active', usedAt: null, usedOnLeadId: null } }
        );
      }
      // Revert referral conversion (cancel voucher issued for referrer)
      const ref = await db.collection('referrals').findOne({ leadId, status: 'converted' });
      if (ref?.voucherId) {
        await db.collection('vouchers').updateOne(
          { id: ref.voucherId },
          { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'lead_unconfirmed' } }
        );
        await db.collection('referrals').updateOne(
          { id: ref.id },
          { $set: { status: 'pending', convertedAt: null, voucherId: null, leadId: null } }
        );
      }
      await db.collection('leads').updateOne(
        { id: leadId },
        { $set: { confirmed: false, confirmedAt: null, status: 'new', updatedAt: new Date() }, $unset: { voucherApplied: '' } }
      );
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // ADMIN: manually issue voucher
    if (pathString === 'admin/vouchers') {
      const token = getTokenFromRequest(request);
      const admin = await validateAdmin(token);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const { customerId, amount = REFERRAL_REWARD_AMOUNT, note = '' } = await request.json();
      if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400, headers: corsHeaders });
      const v = await issueVoucher({ customerId, source: 'manual', amount: Number(amount), note });
      return NextResponse.json(v, { status: 201, headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ==================== PUT ====================
async function handlePUT(request, { params }) {
  const path = params?.path || [];
  const pathString = path.join('/');

  try {
    // --- CUSTOMER: Update own profile (handle BEFORE admin auth check) ---
    if (pathString === 'customer/me') {
      const token = getCustomerTokenFromRequest(request);
      const customer = await validateCustomer(token);
      if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      const data = await request.json();
      const db = await getDatabase();
      const updateData = {};
      if (data.firstName) updateData.firstName = String(data.firstName).trim();
      if (data.lastName) updateData.lastName = String(data.lastName).trim();
      if (data.phone) updateData.phone = String(data.phone).trim();
      if (data.password && data.password.length >= 6) {
        updateData.password = await hashCustomerPassword(data.password);
      }
      updateData.updatedAt = new Date();
      await db.collection('customers').updateOne({ id: customer.id }, { $set: updateData });
      const updated = await db.collection('customers').findOne({ id: customer.id });
      const { password, ...safe } = updated;
      return NextResponse.json(safe, { headers: corsHeaders });
    }

    const token = getTokenFromRequest(request);
    const admin = await validateAdmin(token);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

    const data = await request.json();
    const db = await getDatabase();

    if (pathString.startsWith('admin/trips/') && path.length === 3) {
      const tripId = path[2];
      const updateData = { ...data, slug: data.slug || slugify(data.title, { lower: true, strict: true }), updatedAt: new Date() };
      delete updateData.id; delete updateData._id;
      await db.collection('trips').updateOne({ id: tripId }, { $set: updateData });
      const trip = await db.collection('trips').findOne({ id: tripId });
      return NextResponse.json(trip, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/leads/') && path.length === 3) {
      const leadId = path[2];
      const updateData = { ...data, updatedAt: new Date() };
      delete updateData.id; delete updateData._id; delete updateData.internalNotes;
      await db.collection('leads').updateOne({ id: leadId }, { $set: updateData });
      const lead = await db.collection('leads').findOne({ id: leadId });
      return NextResponse.json(lead, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/categories/') && path.length === 3) {
      const categoryId = path[2];
      const updateData = { ...data, slug: data.slug || slugify(data.name, { lower: true, strict: true }), updatedAt: new Date() };
      delete updateData.id; delete updateData._id;
      await db.collection('categories').updateOne({ id: categoryId }, { $set: updateData });
      const category = await db.collection('categories').findOne({ id: categoryId });
      return NextResponse.json(category, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/blog/') && path.length === 3) {
      const postId = path[2];
      const existingPost = await db.collection('blog_posts').findOne({ id: postId });
      const updateData = { ...data, slug: data.slug || slugify(data.title, { lower: true, strict: true }), updatedAt: new Date() };
      if (data.status === 'published' && (!existingPost || existingPost.status !== 'published')) updateData.publishedAt = new Date();
      delete updateData.id; delete updateData._id;
      await db.collection('blog_posts').updateOne({ id: postId }, { $set: updateData });
      const post = await db.collection('blog_posts').findOne({ id: postId });
      return NextResponse.json(post, { headers: corsHeaders });
    }

    // --- ADMIN: Update Static Page ---
    if (pathString.startsWith('admin/pages/') && path.length === 3) {
      const pageId = path[2];
      const existing = await db.collection('static_pages').findOne({ id: pageId });
      if (!existing) return NextResponse.json({ error: 'Page not found' }, { status: 404, headers: corsHeaders });
      let slug = data.slug ? slugify(data.slug, { lower: true, strict: true }) : existing.slug;
      if (slug !== existing.slug) {
        let baseSlug = slug, n = 1;
        while (await db.collection('static_pages').findOne({ slug, id: { $ne: pageId } })) { slug = `${baseSlug}-${n++}`; }
      }
      const updateData = {
        title: data.title ?? existing.title,
        slug,
        layout: data.layout === 'trips' ? 'trips' : 'content',
        pageType: data.pageType ?? existing.pageType,
        content: data.content ?? existing.content,
        subtitle: data.subtitle ?? existing.subtitle,
        heroImage: data.heroImage ?? existing.heroImage,
        intro: data.intro ?? existing.intro,
        tripSource: data.tripSource ?? existing.tripSource,
        tripCategory: data.tripCategory ?? existing.tripCategory,
        tripIds: Array.isArray(data.tripIds) ? data.tripIds : existing.tripIds,
        status: data.status === 'published' ? 'published' : 'draft',
        metaTitle: data.metaTitle ?? existing.metaTitle,
        metaDescription: data.metaDescription ?? existing.metaDescription,
        updatedAt: new Date(),
      };
      await db.collection('static_pages').updateOne({ id: pageId }, { $set: updateData });
      const updated = await db.collection('static_pages').findOne({ id: pageId });
      await syncFooterPageLink(db, updated);
      return NextResponse.json(updated, { headers: corsHeaders });
    }

    if (pathString === 'admin/profile') {
      const updateData = { updatedAt: new Date() };
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.password) updateData.password = await hashPassword(data.password);
      await db.collection('admins').updateOne({ id: admin.id }, { $set: updateData });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString === 'admin/media-settings') {
      const clean = (v) => String(v || '').trim();
      const settings = { cloudName: clean(data.cloudName), uploadPreset: clean(data.uploadPreset), folder: clean(data.folder).replace(/[^a-z0-9_\/-]/gi, '') };
      if ((settings.cloudName || settings.uploadPreset) && !validCloudinarySettings(settings)) {
        return NextResponse.json({ error: 'Cloud name e upload preset possono contenere solo lettere, numeri, - e _' }, { status: 400, headers: corsHeaders });
      }
      await db.collection('site_settings').updateOne(
        { key: 'cloudinary' },
        { $set: { key: 'cloudinary', ...settings, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true, configured: validCloudinarySettings(settings) }, { headers: corsHeaders });
    }

    if (pathString === 'admin/appearance') {
      const t = currentTenant();
      try {
        const updated = await updateTenantAppearance(t.id, data, {
          colors: isModuleActive(t, 'aspetto'),
          sections: isModuleActive(t, 'sezioni_home'),
        });
        return NextResponse.json({
          success: true,
          branding: updated.branding,
          homeSections: effectiveHomeLayout(updated.layout?.homeSections, activeModules(updated)),
        }, { headers: corsHeaders });
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: e.status || 500, headers: corsHeaders });
      }
    }

    if (pathString === 'admin/footer') {
      await db.collection('site_settings').updateOne({ key: 'footer' }, { $set: { ...data, key: 'footer', updatedAt: new Date() } }, { upsert: true });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString === 'admin/slides') {
      await db.collection('site_settings').updateOne({ key: 'hero_slides' }, { $set: { key: 'hero_slides', slides: data.slides, updatedAt: new Date() } }, { upsert: true });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString === 'admin/hero-banners') {
      await db.collection('site_settings').updateOne({ key: 'hero_banners' }, { $set: { key: 'hero_banners', banners: data.banners, updatedAt: new Date() } }, { upsert: true });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Save Newsletter Settings ---
    if (pathString === 'admin/newsletter/settings') {
      await db.collection('site_settings').updateOne(
        { key: 'newsletter_settings' },
        { $set: { key: 'newsletter_settings', settings: data, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Update Testimonial ---
    if (pathString.startsWith('admin/testimonials/') && path.length === 3) {
      const testimonialId = path[2];
      const updateData = { ...data, updatedAt: new Date() };
      delete updateData.id; delete updateData._id;
      await db.collection('testimonials').updateOne({ id: testimonialId }, { $set: updateData });
      const testimonial = await db.collection('testimonials').findOne({ id: testimonialId });
      return NextResponse.json(testimonial, { headers: corsHeaders });
    }

    // --- ADMIN: Update Promo Landing Page ---
    if (pathString.startsWith('admin/promos/') && path.length === 3) {
      const promoId = path[2];
      const updateData = { ...data, updatedAt: new Date() };
      delete updateData.id; delete updateData._id;
      await db.collection('promo_pages').updateOne({ id: promoId }, { $set: updateData });
      const promo = await db.collection('promo_pages').findOne({ id: promoId });
      return NextResponse.json(promo, { headers: corsHeaders });
    }

    // --- ADMIN: Update Quote ---
    if (pathString.startsWith('admin/quotes/') && path.length === 3) {
      const quoteId = path[2];
      const updateData = { ...data, updatedAt: new Date() };
      delete updateData.id; delete updateData._id;
      await db.collection('quotes').updateOne({ id: quoteId }, { $set: updateData });
      const quote = await db.collection('quotes').findOne({ id: quoteId });
      return NextResponse.json(quote, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('API PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ==================== DELETE ====================
async function handleDELETE(request, { params }) {
  const path = params?.path || [];
  const pathString = path.join('/');

  try {
    const token = getTokenFromRequest(request);
    const admin = await validateAdmin(token);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

    const db = await getDatabase();

    if (pathString.startsWith('admin/trips/') && path.length === 3) {
      await db.collection('trips').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/leads/') && path.length === 3) {
      await db.collection('leads').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/categories/') && path.length === 3) {
      await db.collection('categories').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (pathString.startsWith('admin/blog/') && path.length === 3) {
      await db.collection('blog_posts').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Delete Static Page ---
    if (pathString.startsWith('admin/pages/') && path.length === 3) {
      await db.collection('static_pages').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Delete Testimonial ---
    if (pathString.startsWith('admin/testimonials/') && path.length === 3) {
      await db.collection('testimonials').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Delete Newsletter Subscriber ---
    if (pathString.startsWith('admin/newsletter/') && path.length === 3 && path[2] !== 'settings') {
      await db.collection('newsletter_subscribers').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Delete Promo Landing Page ---
    if (pathString.startsWith('admin/promos/') && path.length === 3) {
      await db.collection('promo_pages').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Delete Quote ---
    if (pathString.startsWith('admin/quotes/') && path.length === 3) {
      await db.collection('quotes').deleteOne({ id: path[2] });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // --- ADMIN: Cancel/delete voucher ---
    if (pathString.startsWith('admin/vouchers/') && path.length === 3) {
      await db.collection('vouchers').updateOne(
        { id: path[2] },
        { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'admin_cancelled' } }
      );
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('API DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}