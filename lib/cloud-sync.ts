import type { CellarSnapshot } from './storage';

export type RemoteSnapshot = { owner_id: string; payload: CellarSnapshot; revision: number; updated_at: string };
export type SyncResult = { status: 'uploaded'; revision: number } | { status: 'conflict'; remote: RemoteSnapshot | null };

async function request(method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<Response> {
  return fetch('/api/cellar', {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
}
export async function fetchRemoteCellar(_ownerId: string, _jwt: string): Promise<RemoteSnapshot | null> {
  const response = await request('GET');
  if (!response.ok) throw new Error('Cloud lezen mislukt (' + response.status + ')');
  return await response.json() as RemoteSnapshot | null;
}
export async function firstUpload(ownerId: string, jwt: string, snapshot: CellarSnapshot): Promise<SyncResult> {
  const response = await request('POST', { payload: snapshot });
  if (response.status === 409) return { status: 'conflict', remote: await fetchRemoteCellar(ownerId, jwt) };
  if (!response.ok) throw new Error('Cloud opslaan mislukt (' + response.status + ')');
  const saved = await response.json() as RemoteSnapshot;
  return { status: 'uploaded', revision: saved.revision };
}
export async function uploadRevision(ownerId: string, jwt: string, snapshot: CellarSnapshot, expectedRevision: number): Promise<SyncResult> {
  const response = await request('PATCH', { payload: snapshot, expectedRevision });
  if (response.status === 409) return { status: 'conflict', remote: await fetchRemoteCellar(ownerId, jwt) };
  if (!response.ok) throw new Error('Cloud opslaan mislukt (' + response.status + ')');
  const saved = await response.json() as RemoteSnapshot;
  return { status: 'uploaded', revision: saved.revision };
}
export function snapshotFingerprint(snapshot: CellarSnapshot): string {
  return JSON.stringify(snapshot);
}
