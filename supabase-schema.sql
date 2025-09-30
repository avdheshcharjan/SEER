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
  resolution_time TIMESTAMPTZ,
  -- Event tracking fields for smart contract integration
  chain_id BIGINT,
  market_id TEXT, -- from smart contract event
  opening_block BIGINT,
  closing_block BIGINT,
  created_tx_hash BYTEA,
  created_log_index INT,
  created_block_number BIGINT,
  is_reorged BOOLEAN NOT NULL DEFAULT FALSE
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
CREATE INDEX IF NOT EXISTS idx_markets_contract_address ON markets(contract_address);
CREATE INDEX IF NOT EXISTS idx_markets_chain_id ON markets(chain_id);
CREATE INDEX IF NOT EXISTS idx_markets_is_reorged ON markets(is_reorged);

-- Unique constraint for event deduplication on markets
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_unique_origin
  ON markets(created_tx_hash, created_log_index, chain_id)
  WHERE created_tx_hash IS NOT NULL AND created_log_index IS NOT NULL AND chain_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_market_id ON user_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_created_at ON user_predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_market_id ON user_positions(market_id);

-- Indexes for sync_jobs table
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at);

-- Indexes for dead_letter_queue table
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_created_at ON dead_letter_queue(created_at);

-- Indexes for contract_events table
CREATE INDEX IF NOT EXISTS idx_contract_events_chain_id ON contract_events(chain_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_contract_address ON contract_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_events_topic0 ON contract_events(topic0);
CREATE INDEX IF NOT EXISTS idx_contract_events_block_number ON contract_events(block_number);
CREATE INDEX IF NOT EXISTS idx_contract_events_created_at ON contract_events(created_at);

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
CREATE TRIGGER update_sync_jobs_updated_at BEFORE UPDATE ON sync_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;

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

-- Create sync_jobs table for reliable event processing
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index, chain_id)
);

-- Create dead_letter_queue table for failed sync jobs
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES sync_jobs(id),
  final_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create policies for sync_jobs (admin/system access for event processing)
CREATE POLICY "Sync jobs are viewable by everyone" ON sync_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create sync jobs" ON sync_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sync jobs" ON sync_jobs FOR UPDATE USING (true);

-- Create policies for dead_letter_queue (admin/system access for error tracking)
CREATE POLICY "Dead letter queue is viewable by everyone" ON dead_letter_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can create dead letter queue entries" ON dead_letter_queue FOR INSERT WITH CHECK (true);

-- Create policies for contract_events (read-only for users, system writes)
CREATE POLICY "Contract events are viewable by everyone" ON contract_events FOR SELECT USING (true);
CREATE POLICY "Anyone can create contract events" ON contract_events FOR INSERT WITH CHECK (true);

-- Create contract_events table for event deduplication
CREATE TABLE IF NOT EXISTS contract_events (
  chain_id BIGINT NOT NULL,
  contract_address BYTEA NOT NULL,
  topic0 BYTEA NOT NULL,
  tx_hash BYTEA NOT NULL,
  log_index INT NOT NULL,
  block_number BIGINT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tx_hash, log_index, chain_id) -- idempotency!
);

-- Insert sample data for testing
INSERT INTO markets (question, category, end_time, yes_pool, no_pool) VALUES
('Will ETH reach $5000 by end of January 2025?', 'crypto', '2025-01-31 23:59:59+00', 1000, 800),
('Will Bitcoin break $150k this year?', 'crypto', '2025-12-31 23:59:59+00', 2500, 1200),
('Will BASE token launch in Q1 2025?', 'crypto', '2025-03-31 23:59:59+00', 500, 300),
('Will Lakers make NBA playoffs?', 'sports', '2025-04-15 23:59:59+00', 800, 600),
('Will Trump win 2028 election?', 'politics', '2028-11-08 23:59:59+00', 1500, 1800);

COMMIT;