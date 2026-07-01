import Link from 'next/link';
import type { CellarIntelligence as Intelligence, DistributionEntry, WindowBucket } from '@/lib/cellar-intelligence';
import Card from './Card';
import { formatCurrency } from '@/lib/utils';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gold-400/60">
      {children}
    </p>
  );
}

function DistributionChips({ label, entries }: { label: string; entries: DistributionEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-cream-300/40">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e) => (
          <span
            key={e.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-600/80 px-2.5 py-1 text-xs text-cream-200"
          >
            {e.name}
            <span className="text-[10px] text-gold-400/70">{e.percent}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function WindowRow({ dot, label, bucket }: { dot: string; label: string; bucket: WindowBucket }) {
  if (bucket.bottles === 0) return null;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-cream-200">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="font-display text-cream-100">{bucket.bottles}</span>
      </div>
      {bucket.wines.length > 0 && (
        <p className="mt-0.5 pl-3.5 text-[11px] leading-relaxed text-cream-300/50">
          {bucket.wines.map((w, i) => (
            <span key={w.id}>
              {i > 0 && ' · '}
              <Link href={`/cellar/${w.id}`} className="hover:text-gold-400/80">
                {w.label}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default function CellarIntelligenceSection({ intel }: { intel: Intelligence }) {
  const { drinkingWindow, balance, gaps, purchase, tasteSummary } = intel;
  const hasWindowData =
    drinkingWindow.drinkSoon.bottles + drinkingWindow.atPeak.bottles + drinkingWindow.tooYoung.bottles > 0;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">✨</span>
        <h2 className="font-display text-sm font-medium uppercase tracking-wide text-gold-400/80">
          Cellar Intelligence
        </h2>
      </div>

      <div className="space-y-3">
        {/* Personal taste summary */}
        {tasteSummary && (
          <Card edge>
            <SectionLabel>Your taste, in your cellar</SectionLabel>
            <p className="text-sm leading-relaxed text-cream-200">{tasteSummary}</p>
          </Card>
        )}

        {/* Purchase insights */}
        <Card>
          <SectionLabel>Collection value</SectionLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="font-display text-xl text-cream-100">{purchase.totalBottles}</p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">Bottles</p>
            </div>
            <div>
              <p className="font-display text-xl text-cream-100">{purchase.uniqueWines}</p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">Unique wines</p>
            </div>
            <div>
              <p className="font-display text-lg text-cream-100">
                {purchase.totalValue > 0 ? formatCurrency(purchase.totalValue) : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">Cellar value</p>
            </div>
            <div>
              <p className="font-display text-lg text-gold-300">
                {purchase.avgBottleValue > 0 ? formatCurrency(purchase.avgBottleValue) : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">Avg / bottle</p>
            </div>
          </div>
          {purchase.estimatedValue > 0 && purchase.estimatedValue !== purchase.totalValue && (
            <p className="mt-3 border-t border-gold-500/10 pt-2.5 text-[11px] text-cream-300/50">
              Estimated current value:{' '}
              <span className="text-gold-400/80">{formatCurrency(purchase.estimatedValue)}</span>
            </p>
          )}
        </Card>

        {/* Drinking window */}
        {hasWindowData && (
          <Card>
            <SectionLabel>Drinking window</SectionLabel>
            <div className="divide-y divide-gold-500/10">
              <WindowRow dot="bg-burgundy-500" label="Drink soon" bucket={drinkingWindow.drinkSoon} />
              <WindowRow dot="bg-gold-400" label="At peak" bucket={drinkingWindow.atPeak} />
              <WindowRow dot="bg-navy-500" label="Too young" bucket={drinkingWindow.tooYoung} />
            </div>
          </Card>
        )}

        {/* Collection balance */}
        <Card>
          <SectionLabel>Collection balance</SectionLabel>
          <div className="space-y-3">
            <DistributionChips label="Countries" entries={balance.countries} />
            <DistributionChips label="Regions" entries={balance.regions} />
            <DistributionChips label="Grapes" entries={balance.grapes} />
            <DistributionChips label="Styles" entries={balance.styles} />
          </div>
        </Card>

        {/* Gaps */}
        {gaps.length > 0 && (
          <Card>
            <SectionLabel>Collection gaps</SectionLabel>
            <div className="space-y-1.5">
              {gaps.map((gap, i) => (
                <p key={i} className="flex items-start gap-2 text-sm text-cream-300/75">
                  <span className="shrink-0 text-gold-400/70">◦</span>
                  {gap}
                </p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
