/**
 * Wine Consistency Validator — Sprint 7
 *
 * Isolated, dependency-free rule engine. Detects impossible combinations of
 * appellation / region / country / style / grapes and reports them as
 * ValidationIssue[]. It never invents data — sanitizeGeneralInfo() only ever
 * downgrades a conflicting field to the existing "Unknown" sentinel used
 * elsewhere in VinIQ.
 *
 * Rules are plain functions over a small reference table (APPELLATION_FACTS /
 * REGION_COUNTRY). Adding a new rule means adding one function to RULES —
 * nothing else in the app needs to change.
 *
 * Resolution policy when appellation conflicts with region/country: the
 * appellation (a specific, hard-to-hallucinate DOC/DOCG/AOC name) is treated
 * as the anchor and kept; the broader free-text region/country fields are
 * blanked to "Unknown" rather than silently reconciled.
 */

import type { WineColor } from './types';

export type ValidationField = 'region' | 'country' | 'appellation' | 'color' | 'grapes';
export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  field: ValidationField;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean; // false when any 'error'-severity issue is present
  issues: ValidationIssue[];
}

export interface GeneralInfoForValidation {
  region: string;
  country: string;
  appellation: string;
  grapes: string[];
}

interface AppellationFact {
  /**
   * Acceptable region strings — plural because Italian/French appellations
   * are often named after the zone itself (e.g. "Valpolicella", "Chianti"),
   * and labels may print either that zone name or the broader administrative
   * region as the "region" field. Both must be accepted as consistent.
   */
  region: string[];
  country: string;
  color: WineColor[];
  /** Only checked when the wine's grapes are known; absence ⇒ no grape rule applies */
  primaryGrapes?: string[];
}

// ---------------------------------------------------------------------------
// Reference knowledge base — deliberately small; extend as new appellations
// are encountered. Keys are matched as case-insensitive substrings.
// ---------------------------------------------------------------------------

const APPELLATION_FACTS: Record<string, AppellationFact> = {
  'amarone della valpolicella': { region: ['veneto', 'valpolicella'], country: 'italy', color: ['red'], primaryGrapes: ['corvina', 'rondinella', 'corvinone'] },
  'valpolicella ripasso':       { region: ['veneto', 'valpolicella'], country: 'italy', color: ['red'] },
  'valpolicella':               { region: ['veneto', 'valpolicella'], country: 'italy', color: ['red'] },
  'brunello di montalcino':     { region: ['tuscany', 'toscana', 'montalcino'], country: 'italy', color: ['red'], primaryGrapes: ['sangiovese'] },
  'vino nobile di montepulciano': { region: ['tuscany', 'toscana', 'montepulciano'], country: 'italy', color: ['red'], primaryGrapes: ['sangiovese'] },
  'chianti':                    { region: ['tuscany', 'toscana', 'chianti'], country: 'italy', color: ['red'], primaryGrapes: ['sangiovese'] },
  'barolo':                     { region: ['piedmont', 'piemonte', 'barolo', 'langhe'], country: 'italy', color: ['red'], primaryGrapes: ['nebbiolo'] },
  'barbaresco':                 { region: ['piedmont', 'piemonte', 'barbaresco', 'langhe'], country: 'italy', color: ['red'], primaryGrapes: ['nebbiolo'] },
  'primitivo di manduria':      { region: ['puglia', 'manduria'], country: 'italy', color: ['red'], primaryGrapes: ['primitivo', 'zinfandel'] },
  "montepulciano d'abruzzo":    { region: ['abruzzo'], country: 'italy', color: ['red'], primaryGrapes: ['montepulciano'] },
  'rioja':                      { region: ['rioja', 'rioja alta', 'rioja alavesa', 'rioja baja'], country: 'spain', color: ['red', 'white', 'rosé'] },
  'ribera del duero':           { region: ['ribera del duero'], country: 'spain', color: ['red'] },
  'priorat':                    { region: ['priorat'], country: 'spain', color: ['red'] },
  'châteauneuf-du-pape':        { region: ['southern rhône', 'southern rhone', 'rhône', 'rhone', 'châteauneuf-du-pape'], country: 'france', color: ['red', 'white'] },
  'chateauneuf-du-pape':        { region: ['southern rhône', 'southern rhone', 'rhône', 'rhone', 'châteauneuf-du-pape'], country: 'france', color: ['red', 'white'] },
  'gigondas':                   { region: ['southern rhône', 'southern rhone', 'rhône', 'rhone', 'gigondas'], country: 'france', color: ['red', 'rosé'] },
  'champagne':                  { region: ['champagne'], country: 'france', color: ['sparkling'] },
  'bordeaux':                   { region: ['bordeaux'], country: 'france', color: ['red', 'white'] },
  'haut-médoc':                 { region: ['bordeaux', 'haut-médoc', 'haut-medoc', 'médoc', 'medoc'], country: 'france', color: ['red'] },
  'sancerre':                   { region: ['loire', 'sancerre'], country: 'france', color: ['white', 'rosé'] },
  'chablis':                    { region: ['burgundy', 'chablis'], country: 'france', color: ['white'], primaryGrapes: ['chardonnay'] },
};

const REGION_COUNTRY: Record<string, string> = {
  veneto: 'italy', tuscany: 'italy', toscana: 'italy', puglia: 'italy',
  piedmont: 'italy', piemonte: 'italy', abruzzo: 'italy', sicily: 'italy', sicilia: 'italy',
  rioja: 'spain', 'rioja alta': 'spain', 'ribera del duero': 'spain', priorat: 'spain',
  champagne: 'france', bordeaux: 'france', burgundy: 'france', alsace: 'france', loire: 'france',
  'southern rhône': 'france', 'southern rhone': 'france', rhône: 'france', rhone: 'france', beaujolais: 'france',
  'napa valley': 'usa', sonoma: 'usa',
  mendoza: 'argentina',
  'barossa valley': 'australia',
  marlborough: 'new zealand',
  douro: 'portugal',
};

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function findAppellationFact(appellation: string): AppellationFact | null {
  const key = norm(appellation);
  if (!key) return null;
  for (const [name, fact] of Object.entries(APPELLATION_FACTS)) {
    if (key.includes(name)) return fact;
  }
  return null;
}

function findRegionCountry(region: string): string | null {
  const key = norm(region);
  if (!key) return null;
  for (const [name, country] of Object.entries(REGION_COUNTRY)) {
    if (key.includes(name) || name.includes(key)) return country;
  }
  return null;
}

function isKnown(value: string): boolean {
  return !!value && value !== 'Unknown';
}

// ---------------------------------------------------------------------------
// Individual rules — each returns the issues it finds; add new rules here.
// ---------------------------------------------------------------------------

type Rule = (info: GeneralInfoForValidation, color: WineColor | undefined, fact: AppellationFact | null) => ValidationIssue[];

const ruleAppellationBelongsToRegion: Rule = (info, _color, fact) => {
  if (!fact || !isKnown(info.region)) return [];
  const regionKey = norm(info.region);
  const matches = fact.region.some((r) => regionKey.includes(r) || r.includes(regionKey));
  if (matches) return [];
  return [{
    field: 'region',
    message: `"${info.appellation}" belongs to ${fact.region[0]}, not ${info.region}.`,
    severity: 'error',
  }];
};

const ruleRegionBelongsToCountry: Rule = (info) => {
  if (!isKnown(info.region) || !isKnown(info.country)) return [];
  const expected = findRegionCountry(info.region);
  if (!expected || expected === norm(info.country)) return [];
  return [{
    field: 'country',
    message: `${info.region} is in ${expected[0].toUpperCase()}${expected.slice(1)}, not ${info.country}.`,
    severity: 'error',
  }];
};

const ruleAppellationBelongsToCountry: Rule = (info, _color, fact) => {
  if (!fact || !isKnown(info.country)) return [];
  if (norm(info.country) === fact.country) return [];
  return [{
    field: 'country',
    message: `"${info.appellation}" is produced in ${fact.country[0].toUpperCase()}${fact.country.slice(1)}, not ${info.country}.`,
    severity: 'error',
  }];
};

const ruleStyleMatchesAppellation: Rule = (_info, color, fact) => {
  if (!fact || !color) return [];
  if (fact.color.includes(color)) return [];
  return [{
    field: 'color',
    message: `"${_info.appellation}" is not typically ${color}.`,
    severity: 'error',
  }];
};

const ruleGrapeCompatibility: Rule = (info, _color, fact) => {
  if (!fact?.primaryGrapes || info.grapes.length === 0) return [];
  const grapeKeys = info.grapes.map(norm);
  const matches = grapeKeys.some((g) => fact.primaryGrapes!.some((pg) => g.includes(pg) || pg.includes(g)));
  if (matches) return [];
  return [{
    field: 'grapes',
    message: `"${info.appellation}" is usually made from ${fact.primaryGrapes.join('/')}, not ${info.grapes.join(', ')}.`,
    severity: 'warning',
  }];
};

const RULES: Rule[] = [
  ruleAppellationBelongsToRegion,
  ruleRegionBelongsToCountry,
  ruleAppellationBelongsToCountry,
  ruleStyleMatchesAppellation,
  ruleGrapeCompatibility,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Runs all consistency rules over a wine's general info. Detection only — never mutates. */
export function validateGeneralInfo(
  info: GeneralInfoForValidation,
  color?: WineColor
): ValidationResult {
  const fact = isKnown(info.appellation) ? findAppellationFact(info.appellation) : null;
  const issues = RULES.flatMap((rule) => rule(info, color, fact));
  return { valid: !issues.some((i) => i.severity === 'error'), issues };
}

/**
 * Rejects impossible combinations by blanking the losing field(s) to the
 * "Unknown" sentinel already used throughout VinIQ. Only error-severity
 * issues trigger a change; warnings (e.g. grape mismatch) are surfaced but
 * left in place since they're lower-confidence calls.
 */
export function sanitizeGeneralInfo<T extends GeneralInfoForValidation>(
  info: T,
  result: ValidationResult
): T {
  if (result.valid) return info;

  const errorFields = new Set(result.issues.filter((i) => i.severity === 'error').map((i) => i.field));
  const sanitized = { ...info };

  if (errorFields.has('region')) sanitized.region = 'Unknown';
  if (errorFields.has('country')) sanitized.country = 'Unknown';

  return sanitized;
}
