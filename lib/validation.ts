/**
 * VinIQ v1 — Validation helpers
 */

import type { Wine, Acquisition, BottleLocation, RackRow, RackCol, BottleSizeML } from './types';

const VALID_ROWS: RackRow[] = ['A', 'B', 'C', 'D'];
const VALID_COLS: RackCol[] = [1, 2, 3, 4, 5, 6];
const VALID_SIZES: BottleSizeML[] = [375, 500, 750, 1500];
const VALID_COLORS = ['red', 'white', 'rosé', 'sparkling', 'other'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWine(data: Partial<Wine>): ValidationResult {
  const errors: string[] = [];

  if (!data.producer?.trim()) errors.push('Producent is verplicht.');
  if (!data.wineName?.trim()) errors.push('Wijnnaam is verplicht.');
  if (data.vintage !== null && data.vintage !== undefined) {
    if (!Number.isInteger(data.vintage) || data.vintage < 1800 || data.vintage > new Date().getFullYear() + 1) {
      errors.push('Jaargang moet een geldig jaar zijn.');
    }
  }
  if (data.color && !VALID_COLORS.includes(data.color)) {
    errors.push('Ongeldig wijntype.');
  }
  if (data.bottleSizeML && !VALID_SIZES.includes(data.bottleSizeML)) {
    errors.push('Flesformaat moet 375, 500, 750 of 1500 ml zijn.');
  }
  if (data.personalRating !== undefined && (data.personalRating < 0 || data.personalRating > 10)) {
    errors.push('Beoordeling moet tussen 0 en 10 liggen.');
  }
  if (data.avgPurchasePrice !== undefined && data.avgPurchasePrice < 0) {
    errors.push('Aankoopprijs mag niet negatief zijn.');
  }
  if (data.drinkFrom && data.drinkTo && data.drinkFrom > data.drinkTo) {
    errors.push('Begin drinkvenster mag niet na het einde liggen.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateAcquisition(data: Partial<Acquisition>): ValidationResult {
  const errors: string[] = [];

  if (!data.wineId) errors.push('Wijn-ID is verplicht.');
  if (!data.quantity || data.quantity < 1) errors.push('Aantal moet minimaal 1 zijn.');
  if (data.pricePerBottle !== undefined && data.pricePerBottle < 0) {
    errors.push('Prijs per fles mag niet negatief zijn.');
  }
  if (!data.date) {
    errors.push('Aankoopdatum is verplicht.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Datum moet in YYYY-MM-DD formaat zijn.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLocation(location: Partial<BottleLocation>): ValidationResult {
  const errors: string[] = [];

  if (!location.type) {
    errors.push('Locatietype is verplicht (rack of outside).');
    return { valid: false, errors };
  }

  if (location.type === 'rack') {
    const loc = location as { type: 'rack'; row?: RackRow; col?: RackCol };
    if (!loc.row || !VALID_ROWS.includes(loc.row)) {
      errors.push('Rekrij moet A, B, C of D zijn.');
    }
    if (!loc.col || !VALID_COLS.includes(loc.col)) {
      errors.push('Rekpositie moet tussen 1 en 6 liggen.');
    }
  }

  return { valid: errors.length === 0, errors };
}
