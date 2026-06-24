'use client';

import { useEffect } from 'react';
import { ensureSeeded } from '@/lib/storage';

export default function ClientInit() {
  useEffect(() => {
    ensureSeeded();
  }, []);

  return null;
}
