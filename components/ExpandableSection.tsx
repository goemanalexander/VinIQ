'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSectionProps {
  number: number;
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function ExpandableSection({ number, title, icon, defaultOpen = false, children }: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="surface overflow-hidden rounded-xl2 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/30 font-display text-xs font-semibold text-gold-400">
          {number}
        </span>
        {icon && <span className="text-base">{icon}</span>}
        <span className="flex-1 font-display text-base font-medium text-cream-100">{title}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-gold-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="gold-rule" />}
      <div className={cn('grid transition-all', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
