import type { CellarWine, Koopjeschecker, TasteProfile, WineListResult } from './types';
import { DEFAULT_CELLAR, DEFAULT_PROFILE } from './mockData';

const KEYS = {
  cellar: 'viniq.cellar',
  profile: 'viniq.profile',
  lastBottle: 'viniq.lastBottle',
  lastPromotion: 'viniq.lastPromotion',
  lastWineList: 'viniq.lastWineList',
  initialised: 'viniq.initialised',
} as const;

function isBrowser() {
  return typeof window !== 'undefined';
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently, app stays usable.
  }
}

/** Initialises app on first run — starts with an empty cellar. */
export function ensureSeeded() {
  if (!isBrowser()) return;
  const done = window.localStorage.getItem(KEYS.initialised);
  if (done) return;
  // Cellar starts empty — user imports or adds their own wines
  write(KEYS.cellar, []);
  // Keep profile import for structural defaults (overwritten by AI profile)
  write(KEYS.profile, DEFAULT_PROFILE);
  window.localStorage.setItem(KEYS.initialised, '1');
}

// ---------- Cellar ----------

export function getCellar(): CellarWine[] {
  return read<CellarWine[]>(KEYS.cellar, DEFAULT_CELLAR);
}

export function saveCellar(wines: CellarWine[]) {
  write(KEYS.cellar, wines);
}

export function addCellarWine(wine: CellarWine) {
  const cellar = getCellar();
  cellar.unshift(wine);
  saveCellar(cellar);
}

export function updateCellarWine(id: string, updates: Partial<CellarWine>) {
  const cellar = getCellar();
  const idx = cellar.findIndex((w) => w.id === id);
  if (idx === -1) return;
  cellar[idx] = { ...cellar[idx], ...updates };
  saveCellar(cellar);
}

export function deleteCellarWine(id: string) {
  const cellar = getCellar().filter((w) => w.id !== id);
  saveCellar(cellar);
}

export function getCellarWine(id: string): CellarWine | undefined {
  return getCellar().find((w) => w.id === id);
}

// ---------- Profile ----------

export function getProfile(): TasteProfile {
  return read<TasteProfile>(KEYS.profile, DEFAULT_PROFILE);
}

export function saveProfile(profile: TasteProfile) {
  write(KEYS.profile, profile);
}

// ---------- Scan results (transient, single-slot) ----------

export function saveBottleResult(result: Koopjeschecker) {
  write(KEYS.lastBottle, result);
}

export function getBottleResult(): Koopjeschecker | null {
  return read<Koopjeschecker | null>(KEYS.lastBottle, null);
}

export function savePromotionResult(result: Koopjeschecker) {
  write(KEYS.lastPromotion, result);
}

export function getPromotionResult(): Koopjeschecker | null {
  return read<Koopjeschecker | null>(KEYS.lastPromotion, null);
}

export function saveWineListResult(result: WineListResult) {
  write(KEYS.lastWineList, result);
}

export function getWineListResult(): WineListResult | null {
  return read<WineListResult | null>(KEYS.lastWineList, null);
}

// ---------- Feedback ----------

const FEEDBACK_KEY = 'viniq.feedback';

export function getFeedback(): import('./types').FeedbackEntry[] {
  return read<import('./types').FeedbackEntry[]>(FEEDBACK_KEY, []);
}

export function addFeedback(entry: import('./types').FeedbackEntry) {
  const list = getFeedback();
  // Replace if same wine already has feedback in same context
  const idx = list.findIndex((f) => f.kcId === entry.kcId && f.context === entry.context);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  write(FEEDBACK_KEY, list.slice(0, 200)); // cap at 200 entries
}

// ---------- AI Taste Profile ----------

const AI_PROFILE_KEY = 'viniq.aiProfile';

export function getAiProfile(): import('./types').AiTasteProfile | null {
  return read<import('./types').AiTasteProfile | null>(AI_PROFILE_KEY, null);
}

export function saveAiProfile(profile: import('./types').AiTasteProfile) {
  write(AI_PROFILE_KEY, profile);
}
