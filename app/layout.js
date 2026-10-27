import './globals.css';
import Script from 'next/script';
import { headers } from 'next/headers';
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher';
import TenantProvider from '@/components/TenantProvider';
import { resolveTenantFromHeaders, publicTenantConfig, tenantBaseUrl } from '@/lib/tenant';
import { tenantThemeCss } from '@/lib/branding';
import { isModuleActive } from '@/lib/modules';

export const dynamic = 'force-dynamic';

async function getTenant() {
  try {
    return await resolveTenantFromHeaders(headers());
  } catch (e) {
    console.error('[layout] tenant resolve error', e);
    return null;
  }
}

export async function generateMetadata() {
  const tenant = await getTenant();
  const h = headers();
  const siteName = tenant?.branding?.siteName || tenant?.name || 'Tribù in Viaggio';
  const title = tenant?.seo?.title || `${siteName} | Agenzia Viaggi Online`;
  const description = tenant?.seo?.description || 'Scopri le migliori offerte di viaggio con assistenza personalizzata.';
  let base;
  try { base = new URL(tenantBaseUrl(tenant, h) || 'https://tribuinviaggio.it'); } catch { base = new URL('https://tribuinviaggio.it'); }
  const indexable = tenant && tenant.status === 'active';
  return {
    title,
    description,
    keywords: 'viaggi, vacanze, crociere, villaggi, tour, weekend, last minute, offerte viaggi, agenzia viaggi',
    metadataBase: base,
    openGraph: { title, description, type: 'website', siteName, locale: 'it_IT' },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: indexable, follow: indexable },
    icons: tenant?.branding?.logoUrl ? { icon: tenant.branding.logoUrl } : undefined,
  };
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

function SuspendedPage({ name }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{name || 'Sito'} non disponibile</h1>
        <p className="text-gray-500">Il sito è temporaneamente sospeso. Riprova più tardi.</p>
      </div>
    </div>
  );
}

export default async function RootLayout({ children }) {
  const tenant = await getTenant();
  const config = publicTenantConfig(tenant);
  const themeCss = tenantThemeCss(tenant?.branding);
  const siteName = config?.branding?.siteName || 'Tribù in Viaggio';
  const baseUrl = tenantBaseUrl(tenant, headers());
  // Tracciamenti globali (GA / Pixel da variabili d'ambiente) solo sul sito master
  const showTracking = !tenant || tenant.isMaster;
  const multilingua = tenant ? isModuleActive(tenant, 'multilingua') : true;

  if (!tenant) {
    return (
      <html lang="it"><body className="antialiased">
        <div className="min-h-screen flex items-center justify-center text-gray-500">Sito non trovato</div>
      </body></html>
    );
  }

  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {themeCss && <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TravelAgency",
              "name": siteName,
              "description": tenant?.seo?.description || "Agenzia viaggi online con consulenza personalizzata",
              "url": baseUrl,
              ...(config?.contacts?.phone ? { "telephone": config.contacts.phone } : {}),
              ...(config?.contacts?.email ? { "email": config.contacts.email } : {}),
              ...(config?.contacts?.address ? { "address": config.contacts.address } : {}),
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "Italian"
              }
            }).replace(/</g, '\\u003c')
          }}
        />
      </head>
      <body className="antialiased">
        <TenantProvider tenant={config}>
          {tenant.status === 'suspended' ? <SuspendedPage name={siteName} /> : children}
          {multilingua && <FloatingLanguageSwitcher />}
        </TenantProvider>
        {showTracking && GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
        {showTracking && META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');`}
          </Script>
        )}
      </body>
    </html>
  );
}
