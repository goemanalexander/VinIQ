'use client';

import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent, FocusEvent, RefObject } from 'react';
import { Minus, Plus, X, ShoppingBag, Check } from 'lucide-react';
import { getCellar, saveCellar } from '@/lib/storage';
import { findExistingCellarEntry, recordPurchase } from '@/lib/purchase-ledger';
import { analysePurchase } from '@/lib/purchase-intelligence';
import type { PurchaseInsight } from '@/lib/purchase-intelligence';
import type { Koopjeschecker } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  kc: Koopjeschecker;
  open: boolean;
  /** Known retailer from the originating flow (e.g. a promotion scan). Always editable. */
  retailer?: string;
  onClose: () => void;
  onSaved: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Accepts "12,50" or "12.50" and returns a plain number — never NaN. */
function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  // A tap/click places the caret *after* the focus event fires, which would
  // otherwise immediately undo an eager select(). Deferring one tick wins the race.
  const target = e.target;
  setTimeout(() => target.select(), 0);
}

// ---------------------------------------------------------------------------
// Insights card — shown after saving
// ---------------------------------------------------------------------------

const CLASSIFICATION_STYLE: Record<
  PurchaseInsight['classification'],
  { border: string; bg: string; labelCls: string }
> = {
  excellent:    { border: 'border-green-500/30',  bg: 'bg-green-500/8',   labelCls: 'text-green-400' },
  good:         { border: 'border-green-500/20',  bg: 'bg-green-500/5',   labelCls: 'text-green-400/80' },
  fair:         { border: 'border-gold-500/20',   bg: 'bg-gold-500/5',    labelCls: 'text-gold-300' },
  expensive:    { border: 'border-burgundy-600/30', bg: 'bg-burgundy-900/15', labelCls: 'text-burgundy-300' },
  first:        { border: 'border-gold-500/20',   bg: 'bg-gold-500/5',    labelCls: 'text-gold-300' },
  insufficient: { border: 'border-navy-600',      bg: 'bg-navy-800/40',   labelCls: 'text-cream-300/50' },
};

function InsightsCard({ insight }: { insight: PurchaseInsight }) {
  const style = CLASSIFICATION_STYLE[insight.classification];
  const isInfoOnly = insight.classification === 'first' || insight.classification === 'insufficient';

  return (
    <div className={`rounded-xl border px-4 py-4 ${style.border} ${style.bg}`}>
      {/* Classification badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg leading-none">{insight.emoji}</span>
        <span className={`font-display text-base font-semibold ${style.labelCls}`}>
          {insight.label}
        </span>
      </div>

      {/* Price diff sentence */}
      {!isInfoOnly && insight.priceDifference !== null && (
        <p className="mb-3 text-sm text-cream-300/80">
          {formatCurrency(insight.priceDifference)}{' '}
          <span className={insight.priceIsBelow ? 'text-green-400' : 'text-burgundy-300'}>
            {insight.priceIsBelow ? 'below' : 'above'}
          </span>{' '}
          your average purchase price
        </p>
      )}

      {/* Stats grid */}
      <div className={`grid gap-3 text-center ${isInfoOnly ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div>
          <p className="font-display text-lg text-cream-100">{insight.totalBottles}</p>
          <p className="text-[10px] uppercase tracking-wide text-cream-300/45">
            {insight.totalBottles === 1 ? 'Bottle' : 'Bottles'} owned
          </p>
        </div>
        {!isInfoOnly && (
          <>
            <div>
              <p className="font-display text-lg text-cream-100">
                {insight.averagePurchasePrice > 0 ? formatCurrency(insight.averagePurchasePrice) : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">Avg price</p>
            </div>
            <div>
              <p className={`font-display text-lg ${insight.priceIsBelow ? 'text-green-400' : 'text-burgundy-300'}`}>
                {insight.currentPrice > 0 ? formatCurrency(insight.currentPrice) : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/45">This purchase</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export default function PurchaseDialog({ kc, open, retailer: initialRetailer, onClose, onSaved }: Props) {
  // Quantity is edited as free text so mobile numeric keypads can clear/replace
  // it naturally; the committed integer is derived and always clamped to >= 1.
  const [quantityInput, setQuantityInput] = useState('1');
  const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);

  const [price, setPrice]             = useState('');
  const [date, setDate]               = useState(today());
  const [retailer, setRetailer]       = useState(initialRetailer ?? '');
  const [existingQty, setExistingQty] = useState(0);
  const [existingAvgPrice, setExistingAvgPrice] = useState(0);
  const [insight, setInsight]         = useState<PurchaseInsight | null>(null);
  const [isSaving, setIsSaving]       = useState(false);

  const quantityRef = useRef<HTMLInputElement>(null);
  const priceRef     = useRef<HTMLInputElement>(null);
  const dateRef       = useRef<HTMLInputElement>(null);
  const retailerRef   = useRef<HTMLInputElement>(null);
  const savingRef      = useRef(false); // synchronous double-tap guard, independent of render timing

  useEffect(() => {
    if (!open) return;
    // Reset to form view on every open
    setInsight(null);
    setIsSaving(false);
    savingRef.current = false;
    setQuantityInput('1');
    setDate(today());

    const cellar = getCellar();
    const existing = findExistingCellarEntry(kc, cellar);
    setExistingQty(existing?.quantity ?? 0);
    setExistingAvgPrice(existing?.purchasePrice ?? 0);

    // "Known" retailer = explicitly passed in (e.g. a future promotion-scan
    // capture) or the last retailer used for this exact wine. The full
    // deduplicated history (`purchases.map(p => p.retailer)`) is the natural
    // future data source for a retailer autocomplete — not wired up yet.
    const purchases = existing?.purchases ?? [];
    const lastRetailer = purchases[purchases.length - 1]?.retailer;
    setRetailer(initialRetailer || lastRetailer || '');

    setPrice(kc.general.price ? String(kc.general.price) : '');

    // Auto-focus + fully select the default quantity so the first tap of a digit replaces it
    requestAnimationFrame(() => {
      quantityRef.current?.focus();
      quantityRef.current?.select();
    });
  }, [open, kc, initialRetailer]);

  function handleSave() {
    if (savingRef.current) return; // blocks a genuine double-tap synchronously
    savingRef.current = true;
    setIsSaving(true);

    // Dismiss the mobile keyboard immediately so the insights view isn't hidden behind it
    (document.activeElement as HTMLElement | null)?.blur();

    const currentPrice = parsePrice(price);
    const cellar = getCellar();
    const updated = recordPurchase(kc, {
      quantity,
      pricePerBottle: currentPrice,
      date,
      retailer: retailer.trim() || undefined,
    }, cellar);
    saveCellar(updated);

    // Find the updated wine entry and compute insight
    const updatedWine = updated.find(
      (w) =>
        w.koopjeschecker.general.producer === kc.general.producer &&
        w.koopjeschecker.general.wineName === kc.general.wineName &&
        w.koopjeschecker.general.vintage === kc.general.vintage
    );
    if (updatedWine) {
      setInsight(analysePurchase(updatedWine, currentPrice));
    } else {
      onSaved();
    }
  }

  function handleDone() {
    onSaved();
  }

  function adjustQty(delta: number) {
    setQuantityInput((q) => String(Math.max(1, (parseInt(q, 10) || 1) + delta)));
  }

  function handleQtyInput(val: string) {
    // Digits only — keeps the numeric keypad in sync with a valid draft
    setQuantityInput(val.replace(/[^0-9]/g, ''));
  }

  function handleQtyBlur() {
    // Never leave the field genuinely empty or below 1
    if (quantityInput === '' || parseInt(quantityInput, 10) < 1) {
      setQuantityInput('1');
    }
  }

  function handlePriceBlur() {
    // Reformat to a consistent "12.5"-style value regardless of "," or "." input
    if (price.trim() === '') return;
    const n = parsePrice(price);
    setPrice(n > 0 ? String(n) : '');
  }

  /** Moves focus to the next field on the mobile keyboard's "Next"/Enter key. */
  function focusNext(nextRef: RefObject<HTMLInputElement>) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      nextRef.current?.focus();
      nextRef.current?.select();
    };
  }

  function handleRetailerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.currentTarget.blur();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm" onClick={insight ? handleDone : onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-2xl border-t border-gold-500/20 bg-navy-900 shadow-2xl">
        <div className="overflow-y-auto px-5 pb-10 pt-5">

        {/* Handle */}
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-gold-500/20" />
        </div>

        {/* Title row */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-display text-base font-semibold text-cream-100">
              {insight ? 'Purchase Recorded' : 'I Bought This'}
            </p>
            <p className="text-sm text-cream-300/60">
              {kc.general.producer} — {kc.general.wineName}
              {kc.general.vintage > 0 ? ` · ${kc.general.vintage}` : ''}
            </p>
          </div>
          <button
            onClick={insight ? handleDone : onClose}
            className="rounded-full p-1.5 text-cream-300/40 hover:text-cream-300/70"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Insights view ── */}
        {insight ? (
          <>
            <InsightsCard insight={insight} />
            <button
              onClick={handleDone}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 active:bg-gold-400"
            >
              <Check size={15} /> Done
            </button>
          </>
        ) : (
          /* ── Form view ── */
          <>
            {/* Already in cellar */}
            {existingQty > 0 && (
              <div className="mb-4 rounded-xl border border-gold-500/20 bg-gold-500/5 px-4 py-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gold-400/60">
                  Already in your cellar
                </p>
                <div className="flex items-center gap-4 text-sm text-cream-200">
                  <span>
                    <span className="font-display text-base text-cream-100">{existingQty}</span>
                    {' '}{existingQty === 1 ? 'bottle' : 'bottles'}
                  </span>
                  {existingAvgPrice > 0 && (
                    <span className="text-cream-300/60">avg {formatCurrency(existingAvgPrice)} / btl</span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-cream-300/50">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustQty(-1)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/20 text-gold-400 transition-colors active:bg-gold-500/10"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    ref={quantityRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="next"
                    value={quantityInput}
                    onChange={(e) => handleQtyInput(e.target.value)}
                    onFocus={selectAllOnFocus}
                    onBlur={handleQtyBlur}
                    onKeyDown={focusNext(priceRef)}
                    className="w-full rounded-xl border border-gold-500/15 bg-navy-950/60 py-2.5 text-center font-display text-lg text-cream-100 focus:border-gold-500/35 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(1)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/20 text-gold-400 transition-colors active:bg-gold-500/10"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Price per bottle */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-cream-300/50">
                  Price per bottle
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cream-300/35">€</span>
                  <input
                    ref={priceRef}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onFocus={selectAllOnFocus}
                    onBlur={handlePriceBlur}
                    onKeyDown={focusNext(dateRef)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gold-500/15 bg-navy-950/60 py-2.5 pl-8 pr-4 text-sm text-cream-100 placeholder:text-cream-300/25 focus:border-gold-500/35 focus:outline-none"
                  />
                </div>
              </div>

              {/* Purchase date */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-cream-300/50">
                  Purchase date
                </label>
                <input
                  ref={dateRef}
                  type="date"
                  enterKeyHint="next"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={focusNext(retailerRef)}
                  className="w-full rounded-xl border border-gold-500/15 bg-navy-950/60 px-4 py-2.5 text-sm text-cream-100 focus:border-gold-500/35 focus:outline-none [color-scheme:dark]"
                />
              </div>

              {/* Retailer */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-cream-300/50">
                  Retailer{' '}
                  <span className="normal-case font-normal text-cream-300/35">— optional</span>
                </label>
                <input
                  ref={retailerRef}
                  type="text"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={retailer}
                  onChange={(e) => setRetailer(e.target.value)}
                  onKeyDown={handleRetailerKeyDown}
                  placeholder="e.g. Albert Heijn, Gall & Gall"
                  className="w-full rounded-xl border border-gold-500/15 bg-navy-950/60 px-4 py-2.5 text-sm text-cream-100 placeholder:text-cream-300/25 focus:border-gold-500/35 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-gold-500/20 py-3 text-sm font-medium text-cream-300/60"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-semibold text-navy-950 active:bg-gold-400 disabled:opacity-60"
              >
                <ShoppingBag size={15} />
                I Bought This
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}
