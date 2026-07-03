'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const STEPS = [
  'Reading the label',
  'Identifying the wine',
  'Checking style and provenance',
  'Building your personal analysis',
];

/** Seconds between step advances. The last step stays active until the scan resolves. */
const STEP_INTERVAL_MS = 2600;
const SLOW_MESSAGE_AFTER_MS = 8000;

interface Props {
  /** Data URL of the image being analysed — shown as a small preview. */
  preview: string;
}

/**
 * Full-screen premium loading state shown while a scan is in flight.
 * Progress is step-based (no fake percentages): steps advance on a timer,
 * completed steps get a check, the active step a spinner. Unmounted by the
 * parent when the scan resolves or fails.
 */
export default function ScanLoadingOverlay({ preview }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_MESSAGE_AFTER_MS);
    return () => {
      clearInterval(stepTimer);
      clearTimeout(slowTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm rounded-2xl border border-gold-500/20 bg-navy-900 p-6 shadow-2xl">

        {/* Image preview + title */}
        <div className="mb-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Scanned image"
            className="h-16 w-16 shrink-0 rounded-xl border border-gold-500/20 object-cover"
          />
          <div>
            <p className="font-display text-base font-semibold text-cream-100">Analysing…</p>
            <p className="mt-0.5 text-xs text-cream-300/55">
              VinIQ is reading your photo
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? 'border-gold-500/40 bg-gold-500/15 text-gold-400'
                      : active
                      ? 'border-gold-500/40 text-gold-400'
                      : 'border-navy-600 text-cream-300/20'
                  }`}
                >
                  {done ? (
                    <Check size={12} />
                  ) : active ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    done ? 'text-cream-300/50' : active ? 'text-cream-100' : 'text-cream-300/30'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Slow-request reassurance */}
        {slow && (
          <p className="mt-5 rounded-xl border border-gold-500/15 bg-gold-500/5 px-4 py-3 text-xs leading-relaxed text-cream-300/70">
            This is taking a little longer because VinIQ is analysing the image carefully.
          </p>
        )}
      </div>
    </div>
  );
}
