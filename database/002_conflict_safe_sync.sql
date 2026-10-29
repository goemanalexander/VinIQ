-- VinIQ cloud sync v1. Apply only after the authenticated API is implemented.
-- The existing cellar_snapshots table already exists in Neon.
-- All writes must use an authenticated user id derived from a verified server session.
-- Never accept owner_id supplied by the browser.

CREATE TABLE IF NOT EXISTS cellar_sync_conflicts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id text NOT NULL,
  client_revision bigint NOT NULL,
  server_revision bigint NOT NULL,
  incoming_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS cellar_sync_conflicts_owner
  ON cellar_sync_conflicts(owner_id, created_at DESC);

-- Transactional optimistic locking:
-- UPDATE cellar_snapshots SET payload=$2::jsonb, revision=revision+1,
--   updated_at=now() WHERE owner_id=$1 AND revision=$3
-- RETURNING revision;
-- On zero updated rows, return HTTP 409 and preserve both copies.
-- Initial migration must INSERT ... ON CONFLICT DO NOTHING;
-- never overwrite an existing remote cellar automatically.
