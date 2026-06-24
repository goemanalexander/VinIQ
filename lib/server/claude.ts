/**
 * VinIQ — Server-side Anthropic Vision helper
 * Runs ONLY inside Next.js API routes (app/api/**). Never imported by client components.
 * Reads the API key from process.env.ANTHROPIC_API_KEY — never exposed to the browser.
 */

export interface VisionCallResult {
  text: string;
  error?: string;
}

export async function callClaudeVisionServer(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  prompt: string
): Promise<VisionCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      text: '',
      error: 'Server is not configured. ANTHROPIC_API_KEY is missing from the environment.',
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = (errBody as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
      return { text: '', error: `Anthropic API error: ${msg}` };
    }

    const data = await response.json();
    const text =
      Array.isArray(data.content) && data.content[0]?.type === 'text' ? data.content[0].text : '';

    return { text };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Network error calling Anthropic API' };
  }
}
