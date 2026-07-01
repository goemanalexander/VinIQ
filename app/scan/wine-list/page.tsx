'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';
import { callVisionApi, parseJsonResponse } from '@/lib/client-api';
import { buildWineListResult, type DetectedWine } from '@/lib/wine-intel';
import { saveWineListResult, getCellar, getFeedback } from '@/lib/storage';
import { generateAiProfile } from '@/lib/profile-ai';

export default function ScanWineListPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyse(imageBase64: string, mediaType: 'image/jpeg'|'image/png'|'image/webp'|'image/gif') {
    setError(null);

    const { text, error: apiError } = await callVisionApi('/api/analyze-wine-list', imageBase64, mediaType);

    if (apiError) {
      setError(apiError);
      return;
    }

    interface OcrResponse { ocrText: string; wines: DetectedWine[] }
    const parsed = parseJsonResponse<OcrResponse>(text);

    if (!parsed || !Array.isArray(parsed.wines)) {
      setError('Could not parse the wine list. Try a clearer photo with better lighting.');
      return;
    }

    const aiProfile = generateAiProfile(getCellar(), getFeedback());
    const ideal = {
      body: aiProfile.avgBody,
      acidity: aiProfile.avgAcidity,
      tannin: aiProfile.avgTannin,
      sweetness: aiProfile.avgSweetness,
    };
    const result = buildWineListResult(parsed.wines, parsed.ocrText ?? '', ideal);
    saveWineListResult(result);
    router.push('/scan/wine-list/result');
  }

  return (
    <>
      <PageHeader backHref="/scan" title="Scan Wine List" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/70">
          Take a photo of the wine list or upload a screenshot. VinIQ will extract every wine and
          show you Alexander&apos;s Choice, Best Value, Best Wine and Best Price/Quality.
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <ImageUploader
          label="Photo of wine list"
          helperText="Capture the full list — include prices if visible"
          analyseLabel="Analyse Wine List"
          onAnalyse={handleAnalyse}
        />
      </div>
    </>
  );
}
