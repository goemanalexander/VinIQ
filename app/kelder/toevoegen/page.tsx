'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { addNewWineToCellar, getRackGrid } from '@/lib/storage';
import type { RackRow, RackCol, Wine } from '@/lib/types';

const field = 'w-full rounded-xl border border-gold-500/20 bg-navy-800/60 px-4 py-3 text-base text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50';
const label = 'mb-1 block text-xs text-cream-300/70';

export default function ToevoegPage() {
  const router = useRouter();
  const [producer, setProducer] = useState('');
  const [wineName, setWineName] = useState('');
  const [vintage, setVintage] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [appellation, setAppellation] = useState('');
  const [color, setColor] = useState<Wine['color']>('red');
  const [grapes, setGrapes] = useState('');
  const [size, setSize] = useState<Wine['bottleSizeML']>(750);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [gift, setGift] = useState(false);
  const [position, setPosition] = useState('outside');
  const [freePositions, setFreePositions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRackGrid().then(grid => {
      const positions = (['A','B','C','D'] as RackRow[]).flatMap(row =>
        ([1,2,3,4,5,6] as RackCol[]).filter(col => !grid[row]?.[col]).map(col => row + col)
      );
      setFreePositions(positions);
    }).catch(e => setError(e instanceof Error ? e.message : 'Kon rek niet laden'));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError('');
    const amount = Number(quantity);
    const parsedPrice = Number(price.trim().replace(',', '.'));
    if (!gift && (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError('Vul een geldige aankoopprijs in'); return;
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      setError('Aantal moet tussen 1 en 99 liggen'); return;
    }
    const year = vintage.trim() ? Number(vintage) : null;
    setBusy(true);
    try {
      const id = await addNewWineToCellar({
        producer, wineName, vintage: year, country, region, appellation, color,
        grapes: grapes.split(',').map(s => s.trim()).filter(Boolean),
        bottleSizeML: size, quantity: amount, pricePerBottle: gift ? 0 : parsedPrice, gift,
        location: position === 'outside'
          ? { type: 'outside' }
          : { type: 'rack', row: position[0] as RackRow, col: Number(position.slice(1)) as RackCol },
      });
      router.push('/kelder/wijn/' + id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Nieuwe wijn toevoegen" back backHref="/kelder" />
      <form onSubmit={submit} className="space-y-4 px-5 pb-28 pt-5">
        <Card className="space-y-4">
          <p className="font-display text-lg text-cream-100">Welke wijn?</p>
          <div>
            <label htmlFor="producer" className={label}>Producent *</label>
            <input id="producer" required maxLength={120} className={field} value={producer} onChange={e => setProducer(e.target.value)} placeholder="Bijv. Masi" />
          </div>
          <div>
            <label htmlFor="wineName" className={label}>Naam van de wijn *</label>
            <input id="wineName" required maxLength={160} className={field} value={wineName} onChange={e => setWineName(e.target.value)} placeholder="Bijv. Costasera Amarone" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vintage" className={label}>Jaargang (leeg = N.V.)</label>
              <input id="vintage" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className={field} value={vintage} onChange={e => setVintage(e.target.value)} placeholder="2022" />
            </div>
            <div>
              <label htmlFor="color" className={label}>Soort</label>
              <select id="color" className={field} value={color} onChange={e => setColor(e.target.value as Wine['color'])}>
                <option value="red">Rood</option><option value="white">Wit</option><option value="rosé">Rosé</option>
                <option value="sparkling">Mousserend</option><option value="other">Overig</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="country" className={label}>Land</label><input id="country" className={field} value={country} onChange={e => setCountry(e.target.value)} placeholder="Italië" /></div>
            <div><label htmlFor="region" className={label}>Regio</label><input id="region" className={field} value={region} onChange={e => setRegion(e.target.value)} placeholder="Veneto" /></div>
          </div>
          <div><label htmlFor="appellation" className={label}>Appellatie (optioneel)</label><input id="appellation" className={field} value={appellation} onChange={e => setAppellation(e.target.value)} /></div>
          <div><label htmlFor="grapes" className={label}>Druiven (gescheiden door komma)</label><input id="grapes" className={field} value={grapes} onChange={e => setGrapes(e.target.value)} placeholder="Corvina, Rondinella" /></div>
          <div><label htmlFor="size" className={label}>Flesformaat</label>
            <select id="size" className={field} value={size} onChange={e => setSize(Number(e.target.value) as Wine['bottleSizeML'])}>
              <option value={375}>375 ml</option><option value={500}>500 ml</option><option value={750}>750 ml</option><option value={1500}>1500 ml</option>
            </select>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="font-display text-lg text-cream-100">Toevoegen aan je kelder</p>
          <div><label htmlFor="quantity" className={label}>Aantal flessen *</label>
            <input id="quantity" required type="text" inputMode="numeric" pattern="[0-9]+" className={field} value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 text-sm text-cream-100">
            <input type="checkbox" className="h-5 w-5 accent-amber-500" checked={gift} onChange={e => setGift(e.target.checked)} />
            Cadeau gekregen
          </label>
          {!gift && <div><label htmlFor="price" className={label}>Aankoopprijs per fles (€) *</label>
            <input id="price" required type="text" inputMode="decimal" autoComplete="off" className={field} value={price} onChange={e => setPrice(e.target.value)} placeholder="12,95" />
          </div>}
          <div>
            <label htmlFor="position" className={label}>Positie eerste fles</label>
            <select id="position" className={field} value={position} onChange={e => setPosition(e.target.value)}>
              <option value="outside">Buiten het rek</option>
              {freePositions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {Number(quantity) > 1 && position !== 'outside' && <p className="mt-2 text-xs text-cream-300/60">De overige flessen komen buiten het rek. Je kunt ze nadien verplaatsen.</p>}
          </div>
        </Card>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-gold-500 px-5 py-3.5 text-sm font-semibold text-navy-950 disabled:opacity-40">
          {busy ? 'Opslaan…' : 'Wijn en flessen toevoegen'}
        </button>
        <p className="text-center text-xs text-cream-300/50">Wordt voorlopig alleen op dit toestel opgeslagen.</p>
      </form>
    </>
  );
}
