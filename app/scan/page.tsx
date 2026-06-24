'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

const SCAN_OPTIONS = [
  {
    href: '/scan/bottle',
    emoji: '🍷',
    title: 'Scan a Bottle',
    description: 'Full Koopjeschecker on any wine — aromas, structure, drinking window, food pairing and personal match.',
  },
  {
    href: '/scan/promotion',
    emoji: '🏷️',
    title: 'Scan a Promotion',
    description: "Is this deal actually worth it? Find out if the discount is real and if the wine matches your taste.",
  },
  {
    href: '/scan/wine-list',
    emoji: '📋',
    title: 'Scan a Wine List',
    description: "Upload a restaurant wine list and VinIQ picks Alexander's Choice, Best Value, Best Wine and Best Price/Quality.",
  },
];

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/70">
          Take a photo of a bottle, a shelf promotion, or a restaurant wine list — VinIQ analyses
          it and gives you a personalised verdict.
        </p>
        <div className="space-y-4">
          {SCAN_OPTIONS.map((opt) => (
            <Link key={opt.href} href={opt.href}>
              <Card edge className="flex gap-4 transition-transform active:scale-[0.98]">
                <span className="mt-0.5 text-3xl">{opt.emoji}</span>
                <div>
                  <p className="font-display text-base text-cream-100">{opt.title}</p>
                  <p className="mt-1 text-sm leading-snug text-cream-300/60">{opt.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
