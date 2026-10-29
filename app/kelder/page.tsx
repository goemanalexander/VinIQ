'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getAllWinesWithCount, exportLocalCellarSnapshot, importCellarSnapshot, type CellarSnapshot } from '@/lib/storage';
import { DRINK_WINDOW_COLOR, DRINK_WINDOW_LABEL, formatCurrency } from '@/lib/utils';
import type { WineWithCount } from '@/lib/types';

export default function KelderPage() {
  const [wines, setWines] = useState<WineWithCount[]>([]);
  const [query, setQuery] = useState('');
  const backupInput = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState('');

  useEffect(() => {
    getAllWinesWithCount().then(all => setWines(all.filter(w => w.bottleCount > 0)));
  }, []);

  function downloadBackup() {
    const snapshot = exportLocalCellarSnapshot();
    const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `viniq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function restoreBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as CellarSnapshot;
      if (!parsed || !Array.isArray(parsed.bottles) || !Array.isArray(parsed.wines)) throw new Error('Ongeldig bestand');
      const current = exportLocalCellarSnapshot();
      if (!window.confirm(`Je huidige kelder bevat ${current.bottles.length} flessen. Het back-upbestand bevat ${parsed.bottles.length} flessen. Wil je je huidige kelder vervangen? Download eerst een back-up als je wijzigingen wilt bewaren.`)) return;
      importCellarSnapshot(parsed);
      setWines((await getAllWinesWithCount()).filter(w => w.bottleCount > 0));
      setBackupMessage(`Back-up hersteld: ${parsed.bottles.length} flessen.`);
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Kon back-up niet herstellen');
    } finally {
      if (backupInput.current) backupInput.current.value = '';
    }
  }

  const filtered = query.trim()
    ? wines.filter(w =>
        w.producer.toLowerCase().includes(query.toLowerCase()) ||
        w.wineName.toLowerCase().includes(query.toLowerCase()) ||
        w.region.toLowerCase().includes(query.toLowerCase()) ||
        String(w.vintage ?? '').includes(query) ||
        w.grapes.some(g => g.toLowerCase().includes(query.toLowerCase()))
      )
    : wines;

  const totalBottles = wines.reduce((s, w) => s + w.bottleCount, 0);

  return (
    <>
      <PageHeader title="Mijn Kelder" subtitle={`${totalBottles} fles${totalBottles !== 1 ? 'sen' : ''}`} />
      <div className="px-5 pb-8 pt-4">

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/40" />
          <input
            type="text"
            placeholder="Zoek producent, regio, jaargang…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gold-500/20 bg-navy-800/60 py-2.5 pl-9 pr-4 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50"
          />
        </div>

        <div className="mb-5">
          <p className="text-xs text-cream-300/60">Kies hieronder een wijn om flessen toe te voegen, op te drinken of te verplaatsen.</p>
        </div>

        <button type="button" onClick={downloadBackup} className="mb-5 rounded-lg border border-gold-500/30 px-3 py-2 text-xs text-cream-100 hover:bg-gold-500/10">Download back-up van mijn kelder (JSON)</button>

        <input ref={backupInput} type="file" accept="application/json,.json" className="hidden" aria-label="Back-upbestand kiezen" onChange={e => void restoreBackup(e.target.files?.[0])} />
        <button type="button" onClick={() => backupInput.current?.click()} className="mb-5 ml-2 rounded-lg border border-gold-500/30 px-3 py-2 text-xs text-cream-100 hover:bg-gold-500/10">Back-up herstellen</button>
        {backupMessage && <p role="status" className="mb-4 text-xs text-cream-100">{backupMessage}</p>}

        {/* Wine list */}
        {filtered.length > 0 ? (
          <Card className="divide-y divide-gold-500/10 p-1">
            {filtered.map((wine) => (
              <Link
                key={wine.id}
                href={`/kelder/wijn/${wine.id}`}
                className="flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-cream-100/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cream-100">
                    {wine.producer} — {wine.wineName}
                  </p>
                  <p className="text-xs text-cream-300/60">
                    {wine.vintage ?? 'N.V.'} · {wine.region}
                  </p>
                  <p className={`mt-1 text-[11px] ${DRINK_WINDOW_COLOR[wine.drinkWindowStatus]}`}>
                    {DRINK_WINDOW_LABEL[wine.drinkWindowStatus]}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right shrink-0">
                  <span className="font-display text-xl text-cream-100">×{wine.bottleCount}</span>
                  {wine.avgPurchasePrice > 0 && (
                    <span className="text-[11px] text-cream-300/40">
                      {formatCurrency(wine.avgPurchasePrice)}/fl.
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </Card>
        ) : wines.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-display text-3xl">🍾</p>
            <p className="mt-3 font-display text-base text-cream-100">Kelder is leeg</p>
            <p className="mt-1 text-sm text-cream-300/60">Voeg je eerste fles toe om te beginnen.</p>
          </Card>
        ) : (
          <Card className="py-6 text-center">
            <p className="text-sm text-cream-300/60">Geen resultaten voor &ldquo;{query}&rdquo;</p>
          </Card>
        )}
      </div>
    </>
  );
}
