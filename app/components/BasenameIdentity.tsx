"use client";

import { Address } from 'viem';
import { Avatar, Identity, Name, Badge, Address as AddressDisplay } from '@coinbase/onchainkit/identity';
import { base, baseSepolia } from 'viem/chains';

interface BasenameIdentityProps {
  address: Address;
  showAvatar?: boolean;
  showName?: boolean;
  showAddress?: boolean;
  showBadge?: boolean;
  avatarSize?: number;
  className?: string;
  chain?: typeof base | typeof baseSepolia;
  hasCopyAddressOnClick?: boolean;
}

/**
 * Reusable component for displaying user identity with Basenames
 * Handles ENS resolution and Coinbase Verifications via EAS
 */
export function BasenameIdentity({
  address,
  showAvatar = true,
  showName = true,
  showAddress = false,
  showBadge = true,
  avatarSize = 40,
  className = '',
  chain,
  hasCopyAddressOnClick = false,
}: BasenameIdentityProps) {
  // Use environment-based chain selection if not provided
  const selectedChain = chain || (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia);

  return (
    <Identity
      address={address}
      chain={selectedChain}
      schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      className={className}
    >
      {showAvatar && (
        <Avatar
          className="rounded-full"
          style={{ width: avatarSize, height: avatarSize }}
        />
      )}
      {showName && (
        <Name className="text-white font-semibold">
          {showBadge && <Badge />}
        </Name>
      )}
      {showAddress && (
        <AddressDisplay className="text-slate-400 text-sm" />
      )}
    </Identity>
  );
}

/**
 * Compact variant for leaderboards and lists
 */
export function BasenameIdentityCompact({ address, chain }: { address: Address; chain?: typeof base | typeof baseSepolia }) {
  return (
    <BasenameIdentity
      address={address}
      showAvatar={true}
      showName={true}
      showAddress={false}
      showBadge={true}
      avatarSize={32}
      className="flex items-center gap-2"
      chain={chain}
    />
  );
}

/**
 * Full variant with address for profiles
 */
export function BasenameIdentityFull({ address, chain }: { address: Address; chain?: typeof base | typeof baseSepolia }) {
  return (
    <BasenameIdentity
      address={address}
      showAvatar={true}
      showName={true}
      showAddress={true}
      showBadge={true}
      avatarSize={64}
      className="flex items-center gap-3"
      chain={chain}
      hasCopyAddressOnClick={true}
    />
  );
}

/**
 * Avatar-only variant for cards
 */
export function BasenameAvatar({ address, size = 24, chain }: { address: Address; size?: number; chain?: typeof base | typeof baseSepolia }) {
  const selectedChain = chain || (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia);

  return (
    <Identity
      address={address}
      chain={selectedChain}
      schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
    >
      <Avatar
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </Identity>
  );
}

/**
 * Name-only variant with optional badge
 */
export function BasenameName({ address, showBadge = true, className = '', chain }: { address: Address; showBadge?: boolean; className?: string; chain?: typeof base | typeof baseSepolia }) {
  const selectedChain = chain || (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia);

  return (
    <Identity
      address={address}
      chain={selectedChain}
      schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
    >
      <Name className={className}>
        {showBadge && <Badge />}
      </Name>
    </Identity>
  );
}