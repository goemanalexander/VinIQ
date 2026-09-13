'use client';

import { useEffect } from 'react';

/**
 * Phase 1: no-op initialiser.
 * Phase 2: will initialise Supabase connection and check session.
 */
export default function ClientInit() {
  useEffect(() => {
    // Phase 2: Supabase init goes here
  }, []);

  return null;
}
