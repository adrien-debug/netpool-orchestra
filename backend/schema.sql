-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  github_id BIGINT UNIQUE NOT NULL,
  login TEXT NOT NULL,
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team')),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetry table
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGSERIAL PRIMARY KEY,
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  arch TEXT NOT NULL,
  service_count INT DEFAULT 0,
  agent_count INT DEFAULT 0,
  ai_provider TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Config sync table (replaces KV)
CREATE TABLE IF NOT EXISTS config_sync (
  user_id TEXT PRIMARY KEY,
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App releases table (replaces KV for updates)
CREATE TABLE IF NOT EXISTS app_releases (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  release_notes TEXT DEFAULT '',
  download_url TEXT,
  mandatory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users (github_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry (created_at);
