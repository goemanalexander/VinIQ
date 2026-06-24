'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, Star } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import KoopjesChecker from '@/components/KoopjesChecker';
import { getCellarWine, updateCellarWine, deleteCellarWine } from '@/lib/storage';
import type { CellarWine } from '@/lib/types';
import { formatCurrency, WINDOW_STATUS_LABEL, deriveWindowStatus } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  too_young: 'text-navy-400',
  ready: 'text-green-400',
  peak: 'text-gold-400',
  past_peak: 'text-burgundy-400',
};

const inputClass =
  'w-full rounded-xl border border-gold-500/20 bg-navy-800/60 px-4 py-2.5 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50';

export default function CellarWineDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [wine, setWine] = useState<CellarWine | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const w = getCellarWine(params.id);
    if (!w) {
      router.replace('/cellar');
      return;
    }
    setWine(w);
    setQuantity(String(w.quantity));
    setPurchasePrice(w.purchasePrice > 0 ? String(w.purchasePrice) : '');
    setPersonalRating(w.personalRating > 0 ? String(w.personalRating) : '');
    setNotes(w.notes);
  }, [params.id, router]);

  function handleSave() {
    if (!wine) return;
    updateCellarWine(wine.id, {
      quantity: Math.max(0, parseInt(quantity, 10) || 0),
      purchasePrice: parseFloat(purchasePrice) || 0,
      personalRating: Math.min(10, Math.max(0, parseFloat(personalRating) || 0)),
      notes: notes.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete() {
    if (!wine) return;
    deleteCellarWine(wine.id);
    router.push('/cellar');
  }

  if (!wine) return null;

  const kc = wine.koopjeschecker;
  const status = deriveWindowStatus(kc.drinkingWindow);

  return (
    <>
      <PageHeader backHref="/cellar" title={wine.wineName} />
      <div className="pb-8 pt-4">
        {/* Quick info bar */}
        <div className="mx-5 mb-6">
          <Card className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-cream-100">{wine.producer}</p>
              <p className="text-sm text-gold-300">{wine.wineName} {wine.vintage}</p>
              <p className={`mt-1 text-xs ${STATUS_COLOR[status]}`}>
                {WINDOW_STATUS_LABEL[status]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl text-cream-100">×{wine.quantity}</p>
              {wine.purchasePrice > 0 && (
                <p className="text-xs text-cream-300/50">{formatCurrency(wine.purchasePrice)} / btl</p>
              )}
              {wine.personalRating > 0 && (
                <p className="mt-1 flex items-center justify-end gap-1 text-xs text-gold-400">
                  <Star size={10} fill="currentColor" />
                  {wine.personalRating.toFixed(1)}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Edit fields */}
        <div className="mx-5 mb-6 space-y-4">
          <h3 className="font-display text-sm uppercase tracking-wide text-gold-400/80">Edit</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-cream-300/50">Quantity</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-cream-300/50">Price (€)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.5"
                placeholder="—"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-cream-300/50">My Rating (0–10)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="—"
              value={personalRating}
              onChange={(e) => setPersonalRating(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-cream-300/50">Notes</label>
            <textarea
              className={`${inputClass} h-20 resize-none`}
              placeholder="Tasting notes, occasion, storage location…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-medium text-navy-950 transition-colors active:bg-gold-400"
          >
            <Save size={15} />
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>

        {/* Full Koopjeschecker */}
        <div className="mb-6">
          <div className="mx-5 mb-3">
            <h3 className="font-display text-base text-cream-200">Koopjeschecker</h3>
          </div>
          <KoopjesChecker data={kc} />
        </div>

        {/* Delete */}
        <div className="mx-5">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-burgundy-600/50 py-3 text-sm text-burgundy-400 transition-colors active:bg-burgundy-900/20"
            >
              <Trash2 size={15} />
              Remove from Cellar
            </button>
          ) : (
            <Card className="text-center">
              <p className="mb-4 text-sm text-cream-200">
                Remove <strong>{wine.wineName}</strong> from your cellar?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-full border border-gold-500/30 py-2 text-sm text-cream-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-full bg-burgundy-700 py-2 text-sm text-cream-100"
                >
                  Remove
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
