"use client";

import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { useEnsName, useEnsAvatar } from 'wagmi';

/**
 * Custom hook for fetching Basename (ENS) data
 * Basenames are ENS names on Base L2
 */
export function useBasename(address: Address | undefined) {
  const [loading, setLoading] = useState(true);

  // Use environment-based chain selection
  const chain = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia;

  // Fetch ENS name (Basename)
  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address,
    chainId: chain.id,
  });

  // Fetch ENS avatar
  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: ensName as string | undefined,
    chainId: chain.id,
  });

  useEffect(() => {
    if (!nameLoading && !avatarLoading) {
      setLoading(false);
    }
  }, [nameLoading, avatarLoading]);

  // Format address for display (0x1234...5678)
  const formatAddress = (addr: Address) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    basename: ensName || null,
    avatar: ensAvatar || null,
    displayName: ensName || (address ? formatAddress(address) : 'Unknown'),
    hasBasename: !!ensName,
    loading,
  };
}

/**
 * Hook to get just the display name (Basename or shortened address)
 */
export function useDisplayName(address: Address | undefined) {
  const { displayName, loading } = useBasename(address);
  return { displayName, loading };
}

/**
 * Hook to check if an address has a Basename
 */
export function useHasBasename(address: Address | undefined) {
  const { hasBasename, loading } = useBasename(address);
  return { hasBasename, loading };
}