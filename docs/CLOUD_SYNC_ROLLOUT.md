# VinIQ cloud sync rollout checklist

Status: NOT LIVE. The `lib/cloud-sync.ts` transport is groundwork only; no client calls it yet.

## Before enabling
- Integrate Neon Auth sign-in, sign-out and token acquisition; never trust a browser-provided owner ID without matching a verified token.
- Confirm the Neon Data API JWT claim and `auth.user_id()` match the `owner_id` written to `cellar_snapshots`.
- Confirm authenticated users can only SELECT/INSERT/UPDATE their own snapshot, and anonymous users cannot access any snapshot.
- Ensure `owner_id` has a unique constraint for insert-on-conflict. Confirm Data API role grants and RLS behaviour with two independent test accounts.
- Before initial upload, require a downloadable local JSON backup. Do not upload the bundled demo seed as if it were the user's real cellar.
- When remote is absent, upload local snapshot using insert-only and verify the returned row. When remote exists, require an explicit choice; never silently overwrite local data.
- Persist the last confirmed revision per authenticated user and local snapshot; keep pending edits durable when offline.
- On every mutation and app resume, queue a sync attempt. Do not mark changes synced until server confirms.
- On HTTP 409 / revision mismatch, retain both local and remote copies; require explicit resolution.
- Test login/logout, two accounts, two devices, simultaneous edits, offline edits, failed uploads, reconnects, reloads, and corrupted local storage.
- Keep production sync disabled until end-to-end tests pass.

## Security
- Neon RLS enabled on the three `cellar_*` tables with authenticated owner policies.
- No browser-visible privileged database credentials.
- Cloud snapshots contain personal inventory and prices; don't log full payloads or bearer tokens.
