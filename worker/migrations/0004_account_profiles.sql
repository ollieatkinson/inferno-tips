CREATE TABLE account_profiles (
  user_id TEXT PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK(length(nickname) BETWEEN 2 AND 24),
  updated_at INTEGER NOT NULL
);
