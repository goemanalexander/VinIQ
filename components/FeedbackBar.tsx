'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { addFeedback, getFeedback } from '@/lib/storage';
import type { FeedbackEntry } from '@/lib/types';
import { genId } from '@/lib/utils';

interface FeedbackBarProps {
  kcId: string;
  producer: string;
  wineName: string;
  context: FeedbackEntry['context'];
  className?: string;
}

export default function FeedbackBar({ kcId, producer, wineName, context, className = '' }: FeedbackBarProps) {
  const [verdict, setVerdict] = useState<FeedbackEntry['verdict'] | null>(null);

  useEffect(() => {
    const existing = getFeedback().find((f) => f.kcId === kcId && f.context === context);
    if (existing) setVerdict(existing.verdict);
  }, [kcId, context]);

  function handleFeedback(v: FeedbackEntry['verdict']) {
    const entry: FeedbackEntry = {
      id: genId('fb'),
      kcId,
      verdict: v,
      context,
      producer,
      wineName,
      timestamp: new Date().toISOString(),
    };
    addFeedback(entry);
    setVerdict(v);
  }

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <span className="text-xs text-cream-300/40">Was this recommendation useful?</span>
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('thumbs_up')}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            verdict === 'thumbs_up'
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-navy-600 text-cream-300/50 hover:border-green-500/30 hover:text-green-400/70'
          }`}
        >
          <ThumbsUp size={13} />
          {verdict === 'thumbs_up' ? 'Helpful' : 'Yes'}
        </button>
        <button
          onClick={() => handleFeedback('thumbs_down')}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            verdict === 'thumbs_down'
              ? 'border-burgundy-500/50 bg-burgundy-500/10 text-burgundy-300'
              : 'border-navy-600 text-cream-300/50 hover:border-burgundy-500/30 hover:text-burgundy-300/70'
          }`}
        >
          <ThumbsDown size={13} />
          {verdict === 'thumbs_down' ? 'Not helpful' : 'No'}
        </button>
      </div>
    </div>
  );
}
