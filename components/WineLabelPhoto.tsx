'use client';
import { useState } from 'react';
import { updateWine } from '@/lib/storage';

export default function WineLabelPhoto({ wineId, imageUrl, onSaved }: { wineId: string; imageUrl?: string; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function onFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Kies een afbeelding.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Afbeelding is te groot (max. 15 MB).'); return; }
    setBusy(true); setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Kan afbeelding niet verwerken');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const url = canvas.toDataURL('image/jpeg', 0.72);
      if (url.length > 350000) throw new Error('Foto blijft te groot voor lokale opslag');
      await updateWine(wineId, { imageUrl: url });
      await onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Foto opslaan mislukt'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    {imageUrl && <img src={imageUrl} alt="Etiket van de wijn" className="max-h-64 w-full rounded-lg object-contain" />}
    <label className="block text-xs text-cream-300/70">Etiketfoto toevoegen of vervangen
      <input type="file" accept="image/*" disabled={busy} onChange={e => void onFile(e.target.files?.[0])} className="mt-2 block w-full text-xs text-cream-100" />
    </label>
    {imageUrl && <button type="button" disabled={busy} onClick={() => void updateWine(wineId, { imageUrl: undefined }).then(onSaved).catch(e => setError(String(e)))} className="text-xs text-cream-300/60 underline">Foto verwijderen</button>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    <p className="text-[11px] text-cream-300/40">De foto wordt verkleind en lokaal bewaard op dit toestel.</p>
  </div>;
}
