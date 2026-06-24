'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wine, Camera, Archive, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/sommelier', icon: Wine, label: 'Sommelier' },
  { href: '/scan', icon: Camera, label: 'Scan' },
  { href: '/cellar', icon: Archive, label: 'Cellar' },
  { href: '/profile', icon: UserRound, label: 'Profile' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold-500/15 bg-navy-950/90 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors',
                active ? 'text-gold-400' : 'text-cream-300/50 hover:text-cream-200'
              )}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.1 : 1.7}
                className={cn('transition-transform', active && 'scale-110')}
              />
              <span className={cn('font-medium tracking-wide', active && 'font-semibold')}>{item.label}</span>
              {active && <span className="mt-0.5 h-0.5 w-6 rounded-full bg-gold-500" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
