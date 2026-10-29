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
  { label: '1. Welke smaken proef je?', choices: ['Rijp fruit', 'Rood fruit', 'Kruidig', 'Hout / vanille', 'Bloemig', 'Anders'] },
  { label: '2. Hoe is de zuurtegraad?', choices: ['Laag', 'Gemiddeld', 'Hoog'] },
  { label: '3. Hoe voelen de tannines?', choices: ['Zacht', 'Gemiddeld', 'Stroef', 'Niet van toepassing'] },
  { label: '4. Hoe is het mondgevoel?', choices: ['Licht', 'Rond / boterig', 'Vol / krachtig', 'Fris'] },
  { label: '5. Zou je deze wijn opnieuw kopen?', choices: ['Ja', 'Misschien', 'Nee'] },
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
          <select id={`taste-${i}`} required value={answers[i]} onChange={e => setAnswers(old => old.map((v, j) => i === j ? e.target.value : v))} className="w-full rounded-lg bg-navy-800 p-3 text-sm text-cream-100">
            <option value="">Kies een antwoord</option>
            {q.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
          </select>
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
