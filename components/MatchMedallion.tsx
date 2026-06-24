import { cn } from '@/lib/utils';

interface MatchMedallionProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { wrapper: 'h-16 w-16', number: 'text-xl', label: 'text-[9px]' },
  md: { wrapper: 'h-24 w-24', number: 'text-3xl', label: 'text-[10px]' },
  lg: { wrapper: 'h-32 w-32', number: 'text-4xl', label: 'text-xs' },
} as const;

export default function MatchMedallion({ percent, size = 'md', className }: MatchMedallionProps) {
  const sizing = SIZE_MAP[size];
  return (
    <div className={cn('medallion', sizing.wrapper, className)} role="img" aria-label={`Personal Match ${percent}%`}>
      <div className="medallion-inner">
        <span className="text-base leading-none">❤️</span>
        <span className={cn('font-display font-semibold leading-none text-gold-300', sizing.number)}>{percent}%</span>
        <span className={cn('mt-0.5 font-medium uppercase tracking-[0.15em] text-cream-300/70', sizing.label)}>
          Match
        </span>
      </div>
    </div>
  );
}
