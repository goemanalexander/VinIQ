# Official inventory correction — 14 November 2026

One-time, explicitly authorized reconciliation of the existing cloud snapshot with
`makeInitialCellar()`: 34 bottles, 14 stocked wines, 24 occupied rack slots and
10 bottles in the adjacent box. No schema change or automatic startup migration.

## Safety and application

1. Read the current owner, revision and complete payload. Confirm the owner.
2. Create a durable Neon snapshot and untouched backup branch before writing.
3. Run `correctOfficialInventory` offline. Preserve existing wine IDs, personal
   notes, photos, ratings, windows, valuations, acquisitions and immutable events.
   Keep removed wines as historical records with zero stock. Keep matching bottles
   in their current positions where possible. Log missing/surplus/moved bottles as
   inventory corrections; do not invent drinking, gifting or acquisition dates.
4. Validate counts, every position, references, preservation, purchase total and
   idempotence. Use synthetic fixtures for automated tests, never production data
   or credentials. Rehearse the write and rollback on an isolated Neon branch.
5. Update only the verified owner using both expected revision and exact original
   JSON payload in the WHERE clause. Increment revision and updated_at. Abort on
   zero rows; re-read rather than overwrite concurrent changes.
6. Read back and compare the full stored payload. Existing clients with no local
   edits pull the newer revision. Clients with local edits retain conflict handling;
   never clear their state or automatically resolve conflicts.

## Rollback

Use the original payload from the untouched backup branch/snapshot. Update only
the same owner with a compare-and-swap on the corrected revision AND exact corrected
payload, incrementing revision again. Abort if any later edits exist, so rollback
cannot silently erase new work. Verify the restored payload equals the original.

The correction function deliberately does nothing after an existing correction
event, even if subsequent consumption has changed quantities. It is an explicit
maintenance operation, not a permanent enforced stock count.
