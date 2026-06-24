import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  edge?: boolean;
}

export default function Card({ className, strong, edge, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl2 p-4 shadow-card',
        strong ? 'surface-strong' : 'surface',
        edge && 'label-edge',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
