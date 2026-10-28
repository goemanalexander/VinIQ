'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getEvents, getWines } from '@/lib/storage';
import type { BottleEvent, Wine } from '@/lib/types';
import { formatLocation } from '@/lib/utils';
const labels: Record<string,string> = { purchased:'Aangekocht',received_gift:'Geschenk ontvangen',drank:'Opgedronken',gifted_away:'Weggegeven',moved:'Verplaatst',inventory_correction:'Gecorrigeerd',market_value_updated:'Marktwaarde aangepast' };
export default function GeschiedenisPage() {
  const [events,setEvents] = useState<BottleEvent[]>([]);
  const [wines,setWines] = useState<Wine[]>([]);
  useEffect(() => { getEvents().then(setEvents); getWines().then(setWines); }, []);
  return <>
    <PageHeader title="Geschiedenis" back backHref="/kelder" />
    <div className="px-5 pt-6 pb-8">
      <Card className="divide-y divide-gold-500/10 p-2">
        {events.map(event => {
          const wine = wines.find(w => w.id === event.wineId);
          return <div key={event.id} className="p-3">
            <p className="text-sm font-medium text-cream-100">{labels[event.type] ?? event.type}</p>
            <p className="text-sm text-cream-200">{wine ? `${wine.producer} ${wine.wineName} ${wine.vintage ?? ''}` : event.wineId}</p>
            {event.fromLocation && <p className="text-xs text-cream-300/60">Van: {formatLocation(event.fromLocation)}</p>}
            {event.toLocation && <p className="text-xs text-cream-300/60">Naar: {formatLocation(event.toLocation)}</p>}
            {event.note && <p className="text-xs text-cream-300/60">{event.note}</p>}
            <p className="text-xs text-cream-300/40">{new Date(event.timestamp).toLocaleDateString('nl-BE')}</p>
          </div>;
        })}
        {events.length === 0 && <p className="p-4 text-sm text-cream-300/60">Nog geen gebeurtenissen.</p>}
      </Card>
    </div>
  </>;
}
