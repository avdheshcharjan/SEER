-- BASED Prediction Markets Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  creator_address TEXT,
  contract_address TEXT,
  yes_pool DECIMAL DEFAULT 0,
  no_pool DECIMAL DEFAULT 0,
  total_yes_shares DECIMAL DEFAULT 0,
  total_no_shares DECIMAL DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  outcome BOOLEAN,
  resolution_time TIMESTAMPTZ
);

-- Create user_predictions table
CREATE TABLE IF NOT EXISTS user_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Wallet address
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount DECIMAL NOT NULL,
  shares_received DECIMAL DEFAULT 0,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_positions table
CREATE TABLE IF NOT EXISTS user_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Wallet address
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  yes_shares DECIMAL DEFAULT 0,
  no_shares DECIMAL DEFAULT 0,
  total_invested DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, market_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);

CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_market_id ON user_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_created_at ON user_predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_market_id ON user_positions(market_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_predictions_updated_at BEFORE UPDATE ON user_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_positions_updated_at BEFORE UPDATE ON user_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to markets
CREATE POLICY "Markets are viewable by everyone" ON markets FOR SELECT USING (true);
CREATE POLICY "Anyone can create markets" ON markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Creators can update their markets" ON markets FOR UPDATE USING (true); -- For MVP, allow all updates

-- Create policies for user_predictions
CREATE POLICY "Users can view all predictions" ON user_predictions FOR SELECT USING (true);
CREATE POLICY "Users can create predictions" ON user_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own predictions" ON user_predictions FOR UPDATE USING (true);

-- Create policies for user_positions  
CREATE POLICY "Users can view all positions" ON user_positions FOR SELECT USING (true);
CREATE POLICY "Users can create/update positions" ON user_positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update positions" ON user_positions FOR UPDATE USING (true);

-- Insert sample data for testing
INSERT INTO markets (question, category, end_time, yes_pool, no_pool) VALUES
('Will ETH reach $5000 by end of January 2025?', 'crypto', '2025-01-31 23:59:59+00', 1000, 800),
('Will Bitcoin break $150k this year?', 'crypto', '2025-12-31 23:59:59+00', 2500, 1200),
('Will BASE token launch in Q1 2025?', 'crypto', '2025-03-31 23:59:59+00', 500, 300),
('Will Lakers make NBA playoffs?', 'sports', '2025-04-15 23:59:59+00', 800, 600),
('Will Trump win 2028 election?', 'politics', '2028-11-08 23:59:59+00', 1500, 1800);

COMMIT;