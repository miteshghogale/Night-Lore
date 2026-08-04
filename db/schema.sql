CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  event_date TEXT,
  story_text TEXT NOT NULL,
  author_name TEXT,
  is_anonymous INTEGER DEFAULT 0,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL
);
