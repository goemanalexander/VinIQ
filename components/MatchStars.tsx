import { percentToStars } from '@/lib/utils';

interface MatchStarsProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE = {
  sm: { star: 'text-base', label: 'text-[11px]', gap: 'gap-0.5' },
  md: { star: 'text-xl', label: 'text-xs', gap: 'gap-1' },
  lg: { star: 'text-2xl', label: 'text-sm', gap: 'gap-1' },
};

export default function MatchStars({ percent, size = 'md', showLabel = true, className = '' }: MatchStarsProps) {
  const { stars, label } = percentToStars(percent);
  const s = SIZE[size];

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <div className={`flex ${s.gap}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`${s.star} leading-none ${
              i < stars ? 'text-gold-400' : 'text-navy-700'
            }`}
          >
            ★
          </span>
        ))}
      </div>
      {showLabel && (
        <span className={`${s.label} font-medium text-cream-300/70 whitespace-nowrap`}>
          {label}
        </span>
      )}
    </div>
  );
}
