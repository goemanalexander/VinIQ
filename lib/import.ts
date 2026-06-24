/**
 * VinIQ Cellar Import Engine
 * Parses CSV or Excel files and converts rows → CellarWine entries.
 * Generates a KoopjesChecker template per wine using keyword detection.
 */

import type { CellarWine, Koopjeschecker } from './types';
import { genId } from './utils';
import {
  KC_AMARONE,
  KC_BRUNELLO,
  KC_PRIMITIVO,
  KC_RIOJA,
  KC_CHATEAUNEUF,
  KC_RIPASSO,
  KC_BAROLO,
  KC_CHAMPAGNE,
} from './mockData';

// ---------------------------------------------------------------------------
// CSV template the user can download
// ---------------------------------------------------------------------------

export const CSV_TEMPLATE_HEADERS =
  'Producer,Wine Name,Vintage,Quantity,Purchase Price (€),Personal Rating (0-10),Notes\n';

export const CSV_TEMPLATE_EXAMPLE =
  CSV_TEMPLATE_HEADERS +
  'Tenuta Sant\'Antonio,Amarone della Valpolicella Campo dei Gigli,2018,2,58,9.5,Superb vintage\n' +
  'I Pastini,Primitivo Carignano,2021,6,16,8,Great everyday wine\n' +
  'La Rioja Alta,Viña Ardanza Reserva,2016,4,28,8.5,Reliable and elegant\n';

// ---------------------------------------------------------------------------
// Wine style detection from name / producer keywords
// ---------------------------------------------------------------------------

type WineStyle =
  | 'amarone'
  | 'brunello'
  | 'primitivo'
  | 'rioja'
  | 'chateauneuf'
  | 'ripasso'
  | 'barolo'
  | 'champagne'
  | 'generic_red';

function detectStyle(producer: string, wineName: string): WineStyle {
  const text = `${producer} ${wineName}`.toLowerCase();

  if (text.includes('amarone')) return 'amarone';
  if (text.includes('brunello')) return 'brunello';
  if (text.includes('primitivo')) return 'primitivo';
  if (text.includes('ripasso')) return 'ripasso';
  if (text.includes('barolo') || text.includes('nebbiolo')) return 'barolo';
  if (text.includes('champagne') || text.includes('blanc de blancs') || text.includes('brut')) return 'champagne';
  if (
    text.includes('rioja') ||
    text.includes('viña ardanza') ||
    text.includes('vina ardanza') ||
    text.includes('tempranillo')
  )
    return 'rioja';
  if (
    text.includes('châteauneuf') ||
    text.includes('chateauneuf') ||
    text.includes('côtes du rhône') ||
    text.includes('cotes du rhone') ||
    text.includes('gigondas') ||
    text.includes('grenache') ||
    text.includes('rhône') ||
    text.includes('rhone')
  )
    return 'chateauneuf';
  if (text.includes('brunello')) return 'brunello';

  return 'generic_red';
}

const STYLE_KC_MAP: Record<WineStyle, Koopjeschecker> = {
  amarone: KC_AMARONE,
  brunello: KC_BRUNELLO,
  primitivo: KC_PRIMITIVO,
  rioja: KC_RIOJA,
  chateauneuf: KC_CHATEAUNEUF,
  ripasso: KC_RIPASSO,
  barolo: KC_BAROLO,
  champagne: KC_CHAMPAGNE,
  generic_red: KC_PRIMITIVO, // Fallback — approachable red
};

function buildKc(
  producer: string,
  wineName: string,
  vintage: number,
  price: number,
  style: WineStyle
): Koopjeschecker {
  const template = STYLE_KC_MAP[style];
  const currentYear = new Date().getFullYear();
  const age = currentYear - vintage;

  // Adjust drinking window relative to actual vintage
  const templateAge = currentYear - template.general.vintage;
  const ageDiff = age - templateAge;

  return {
    ...template,
    id: genId('kc'),
    general: {
      ...template.general,
      producer,
      wineName,
      vintage,
      price: price || template.general.price,
    },
    drinkingWindow: {
      from: template.drinkingWindow.from + ageDiff,
      to: template.drinkingWindow.to + ageDiff,
      peakFrom: template.drinkingWindow.peakFrom + ageDiff,
      peakTo: template.drinkingWindow.peakTo + ageDiff,
      status: template.drinkingWindow.status, // Will be recomputed by deriveWindowStatus
    },
    cellarAdvice: {
      ...template.cellarAdvice,
      suggestion: `${wineName} — ${style === 'generic_red' ? 'Full-bodied red' : style.charAt(0).toUpperCase() + style.slice(1)} style. Drinking window estimated from vintage ${vintage}.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Row parsing helpers
// ---------------------------------------------------------------------------

interface RawRow {
  producer: string;
  wineName: string;
  vintage: number;
  quantity: number;
  purchasePrice: number;
  personalRating: number;
  notes: string;
}

function cleanStr(v: unknown): string {
  return String(v ?? '').trim();
}

function cleanNum(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  producer: 'producer',
  wine_name: 'wineName',
  wine: 'wineName',
  name: 'wineName',
  vintage: 'vintage',
  year: 'vintage',
  quantity: 'quantity',
  qty: 'quantity',
  bottles: 'quantity',
  purchase_price: 'purchasePrice',
  price: 'purchasePrice',
  cost: 'purchasePrice',
  personal_rating: 'personalRating',
  rating: 'personalRating',
  score: 'personalRating',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
};

function mapHeaders(headers: string[]): Record<number, keyof RawRow> {
  const map: Record<number, keyof RawRow> = {};
  headers.forEach((h, i) => {
    const norm = normaliseHeader(h);
    const field = HEADER_ALIASES[norm];
    if (field) map[i] = field;
  });
  return map;
}

function rowToRaw(cells: string[], headerMap: Record<number, keyof RawRow>): RawRow | null {
  const raw: Partial<RawRow> = {};
  Object.entries(headerMap).forEach(([idx, field]) => {
    const val = cells[parseInt(idx)]?.trim() ?? '';
    if (field === 'vintage' || field === 'quantity' || field === 'purchasePrice' || field === 'personalRating') {
      (raw as Record<string, number>)[field] = cleanNum(val);
    } else {
      (raw as Record<string, string>)[field] = val;
    }
  });

  if (!raw.producer && !raw.wineName) return null; // Skip empty rows
  if (!raw.producer) raw.producer = '';
  if (!raw.wineName) raw.wineName = '';
  if (!raw.vintage || raw.vintage < 1900 || raw.vintage > 2030) return null; // Skip bad vintages

  return {
    producer: raw.producer ?? '',
    wineName: raw.wineName ?? '',
    vintage: raw.vintage ?? 0,
    quantity: Math.max(1, raw.quantity ?? 1),
    purchasePrice: raw.purchasePrice ?? 0,
    personalRating: Math.min(10, Math.max(0, raw.personalRating ?? 0)),
    notes: raw.notes ?? '',
  };
}

function rawToCellarWine(row: RawRow): CellarWine {
  const style = detectStyle(row.producer, row.wineName);
  const kc = buildKc(row.producer, row.wineName, row.vintage, row.purchasePrice, style);

  return {
    id: genId('cellar'),
    producer: row.producer,
    wineName: row.wineName,
    vintage: row.vintage,
    quantity: row.quantity,
    purchasePrice: row.purchasePrice,
    personalRating: row.personalRating,
    notes: row.notes,
    koopjeschecker: kc,
    addedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCSV(text: string): CellarWine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Parse header
  const headerCells = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const headerMap = mapHeaders(headerCells);

  if (!Object.values(headerMap).includes('producer') && !Object.values(headerMap).includes('wineName')) {
    throw new Error(
      'Could not find required columns. Make sure your file has "Producer" and "Wine Name" columns.'
    );
  }

  const wines: CellarWine[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — handles basic quoting
    const cells = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const cleanCells = cells.map((c) => c.replace(/^"|"$/g, '').trim());
    const raw = rowToRaw(cleanCells, headerMap);
    if (raw) wines.push(rawToCellarWine(raw));
  }

  return wines;
}

// ---------------------------------------------------------------------------
// Excel parser (uses xlsx package, loaded dynamically client-side)
// ---------------------------------------------------------------------------

async function parseExcel(buffer: ArrayBuffer): Promise<CellarWine[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  if (rows.length === 0) throw new Error('Excel sheet appears to be empty.');

  // Build header map from first row keys
  const firstRowKeys = Object.keys(rows[0]);
  const headerMap = mapHeaders(firstRowKeys);
  const keysByIdx = firstRowKeys;

  const wines: CellarWine[] = [];
  for (const row of rows) {
    const cells = keysByIdx.map((k) => cleanStr(row[k]));
    const raw = rowToRaw(cells, headerMap);
    if (raw) wines.push(rawToCellarWine(raw));
  }

  return wines;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ImportResult {
  wines: CellarWine[];
  skipped: number;
  errors: string[];
}

export async function importFromFile(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  let wines: CellarWine[] = [];

  try {
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      wines = parseCSV(text);
    } else if (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel')
    ) {
      const buffer = await file.arrayBuffer();
      wines = await parseExcel(buffer);
    } else {
      throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    errors.push(message);
    return { wines: [], skipped: 0, errors };
  }

  return {
    wines,
    skipped: 0,
    errors,
  };
}
