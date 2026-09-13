/**
 * VinIQ v1 — CSV/Excel import
 * Phase 1: stub. Full implementation in Phase 2 (after Supabase).
 * The import format will be defined once the Supabase schema is stable.
 */

export const CSV_TEMPLATE_EXAMPLE = `producent,wijnnaam,jaargang,regio,appellatie,druiven,kleur,flesformaat_ml,prijs_per_fles,aankoopdatum,winkel,aantal
Cantine San Marzano,Ritardatario Primitivo di Manduria,2022,Puglia,Primitivo di Manduria DOC,"Primitivo",red,750,10.95,2024-01-15,Colruyt,4
Poggio di Sotto,Brunello di Montalcino,2021,Toscane,Brunello di Montalcino DOCG,"Sangiovese Grosso",red,750,,2024-03-10,,1`;

export interface ImportResult {
  wines: unknown[];
  errors: string[];
}

/** Phase 2: will parse CSV/XLSX and map to Wine + Bottle + Acquisition records. */
export async function importFromFile(_file: File): Promise<ImportResult> {
  return {
    wines: [],
    errors: ['Import is beschikbaar vanaf fase 2.'],
  };
}
