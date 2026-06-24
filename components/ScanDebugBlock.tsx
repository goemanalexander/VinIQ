'use client';

import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import type { ScanMetadata } from '@/lib/types';

const CONFIDENCE_STYLE: Record<string, { label: string; cls: string }> = {
  high: { label: 'High confidence', cls: 'text-green-400' },
  medium: { label: 'Medium confidence', cls: 'text-gold-400' },
  low: { label: 'Low confidence', cls: 'text-burgundy-400' },
};

export default function ScanDebugBlock({ meta }: { meta: ScanMetadata }) {
  const [open, setOpen] = useState(false);
  const conf = CONFIDENCE_STYLE[meta.confidence];

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-navy-600 px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-xs text-cream-300/50">
          <Eye size={13} />
          Debug — what VinIQ detected
          <span className={`font-medium ${conf.cls}`}>· {conf.label}</span>
        </div>
        <ChevronDown size={13} className={`text-cream-300/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-navy-600 bg-navy-800/60 px-4 py-3 space-y-2">
          {(meta.promotionPrice != null || meta.originalPrice != null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-cream-300/60 border-b border-navy-700 pb-2 mb-2">
              {meta.promotionPrice != null && <span>Promo price: €{meta.promotionPrice}</span>}
              {meta.originalPrice != null && <span>Original price: €{meta.originalPrice}</span>}
              {meta.discountPercent != null && <span>Discount: {meta.discountPercent}%</span>}
            </div>
          )}
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-cream-300/60">
            {meta.ocrText || '(no text extracted)'}
          </p>
        </div>
      )}
    </div>
  );
}
