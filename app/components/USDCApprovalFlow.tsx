"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { CheckCircle, DollarSign, AlertCircle } from 'lucide-react';
import { 
  validateGaslessConfig,
  checkUserBalance
} from '@/lib/gasless';
import { USDCApprovalManager, ApprovalStatus } from '@/lib/approval-manager';
import { Transaction, TransactionButton, TransactionSponsor } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface USDCApprovalFlowProps {
  onApprovalComplete?: () => void;
}

export function USDCApprovalFlow({ onApprovalComplete }: USDCApprovalFlowProps) {
  const { address } = useAccount();
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [hasBalance, setHasBalance] = useState(false);
  const [approvedMarkets, setApprovedMarkets] = useState(0);
  const [totalApprovalAmount, setTotalApprovalAmount] = useState(0);

  // Check current approval status and balance on load
  useEffect(() => {
    const checkCurrentStatus = async () => {
      if (!address) return;

      setCheckingApproval(true);
      try {
        // Check user's ETH balance for gas (in case gasless fails)
        const balanceResult = await checkUserBalance(address as Address);
        setHasBalance(balanceResult.hasMinimumBalance);

        // Check current approval status across all markets
        const approvalStatuses = await USDCApprovalManager.getUserApprovedMarkets(address as Address);
        const hasActiveApprovals = approvalStatuses.some((status: ApprovalStatus) => status.approved);
        
        setIsApproved(hasActiveApprovals);
        setApprovedMarkets(approvalStatuses.filter((s: ApprovalStatus) => s.approved).length);
        setTotalApprovalAmount(approvalStatuses.reduce((sum: number, s: ApprovalStatus) => sum + s.allowanceAmount, 0));
      } catch (error) {
        console.error('Error checking approval status:', error);
      } finally {
        setCheckingApproval(false);
      }
    };

    checkCurrentStatus();
  }, [address]);

  // Get approval calls for OnchainKit
  const [approvalCalls, setApprovalCalls] = useState<any[]>([]);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  
  useEffect(() => {
    const loadApprovalCalls = async () => {
      if (!address || isApproved) return; // Don't load if already approved
      
      try {
        const result = await USDCApprovalManager.setupUSDCApproval(address as Address);
        console.log('USDC approval setup result:', result);
        
        if (result.success && result.calls && result.calls.length > 0) {
          setApprovalCalls(result.calls);
          setApprovalAmount(result.totalApprovalAmount);
        } else {
          console.warn('No approval calls generated, result:', result);
        }
      } catch (error) {
        console.error('Failed to load approval calls:', error);
      }
    };
    
    loadApprovalCalls();
  }, [address, isApproved]);

  const handleTransactionStatus = (status: LifecycleStatus) => {
    console.log('Approval transaction status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
        setIsApproving(true);
        toast.loading('Setting up USDC approval for gasless transactions...', {
          style: {
            borderRadius: '12px',
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
          },
        });
        break;
      
      case 'success':
        setIsApproving(false);
        setIsApproved(true);
        setApprovedMarkets(1); // Single approval for MarketFactory
        setTotalApprovalAmount(approvalAmount);
        
        toast.success(
          <div className="flex flex-col">
            <span className="font-semibold">USDC approval complete! 🎉</span>
            <span className="text-xs mt-1">
              ${approvalAmount} USDC approved for gasless predictions
            </span>
          </div>,
          {
            duration: 8000,
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #22c55e',
            },
          }
        );
        
        onApprovalComplete?.();
        break;
      
      case 'error':
        setIsApproving(false);
        console.error('USDC approval failed:', status.statusData);
        toast.error(`Failed to approve USDC: ${status.statusData?.message || 'Unknown error'}`);
        break;
    }
  };

  if (!address) {
    return null;
  }

  if (checkingApproval) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
          <span className="text-slate-400">Checking approval status...</span>
        </div>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20 mb-6">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-400">Ready for Gasless Predictions!</h3>
            <p className="text-green-300 text-sm">
              ${totalApprovalAmount} USDC approved for gasless trading
            </p>
          </div>
        </div>
        <div className="text-center text-slate-400 text-xs space-y-1">
          <div>⚡ Swipe left or right to predict without gas fees or popups</div>
          <div className="text-green-400">
            ✅ USDC approved for MarketFactory • Ready to trade
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-6">
      <div className="text-center mb-4">
        <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">One-Time Setup Required</h3>
        <p className="text-slate-400 text-sm mb-4">
          Pre-approve USDC to enable seamless, gasless predictions. This is a one-time setup that allows you to swipe without wallet popups.
        </p>
      </div>

      {!hasBalance && (
        <div className="flex items-center justify-center mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-400 mr-2" />
          <span className="text-yellow-400 text-xs">
            Low ETH balance detected. Gasless mode will be used automatically.
          </span>
        </div>
      )}

      {approvalCalls.length > 0 ? (
        <>
          {(() => {
            console.log('Rendering Transaction with calls:', approvalCalls);
            console.log('First call structure:', approvalCalls[0]);
            return null;
          })()}
          <Transaction
            isSponsored={true}
            calls={approvalCalls}
            onStatus={handleTransactionStatus}
            chainId={84532} // Base Sepolia
          >
            <TransactionButton 
              className="w-full py-4 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-blue-500/25"
              text={isApproving ? 'Setting up gasless predictions...' : 'Enable Gasless Predictions'}
              disabled={isApproving}
            />
            <TransactionSponsor />
          </Transaction>
        </>
      ) : (
        <motion.button
          disabled={true}
          className="w-full py-4 rounded-xl font-semibold bg-slate-600 text-slate-400 cursor-not-allowed flex items-center justify-center"
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400 mr-3"></div>
          Preparing approval setup...
        </motion.button>
      )}

      <div className="mt-4 text-center">
        <div className="text-xs text-slate-500 mb-2">This approval allows gasless transactions via:</div>
        <div className="flex items-center justify-center space-x-2 text-xs">
          <div className="px-2 py-1 bg-slate-700/50 rounded text-slate-300">Base Smart Account</div>
          <div className="text-slate-500">+</div>
          <div className="px-2 py-1 bg-slate-700/50 rounded text-slate-300">Coinbase Paymaster</div>
        </div>
      </div>
    </div>
  );
}