/**
 * /logo.png -> logo dell'affiliato corrente.
 * Tutte le pagine usano <img src="/logo.png">: questo percorso restituisce
 * il logo caricato dal Super Admin per il dominio chiamato, oppure il logo
 * di default del sito master.
 */
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveTenantFromHeaders } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let logoUrl = '';
  try {
    const tenant = await resolveTenantFromHeaders(request.headers);
    logoUrl = tenant?.branding?.logoUrl || '';
  } catch (e) {
    console.error('[logo] tenant resolve error', e);
  }
  if (logoUrl && /^https?:\/\//.test(logoUrl)) {
    return NextResponse.redirect(logoUrl, { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } });
  }
  try {
    const file = await readFile(path.join(process.cwd(), 'public', 'brand', 'tribu-logo.png'));
    return new NextResponse(file, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return new NextResponse(null, { status: 302, headers: { Location: '/brand/tribu-logo.png' } });
  }
}
