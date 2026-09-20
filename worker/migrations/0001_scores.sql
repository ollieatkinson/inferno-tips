CREATE TABLE guests (id TEXT PRIMARY KEY, credential_hash TEXT NOT NULL UNIQUE, blocked INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE runs (
 id TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id), mode TEXT NOT NULL CHECK(mode IN ('hard','endless')),
 seed INTEGER NOT NULL, version INTEGER NOT NULL, week TEXT NOT NULL, started_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 next_batch INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL, finished INTEGER NOT NULL DEFAULT 0,
 points INTEGER NOT NULL DEFAULT 0, stage INTEGER NOT NULL DEFAULT 1, cleared INTEGER NOT NULL DEFAULT 0, practice INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX runs_owner ON runs(guest_id, updated_at);
CREATE TABLE batches (run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, sequence INTEGER NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(run_id, sequence));
CREATE TABLE scores (
 id TEXT PRIMARY KEY REFERENCES runs(id), guest_id TEXT NOT NULL REFERENCES guests(id), name TEXT NOT NULL,
 mode TEXT NOT NULL, version INTEGER NOT NULL, week TEXT NOT NULL, points INTEGER NOT NULL, stage INTEGER NOT NULL,
 cleared INTEGER NOT NULL, published_at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX scores_board ON scores(mode, version, week, hidden, points DESC);
CREATE INDEX scores_owner ON scores(guest_id);
