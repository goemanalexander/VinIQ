import type { CellarSnapshot } from './storage';

/** Cloud transport uses a short-lived Neon Auth JWT; no database password enters the browser. */
export type RemoteSnapshot = { owner_id: string; payload: CellarSnapshot; revision: number; updated_at: string };
export type SyncResult =
  | { status: 'uploaded'; revision: number }
  | { status: 'downloaded'; snapshot: CellarSnapshot; revision: number }
  | { status: 'conflict'; remote: RemoteSnapshot }
  | { status: 'offline' };

const BASE_URL = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

function endpoint(path: string): string {
  if (!BASE_URL) throw new Error('Cloudsync is nog niet geconfigureerd');
  return BASE_URL.replace(/\/$/, '') + path;
}

async function request(path: string, jwt: string, options: RequestInit = {}): Promise<Response> {
  if (!jwt || jwt.split('.').length !== 3) throw new Error('Geen geldige aanmelding');
  return fetch(endpoint(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });
}

/** Reads only the signed-in user's row; RLS enforces the owner restriction. */
export async function fetchRemoteCellar(ownerId: string, jwt: string): Promise<RemoteSnapshot | null> {
  const response = await request(`/cellar_snapshots?owner_id=eq.${encodeURIComponent(ownerId)}&select=owner_id,payload,revision,updated_at&limit=1`, jwt);
  if (!response.ok) throw new Error(`Cloud lezen mislukt (${response.status})`);
  const rows = await response.json() as RemoteSnapshot[];
  return rows[0] ?? null;
}

/** Initial upload is insert-only. Never overwrites an existing remote cellar. */
export async function firstUpload(ownerId: string, jwt: string, snapshot: CellarSnapshot): Promise<SyncResult> {
  const response = await request('/cellar_snapshots?on_conflict=owner_id', jwt, {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ owner_id: ownerId, payload: snapshot, revision: 1 }),
  });
  if (!response.ok) throw new Error(`Eerste cloudback-up mislukt (${response.status})`);
  const inserted = await response.json() as RemoteSnapshot[];
  if (inserted.length) return { status: 'uploaded', revision: inserted[0].revision };
  const remote = await fetchRemoteCellar(ownerId, jwt);
  if (!remote) throw new Error('Cloudback-up kon niet worden bevestigd');
  return { status: 'conflict', remote };
}

/** Compare-and-swap prevents silent overwrites when two devices edit the same revision. */
export async function uploadRevision(ownerId: string, jwt: string, snapshot: CellarSnapshot, expectedRevision: number): Promise<SyncResult> {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('Ongeldige cloudversie');
  const response = await request(`/cellar_snapshots?owner_id=eq.${encodeURIComponent(ownerId)}&revision=eq.${expectedRevision}`, jwt, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ payload: snapshot, revision: expectedRevision + 1, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Cloud opslaan mislukt (${response.status})`);
  const updated = await response.json() as RemoteSnapshot[];
  if (updated.length === 1) return { status: 'uploaded', revision: updated[0].revision };
  const remote = await fetchRemoteCellar(ownerId, jwt);
  if (!remote) throw new Error('Cloudversie ontbreekt');
  return { status: 'conflict', remote };
}

/** Do not auto-merge event histories, racks or stock; ask the user which version to retain. */
export function snapshotFingerprint(snapshot: CellarSnapshot): string {
  return JSON.stringify(snapshot);
}
