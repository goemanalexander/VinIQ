'use client';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
export default function ImporterenPage() {
  return (
    <>
      <PageHeader title="Importeren" back backHref="/kelder" />
      <div className="px-5 pt-6">
        <Card className="text-center py-10">
          <p className="font-display text-3xl mb-3">📂</p>
          <p className="font-display text-base text-cream-100 mb-1">Binnenkort beschikbaar</p>
          <p className="text-sm text-cream-300/50">
            CSV/Excel-import wordt gebouwd in fase 2.
            <br />Er worden nu geen gegevens geïmporteerd.
          </p>
        </Card>
      </div>
    </>
  );
}
