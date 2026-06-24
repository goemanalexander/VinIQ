'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';
import { callVisionApi, parseJsonResponse } from '@/lib/client-api';
import { buildBottleKc } from '@/lib/kc-generator';
import type { DetectedWine } from '@/lib/wine-intel';
import { saveBottleResult, getCellar, getFeedback } from '@/lib/storage';
import { generateAiProfile } from '@/lib/profile-ai';

export default function ScanBottlePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyse(imageBase64: string, mediaType: 'image/jpeg'|'image/png'|'image/webp'|'image/gif') {
    setError(null);

    const { text, error: apiError } = await callVisionApi('/api/analyze-bottle', imageBase64, mediaType);
    if (apiError) {
      setError(apiError);
      return;
    }

    interface BottleOcrResponse { ocrText: string; wine: DetectedWine }
    const parsed = parseJsonResponse<BottleOcrResponse>(text);

    if (!parsed || !parsed.wine || !parsed.wine.wineName) {
      setError('Could not read the bottle label. Try a clearer photo with the front label fully visible.');
      return;
    }

    const aiProfile = generateAiProfile(getCellar(), getFeedback());
    const ideal = {
      body: aiProfile.avgBody,
      acidity: aiProfile.avgAcidity,
      tannin: aiProfile.avgTannin,
      sweetness: aiProfile.avgSweetness,
    };
    const kc = buildBottleKc(parsed.wine, parsed.ocrText ?? '', ideal);
    saveBottleResult(kc);
    router.push('/scan/bottle/result');
  }

  return (
    <>
      <PageHeader backHref="/scan" title="Scan Bottle" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/70">
          Take a clear photo of the bottle label. VinIQ will read the label and generate a full
          Koopjeschecker tailored to your taste.
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <ImageUploader
          label="Photo of bottle label"
          helperText="Front label clearly visible"
          analyseLabel="Analyse Bottle"
          onAnalyse={handleAnalyse}
        />
      </div>
    </>
  );
}
