'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, UserRound } from 'lucide-react';
import Logo from './Logo';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  backHref?: string;
}

export default function PageHeader({ title, subtitle, back, backHref }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-gold-500/10 bg-navy-950/80 px-5 pb-3 backdrop-blur-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
      <div className="mx-auto flex max-w-md items-center gap-3">
        {back ? (
          backHref ? (
            <Link
              href={backHref}
              aria-label="Go back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full surface text-gold-400"
            >
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full surface text-gold-400"
            >
              <ChevronLeft size={20} />
            </button>
          )
        ) : (
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="VinIQ home">
            <Logo size={26} />
            <span className="font-display text-lg font-semibold tracking-[0.2em] text-gold-400">VinIQ</span>
          </Link>
        )}

        {(title || subtitle) && (
          <div className="min-w-0 flex-1">
            {title && <h1 className="truncate font-display text-lg font-semibold text-cream-100">{title}</h1>}
            {subtitle && <p className="truncate text-xs text-cream-300/60">{subtitle}</p>}
          </div>
        )}

        {!title && !back && (
          <Link
            href="/profile"
            aria-label="Profile"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full surface text-gold-300"
          >
            <UserRound size={18} />
          </Link>
        )}
      </div>
    </header>
  );
}
