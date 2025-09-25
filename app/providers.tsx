"use client";

import { type ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";

export function Providers(props: { children: ReactNode }) {
  // Use Base Sepolia for testing, Base for production
  const chain = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia;
  
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
      chain={chain}
      config={{
        appearance: {
          mode: 'dark'
        }
      }}
    >
      <MiniKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={chain}
        config={{
          appearance: {
            mode: "auto",
            theme: "mini-app-theme",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            logo: process.env.NEXT_PUBLIC_ICON_URL,
          },
          // Custom paymaster configuration for gasless transactions
          paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL,
        }}
      >
        {props.children}
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}
