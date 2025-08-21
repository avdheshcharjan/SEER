'use client';

import { Transaction, TransactionButton, TransactionSponsor, TransactionStatus } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { 
  generateApprovalCalls, 
  generateBuySharesCalls,
  generateCreateMarketCalls 
} from '@/lib/gasless-onchainkit';
import { Address } from 'viem';
import { useState } from 'react';
import { toast } from 'sonner';

interface GaslessApprovalProps {
  marketAddress: Address;
  amount: number; // in USDC
  onSuccess?: (txHash: string) => void;
}

/**
 * Gasless USDC Approval Component
 */
export function GaslessApproval({ marketAddress, amount, onSuccess }: GaslessApprovalProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!address) {
    return <div>Connect wallet first</div>;
  }

  const calls = generateApprovalCalls(marketAddress, parseUnits(amount.toString(), 6));

  const handleStatus = (status: LifecycleStatus) => {
    console.log('Approval status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
        setIsProcessing(true);
        toast.loading('Approving USDC (gasless)...');
        break;
      
      case 'success':
        setIsProcessing(false);
        toast.success('USDC approved successfully!');
        if (status.statusData?.transactionReceipts?.[0]) {
          onSuccess?.(status.statusData.transactionReceipts[0].transactionHash);
        }
        break;
      
      case 'error':
        setIsProcessing(false);
        toast.error(`Approval failed: ${status.statusData?.message || 'Unknown error'}`);
        break;
    }
  };

  return (
    <Transaction
      isSponsored={true}
      calls={calls}
      onStatus={handleStatus}
      chainId={84532} // Base Sepolia
    >
      <TransactionButton 
        text={isProcessing ? 'Approving...' : `Approve ${amount} USDC`}
        disabled={isProcessing}
      />
      <TransactionSponsor />
    </Transaction>
  );
}

interface GaslessPredictionProps {
  marketAddress: Address;
  prediction: 'yes' | 'no';
  amount: number; // in USDC
  onSuccess?: (txHash: string) => void;
}

/**
 * Gasless Prediction Component
 */
export function GaslessPrediction({ marketAddress, prediction, amount, onSuccess }: GaslessPredictionProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!address) {
    return <div>Connect wallet first</div>;
  }

  const calls = generateBuySharesCalls(marketAddress, prediction, parseUnits(amount.toString(), 6));

  const handleStatus = (status: LifecycleStatus) => {
    console.log('Prediction status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
        setIsProcessing(true);
        toast.loading(`Placing ${prediction.toUpperCase()} prediction (gasless)...`);
        break;
      
      case 'success':
        setIsProcessing(false);
        toast.success(`Prediction placed successfully!`);
        if (status.statusData?.transactionReceipts?.[0]) {
          onSuccess?.(status.statusData.transactionReceipts[0].transactionHash);
        }
        break;
      
      case 'error':
        setIsProcessing(false);
        toast.error(`Prediction failed: ${status.statusData?.message || 'Unknown error'}`);
        break;
    }
  };

  return (
    <Transaction
      isSponsored={true}
      calls={calls}
      onStatus={handleStatus}
      chainId={84532} // Base Sepolia
    >
      <TransactionButton 
        text={isProcessing ? 'Processing...' : `Predict ${prediction.toUpperCase()} - ${amount} USDC`}
        disabled={isProcessing}
      />
      <TransactionStatus>
        <TransactionStatus.Label />
        <TransactionStatus.Action />
      </TransactionStatus>
      <TransactionSponsor />
    </Transaction>
  );
}

interface GaslessMarketCreationProps {
  question: string;
  endTime: Date;
  onSuccess?: (marketAddress: string, txHash: string) => void;
}

/**
 * Gasless Market Creation Component
 */
export function GaslessMarketCreation({ question, endTime, onSuccess }: GaslessMarketCreationProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!address) {
    return <div>Connect wallet first</div>;
  }

  const endTimeTimestamp = BigInt(Math.floor(endTime.getTime() / 1000));
  const calls = generateCreateMarketCalls(question, endTimeTimestamp);

  const handleStatus = (status: LifecycleStatus) => {
    console.log('Market creation status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
        setIsProcessing(true);
        toast.loading('Creating market (gasless)...');
        break;
      
      case 'success':
        setIsProcessing(false);
        toast.success('Market created successfully!');
        if (status.statusData?.transactionReceipts?.[0]) {
          const receipt = status.statusData.transactionReceipts[0];
          // Parse the MarketCreated event to get the market address
          // This would need additional logic to extract from logs
          onSuccess?.('0x...', receipt.transactionHash);
        }
        break;
      
      case 'error':
        setIsProcessing(false);
        toast.error(`Market creation failed: ${status.statusData?.message || 'Unknown error'}`);
        break;
    }
  };

  return (
    <Transaction
      isSponsored={true}
      calls={calls}
      onStatus={handleStatus}
      chainId={84532} // Base Sepolia
    >
      <TransactionButton 
        text={isProcessing ? 'Creating Market...' : 'Create Market'}
        disabled={isProcessing}
      />
      <TransactionSponsor />
    </Transaction>
  );
}

/**
 * Batch approval for multiple markets
 */
export function GaslessBatchApproval({ 
  marketAddresses, 
  amountPerMarket = 100,
  onSuccess 
}: { 
  marketAddresses: Address[];
  amountPerMarket?: number;
  onSuccess?: (txHash: string) => void;
}) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!address) {
    return <div>Connect wallet first</div>;
  }

  const calls = marketAddresses.map(marketAddress => ({
    ...generateApprovalCalls(marketAddress, parseUnits(amountPerMarket.toString(), 6))[0]
  }));

  const handleStatus = (status: LifecycleStatus) => {
    console.log('Batch approval status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
        setIsProcessing(true);
        toast.loading(`Approving ${marketAddresses.length} markets (gasless)...`);
        break;
      
      case 'success':
        setIsProcessing(false);
        toast.success(`Approved ${marketAddresses.length} markets successfully!`);
        if (status.statusData?.transactionReceipts?.[0]) {
          onSuccess?.(status.statusData.transactionReceipts[0].transactionHash);
        }
        break;
      
      case 'error':
        setIsProcessing(false);
        toast.error(`Batch approval failed: ${status.statusData?.message || 'Unknown error'}`);
        break;
    }
  };

  return (
    <Transaction
      isSponsored={true}
      calls={calls}
      onStatus={handleStatus}
      chainId={84532} // Base Sepolia
    >
      <TransactionButton 
        text={isProcessing ? 'Approving...' : `Approve ${marketAddresses.length} Markets`}
        disabled={isProcessing}
      />
      <TransactionSponsor />
    </Transaction>
  );
}