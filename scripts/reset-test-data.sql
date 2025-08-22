-- Reset script for local testing
-- Run this in Supabase SQL editor or via CLI

-- Clear ALL test predictions (including short/fake transaction hashes)
DELETE FROM user_predictions WHERE LENGTH(transaction_hash) < 66 OR user_id IN (
  '0xbB65d349DCa28A64b5dDBA859C0389060eFD3D71',
  '0x3Be7907e139DfD37F3b53CDf67A0b5817afC2A7c', 
  '0x18209352b685C0fcB54f837503Af863fA56aEbFD'
);

-- Clear ALL test positions from test wallets
DELETE FROM user_positions WHERE user_id IN (
  '0xbB65d349DCa28A64b5dDBA859C0389060eFD3D71',
  '0x3Be7907e139DfD37F3b53CDf67A0b5817afC2A7c',
  '0x18209352b685C0fcB54f837503Af863fA56aEbFD'
);

-- Clean up any orphaned positions (positions without corresponding predictions)
DELETE FROM user_positions WHERE market_id NOT IN (SELECT DISTINCT market_id FROM user_predictions);

-- Reset market stats (if you have any)
-- UPDATE markets SET total_yes_shares = 0, total_no_shares = 0, yes_pool = 0, no_pool = 0;

SELECT 
  (SELECT COUNT(*) FROM user_predictions) as remaining_predictions,
  (SELECT COUNT(*) FROM user_positions) as remaining_positions,
  'All test data cleared!' as result;