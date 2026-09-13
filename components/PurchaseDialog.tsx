'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Card from './Card';
import type { BottleLocation } from '@/lib/types';
import { formatCurrencyExact } from '@/lib/utils';

interface PurchaseDialogProps {
  wineName: string;
  producer: string;
  onConfirm: (data: {
    quantity: number;
    pricePerBottle: number;
    date: string;
    retailer: string;
    type: 'purchased' | 'gift';
    defaultLocation: BottleLocation;
  }) => void;
  onCancel: () => void;
  knownRetailers?: string[];
}

const inputClass =
  'w-full rounded-xl border border-gold-500/20 bg-navy-800/60 px-4 py-2.5 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50';

export default function PurchaseDialog({
  wineName,
  producer,
  onConfirm,
  onCancel,
  knownRetailers = [],
}: PurchaseDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'purchased' | 'gift'>('purchased');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(today);
  const [retailer, setRetailer] = useState('');

  const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
  const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
  const totalCost = parsedQty * parsedPrice;
  const isGift = type === 'gift';
  const canConfirm = parsedQty >= 1 && date;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      quantity: parsedQty,
      pricePerBottle: isGift ? 0 : parsedPrice,
      date,
      retailer: retailer.trim(),
      type,
      defaultLocation: { type: 'outside', label: 'nieuw' },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-2xl border-t border-gold-500/20 bg-navy-900 p-5 pb-8">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="font-display text-lg text-cream-100">{producer}</p>
            <p className="text-sm text-gold-300">{wineName}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-cream-300/50 hover:text-cream-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="mb-4 flex rounded-xl border border-gold-500/20 p-1">
          {(['purchased', 'gift'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                type === t
                  ? 'bg-gold-500 text-navy-950'
                  : 'text-cream-300/60 hover:text-cream-200'
              }`}
            >
              {t === 'purchased' ? 'Gekocht' : 'Gekregen'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-cream-300/50">Aantal flessen</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {!isGift && (
              <div>
                <label className="mb-1 block text-xs text-cream-300/50">Prijs per fles (€)</label>
                <input
                  className={inputClass}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-xs text-cream-300/50">Datum</label>
            <input
              className={inputClass}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Retailer */}
          {!isGift && (
            <div>
              <label className="mb-1 block text-xs text-cream-300/50">Winkel / bron</label>
              <input
                className={inputClass}
                type="text"
                placeholder="bijv. Colruyt, Wijnklder.be…"
                value={retailer}
                list="retailer-suggestions"
                onChange={(e) => setRetailer(e.target.value)}
              />
              {knownRetailers.length > 0 && (
                <datalist id="retailer-suggestions">
                  {knownRetailers.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              )}
            </div>
          )}

          {/* Total */}
          {!isGift && parsedPrice > 0 && (
            <Card className="flex items-center justify-between py-3">
              <span className="text-sm text-cream-300/60">Totaal ({parsedQty} fl.)</span>
              <span className="font-display text-lg text-gold-300">
                {formatCurrencyExact(totalCost)}
              </span>
            </Card>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`mt-6 w-full rounded-full py-3 text-sm font-semibold transition-colors ${
            canConfirm
              ? 'bg-gold-500 text-navy-950 active:bg-gold-400'
              : 'bg-navy-700 text-cream-300/40'
          }`}
        >
          Toevoegen aan kelder
        </button>
      </div>
    </div>
  );
}
