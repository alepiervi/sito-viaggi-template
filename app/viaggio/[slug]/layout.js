// SEO lato server per la pagina viaggio: usa i campi del tab "SEO" del backend
import { findTenantDoc, buildMetadata, siteNameOf, plainText, baseUrlOf, jsonLd } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

async function getTrip(slug) {
  return findTenantDoc('trips', { slug, status: 'published' });
}

export async function generateMetadata({ params }) {
  const { tenant, doc: trip } = await getTrip(params.slug);
  if (!trip) return buildMetadata({ tenant, title: `Viaggio non trovato | ${siteNameOf(tenant)}` });
  const title = trip.seoTitle?.trim()
    || [trip.title, trip.duration, trip.period].filter(Boolean).join(' · ') + ` | ${siteNameOf(tenant)}`;
  const description = trip.seoDescription?.trim() || plainText(trip.shortDescription || trip.description);
  return buildMetadata({
    tenant, title, description,
    image: trip.cardImage || trip.images?.[0],
    path: `/viaggio/${trip.slug}`,
  });
}

export default async function TripLayout({ children, params }) {
  const { tenant, doc: trip } = await getTrip(params.slug);
  const data = trip ? {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: trip.title,
    description: plainText(trip.shortDescription || trip.description, 300),
    image: [trip.cardImage, ...(trip.images || [])].filter(Boolean).slice(0, 5),
    url: `${baseUrlOf(tenant)}/viaggio/${trip.slug}`,
    ...(trip.destination ? { touristType: trip.category, itinerary: { '@type': 'Place', name: trip.destination } } : {}),
    provider: { '@type': 'TravelAgency', name: siteNameOf(tenant), url: baseUrlOf(tenant) },
    ...(Number(trip.priceFrom) > 0 ? {
      offers: { '@type': 'Offer', price: Number(trip.priceFrom), priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
    } : {}),
  } : null;
  return (
    <>
      {data && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />}
      {children}
    </>
  );
}
