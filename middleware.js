/**
 * Anteprima degli affiliati senza DNS: visitando ?tenant=slug viene salvato
 * un cookie che il server usa per scegliere l'affiliato.
 * Funziona SOLO se la variabile d'ambiente TENANT_OVERRIDE=true
 * (da attivare in sviluppo / anteprima Emergent, mai in produzione).
 */
import { NextResponse } from 'next/server';

export function middleware(request) {
  const slug = request.nextUrl.searchParams.get('tenant');
  if (slug === null) return NextResponse.next();
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const reset = clean === '' || clean === 'reset';
  // passa lo slug anche alla richiesta corrente, così la prima pagina è già quella giusta
  const requestHeaders = new Headers(request.headers);
  if (!reset) requestHeaders.set('x-tenant', clean);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (reset) res.cookies.delete('tenant_preview');
  else res.cookies.set('tenant_preview', clean, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 8 });
  return res;
}

export const config = { matcher: ['/((?!_next/|api/|favicon).*)'] };
