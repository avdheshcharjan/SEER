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

  const handleApproval = async () => {
    if (!address) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (!validateGaslessConfig()) {
      toast.error('Gasless transactions not configured. Please contact support.');
      return;
    }

    setIsApproving(true);
    const loadingToast = toast.loading('Setting up one-time USDC approval...', {
      style: {
        borderRadius: '12px',
        background: '#1e293b',
        color: '#f1f5f9',
        border: '1px solid #475569',
      },
    });

    try {
      // ✅ SECURITY FIX: Batch approve multiple markets with daily limits
      const result = await USDCApprovalManager.setupMultiMarketApprovals(address as Address);

      if (result.success) {
        setIsApproved(true);
        setApprovedMarkets(result.approvedMarkets.length);
        setTotalApprovalAmount(result.totalApprovalAmount);
        
        toast.success(
          <div className="flex flex-col">
            <span className="font-semibold">Multi-market USDC approval complete! 🎉</span>
            <span className="text-xs mt-1">
              {result.approvedMarkets.length} markets • ${result.totalApprovalAmount} total approved
            </span>
            {result.failedMarkets.length > 0 && (
              <span className="text-yellow-300 text-xs mt-1">
                {result.failedMarkets.length} markets failed - will retry automatically
              </span>
            )}
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
      } else {
        throw new Error('Multi-market approval failed');
      }
    } catch (error) {
      console.error('USDC approval failed:', error);
      toast.error('Failed to approve USDC. Please try again.');
    } finally {
      toast.dismiss(loadingToast);
      setIsApproving(false);
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
              {approvedMarkets} markets approved • ${totalApprovalAmount} USDC total
            </p>
          </div>
        </div>
        <div className="text-center text-slate-400 text-xs space-y-1">
          <div>⚡ Swipe left or right to predict without gas fees or popups</div>
          <div className="text-green-400">
            ✅ Multi-market approvals active • Daily limits: $100 per market
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

      <motion.button
        onClick={handleApproval}
        disabled={isApproving}
        className={`
          w-full py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center
          ${isApproving 
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-blue-500/25'
          }
        `}
        whileHover={!isApproving ? { scale: 1.02 } : {}}
        whileTap={!isApproving ? { scale: 0.98 } : {}}
      >
        {isApproving ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400 mr-3"></div>
            Setting up gasless predictions...
          </>
        ) : (
          <>
            <DollarSign className="w-5 h-5 mr-2" />
            Enable Gasless Predictions
          </>
        )}
      </motion.button>

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