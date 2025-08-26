-- Migration: Add Influencer Support to BASED Prediction Markets
-- Date: 2025-08-25
-- Description: Adds influencer profiles, market attribution, and related tables

-- Create influencer_profiles table
CREATE TABLE IF NOT EXISTS influencer_profiles (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  follower_count INTEGER DEFAULT 0,
  verified_status BOOLEAN DEFAULT false,
  win_rate DECIMAL(5,2) DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  total_volume TEXT DEFAULT '$0', -- Stored as formatted string like '$2.4M'
  profit_loss DECIMAL(5,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}', -- Array of expertise tags
  farcaster_fid INTEGER,
  twitter_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create influencer_markets junction table to track which markets are created by influencers
CREATE TABLE IF NOT EXISTS influencer_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  influencer_id TEXT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_id, influencer_id)
);

-- Add influencer attribution to existing tables
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS creator_influencer_id TEXT REFERENCES influencer_profiles(id),
ADD COLUMN IF NOT EXISTS is_influencer_market BOOLEAN DEFAULT false;

ALTER TABLE user_predictions 
ADD COLUMN IF NOT EXISTS is_influencer_prediction BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS influencer_id TEXT REFERENCES influencer_profiles(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_influencer_markets_market_id ON influencer_markets(market_id);
CREATE INDEX IF NOT EXISTS idx_influencer_markets_influencer_id ON influencer_markets(influencer_id);
CREATE INDEX IF NOT EXISTS idx_markets_creator_influencer_id ON markets(creator_influencer_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_influencer_id ON user_predictions(influencer_id);

-- Insert demo data based on existing influencer system
INSERT INTO influencer_profiles (
  id, handle, name, avatar_url, follower_count, verified_status, win_rate, 
  total_predictions, total_volume, profit_loss, tags, twitter_handle, farcaster_fid
) VALUES 
  (
    '0xsisyphus',
    '@0xSisyphus',
    'Sisyphus',
    'https://pbs.twimg.com/profile_images/1598123456789012345/abcd1234_400x400.jpg',
    287000,
    true,
    73.00,
    156,
    '$2.4M',
    34.20,
    ARRAY['DeFi', 'Layer2', 'Yield Farming', 'MEV'],
    '0xSisyphus',
    2847
  ),
  (
    'inversebrah',
    '@inversebrah', 
    'InverseBrah',
    'https://pbs.twimg.com/profile_images/1598987654321098765/efgh5678_400x400.jpg',
    425000,
    true,
    68.00,
    203,
    '$3.8M',
    52.70,
    ARRAY['Perpetuals', 'Trading', 'Derivatives', 'Risk Management'],
    'inversebrah',
    1923
  ),
  (
    'hsaka',
    '@hsaka',
    'Hsaka', 
    'https://pbs.twimg.com/profile_images/1598456789123456789/ijkl9012_400x400.jpg',
    198000,
    true,
    81.00,
    89,
    '$1.2M',
    67.30,
    ARRAY['GameFi', 'NFTs', 'Metaverse', 'Virtual Worlds'],
    'hsaka',
    5621
  ),
  (
    'cobie',
    '@cobie',
    'Cobie',
    'https://pbs.twimg.com/profile_images/1598321654987321654/mnop3456_400x400.jpg',
    847000,
    true,
    72.00,
    178,
    '$5.7M', 
    43.80,
    ARRAY['Altcoins', 'Market Analysis', 'Trading Psychology', 'Podcasting'],
    'cobie',
    892
  ),
  (
    'gainzy222',
    '@gainzy222',
    'Gainzy',
    'https://pbs.twimg.com/profile_images/1598654321456789321/qrst7890_400x400.jpg',
    312000,
    true,
    65.00,
    234,
    '$2.9M',
    28.40,
    ARRAY['Memecoins', 'Low Cap', 'Community Building', 'Alpha Calls'],
    'gainzy222',
    4157
  ),
  (
    'lightcrypto',
    '@lightcrypto',
    'Light',
    'https://pbs.twimg.com/profile_images/1598789456123789456/uvwx1234_400x400.jpg',
    156000,
    true,
    79.00,
    127,
    '$1.8M',
    58.90,
    ARRAY['Infrastructure', 'Consensus', 'Validator Economics', 'Staking'],
    'lightcrypto',
    3694
  )
ON CONFLICT (id) DO UPDATE SET
  handle = EXCLUDED.handle,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  follower_count = EXCLUDED.follower_count,
  verified_status = EXCLUDED.verified_status,
  win_rate = EXCLUDED.win_rate,
  total_predictions = EXCLUDED.total_predictions,
  total_volume = EXCLUDED.total_volume,
  profit_loss = EXCLUDED.profit_loss,
  tags = EXCLUDED.tags,
  twitter_handle = EXCLUDED.twitter_handle,
  farcaster_fid = EXCLUDED.farcaster_fid,
  updated_at = NOW();

-- Create a function to automatically link markets to influencers
CREATE OR REPLACE FUNCTION link_market_to_influencer()
RETURNS TRIGGER AS $$
BEGIN
  -- If a market is created with an influencer_id, automatically create the junction record
  IF NEW.creator_influencer_id IS NOT NULL THEN
    INSERT INTO influencer_markets (market_id, influencer_id)
    VALUES (NEW.id, NEW.creator_influencer_id)
    ON CONFLICT (market_id, influencer_id) DO NOTHING;
    
    -- Mark as influencer market
    NEW.is_influencer_market = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link markets
DROP TRIGGER IF EXISTS trigger_link_market_to_influencer ON markets;
CREATE TRIGGER trigger_link_market_to_influencer
  BEFORE INSERT OR UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION link_market_to_influencer();

-- Update existing markets with influencer attribution based on hardcoded mapping
-- This maps the existing market IDs to influencers as defined in lib/influencers.ts
DO $$
DECLARE
  market_mapping RECORD;
BEGIN
  -- Define market to influencer mappings
  FOR market_mapping IN 
    SELECT * FROM (VALUES
      ('crypto-1', '0xsisyphus'),
      ('crypto-2', 'cobie'),
      ('crypto-3', 'inversebrah'),
      ('crypto-4', 'gainzy222'),
      ('crypto-5', 'lightcrypto'),
      ('crypto-7', '0xsisyphus'),
      ('crypto-8', 'hsaka'),
      ('crypto-11', 'inversebrah'),
      ('crypto-13', 'lightcrypto'),
      ('crypto-15', 'hsaka'),
      ('crypto-17', '0xsisyphus'),
      ('crypto-18', 'cobie'),
      ('crypto-19', 'gainzy222'),
      ('crypto-21', 'gainzy222'),
      ('crypto-25', 'hsaka'),
      ('tech-2', 'cobie'),
      ('tech-9', 'inversebrah'),
      ('tech-13', 'hsaka'),
      ('tech-18', 'cobie'),
      ('tech-24', 'lightcrypto')
    ) AS mapping(market_id, influencer_id)
  LOOP
    -- Update markets that exist with this ID
    UPDATE markets 
    SET creator_influencer_id = market_mapping.influencer_id,
        is_influencer_market = true
    WHERE id::text = market_mapping.market_id;
    
    -- Insert into junction table if market exists
    INSERT INTO influencer_markets (market_id, influencer_id)
    SELECT m.id, market_mapping.influencer_id
    FROM markets m
    WHERE m.id::text = market_mapping.market_id
    ON CONFLICT (market_id, influencer_id) DO NOTHING;
  END LOOP;
END $$;

-- Create view for easy querying of markets with influencer data
CREATE OR REPLACE VIEW markets_with_influencers AS
SELECT 
  m.*,
  ip.id as influencer_id,
  ip.handle as influencer_handle,
  ip.name as influencer_name,
  ip.avatar_url as influencer_avatar,
  ip.verified_status as influencer_verified,
  ip.win_rate as influencer_win_rate,
  ip.follower_count as influencer_followers,
  ip.total_volume as influencer_volume,
  ip.tags as influencer_tags
FROM markets m
LEFT JOIN influencer_profiles ip ON m.creator_influencer_id = ip.id;

-- Create function to get markets by influencer
CREATE OR REPLACE FUNCTION get_markets_by_influencer(influencer_id_param TEXT)
RETURNS TABLE (
  market_id UUID,
  question TEXT,
  category TEXT,
  end_time TIMESTAMP WITH TIME ZONE,
  yes_pool DECIMAL,
  no_pool DECIMAL,
  resolved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.question,
    m.category,
    m.end_time,
    m.yes_pool,
    m.no_pool,
    m.resolved
  FROM markets m
  INNER JOIN influencer_markets im ON m.id = im.market_id
  WHERE im.influencer_id = influencer_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get influencer stats
CREATE OR REPLACE FUNCTION get_influencer_stats()
RETURNS TABLE (
  total_influencers BIGINT,
  total_verified BIGINT,
  avg_win_rate DECIMAL,
  total_followers BIGINT,
  total_markets BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_influencers,
    COUNT(*) FILTER (WHERE verified_status = true) as total_verified,
    AVG(win_rate) as avg_win_rate,
    SUM(follower_count) as total_followers,
    (SELECT COUNT(*) FROM influencer_markets) as total_markets
  FROM influencer_profiles;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for influencer tables
ALTER TABLE influencer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_markets ENABLE ROW LEVEL SECURITY;

-- Allow read access to influencer profiles for everyone
CREATE POLICY "Allow read access to influencer profiles" ON influencer_profiles
  FOR SELECT USING (true);

-- Allow read access to influencer markets for everyone  
CREATE POLICY "Allow read access to influencer markets" ON influencer_markets
  FOR SELECT USING (true);

-- Allow influencers to update their own profiles (when we add auth)
CREATE POLICY "Allow influencers to update own profile" ON influencer_profiles
  FOR UPDATE USING (auth.uid()::text = wallet_address);

-- Grant necessary permissions
GRANT SELECT ON markets_with_influencers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_markets_by_influencer(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_influencer_stats() TO anon, authenticated;