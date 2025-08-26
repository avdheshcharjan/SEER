# Influencer Support Migration

## Overview
This migration adds comprehensive influencer support to the BASED prediction markets platform, allowing markets to be attributed to crypto Twitter influencers.

## What's Added

### New Tables
1. **`influencer_profiles`** - Stores influencer profile data
2. **`influencer_markets`** - Junction table linking markets to influencers

### Updated Tables
- **`markets`** - Added `creator_influencer_id` and `is_influencer_market` columns
- **`user_predictions`** - Added `is_influencer_prediction` and `influencer_id` columns

### Views and Functions
- **`markets_with_influencers`** - View for easy querying of markets with influencer data
- **`get_markets_by_influencer()`** - Function to get all markets by an influencer
- **`get_influencer_stats()`** - Function for platform-wide influencer statistics

## How to Apply

### 1. Run the Migration
Copy the contents of `20250825_add_influencer_support.sql` and run it in your Supabase SQL editor:

```sql
-- The entire migration script should be run as one transaction
```

### 2. Verify the Migration
After running, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('influencer_profiles', 'influencer_markets');

-- Check influencers were inserted
SELECT id, name, handle, win_rate, verified_status FROM influencer_profiles;

-- Check view works
SELECT * FROM markets_with_influencers LIMIT 5;
```

## Influencers Included

The migration includes 6 prominent crypto Twitter personalities:
- **0xSisyphus** (73% win rate, 287K followers)
- **InverseBrah** (68% win rate, 425K followers) 
- **Hsaka** (81% win rate, 198K followers)
- **Cobie** (72% win rate, 847K followers)
- **Gainzy** (65% win rate, 312K followers)
- **Light** (79% win rate, 156K followers)

## Market Attribution

The migration automatically links existing markets to influencers based on the mapping in `lib/influencers.ts`. Markets with IDs like `crypto-1`, `crypto-2`, etc. will be attributed to specific influencers.

## Row Level Security (RLS)

RLS policies are enabled for:
- Read access to all influencer data (public)
- Update access for influencers on their own profiles (when auth is added)

## Usage Examples

### Get Markets by Influencer
```sql
SELECT * FROM get_markets_by_influencer('cobie');
```

### Get Influencer Statistics
```sql
SELECT * FROM get_influencer_stats();
```

### Query Markets with Influencer Data
```sql
SELECT 
  m.question,
  m.category,
  ip.name as creator_name,
  ip.win_rate,
  ip.follower_count
FROM markets_with_influencers m
WHERE m.influencer_verified = true
ORDER BY m.created_at DESC;
```

## Frontend Integration

The migration is already integrated with:
- **BaseCard component** - Displays influencer attribution automatically
- **InfluencerAttribution component** - Renders influencer profile data
- **Updated TypeScript types** - Full type safety for influencer data

## Rollback

To rollback this migration if needed:

```sql
-- Drop tables in correct order (foreign key dependencies)
DROP VIEW IF EXISTS markets_with_influencers;
DROP FUNCTION IF EXISTS get_markets_by_influencer(TEXT);
DROP FUNCTION IF EXISTS get_influencer_stats();
DROP TRIGGER IF EXISTS trigger_link_market_to_influencer ON markets;
DROP FUNCTION IF EXISTS link_market_to_influencer();
DROP TABLE IF EXISTS influencer_markets;
DROP TABLE IF EXISTS influencer_profiles;

-- Remove added columns
ALTER TABLE markets DROP COLUMN IF EXISTS creator_influencer_id;
ALTER TABLE markets DROP COLUMN IF EXISTS is_influencer_market;
ALTER TABLE user_predictions DROP COLUMN IF EXISTS is_influencer_prediction;
ALTER TABLE user_predictions DROP COLUMN IF EXISTS influencer_id;
```