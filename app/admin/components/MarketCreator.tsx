"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, AlertTriangle, Check, FileText } from 'lucide-react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { generateCreateMarketCalls } from '@/lib/gasless-onchainkit';
import { processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';

interface MarketCreatorProps {
  onBack: () => void;
  onSuccess: (markets: Array<{
    id: string;
    question: string;
    contractAddress: string;
    transactionHash: string;
    category: string;
    endTime: Date;
  }>) => void;
}

type CreationStep = 'input' | 'preview' | 'creating';

interface MarketPreview {
  question: string;
  endTime: Date;
  category: string;
}

export function MarketCreator({ onBack, onSuccess }: MarketCreatorProps) {
  const { address } = useAccount();
  const [step, setStep] = useState<CreationStep>('input');
  const [bulkText, setBulkText] = useState('');
  const [marketPreviews, setMarketPreviews] = useState<MarketPreview[]>([]);
  const [createdMarkets, setCreatedMarkets] = useState<Array<{
    id: string;
    question: string;
    contractAddress: string;
    transactionHash: string;
    category: string;
    endTime: Date;
  }>>([]);
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse bulk text into market questions
  const parseMarketQuestions = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // Validate questions and prepare previews
  const handlePreview = () => {
    const questions = parseMarketQuestions(bulkText);

    if (questions.length === 0) {
      toast.error('Please enter at least one market question');
      return;
    }

    if (questions.length > 10) {
      toast.error('Maximum 10 markets can be created at once');
      return;
    }

    // Validate each question
    const errors: string[] = [];
    questions.forEach((question, index) => {
      if (question.length < 10) {
        errors.push(`Line ${index + 1}: Question too short (minimum 10 characters)`);
      }
      if (question.length > 256) {
        errors.push(`Line ${index + 1}: Question too long (maximum 256 characters)`);
      }
      if (!question.includes('?')) {
        errors.push(`Line ${index + 1}: Question should end with a question mark`);
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      return;
    }

    // Create previews with default 24-hour duration
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const previews: MarketPreview[] = questions.map(question => ({
      question,
      endTime,
      category: 'crypto' as const // Default category
    }));

    setMarketPreviews(previews);
    setStep('preview');
  };

  // Handle transaction status for each market
  const handleTransactionStatus = (status: LifecycleStatus) => {
    if (status.statusName === 'success' && status.statusData && 'transactionReceipts' in status.statusData) {
      const txHash = status.statusData.transactionReceipts?.[0]?.transactionHash;
      if (txHash) {
        processCurrentMarket(txHash);
      }
    }

    if (status.statusName === 'error' && status.statusData && 'message' in status.statusData) {
      toast.error(`Market creation failed: ${status.statusData.message}`, {
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #ef4444',
        },
      });
      setIsProcessing(false);
    }
  };

  // Process individual market creation
  const processCurrentMarket = async (txHash: string) => {
    try {
      const currentMarket = marketPreviews[currentMarketIndex];

      // Validate the market creation parameters
      const validation = validateMarketCreation({
        question: currentMarket.question,
        endTime: currentMarket.endTime,
        creatorAddress: address as Address
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Process the market creation
      const result = await processMarketCreation({
        question: currentMarket.question,
        category: currentMarket.category,
        endTime: currentMarket.endTime,
        creatorAddress: address as Address,
        transactionHash: txHash
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process market creation');
      }

      // Add to created markets
      const newMarket = {
        id: result.marketId!,
        question: currentMarket.question,
        contractAddress: result.contractAddress!,
        transactionHash: txHash,
        category: currentMarket.category,
        endTime: currentMarket.endTime
      };

      setCreatedMarkets(prev => [...prev, newMarket]);

      toast.success(`Market ${currentMarketIndex + 1}/${marketPreviews.length} created successfully!`, {
        duration: 3000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #10b981',
        },
      });

      // Move to next market or complete
      if (currentMarketIndex + 1 < marketPreviews.length) {
        setCurrentMarketIndex(prev => prev + 1);
        // The UI will automatically show the next transaction
      } else {
        // All markets created successfully
        setIsProcessing(false);
        onSuccess([...createdMarkets, newMarket]);
      }

    } catch (error) {
      console.error('Market processing failed:', error);
      toast.error(`Failed to process market: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #ef4444',
        },
      });
      setIsProcessing(false);
    }
  };

  // Start the market creation process
  const startCreation = () => {
    setStep('creating');
    setCurrentMarketIndex(0);
    setCreatedMarkets([]);
    setIsProcessing(true);
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white text-lg">Please connect your wallet to create markets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Bulk Market Creation</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white mb-2 font-medium">
                Market Questions
                <span className="text-slate-400 text-sm ml-2 hidden sm:inline">(One per line, max 10)</span>
                <span className="text-slate-400 text-xs block sm:hidden">One per line, max 10</span>
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Enter market questions, one per line:&#10;&#10;Will Bitcoin reach $100,000 by the end of 2024?&#10;Will Ethereum surpass Bitcoin in market cap this year?&#10;Will Apple release a VR headset in 2024?"
                className="w-full h-48 sm:h-64 px-3 sm:px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50 resize-none font-mono text-sm overflow-touch"
                rows={10}
              />
              <div className="flex justify-between text-xs sm:text-sm text-slate-400 mt-2">
                <span>{parseMarketQuestions(bulkText).length} questions</span>
                <span>Max 10 questions</span>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Default Settings
              </h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span>Crypto</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Liquidity:</span>
                  <span>10 USDC each side</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Cost:</span>
                  <span className="text-green-400">Gasless (sponsored)</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-100 font-medium mb-1">Important Notes</p>
                  <ul className="text-amber-200/80 text-sm space-y-1">
                    <li>• Each question will be deployed as a separate smart contract</li>
                    <li>• Markets will be created sequentially (one transaction per market)</li>
                    <li>• Questions should be clear, objective, and resolvable</li>
                    <li>• Each question must be between 10-256 characters</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-slate-700/50 text-white rounded-xl font-semibold hover:bg-slate-600/50 transition-colors border border-slate-600/50"
            >
              Back
            </button>
            <button
              onClick={handlePreview}
              disabled={parseMarketQuestions(bulkText).length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Markets
            </button>
          </div>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50"
        >
          <h2 className="text-xl font-bold text-white">Preview Markets ({marketPreviews.length})</h2>

          <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto overflow-touch">
            {marketPreviews.map((market, index) => (
              <div key={index} className="bg-slate-700/30 rounded-xl p-3 sm:p-4 border border-slate-600/50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-1 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base leading-snug">{market.question}</p>
                    <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 mt-2">
                      <span>Category: {market.category}</span>
                      <span>Duration: 24h</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
            <h3 className="text-white font-semibold mb-2">Creation Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Markets to create:</span>
                <span className="text-white ml-2 font-semibold">{marketPreviews.length}</span>
              </div>
              <div>
                <span className="text-slate-400">Estimated time:</span>
                <span className="text-white ml-2 font-semibold">{marketPreviews.length * 30}s</span>
              </div>
              <div>
                <span className="text-slate-400">Gas cost:</span>
                <span className="text-green-400 ml-2 font-semibold">Free (sponsored)</span>
              </div>
              <div>
                <span className="text-slate-400">Network:</span>
                <span className="text-white ml-2 font-semibold">Base Sepolia</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('input')}
              className="flex-1 py-3 bg-slate-700/50 text-white rounded-xl font-semibold hover:bg-slate-600/50 transition-colors border border-slate-600/50"
            >
              Back to Edit
            </button>
            <button
              onClick={startCreation}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-green-500/25"
            >
              Create All Markets
            </button>
          </div>
        </motion.div>
      )}

      {step === 'creating' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50"
        >
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Creating Markets</h2>
            <p className="text-slate-400">
              Market {currentMarketIndex + 1} of {marketPreviews.length}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-base-500 to-base-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((currentMarketIndex + (isProcessing ? 0.5 : 1)) / marketPreviews.length) * 100}%`
              }}
            />
          </div>

          {/* Current Market */}
          {currentMarketIndex < marketPreviews.length && (
            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {currentMarketIndex + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{marketPreviews[currentMarketIndex]?.question}</p>
                  <div className="flex gap-4 text-sm text-slate-400 mt-2">
                    <span>Category: {marketPreviews[currentMarketIndex]?.category}</span>
                    <span>Duration: 24h</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Created Markets Status */}
          {createdMarkets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Completed Markets:</p>
              {createdMarkets.map((market, index) => (
                <div key={market.id} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-green-100 text-sm truncate flex-1">{market.question}</span>
                  <span className="text-green-400 text-xs">#{index + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transaction Component for Current Market */}
          {currentMarketIndex < marketPreviews.length && (
            <Transaction
              isSponsored={true}
              calls={generateCreateMarketCalls(
                marketPreviews[currentMarketIndex].question,
                BigInt(Math.floor(marketPreviews[currentMarketIndex].endTime.getTime() / 1000))
              )}
              onStatus={handleTransactionStatus}
            >
              <TransactionButton
                className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25 disabled:opacity-50"
                text={`Create Market ${currentMarketIndex + 1}/${marketPreviews.length}`}
              />
              <TransactionSponsor />
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </Transaction>
          )}
        </motion.div>
      )}
    </div>
  );
}