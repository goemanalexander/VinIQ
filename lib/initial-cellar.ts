import type { Wine, Bottle, Acquisition, BottleEvent, BottleLocation, WineColor } from './types';

type Entry = { id: string; producer: string; name: string; vintage: number | null; country: string; region: string; color: WineColor; price: number; locations: string[]; gift?: boolean };
const data: Entry[] = [
  { id:'bennati',producer:'Bennati',name:'Amarone della Valpolicella',vintage:2021,country:'Italië',region:'Veneto',color:'red',price:19.10,locations:['A6','D1','D2','D3','outside','outside'] },
  { id:'ritardatario',producer:'Ritardatario',name:'Primitivo di Manduria',vintage:2022,country:'Italië',region:'Puglia',color:'red',price:10.95,locations:['C1','C2','C3','C4'] },
  { id:'don-caron',producer:'Don Carón',name:'Gran Reserva',vintage:2018,country:'Spanje',region:'',color:'red',price:9.17,locations:['C6'] },
  { id:'gran-sasso',producer:'Gran Sasso',name:'Tre Autoctoni',vintage:null,country:'Italië',region:'Abruzzo',color:'red',price:10.95,locations:['D4','outside','outside','outside','outside'] },
  { id:'bufalo-nero',producer:'Bufalo Nero',name:'Governo',vintage:2023,country:'Italië',region:'Toscane',color:'red',price:8.99,locations:['D5','D6','outside','outside'] },
  { id:'mastieri',producer:'Mastieri',name:'Primitivo',vintage:2024,country:'Italië',region:'Puglia',color:'red',price:9.17,locations:['B5','B6'] },
  { id:'memoires',producer:'Les Mémoires d’Excellence',name:'Cévennes',vintage:2023,country:'Frankrijk',region:'Cévennes',color:'red',price:9.17,locations:['A5'] },
  { id:'villa-portici',producer:'Villa Portici',name:'Rosso Appassimento',vintage:null,country:'Italië',region:'Puglia',color:'red',price:7.99,locations:['B1','B2','B3','B4'] },
  { id:'roero',producer:'',name:'Roero Arneis “Ghita”',vintage:2024,country:'Italië',region:'Piemonte',color:'white',price:0,gift:true,locations:['A1'] },
  { id:'enguera',producer:'Blanc d’Enguera',name:'Original',vintage:2019,country:'Spanje',region:'Valencia',color:'white',price:0,gift:true,locations:['A2'] },
  { id:'erbaluce',producer:'Roberto Crosio',name:'Erbaluce di Caluso',vintage:2022,country:'Italië',region:'Piemonte',color:'white',price:0,gift:true,locations:['A3'] },
  { id:'barbera',producer:'Roberto Crosio',name:'Canavese Barbera',vintage:2021,country:'Italië',region:'Piemonte',color:'red',price:0,gift:true,locations:['A4'] },
  { id:'marufa',producer:'Alegre / Marufa',name:'Tejo Tinto',vintage:2012,country:'Portugal',region:'Tejo',color:'red',price:0,gift:true,locations:['outside:doos naast rek'] },
  { id:'masso',producer:'Masso Antico',name:'Primitivo Salento',vintage:2024,country:'Italië',region:'Puglia',color:'red',price:0,gift:true,locations:['outside'] },
];

export function makeInitialCellar() {
  const date = '2026-10-28T00:00:00.000Z';
  const wines: Wine[] = [];
  const bottles: Bottle[] = [];
  const acquisitions: Acquisition[] = [];
  const events: BottleEvent[] = [];
  for (const e of data) {
    const wineId = 'seed-wine-' + e.id;
    const acquisitionId = 'seed-acq-' + e.id;
    wines.push({ id:wineId,producer:e.producer,wineName:e.name,vintage:e.vintage,country:e.country,region:e.region,appellation:'',color:e.color,grapes:[],bottleSizeML:750,personalRating:0,avgPurchasePrice:e.price,addedAt:date });
    acquisitions.push({ id:acquisitionId,wineId,type:e.gift?'gift':'purchased',quantity:e.locations.length,pricePerBottle:e.price,date:'2026-10-28',createdAt:date });
    e.locations.forEach((loc,i) => {
      const location: BottleLocation = loc.startsWith('outside') ? {type:'outside',...(loc.includes(':')?{label:loc.split(':')[1]}:{})} : {type:'rack',row:loc[0] as 'A'|'B'|'C'|'D',col:Number(loc[1]) as 1|2|3|4|5|6};
      bottles.push({id:'seed-bottle-'+e.id+'-'+i,wineId,acquisitionId,location,addedAt:date});
    });
    events.push({id:'seed-event-'+e.id,wineId,type:e.gift?'received_gift':'purchased',note:'Begininventaris 28 oktober 2026',timestamp:date});
  }
  return {wines,bottles,acquisitions,valuations:[],events};
}
