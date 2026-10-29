import { currentUser } from './neon-auth-client';
import { fetchRemoteCellar, firstUpload, uploadRevision, snapshotFingerprint } from './cloud-sync';
import { exportLocalCellarSnapshot, importCellarSnapshot } from './storage';

const META_KEY = 'viniq-cloud-state';
const DIRTY_KEY = 'viniq-cloud-dirty';
export type CloudState = { ownerId: string; revision: number; fingerprint: string };
export type CloudStatus = 'signed-out' | 'synced' | 'conflict' | 'offline' | 'error';
let inFlight: Promise<CloudStatus> | null = null;

function getMeta(ownerId: string): CloudState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) || 'null') as CloudState | null;
    return parsed?.ownerId === ownerId ? parsed : null;
  } catch { return null; }
}
function confirmSynced(ownerId: string, revision: number, fingerprint: string) {
  localStorage.setItem(META_KEY, JSON.stringify({ ownerId, revision, fingerprint }));
  localStorage.removeItem('viniq-cloud-seed');
  if (snapshotFingerprint(exportLocalCellarSnapshot()) === fingerprint) {
    localStorage.removeItem(DIRTY_KEY);
  }
}
async function runSync(): Promise<CloudStatus> {
  if (!navigator.onLine) return 'offline';
  const user = await currentUser();
  if (!user) return 'signed-out';
  const local = exportLocalCellarSnapshot();
  const localFingerprint = snapshotFingerprint(local);
  const meta = getMeta(user.id);
  const remote = await fetchRemoteCellar(user.id, '');

  if (!remote) {
    const created = await firstUpload(user.id, '', local);
    if (created.status !== 'uploaded') return 'conflict';
    confirmSynced(user.id, created.revision, localFingerprint);
    return 'synced';
  }
  const remoteFingerprint = snapshotFingerprint(remote.payload);
  if (remoteFingerprint === localFingerprint) {
    confirmSynced(user.id, remote.revision, localFingerprint);
    return 'synced';
  }
  // A freshly installed untouched demo cellar is not user data: load the real cloud copy.
  if (!meta && localStorage.getItem('viniq-cloud-seed') === '1') {
    if (snapshotFingerprint(exportLocalCellarSnapshot()) !== localFingerprint) return 'conflict';
    importCellarSnapshot(remote.payload);
    confirmSynced(user.id, remote.revision, remoteFingerprint);
    window.dispatchEvent(new Event('viniq-cloud-updated'));
    return 'synced';
  }
  // Without a common ancestor, never guess which inventory is authoritative.
  if (!meta) return 'conflict';
  const changedLocally = localFingerprint !== meta.fingerprint;
  const changedRemotely = remote.revision !== meta.revision;
  if (changedLocally && changedRemotely) return 'conflict';
  if (changedLocally) {
    const result = await uploadRevision(user.id, '', local, meta.revision);
    if (result.status !== 'uploaded') return 'conflict';
    confirmSynced(user.id, result.revision, localFingerprint);
    return 'synced';
  }
  if (changedRemotely) {
    // Protect edits made while awaiting the network.
    if (snapshotFingerprint(exportLocalCellarSnapshot()) !== localFingerprint) return 'conflict';
    importCellarSnapshot(remote.payload);
    confirmSynced(user.id, remote.revision, remoteFingerprint);
    window.dispatchEvent(new Event('viniq-cloud-updated'));
    return 'synced';
  }
  return 'conflict';
}
export function syncCellar(): Promise<CloudStatus> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => { inFlight = null; });
  return inFlight;
}

/** User chooses which independent copy wins; never silently discard either copy. */
export async function resolveCloudConflict(choice: 'local' | 'cloud'): Promise<void> {
  await inFlight?.catch(() => undefined);
  const user = await currentUser();
  if (!user) throw new Error('Meld je eerst aan');
  const remote = await fetchRemoteCellar(user.id, '');
  if (!remote) throw new Error('Cloudgegevens niet gevonden');
  if (choice === 'cloud') {
    importCellarSnapshot(remote.payload);
    confirmSynced(user.id, remote.revision, snapshotFingerprint(remote.payload));
    window.dispatchEvent(new Event('viniq-cloud-updated'));
    return;
  }
  const local = exportLocalCellarSnapshot();
  const result = await uploadRevision(user.id, '', local, remote.revision);
  if (result.status !== 'uploaded') throw new Error('Er is opnieuw een conflict. Probeer opnieuw.');
  confirmSynced(user.id, result.revision, snapshotFingerprint(local));
}
