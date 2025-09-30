# Shared Context and Dependencies

## Critical Information for All Agents

### Factory Contract Details
- **Address**: `0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C`
- **Network**: Base Sepolia
- **USDC Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Function**: `createMarkets(string[] questions, address[] resolvers)`
- **Max Batch Size**: 10 markets per transaction (requirement) or 20 (contract limit)

### Database Contract Address Pattern
Markets MUST have a valid `contract_address` field to appear in the swipe interface. The validation logic is:
```typescript
const contractAddr = market.contract_address || market.contractAddress;
if (!contractAddr || !isValidAddress(contractAddr)) {
    return undefined;
}
```

### Type Definitions
```typescript
// From lib/types.ts
interface UnifiedMarket {
  id: string;
  question: string;
  category: string;
  endTime?: string;
  end_time?: string;
  contractAddress?: string;
  contract_address?: string;
  yes_pool?: number;
  no_pool?: number;
  resolved?: boolean;
  outcome?: boolean;
}
```

### Event Structure
```typescript
// MarketCreated event from factory
interface MarketCreatedEvent {
  market: Address; // The deployed market contract address
  question: string;
  endTime: bigint;
  creator: Address;
  transactionHash: string;
}
```

### Category Mapping
Markets should be categorized as one of:
- `crypto` - Cryptocurrency predictions
- `tech` - Technology company predictions
- `celebrity` - Celebrity/entertainment predictions
- `sports` - Sports outcomes
- `politics` - Political events

Use question content to auto-categorize when possible.

### API Response Format
Admin API should return:
```typescript
interface CreateMarketsResponse {
  success: boolean;
  markets: Array<{
    id: string;
    question: string;
    category: string;
    contract_address: string;
    explorer_url: string;
  }>;
  error?: string;
}
```

### Explorer URL Pattern
```typescript
const explorerUrl = `https://sepolia.base.org/address/${contractAddress}`;
```

### Existing Patterns to Follow

#### Transaction Generation (from lib/blockchain.ts)
```typescript
const tx = await publicClient.simulateContract({
  address: FACTORY_ADDRESS,
  abi: factoryAbi,
  functionName: 'createMarkets',
  args: [questions, resolvers],
  account: userAddress,
});
```

#### Event Parsing (from lib/market-factory-onchainkit.ts)
```typescript
const logs = receipt.logs.filter(log =>
  log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
);
const decoded = decodeEventLog({
  abi: factoryAbi,
  data: log.data,
  topics: log.topics,
});
```

#### Database Update (from lib/supabase.ts)
```typescript
const { data, error } = await supabase
  .from('markets')
  .insert({
    question,
    category,
    end_time: new Date(Number(endTime) * 1000).toISOString(),
    contract_address: marketAddress.toLowerCase(),
    creator_address: creatorAddress.toLowerCase(),
  })
  .select()
  .single();
```

### Error Handling Pattern
All agents should:
1. Validate inputs early
2. Throw specific errors with clear messages
3. NOT use fallbacks or default values
4. Log important operations with emojis for visibility:
   - 🚀 Starting operations
   - ✅ Success
   - ❌ Errors
   - 📊 Data processing
   - 🔄 Retries

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ALCHEMY_API_KEY
```

### Testing Requirements
Each agent MUST:
1. Run type checking on modified files before returning
2. Ensure no type errors in their specific files
3. Not break existing functionality
4. Follow the "throw errors early" principle

### File Naming Conventions
- Components: PascalCase (e.g., `MarketCreator.tsx`)
- Services/Utils: kebab-case (e.g., `contract-integration.ts`)
- API Routes: kebab-case folders (e.g., `/api/admin/create-markets/route.ts`)

### Import Patterns
```typescript
// Prefer named imports
import { supabaseService } from '@/lib/supabase';
import { getMarketContractAddress, isValidAddress } from '@/lib/blockchain';
import type { UnifiedMarket } from '@/lib/types';

// For components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

### State Management
Use Zustand store when needed:
```typescript
import { useStore } from '@/lib/store';
const { user, addPrediction } = useStore();
```

### Styling
Use Tailwind CSS classes consistently with existing components:
- Cards: `bg-white dark:bg-gray-800 rounded-xl shadow-lg`
- Buttons: `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg`
- Errors: `text-red-500 text-sm mt-2`
- Success: `text-green-500 text-sm mt-2`