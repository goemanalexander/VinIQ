import type { Wine, Bottle, Acquisition, BottleEvent, BottleLocation, WineColor } from './types';

/**
 * Official physical inventory confirmed 14 November 2026.
 * 14 wines / 34 individual bottles: 24 in rack A1–D6 and 10 in the adjacent box.
 * Used only for fresh installations; never silently overwrite a local/cloud cellar.
 */
type Entry = { id: string; producer: string; name: string; vintage: number | null; country: string; region: string; color: WineColor; price: number; locations: string[]; gift: boolean };
const data: Entry[] = [
  { id:"cdp", producer:"Cellier des Princes", name:"Châteauneuf-du-Pape Rouge", vintage:2025, country:"Frankrijk", region:"Rhône", color:"red", price:18, locations:["C4","C5","C6"], gift:false },
  { id:"bennati", producer:"Casa Vinicola Bennati", name:"Amarone della Valpolicella", vintage:2021, country:"Italië", region:"Veneto", color:"red", price:19.1, locations:["D1","D2","D3","D4","D5","D6"], gift:false },
  { id:"gran-sasso", producer:"Gran Sasso", name:"Tre Autoctoni", vintage:null, country:"Italië", region:"Abruzzo", color:"red", price:10.95, locations:["B6","outside","outside","outside","outside"], gift:false },
  { id:"bufalo-nero", producer:"Bufalo Nero", name:"Governo all’Uso Toscano", vintage:2023, country:"Italië", region:"Toscane", color:"red", price:8.99, locations:["C1","outside","outside"], gift:false },
  { id:"don-caron", producer:"Don Carón", name:"Gran Reserva", vintage:2018, country:"Spanje", region:"", color:"red", price:9.17, locations:["A5"], gift:false },
  { id:"ritardatario", producer:"Ritardatario", name:"Primitivo di Manduria", vintage:2022, country:"Italië", region:"Puglia", color:"red", price:10.95, locations:["C3","outside","outside","outside"], gift:false },
  { id:"villa-portici", producer:"Villa Portici", name:"Rosso Appassimento Puglia IGT", vintage:null, country:"Italië", region:"Puglia", color:"red", price:7.99, locations:["B1","B2","B3","B4"], gift:false },
  { id:"marufa", producer:"Alegre / Marufa", name:"Tejo Tinto", vintage:2012, country:"Portugal", region:"Tejo", color:"red", price:0, locations:["A6"], gift:true },
  { id:"mastieri", producer:"Mastieri", name:"Primitivo Puglia IGP", vintage:2024, country:"Italië", region:"Puglia", color:"red", price:9.17, locations:["B5","outside"], gift:false },
  { id:"memoires", producer:"Les Mémoires d’Excellence", name:"Cévennes", vintage:2023, country:"Frankrijk", region:"Cévennes", color:"red", price:9.17, locations:["A4"], gift:false },
  { id:"barbera", producer:"Roberto Crosio", name:"Canavese Barbera DOC", vintage:2021, country:"Italië", region:"Piemonte", color:"red", price:0, locations:["C2"], gift:true },
  { id:"erbaluce", producer:"Roberto Crosio", name:"Primavite Erbaluce di Caluso DOCG", vintage:2022, country:"Italië", region:"Piemonte", color:"white", price:0, locations:["A3"], gift:true },
  { id:"enguera", producer:"Blanc d’Enguera", name:"Original Fermentado en Roble", vintage:2019, country:"Spanje", region:"Valencia", color:"white", price:0, locations:["A2"], gift:true },
  { id:"roero", producer:"Antiche Cantine Borgo Lame", name:"Roero Arneis DOCG “Ghita”", vintage:2024, country:"Italië", region:"Piemonte", color:"white", price:0, locations:["A1"], gift:true },
];

export function makeInitialCellar() {
  const timestamp = '2026-11-14T00:00:00.000Z';
  const wines: Wine[] = [];
  const bottles: Bottle[] = [];
  const acquisitions: Acquisition[] = [];
  const events: BottleEvent[] = [];
  for (const e of data) {
    const wineId = 'seed-wine-' + e.id;
    const acquisitionId = 'seed-acq-' + e.id;
    wines.push({
      id: wineId, producer: e.producer, wineName: e.name, vintage: e.vintage,
      country: e.country, region: e.region, appellation: '',
      color: e.color, grapes: [], bottleSizeML: 750,
      personalRating: 0, avgPurchasePrice: e.price, addedAt: timestamp,
    });
    acquisitions.push({
      id: acquisitionId, wineId, type: e.gift ? 'gift' : 'purchased',
      quantity: e.locations.length, pricePerBottle: e.price,
      date: '', // Acquisition date not supplied; do not invent a purchase date.
      createdAt: timestamp,
    });
    e.locations.forEach((loc, i) => {
      const location: BottleLocation = loc === 'outside'
        ? { type: 'outside', label: 'doos naast rek' }
        : { type: 'rack', row: loc[0] as 'A'|'B'|'C'|'D', col: Number(loc[1]) as 1|2|3|4|5|6 };
      const bottleId = 'seed-bottle-' + e.id + '-' + i;
      bottles.push({ id: bottleId, wineId, acquisitionId, location, addedAt: timestamp });
      events.push({
        id: 'seed-event-' + e.id + '-' + i, wineId, bottleId,
        type: 'inventory_correction', toLocation: location,
        note: 'Officiële voorraadopname 14 november 2026; aankoopdatum niet opgegeven',
        timestamp,
      });
    });
  }
  return { wines, bottles, acquisitions, valuations: [], events };
}
