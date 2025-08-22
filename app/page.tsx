"use client";

// import {
//   useMiniKit,
//   useAddFrame,
//   useOpenUrl,
// } from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useState } from "react";
import { Toaster } from 'react-hot-toast';
import { Home } from "./components/Home";
import { PredictionMarket } from "./components/PredictionMarket";
import { Profile } from "./components/Profile";
import { Leaderboard } from "./components/Leaderboard";
import { CreateMarketOnchainKit } from "./components/CreateMarketOnchainKit";

// import { Plus, Check } from 'lucide-react';

type ViewType = 'home' | 'predict' | 'profile' | 'leaderboard' | 'create';

export default function App() {
  // const { setFrameReady, isFrameReady, context } = useMiniKit();
  // const [frameAdded, setFrameAdded] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("home");

  // const addFrame = useAddFrame();
  // const openUrl = useOpenUrl();

  // useEffect(() => {
  //   if (!isFrameReady) {
  //     setFrameReady();
  //   }
  // }, [setFrameReady, isFrameReady]);

  // const handleAddFrame = useCallback(async () => {
  //   const frameAdded = await addFrame();
  //   setFrameAdded(Boolean(frameAdded));
  // }, [addFrame]);

  // const saveFrameButton = useMemo(() => {
  //   if (context && !context.client.added) {
  //     return (
  //       <button
  //         onClick={handleAddFrame}
  //         className="flex items-center space-x-1 text-sm font-medium text-base-500 hover:text-base-400 transition-colors p-2"
  //       >
  //         <Plus className="w-4 h-4" />
  //         <span>Save Frame</span>
  //       </button>
  //     );
  //   }

  //   if (frameAdded) {
  //     return (
  //       <div className="flex items-center space-x-1 text-sm font-medium text-green-400 animate-fade-out">
  //         <Plus className="w-4 h-4" />
  //         <span>Saved</span>
  //       </div>
  //     );
  //   }

  //   return null;
  // }, [context, frameAdded, handleAddFrame]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'predict':
        return <PredictionMarket onBack={() => setCurrentView('home')} />;
      case 'profile':
        return <Profile onBack={() => setCurrentView('home')} onCreateMarket={() => setCurrentView('create')} />;
      case 'leaderboard':
        return <Leaderboard onBack={() => setCurrentView('home')} />;
      case 'create':
        return <CreateMarketOnchainKit onBack={() => setCurrentView('home')} />;
      default:
        return (
          <Home
            onStartPredicting={() => setCurrentView('predict')}
            onViewProfile={() => setCurrentView('profile')}
            onViewLeaderboard={() => setCurrentView('leaderboard')}
            onCreateMarket={() => setCurrentView('create')}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-geist bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white ios-safe-area">
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '90vw',
          },
        }}
      />

      <div className="w-full max-w-md mx-auto px-4 py-3 safe-area-padding">
        <header className="flex justify-between items-center mb-6 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit mobile-text-sm" />
                </ConnectWallet>
                <WalletDropdown>
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
          {/* <div>{saveFrameButton}</div> */}
        </header>

        <main className="flex-1 min-h-[calc(100vh-200px)]">
          {renderCurrentView()}
        </main>

        <footer className="mt-6 pt-4 flex justify-center">
          <button
            className="text-slate-400 hover:text-slate-300 mobile-text-xs transition-colors ios-button"
            onClick={() => window.open("https://base.org/builders/minikit", "_blank")}
          >
            Built on Base with MiniKit
          </button>
        </footer>
      </div>
    </div>
  );
}
