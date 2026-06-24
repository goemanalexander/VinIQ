import type { RecommendedAction } from '@/lib/types';
import { ACTION_STYLES } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ActionBanner({ action, className }: { action: RecommendedAction; className?: string }) {
  const style = ACTION_STYLES[action];
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl2 border px-4 py-4 text-center font-display text-2xl font-semibold tracking-wide shadow-card',
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {style.label}
    </div>
  );
}
