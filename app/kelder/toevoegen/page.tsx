'use client';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
export default function ToevoegPage() {
  return (
    <>
      <PageHeader title="Fles toevoegen" back backHref="/kelder" />
      <div className="px-5 pt-6">
        <Card className="text-center py-10">
          <p className="font-display text-3xl mb-3">🍾</p>
          <p className="font-display text-base text-cream-100 mb-1">Binnenkort beschikbaar</p>
          <p className="text-sm text-cream-300/50">
            Het toevoegen van flessen wordt gebouwd in fase 2.
            <br />Er worden nu geen flessen toegevoegd aan je kelder.
          </p>
        </Card>
      </div>
    </>
  );
}
