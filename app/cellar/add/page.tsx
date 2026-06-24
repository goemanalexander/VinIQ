'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { addCellarWine } from '@/lib/storage';
import { genId } from '@/lib/utils';
import { KC_PRIMITIVO } from '@/lib/mockData';
import type { CellarWine } from '@/lib/types';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gold-400/80">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-gold-500/20 bg-navy-800/60 px-4 py-2.5 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50';

export default function AddCellarPage() {
  const router = useRouter();

  const [producer, setProducer] = useState('');
  const [wineName, setWineName] = useState('');
  const [vintage, setVintage] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = producer.trim() && wineName.trim() && vintage.trim();

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);

    // Build a minimal CellarWine — use KC_PRIMITIVO as a structural placeholder
    // for the koopjeschecker (a real app would call AI here)
    const wine: CellarWine = {
      id: genId('cellar'),
      producer: producer.trim(),
      wineName: wineName.trim(),
      vintage: parseInt(vintage, 10),
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      purchasePrice: parseFloat(purchasePrice) || 0,
      personalRating: Math.min(10, Math.max(0, parseFloat(personalRating) || 0)),
      notes: notes.trim(),
      addedAt: new Date().toISOString(),
      // Placeholder KC — in production the AI would generate a proper one
      koopjeschecker: {
        ...KC_PRIMITIVO,
        general: {
          ...KC_PRIMITIVO.general,
          producer: producer.trim(),
          wineName: wineName.trim(),
          vintage: parseInt(vintage, 10),
          price: parseFloat(purchasePrice) || KC_PRIMITIVO.general.price,
        },
      },
    };

    addCellarWine(wine);
    router.push('/cellar');
  }

  return (
    <>
      <PageHeader backHref="/cellar" title="Add Bottle" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/60">
          Add a bottle manually. Scan the label instead for a full Koopjeschecker with AI analysis.
        </p>

        <Card className="space-y-5">
          <Field label="Producer *">
            <input
              className={inputClass}
              placeholder="e.g. Tenuta Sant'Antonio"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
            />
          </Field>

          <Field label="Wine Name *">
            <input
              className={inputClass}
              placeholder="e.g. Amarone Campo dei Gigli"
              value={wineName}
              onChange={(e) => setWineName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Vintage *">
              <input
                className={inputClass}
                placeholder="e.g. 2018"
                type="number"
                min="1900"
                max="2030"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
              />
            </Field>
            <Field label="Quantity">
              <input
                className={inputClass}
                type="number"
                min="1"
                max="999"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (€)">
              <input
                className={inputClass}
                placeholder="0"
                type="number"
                min="0"
                step="0.5"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </Field>
            <Field label="My Rating (0–10)">
              <input
                className={inputClass}
                placeholder="—"
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={personalRating}
                onChange={(e) => setPersonalRating(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              className={`${inputClass} h-24 resize-none`}
              placeholder="Where you bought it, occasion, first impressions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </Card>

        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className={`mt-6 flex w-full items-center justify-center rounded-full py-3 text-sm font-medium transition-colors ${
            isValid && !saving
              ? 'bg-gold-500 text-navy-950 active:bg-gold-400'
              : 'bg-navy-700 text-cream-300/40'
          }`}
        >
          {saving ? 'Saving…' : 'Add to Cellar'}
        </button>
      </div>
    </>
  );
}
