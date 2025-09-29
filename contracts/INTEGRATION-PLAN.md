Smart Contract Markets Integration Plan    │ │
│ │                                            │ │
│ │ Overview                                   │ │
│ │                                            │ │
│ │ I'll create a comprehensive system to      │ │
│ │ automatically sync the 50 smart contract   │ │
│ │ markets created by CreateMarkets.s.sol to  │ │
│ │ the Supabase database and display them as  │ │
│ │ swipeable cards in the UI.                 │ │
│ │                                            │ │
│ │ Phase 1: Smart Contract Event Monitoring & │ │
│ │  Database Sync                             │ │
│ │                                            │ │
│ │ 1.1 Create Contract Event Listener Service │ │
│ │                                            │ │
│ │ - File: lib/contract-sync.ts               │ │
│ │ - Monitor the ParimutuelMarketFactory      │ │
│ │ contract for MarketCreated events          │ │
│ │ - Extract market data from blockchain      │ │
│ │ events and sync to Supabase                │ │
│ │ - Handle contract address mapping and      │ │
│ │ real-time pool updates                     │ │
│ │                                            │ │
│ │ 1.2 Deployment Script Enhancement          │ │
│ │                                            │ │
│ │ - File:                                    │ │
│ │ contracts/script/CreateMarkets.s.sol       │ │
│ │ (enhance existing)                         │ │
│ │ - Add post-deployment database sync        │ │
│ │ functionality                              │ │
│ │ - Store contract addresses and deployment  │ │
│ │ transaction hashes                         │ │
│ │ - Create mapping between script-generated  │ │
│ │ markets and database entries               │ │
│ │                                            │ │
│ │ 1.3 Backend Sync Script                    │ │
│ │                                            │ │
│ │ - File: scripts/sync-contract-markets.ts   │ │
│ │ - Batch process to sync all 50 deployed    │ │
│ │ markets to database                        │ │
│ │ - Extract market questions, categories,    │ │
│ │ and contract metadata                      │ │
│ │ - Update database with real contract       │ │
│ │ addresses and deployment status            │ │
│ │                                            │ │
│ │ Phase 2: Database Schema Updates           │ │
│ │                                            │ │
│ │ 2.1 Market Categories Enhancement          │ │
│ │                                            │ │
│ │ - Update Supabase schema to support the 5  │ │
│ │ categories from MARKET-IDEAS.md:           │ │
│ │   - crypto (12 markets)                    │ │
│ │   - current-affairs (10 markets)           │ │
│ │   - politics (8 markets)                   │ │
│ │   - technology (10 markets)                │ │
│ │   - sports (10 markets)                    │ │
│ │                                            │ │
│ │ 2.2 Contract Integration Fields            │ │
│ │                                            │ │
│ │ - Enhance markets table with:              │ │
│ │   - factory_contract_address               │ │
│ │ (ParimutuelMarketFactory address)          │ │
│ │   - deployment_batch_id (track which batch │ │
│ │  deployment)                               │ │
│ │   - script_generated (flag for             │ │
│ │ script-created markets)                    │ │
│ │                                            │ │
│ │ Phase 3: Frontend UI Enhancement           │ │
│ │                                            │ │
│ │ 3.1 Market Cards Stack Component           │ │
│ │                                            │ │
│ │ - Enhancement: Existing SwipeStack.tsx     │ │
│ │ already supports card stacking             │ │
│ │ - New: Category-specific card variants for │ │
│ │  the 5 new categories                      │ │
│ │ - Files:                                   │ │
│ │   - app/components/cards/CurrentAffairsCar │ │
│ │ d.tsx                                      │ │
│ │   -                                        │ │
│ │ app/components/cards/TechnologyCard.tsx    │ │
│ │ (update existing TechCard)                 │ │
│ │   - Update SmartPredictionCard.tsx to      │ │
│ │ handle new categories                      │ │
│ │                                            │ │
│ │ 3.2 Real-time Market Data                  │ │
│ │                                            │ │
│ │ - Enhancement: lib/supabase.ts             │ │
│ │ - Add real-time subscriptions for contract │ │
│ │  market updates                            │ │
│ │ - Sync blockchain pool data with UI        │ │
│ │ display                                    │ │
│ │ - Handle market resolution and outcome     │ │
│ │ updates                                    │ │
│ │                                            │ │
│ │ 3.3 Contract Market Integration            │ │
│ │                                            │ │
│ │ - Enhancement:                             │ │
│ │ lib/parimutuel-blockchain.ts               │ │
│ │ - Connect UI actions to actual deployed    │ │
│ │ contracts                                  │ │
│ │ - Enable real USDC betting on              │ │
│ │ script-generated markets                   │ │
│ │ - Handle transaction signing and           │ │
│ │ confirmation                               │ │
│ │                                            │ │
│ │ Phase 4: Automatic Syncing Mechanism       │ │
│ │                                            │ │
│ │ 4.1 Real-time Event Processing             │ │
│ │                                            │ │
│ │ - File: lib/blockchain-monitor.ts          │ │
│ │ - Listen for all market events (bets,      │ │
│ │ resolutions, etc.)                         │ │
│ │ - Update database pools and user positions │ │
│ │  in real-time                              │ │
│ │ - Handle error recovery and retry logic    │ │
│ │                                            │ │
│ │ 4.2 Scheduled Sync Jobs                    │ │
│ │                                            │ │
│ │ - File: scripts/periodic-sync.ts           │ │
│ │ - Hourly sync job to catch any missed      │ │
│ │ events                                     │ │
│ │ - Reconcile blockchain state with database │ │
│ │  state                                     │ │
│ │ - Generate alerts for sync discrepancies   │ │
│ │                                            │ │
│ │ 4.3 API Integration                        │ │
│ │                                            │ │
│ │ - Files:                                   │ │
│ │   - app/api/markets/sync/route.ts (webhook │ │
│ │  endpoint)                                 │ │
│ │   - app/api/markets/contract/[address]/rou │ │
│ │ te.ts (individual market sync)             │ │
│ │ - Expose endpoints for manual sync         │ │
│ │ triggers                                   │ │
│ │ - Support webhook-based updates from       │ │
│ │ external services                          │ │
│ │                                            │ │
│ │ Phase 5: UI/UX Enhancements                │ │
│ │                                            │ │
│ │ 5.1 Market Discovery                       │ │
│ │                                            │ │
│ │ - Enhancement: app/components/Home.tsx     │ │
│ │ - Add "Live Markets" section showing       │ │
│ │ deployed contract markets                  │ │
│ │ - Display real-time statistics and         │ │
│ │ activity                                   │ │
│ │ - Quick access to highest-volume markets   │ │
│ │                                            │ │
│ │ 5.2 Contract Market Indicators             │ │
│ │                                            │ │
│ │ - Visual: Badge/indicator showing "Live    │ │
│ │ Contract" vs "Demo"                        │ │
│ │ - Data: Real-time pool sizes and           │ │
│ │ participant counts                         │ │
│ │ - Interaction: Direct contract interaction │ │
│ │  for deployed markets                      │ │
│ │                                            │ │
│ │ 5.3 Category Filtering & Navigation        │ │
│ │                                            │ │
│ │ - Enhancement: Add category tabs/filters   │ │
│ │ to market browser                          │ │
│ │ - Feature: "Script Markets" filter to show │ │
│ │  only deployed contract markets            │ │
│ │ - Analytics: Category-specific statistics  │ │
│ │ and trends                                 │ │
│ │                                            │ │
│ │ Implementation Strategy                    │ │
│ │                                            │ │
│ │ Phase 1 (Core Infrastructure): 2-3 hours   │ │
│ │                                            │ │
│ │ - Contract event monitoring                │ │
│ │ - Database sync scripts                    │ │
│ │ - Deployment script enhancement            │ │
│ │                                            │ │
│ │ Phase 2 (Data Layer): 1-2 hours            │ │
│ │                                            │ │
│ │ - Schema updates                           │ │
│ │ - Data transformation utilities            │ │
│ │ - Supabase service enhancements            │ │
│ │                                            │ │
│ │ Phase 3 (Frontend Integration): 2-3 hours  │ │
│ │                                            │ │
│ │ - New card components                      │ │
│ │ - Real-time data integration               │ │
│ │ - Contract interaction layer               │ │
│ │                                            │ │
│ │ Phase 4 (Automation): 1-2 hours            │ │
│ │                                            │ │
│ │ - Background sync processes                │ │
│ │ - API endpoints                            │ │
│ │ - Error handling and monitoring            │ │
│ │                                            │ │
│ │ Phase 5 (Polish): 1 hour                   │ │
│ │                                            │ │
│ │ - UI enhancements                          │ │
│ │ - User experience improvements             │ │
│ │ - Performance optimization                 │ │
│ │                                            │ │
│ │ Expected Outcome                           │ │
│ │                                            │ │
│ │ - 50 live prediction markets automatically │ │
│ │  synced from smart contracts               │ │
│ │ - Real-time betting with actual USDC on    │ │
│ │ Base Sepolia                               │ │
│ │ - Swipeable card interface displaying live │ │
│ │  contract data                             │ │
│ │ - Automatic synchronization between        │ │
│ │ blockchain and database                    │ │
│ │ - Category-based organization of the 5     │ │
│ │ market types                               │ │
│ │ - Seamless UX where users can't tell the   │ │
│ │ difference between demo and live markets   │ │
│ │                                            │ │
│ │ The system will provide a complete bridge  │ │
│ │ between the deployed smart contracts and   │ │
│ │ the existing Supabase + React frontend,    │ │
│ │ enabling real decentralized prediction     │ │
│ │ markets while maintaining the polished     │ │
│ │ swipe-to-predict user experience. 