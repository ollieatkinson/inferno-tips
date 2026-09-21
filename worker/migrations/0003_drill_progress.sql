CREATE TABLE account_imports (
 user_id TEXT PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE,
 progress TEXT NOT NULL, imported_at INTEGER NOT NULL
);
CREATE TABLE account_guests (
 guest_id TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE
);
CREATE INDEX account_guests_user ON account_guests(user_id);
CREATE TABLE drill_attempts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
 lesson TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('guided','challenge')),
 seed INTEGER NOT NULL, version INTEGER NOT NULL, started_at INTEGER NOT NULL,
 finished_at INTEGER, score INTEGER, passed INTEGER NOT NULL DEFAULT 0,
 practice INTEGER NOT NULL DEFAULT 1, best_streak INTEGER NOT NULL DEFAULT 0,
 feedback TEXT, payload_hash TEXT, abandoned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX drill_attempts_owner ON drill_attempts(user_id, finished_at DESC);

CREATE TABLE drill_slots (
 user_id TEXT PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE,
 attempt_id TEXT NOT NULL, until_at INTEGER NOT NULL
);
