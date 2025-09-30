"use client";

import { BasenameIdentityFull, BasenameIdentityCompact, BasenameAvatar, BasenameName } from '@/app/components/BasenameIdentity';
import { Address } from 'viem';

// Test addresses - some may have Basenames, some won't
const TEST_ADDRESSES = [
  // Well-known addresses (may have ENS/Basenames)
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Common test address
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Another test address

  // Your wallet addresses (replace with your actual addresses)
  '0x1234567890123456789012345678901234567890', // Your address here
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Your address here
];

export default function TestBasenamesPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Basenames Integration Test</h1>

        {/* Full Identity Component Test */}
        <section className="mb-12 bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Full Identity Component</h2>
          <div className="space-y-4">
            {TEST_ADDRESSES.map((address) => (
              <div key={address} className="bg-slate-700 rounded-lg p-4">
                <BasenameIdentityFull address={address as Address} />
                <p className="text-xs text-slate-400 mt-2">Address: {address}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compact Identity Component Test */}
        <section className="mb-12 bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Compact Identity (Leaderboard Style)</h2>
          <div className="space-y-3">
            {TEST_ADDRESSES.map((address, index) => (
              <div key={address} className="bg-slate-700 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold">#{index + 1}</span>
                  <BasenameIdentityCompact address={address as Address} />
                </div>
                <div className="text-sm text-slate-400">
                  <div>Win Rate: {85 - index * 2}%</div>
                  <div>Streak: {10 - index}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Avatar Only Test */}
        <section className="mb-12 bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Avatar Component</h2>
          <div className="flex flex-wrap gap-4">
            {TEST_ADDRESSES.map((address) => (
              <div key={address} className="text-center">
                <BasenameAvatar address={address as Address} size={64} />
                <p className="text-xs text-slate-400 mt-2 max-w-[64px] truncate">
                  {address.slice(0, 6)}...
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Name Only Test */}
        <section className="mb-12 bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Name Component</h2>
          <div className="space-y-2">
            {TEST_ADDRESSES.map((address) => (
              <div key={address} className="bg-slate-700 rounded-lg p-3">
                <BasenameName
                  address={address as Address}
                  showBadge={true}
                  className="text-white font-semibold"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">📝 Testing Instructions</h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p><strong>What to look for:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Addresses with Basenames should show names like "alice.base.eth"</li>
              <li>Addresses without Basenames show shortened format "0x1234...5678"</li>
              <li>Avatars should load for addresses with ENS/Basenames</li>
              <li>Blue verification badges show for Coinbase-verified addresses</li>
              <li>All addresses should display correctly (no errors)</li>
            </ul>

            <p className="mt-4"><strong>To test with your own address:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Replace one of the test addresses above with your wallet address</li>
              <li>Refresh this page</li>
              <li>See how your address displays (with or without Basename)</li>
            </ol>

            <p className="mt-4"><strong>To get a Basename:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Visit <a href="https://www.base.org/names" className="text-blue-400 hover:underline" target="_blank">base.org/names</a></li>
              <li>Register a Basename for your address</li>
              <li>Come back and see it resolve automatically!</li>
            </ul>
          </div>
        </section>

        {/* Debug Info */}
        <section className="mt-8 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-3">🔧 Debug Info</h3>
          <div className="space-y-1 text-xs font-mono text-slate-400">
            <div>Environment: {process.env.NEXT_PUBLIC_ENVIRONMENT}</div>
            <div>OnchainKit API: {process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ? '✅ Set' : '❌ Missing'}</div>
            <div>Network: Base Sepolia (testnet)</div>
            <div>Schema ID: 0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9</div>
          </div>
        </section>
      </div>
    </div>
  );
}