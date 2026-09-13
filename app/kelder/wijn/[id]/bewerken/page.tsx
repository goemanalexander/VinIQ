'use client';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
export default function BewerkPage({ params }: { params: { id: string } }) {
  return (
    <>
      <PageHeader title="Wijn bewerken" back backHref={`/kelder/wijn/${params.id}`} />
      <div className="px-5 pt-6">
        <Card className="text-center py-10">
          <p className="font-display text-3xl mb-3">✏️</p>
          <p className="font-display text-base text-cream-100 mb-1">Binnenkort beschikbaar</p>
          <p className="text-sm text-cream-300/50">
            Het bewerken van wijngegevens wordt gebouwd in fase 2.
            <br />Er worden nu geen wijzigingen opgeslagen.
          </p>
        </Card>
      </div>
    </>
  );
}
