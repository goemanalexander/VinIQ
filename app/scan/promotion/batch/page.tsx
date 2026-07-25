'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import MultiImageUploader from '@/components/MultiImageUploader';
import { callBatchVisionApi } from '@/lib/client-api';
import { prepareImage, makeThumbnail, dataUrlToBase64 } from '@/lib/image-optimise';
import {
  parseBatchResponses, normaliseOffers, buildBatchCandidates, dominantRetailer,
} from '@/lib/promo-batch';
import { savePromoBatchResult, getCellar, getFeedback } from '@/lib/storage';
import { generateAiProfile } from '@/lib/profile-ai';
import { genId } from '@/lib/utils';

export default function ScanPromotionBatchPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyse(dataUrls: string[]) {
    setError(null);

    // Optimise every image and build thumbnails in parallel
    const [prepared, thumbnails] = await Promise.all([
      Promise.all(dataUrls.map((u) => prepareImage(u))),
      Promise.all(dataUrls.map((u) => makeThumbnail(u))),
    ]);

    const { results, error: apiError } = await callBatchVisionApi(
      prepared.map((p) => ({ imageBase64: dataUrlToBase64(p.dataUrl), mediaType: p.mediaType }))
    );
    if (apiError) {
      setError(apiError);
      return;
    }

    const pages = parseBatchResponses(results);
    const failedImages = pages
      .filter((p) => p.error !== null)
      .map((p) => ({ index: p.imageIndex, error: p.error! }));

    if (failedImages.length === pages.length) {
      setError('None of the pages could be read. Try clearer photos with the offers fully visible.');
      return;
    }

    const offers = normaliseOffers(pages);
    if (offers.length === 0) {
      setError('No wine offers were detected on these pages. Try photos where the wines and prices are clearly visible.');
      return;
    }

    const aiProfile = generateAiProfile(getCellar(), getFeedback());
    const ideal = {
      body: aiProfile.avgBody,
      acidity: aiProfile.avgAcidity,
      tannin: aiProfile.avgTannin,
      sweetness: aiProfile.avgSweetness,
    };
    const candidates = buildBatchCandidates(offers, getCellar(), ideal);

    savePromoBatchResult({
      id: genId('batch'),
      createdAt: new Date().toISOString(),
      imageCount: dataUrls.length,
      thumbnails,
      retailer: dominantRetailer(pages),
      candidates,
      failedImages,
    });
    router.push('/scan/promotion/batch/result');
  }

  return (
    <>
      <PageHeader backHref="/scan/promotion" title="Scan Promotion Folder" />
      <div className="px-5 pb-8 pt-4">
        <p className="mb-6 text-sm leading-relaxed text-cream-300/70">
          Photograph every page of the promotion — up to 6 images. VinIQ reads all offers,
          compares them against your taste, cellar and purchase history, and ranks the best buys.
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <MultiImageUploader analyseLabel="Find the best buys" onAnalyse={handleAnalyse} />
      </div>
    </>
  );
}
