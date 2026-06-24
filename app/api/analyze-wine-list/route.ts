import { NextRequest, NextResponse } from 'next/server';
import { callClaudeVisionServer } from '@/lib/server/claude';
import { WINE_LIST_OCR_PROMPT } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export async function POST(req: NextRequest) {
  let body: { imageBase64?: string; mediaType?: MediaType };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: 'Missing imageBase64 or mediaType' }, { status: 400 });
  }

  const { text, error } = await callClaudeVisionServer(imageBase64, mediaType, WINE_LIST_OCR_PROMPT);

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  return NextResponse.json({ text });
}
