'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getWine, updateWine } from '@/lib/storage';
import type { Wine } from '@/lib/types';
import { useGuestView } from '@/components/GuestView';

const questions = [
  { label: '1. Hoe lekker vind je deze wijn?', choices: ['Heerlijk', 'Lekker', 'Gewoon oké', 'Niet mijn ding'] },
  { label: '2. Hoe zuur smaakt hij?', choices: ['Helemaal niet', 'Een beetje', 'Te zuur'] },
  { label: '3. Welke kleur geef je de smaak?', choices: ['Licht rood', 'Donker rood', 'Bordeaux', 'Bruin', 'Oranje', 'Geel', 'Groen', 'Blauw', 'Paars', 'Roze', 'Anders / weet ik niet'] },
  { label: '4. Hoe voelt hij in je mond?', choices: ['Licht / waterig', 'Zacht / rond', 'Boterig', 'Vol / krachtig', 'Droog / stroef', 'Weet ik niet'] },
  { label: '5. Zou je hem opnieuw kopen?', choices: ['Zeker!', 'Misschien', 'Nee'] },
];
export default function ProevenPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { guest } = useGuestView();
  const [wine, setWine] = useState<Wine | null>(null);
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(''));
  const [rating, setRating] = useState('8');
  const [extra, setExtra] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { getWine(params.id).then(setWine); }, [params.id]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (guest || !wine) return;
    if (answers.some(a => !a)) { setError('Beantwoord alle vijf vragen.'); return; }
    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 10) { setError('Score moet tussen 1 en 10 liggen.'); return; }
    const entry = [`Proefnotitie ${new Date().toLocaleDateString('nl-BE')} · ${score}/10`,
      ...questions.map((q, i) => `${q.label.slice(3)} ${answers[i]}`), ...(extra.trim() ? [`Extra: ${extra.trim()}`] : [])].join('\n');
    await updateWine(wine.id, { personalRating: score, notes: [wine.notes?.trim(), entry].filter(Boolean).join('\n\n') });
    router.push(`/kelder/wijn/${wine.id}`);
  }
  if (!wine) return null;
  return <>
    <PageHeader title="Wijn proeven" subtitle={wine.wineName} back backHref={`/kelder/wijn/${wine.id}`} />
    <div className="px-5 py-4">
      {guest ? <p>Schakel de gastweergave uit om proefnotities te bewaren.</p> :
      <form onSubmit={e => void save(e)} className="space-y-4">
        {questions.map((q, i) => <Card key={i}>
          <label htmlFor={`taste-${i}`} className="mb-2 block text-sm font-medium text-cream-100">{q.label}</label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={q.label}>
            {q.choices.map(choice => <button key={choice} type="button" aria-pressed={answers[i] === choice}
              onClick={() => setAnswers(old => old.map((v, j) => i === j ? choice : v))}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${answers[i] === choice ? 'border-gold-500 bg-gold-500/20 text-gold-300' : 'border-cream-300/20 bg-navy-800 text-cream-300/80'}`}>
              {choice}
            </button>)}
          </div>
        </Card>)}
        <Card>
          <label htmlFor="taste-rating" className="mb-2 block text-sm text-cream-100">Mijn score (1–10)</label>
          <input id="taste-rating" type="number" min="1" max="10" step="1" value={rating} onChange={e => setRating(e.target.value)} className="w-full rounded-lg bg-navy-800 p-3 text-cream-100" />
          <label htmlFor="taste-extra" className="mb-2 mt-3 block text-sm text-cream-100">Extra opmerkingen (optioneel)</label>
          <textarea id="taste-extra" value={extra} onChange={e => setExtra(e.target.value)} rows={3} className="w-full rounded-lg bg-navy-800 p-3 text-cream-100" />
        </Card>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        <button className="w-full rounded-xl bg-gold-500 p-3 font-semibold text-navy-950">Proefnotitie bewaren</button>
        <Link href={`/kelder/wijn/${wine.id}`} className="block text-center text-xs text-cream-300/60">Annuleren</Link>
      </form>}
    </div>
  </>;
}
