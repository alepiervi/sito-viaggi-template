// robots.txt per dominio. I siti in preparazione (draft) non vengono indicizzati.
import { resolveTenantFromHeaders, tenantBaseUrl } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const tenant = await resolveTenantFromHeaders(request.headers);
  const base = tenantBaseUrl(tenant, request.headers);
  const body = !tenant || tenant.status !== 'active'
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /superadmin\nDisallow: /api/\nDisallow: /preventivo/\nDisallow: /area-clienti\n\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' } });
}
