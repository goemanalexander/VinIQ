'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getRackGrid, getBottles, getWines } from '@/lib/storage';
import type { RackGrid, RackRow, RackCol, Bottle, Wine } from '@/lib/types';

const ROWS: RackRow[] = ['A', 'B', 'C', 'D'];
const COLS: RackCol[] = [1, 2, 3, 4, 5, 6];
const ROW_LABEL: Record<RackRow, string> = { A: 'A (boven)', B: 'B', C: 'C', D: 'D (onder)' };

const COLOR_MAP: Record<string, string> = {
  red: 'bg-burgundy-700',
  white: 'bg-gold-600',
  rosé: 'bg-pink-700',
  sparkling: 'bg-teal-700',
  other: 'bg-navy-600',
};

export default function RekPage() {
  const [grid, setGrid] = useState<RackGrid | null>(null);
  const [outsideBottles, setOutsideBottles] = useState<Bottle[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);

  useEffect(() => {
    getRackGrid().then(setGrid);
    getWines().then(setWines);
    getBottles().then(all => setOutsideBottles(all.filter(b => b.location.type === 'outside')));
  }, []);

  if (!grid) {
    return (
      <>
        <PageHeader title="Rek" back backHref="/" />
        <div className="px-5 pt-6 text-sm text-cream-300/50">Laden…</div>
      </>
    );
  }

  const occupiedCount = ROWS.reduce((sum, row) =>
    sum + COLS.filter(col => grid[row]?.[col]).length, 0);

  return (
    <>
      <PageHeader
        title="Rek"
        subtitle={`${occupiedCount}/24 bezet`}
        back
        backHref="/"
      />
      <div className="px-4 pb-8 pt-4">

        {/* Rack grid */}
        <Card className="mb-6 p-3">
          {/* Column headers */}
          <div className="mb-2 grid grid-cols-7 gap-1.5">
            <div aria-hidden="true" />
            {COLS.map(col => (
              <div key={col} className="text-center text-[10px] text-cream-300/30 font-medium">
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROWS.map(row => (
            <div key={row} className="mb-1.5 grid grid-cols-7 gap-1.5 items-center">
              {/* Row label */}
              <div className="text-[11px] text-cream-300/40 font-medium text-center">{row}</div>
              {/* Cells */}
              {COLS.map(col => {
                const cell = grid[row]?.[col];
                if (cell) {
                  const colorClass = COLOR_MAP[cell.wine.color] ?? 'bg-navy-600';
                  return (
                    <Link
                      key={col}
                      href={`/kelder/wijn/${cell.wine.id}`}
                      className={`${colorClass} rounded-md aspect-square flex items-center justify-center transition-opacity active:opacity-70`}
                      title={`${cell.wine.producer} — ${cell.wine.wineName} ${cell.wine.vintage ?? ''}`}
                    >
                      <span className="text-[8px] text-white/60 font-bold leading-none text-center px-0.5 truncate">
                        {cell.wine.producer.slice(0, 3).toUpperCase()}
                      </span>
                    </Link>
                  );
                }
                return (
                  <div
                    key={col}
                    className="rounded-md aspect-square border border-dashed border-gold-500/15 bg-navy-900/40"
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-gold-500/10 pt-3">
            {Object.entries(COLOR_MAP).map(([color, cls]) => (
              <div key={color} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${cls}`} />
                <span className="text-[10px] text-cream-300/40 capitalize">{
                  color === 'red' ? 'Rood' :
                  color === 'white' ? 'Wit' :
                  color === 'rosé' ? 'Rosé' :
                  color === 'sparkling' ? 'Mousseux' : 'Overig'
                }</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm border border-dashed border-gold-500/30" />
              <span className="text-[10px] text-cream-300/40">Leeg</span>
            </div>
          </div>
        </Card>

        {/* Outside rack */}
        {outsideBottles.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream-300/40">
              Buiten rek ({outsideBottles.length} fl.)
            </h2>
            <Card className="divide-y divide-gold-500/10 p-1">
              {Array.from(new Set(outsideBottles.map(b => b.wineId))).map(wineId => {
                const group = outsideBottles.filter(b => b.wineId === wineId);
                const wine = wines.find(w => w.id === wineId);
                const labels = Array.from(new Set(group.map(b => b.location.type === 'outside' ? b.location.label : undefined).filter(Boolean)));
                return (
                  <Link key={wineId} href={`/kelder/wijn/${wineId}`} className="flex items-center justify-between gap-3 px-3 py-3">
                    <span className="min-w-0 text-sm text-cream-200">
                      {wine ? `${wine.producer ? wine.producer + ' — ' : ''}${wine.wineName} ${wine.vintage ?? ''}` : 'Onbekende wijn'}
                      {labels.length > 0 && <span className="block text-xs text-cream-300/50">{labels.join(', ')}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-gold-300">×{group.length}</span>
                  </Link>
                );
              })}
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
