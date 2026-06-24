'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';
import { callVisionApi, parseJsonResponse } from '@/lib/client-api';
import { buildPromotionKc, type DetectedPromotion } from '@/lib/kc-generator';
import { savePromotionResult, getCellar, getFeedback } from '@/lib/storage';
import { generateAiProfile } from '@/lib/profile-ai';

export default function ScanPromotionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyse(imageBase64: string, mediaType: 'image/jpeg'|'image/png'|'image/webp'|'image/gif') {
    setError(null);

    const { text, error: apiError } = await callVisionApi('/api/analyze-promotion', imageBase64, mediaType);
    if (apiError) {
      setError(apiError);
      return;
    }

    interface PromoOcrResponse { ocrText: string; wine: DetectedPromotion }
    const parsed = parseJsonResponse<PromoOcrResponse>(text);

    if (!parsed || !parsed.wine || !parsed.wine.wineName) {
      setError('Could not read the promotion. Try a clearer photo with the price tag and label visible.');
      return;
    }

    const aiProfile = generateAiProfile(getCellar(), getFeedback());
    const ideal = {
      body: aiProfile.avgBody,
      acidity: aiProfile.avgAcidity,
      tannin: aiProfile.avgTannin,
      sweetness: aiProfile.avgSweetness,
    };
    const kc = buildPromotionKc(
      { ...parsed.wine, price: parsed.wine.promotionPrice ?? null },
      parsed.ocrText ?? '',
      ideal
    );
    savePromotionResult(kc);
    router.push('/scan/promotion/result');
  }

  return (
    <>
      <PageHeader backHref="/scan" title="Scan Promotion" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/70">
          Spotted a promotional price in a shop or supermarket? Take a photo and VinIQ will tell
          you if the deal is genuinely worth it for your taste.
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <ImageUploader
          label="Photo of promotion"
          helperText="Include the price tag and bottle label"
          analyseLabel="Check This Deal"
          onAnalyse={handleAnalyse}
        />
      </div>
    </>
  );
}
