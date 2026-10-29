import { currentUser, getCloudJWT } from './neon-auth-client';
import { fetchRemoteCellar, firstUpload, uploadRevision, snapshotFingerprint } from './cloud-sync';
import { exportLocalCellarSnapshot, importCellarSnapshot } from './storage';

const META_KEY = 'viniq-cloud-state';
const DIRTY_KEY = 'viniq-cloud-dirty';
export type CloudState = { ownerId: string; revision: number; fingerprint: string };
export type CloudStatus = 'signed-out' | 'synced' | 'conflict' | 'offline' | 'error';

function getMeta(ownerId: string): CloudState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) || 'null') as CloudState | null;
    return parsed?.ownerId === ownerId ? parsed : null;
  } catch { return null; }
}
function confirmSynced(ownerId: string, revision: number, fingerprint: string) {
  localStorage.setItem(META_KEY, JSON.stringify({ ownerId, revision, fingerprint }));
  localStorage.removeItem(DIRTY_KEY);
}
export async function syncCellar(): Promise<CloudStatus> {
  if (!navigator.onLine) return 'offline';
  const user = await currentUser();
  if (!user) return 'signed-out';
  const jwt = await getCloudJWT();
  const local = exportLocalCellarSnapshot();
  const localFingerprint = snapshotFingerprint(local);
  const meta = getMeta(user.id);
  const remote = await fetchRemoteCellar(user.id, jwt);

  if (!remote) {
    const created = await firstUpload(user.id, jwt, local);
    if (created.status !== 'uploaded') return 'conflict';
    confirmSynced(user.id, created.revision, localFingerprint);
    return 'synced';
  }

  const remoteFingerprint = snapshotFingerprint(remote.payload);
  if (remoteFingerprint === localFingerprint) {
    confirmSynced(user.id, remote.revision, localFingerprint);
    return 'synced';
  }

  // No previous sync record: never assume which independent cellar is authoritative.
  if (!meta) return 'conflict';
  const changedLocally = localFingerprint !== meta.fingerprint;
  const changedRemotely = remote.revision !== meta.revision;
  if (changedLocally && changedRemotely) return 'conflict';
  if (changedLocally) {
    const result = await uploadRevision(user.id, jwt, local, meta.revision);
    if (result.status !== 'uploaded') return 'conflict';
    confirmSynced(user.id, result.revision, localFingerprint);
    return 'synced';
  }
  if (changedRemotely) {
    importCellarSnapshot(remote.payload);
    confirmSynced(user.id, remote.revision, remoteFingerprint);
    return 'synced';
  }
  return 'conflict';
}

/** Explicitly choose which snapshot to keep when both exist. */
export async function resolveCloudConflict(choice: 'local' | 'cloud'): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error('Meld je eerst aan');
  const jwt = await getCloudJWT();
  const remote = await fetchRemoteCellar(user.id, jwt);
  if (!remote) throw new Error('Cloudgegevens niet gevonden');
  if (choice === 'cloud') {
    importCellarSnapshot(remote.payload);
    confirmSynced(user.id, remote.revision, snapshotFingerprint(remote.payload));
    return;
  }
  const local = exportLocalCellarSnapshot();
  const result = await uploadRevision(user.id, jwt, local, remote.revision);
  if (result.status !== 'uploaded') throw new Error('Er is opnieuw een conflict. Probeer opnieuw.');
  confirmSynced(user.id, result.revision, snapshotFingerprint(local));
}
