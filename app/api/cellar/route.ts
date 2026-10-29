import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const AUTH_BASE = process.env.NEON_AUTH_BASE_URL;
const DATA_API = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

type Session = { user?: { id?: string } };
async function identity(request: NextRequest): Promise<{ owner: string; token: string } | null> {
  if (!AUTH_BASE) throw new Error('Neon Auth ontbreekt');
  const headers = { cookie: request.headers.get('cookie') || '', accept: 'application/json' };
  const [sessionResponse, tokenResponse] = await Promise.all([
    fetch(AUTH_BASE + '/get-session', { headers, cache: 'no-store' }),
    fetch(AUTH_BASE + '/token', { headers, cache: 'no-store' }),
  ]);
  if (!sessionResponse.ok || !tokenResponse.ok) return null;
  const session = await sessionResponse.json() as Session;
  const tokenData = await tokenResponse.json() as { token?: string };
  if (!session.user?.id || !tokenData.token) return null;
  // The token is issued by Neon Auth for the same session cookie; RLS independently verifies it.
  return { owner: session.user.id, token: tokenData.token };
}
function validPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Record<string, unknown>;
  return ['wines', 'bottles', 'acquisitions', 'valuations', 'events'].every(key =>
    Array.isArray(data[key]) && (data[key] as unknown[]).length <= 100000);
}
async function dataRequest(path: string, token: string, method = 'GET', body?: unknown, prefer?: string) {
  if (!DATA_API) throw new Error('Neon Data API ontbreekt');
  return fetch(DATA_API.replace(/\/$/, '') + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
}
async function respond(request: NextRequest) {
  try {
    const identityData = await identity(request);
    if (!identityData) return NextResponse.json({ message: 'Meld je eerst aan' }, { status: 401 });
    const { owner, token } = identityData;
    const filter = '?owner_id=eq.' + encodeURIComponent(owner) + '&select=owner_id,payload,revision,updated_at';
    if (request.method === 'GET') {
      const remote = await dataRequest('/cellar_snapshots' + filter + '&limit=1', token);
      if (!remote.ok) return NextResponse.json({ message: 'Cloud lezen mislukt' }, { status: remote.status });
      return NextResponse.json((await remote.json() as unknown[])[0] ?? null);
    }
    const body = await request.json().catch(() => null) as { payload?: unknown; expectedRevision?: number } | null;
    if (!validPayload(body?.payload)) return NextResponse.json({ message: 'Ongeldige wijnkelder' }, { status: 400 });
    if (request.method === 'POST') {
      const remote = await dataRequest('/cellar_snapshots?on_conflict=owner_id', token, 'POST',
        { owner_id: owner, payload: body!.payload, revision: 1 }, 'resolution=ignore-duplicates,return=representation');
      if (!remote.ok) return NextResponse.json({ message: 'Cloud opslaan mislukt' }, { status: remote.status });
      const rows = await remote.json() as unknown[];
      return NextResponse.json(rows[0] ?? null, { status: rows.length ? 201 : 409 });
    }
    if (request.method === 'PATCH') {
      const revision = body?.expectedRevision;
      if (!Number.isSafeInteger(revision) || !revision || revision < 1) return NextResponse.json({ message: 'Ongeldige revisie' }, { status: 400 });
      const remote = await dataRequest('/cellar_snapshots' + filter + '&revision=eq.' + revision, token, 'PATCH',
        { payload: body!.payload, revision: revision + 1, updated_at: new Date().toISOString() }, 'return=representation');
      if (!remote.ok) return NextResponse.json({ message: 'Cloud opslaan mislukt' }, { status: remote.status });
      const rows = await remote.json() as unknown[];
      return NextResponse.json(rows[0] ?? null, { status: rows.length ? 200 : 409 });
    }
    return NextResponse.json({ message: 'Niet ondersteund' }, { status: 405 });
  } catch {
    return NextResponse.json({ message: 'Cloudserver tijdelijk niet beschikbaar' }, { status: 503 });
  }
}
export const GET = respond;
export const POST = respond;
export const PATCH = respond;
