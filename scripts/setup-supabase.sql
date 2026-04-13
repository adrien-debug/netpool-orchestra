-- Orchestra Database Schema
-- Execute this on Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'team')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only read/update their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role has full access" ON users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sessions table (for analytics)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  actions_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to sessions" ON sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);

-- Actions table (for history)
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  action_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  duration_ms INTEGER,
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own actions" ON actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to actions" ON actions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_session_id ON actions(session_id);
CREATE INDEX IF NOT EXISTS idx_actions_action_id ON actions(action_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON actions(created_at DESC);

-- Metrics table (for time-series data)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('cpu', 'ram', 'services', 'ports', 'docker')),
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own metrics" ON metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to metrics" ON metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at DESC);

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id,
  u.username,
  u.subscription_tier,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT a.id) as total_actions,
  SUM(a.duration_ms) as total_duration_ms,
  MAX(s.started_at) as last_session_at
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id
LEFT JOIN actions a ON a.user_id = u.id
GROUP BY u.id, u.username, u.subscription_tier;

-- Grant access to view
GRANT SELECT ON user_stats TO authenticated;
GRANT SELECT ON user_stats TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Orchestra database schema created successfully!';
  RAISE NOTICE 'Tables: users, sessions, actions, metrics';
  RAISE NOTICE 'Views: user_stats';
  RAISE NOTICE 'RLS enabled on all tables';
END $$;
