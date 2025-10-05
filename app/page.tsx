"use client";

import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Toaster } from 'react-hot-toast';
import { Home } from "./components/Home";

export default function App() {
  return (
    <div className="flex flex-col min-h-screen font-geist text-white relative">
      <Toaster position="top-center" />

      {/* Static Background */}
      <div className="static-bg"></div>

      <div className="w-full max-w-md mx-auto px-4 py-3 min-h-screen relative z-0">
        <header className="flex justify-start items-center mb-6 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown className="bg-[#d1d5db] overflow-hidden rounded-lg shadow-lg border border-slate-200 text-black">
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-[calc(100vh-200px)]">
          <Home />
        </main>

        <footer className="mt-6 pt-4 flex justify-center">
          <button
            className="text-slate-400 hover:text-slate-300 text-xs transition-colors"
            onClick={() => window.open("https://base.org/builders/minikit", "_blank")}
          >
            Built on Base with MiniKit
          </button>
        </footer>
      </div>
    </div>
  );
}