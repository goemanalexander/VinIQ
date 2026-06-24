import { BADGE_LABEL, type Badge } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BadgeChipProps {
  badge: Badge;
  className?: string;
}

export function BadgeChip({ badge, className }: BadgeChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-300',
        className
      )}
    >
      {BADGE_LABEL[badge]}
    </span>
  );
}

export function BadgeRow({ badges, className }: { badges: Badge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map((b) => (
        <BadgeChip key={b} badge={b} />
      ))}
    </div>
  );
}
