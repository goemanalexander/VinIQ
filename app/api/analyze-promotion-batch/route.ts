import { NextRequest, NextResponse } from 'next/server';
import { callClaudeVisionServer } from '@/lib/server/claude';
import { PROMOTION_BATCH_OCR_PROMPT } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

interface BatchImageInput {
  imageBase64?: string;
  mediaType?: MediaType;
}

const MAX_IMAGES = 6;

/**
 * Batch promotion analysis: runs the vision call for every image in
 * parallel and isolates failures per image — one unreadable or failed
 * page never discards the results of the others.
 */
export async function POST(req: NextRequest) {
  let body: { images?: BatchImageInput[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const images = body.images;
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Provide at least one image' }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images per batch` }, { status: 400 });
  }
  for (const img of images) {
    if (!img?.imageBase64 || !img?.mediaType) {
      return NextResponse.json({ error: 'Every image needs imageBase64 and mediaType' }, { status: 400 });
    }
  }

  const results = await Promise.all(
    images.map(async (img, index) => {
      const { text, error } = await callClaudeVisionServer(
        img.imageBase64!,
        img.mediaType!,
        PROMOTION_BATCH_OCR_PROMPT,
        // Dense folder pages can carry 25+ offers — give the JSON room to finish.
        8000
      );
      return error ? { index, error } : { index, text };
    })
  );

  return NextResponse.json({ results });
}
