import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const AUTH_BASE = process.env.NEON_AUTH_BASE_URL;

async function handler(request: NextRequest, context: { params: { path: string[] } }) {
  if (!AUTH_BASE) return NextResponse.json({ message: 'Aanmelding niet geconfigureerd' }, { status: 503 });
  const path = context.params.path.join('/');
  if (!/^[a-zA-Z0-9/_-]+$/.test(path)) return NextResponse.json({ message: 'Ongeldig pad' }, { status: 400 });
  const target = AUTH_BASE.replace(/\/$/, '') + '/' + path + request.nextUrl.search;
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('accept', 'application/json');
  headers.set('origin', request.nextUrl.origin);
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'POST' ? await request.text() : undefined,
    cache: 'no-store',
    redirect: 'manual',
  });
  const response = new NextResponse(await upstream.text(), { status: upstream.status });
  response.headers.set('content-type', upstream.headers.get('content-type') || 'application/json');
  response.headers.set('cache-control', 'no-store');
  const cookies = upstream.headers.getSetCookie();
  for (const original of cookies) {
    // Strip upstream domain so the cookie is first-party on the VinIQ hostname.
    const firstParty = original.replace(/;\s*Domain=[^;]+/ig, '');
    response.headers.append('set-cookie', firstParty);
  }
  return response;
}
export const GET = handler;
export const POST = handler;
