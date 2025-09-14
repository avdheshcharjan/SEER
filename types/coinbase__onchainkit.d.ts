declare module '@coinbase/onchainkit' {
  import { ReactNode } from 'react';

  export interface OnchainKitProviderProps {
    children: ReactNode;
    apiKey?: string;
    chain?: any;
    config?: any;
  }

  export function OnchainKitProvider(props: OnchainKitProviderProps): JSX.Element;
}

declare module '@coinbase/onchainkit/transaction' {
  import { ReactNode } from 'react';
  import { Address } from 'viem';

  export interface TransactionCall {
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }

  export interface TransactionReceiptData {
    transactionHash: string;
    [key: string]: any;
  }

  export interface LifecycleStatusData {
    code?: string;
    message?: string;
    transactionReceipts?: TransactionReceiptData[];
    [key: string]: any;
  }

  export interface LifecycleStatus {
    statusName: 'idle' | 'preparing' | 'ready' | 'broadcasting' | 'pending' | 'success' | 'error' | 'init' | 'transactionIdle' | 'buildingTransaction' | 'transactionPending' | 'transactionLegacyExecuted';
    statusData?: LifecycleStatusData;
  }

  export interface TransactionProps {
    chainId?: number;
    calls: TransactionCall[];
    isSponsored?: boolean;
    onStatus?: (status: LifecycleStatus) => void;
    children: ReactNode;
  }

  export interface TransactionButtonProps {
    text?: string;
    className?: string;
    disabled?: boolean;
  }

  export function Transaction(props: TransactionProps): JSX.Element;
  export function TransactionButton(props: TransactionButtonProps): JSX.Element;
  export function TransactionSponsor(): JSX.Element;
  export function TransactionStatusLabel(): JSX.Element;
  export function TransactionStatusAction(): JSX.Element;
}

declare module '@coinbase/onchainkit/identity' {
  import { ReactNode } from 'react';
  import { Address, Chain } from 'viem';

  export interface IdentityProps {
    address?: Address;
    children: ReactNode;
    className?: string;
    chain?: Chain;
    schemaId?: string;
    hasCopyAddressOnClick?: boolean;
  }

  export interface AvatarProps {
    address?: Address;
    className?: string;
    loadingComponent?: ReactNode;
    defaultComponent?: ReactNode;
  }

  export interface NameProps {
    address?: Address;
    className?: string;
    loadingComponent?: ReactNode;
    defaultComponent?: ReactNode;
    children?: ReactNode;
  }

  export interface BadgeProps {
    className?: string;
  }

  export interface AddressProps {
    address?: Address;
    className?: string;
    isSliced?: boolean;
  }

  export interface EthBalanceProps {
    address?: Address;
    className?: string;
  }

  export function Identity(props: IdentityProps): JSX.Element;
  export function Avatar(props: AvatarProps): JSX.Element;
  export function Name(props: NameProps): JSX.Element;
  export function Badge(props: BadgeProps): JSX.Element;
  export function Address(props: AddressProps): JSX.Element;
  export function EthBalance(props: EthBalanceProps): JSX.Element;
}

declare module '@coinbase/onchainkit/minikit' {
  import { ReactNode } from 'react';

  export interface MiniKitProviderProps {
    children: ReactNode;
    apiKey?: string;
    chain?: any;
    config?: any;
  }

  export function useComposeCast(): {
    composeCast: (options: { text: string; url?: string; embeds?: string[] }) => Promise<void>;
  };

  export function MiniKitProvider(props: MiniKitProviderProps): JSX.Element;
}

declare module '@coinbase/onchainkit/wallet' {
  import { ReactNode } from 'react';

  export interface ConnectWalletProps {
    children?: ReactNode;
    className?: string;
    text?: string;
  }

  export interface WalletDropdownProps {
    children?: ReactNode;
    className?: string;
  }

  export interface WalletDropdownDisconnectProps {
    className?: string;
    text?: string;
  }

  export interface WalletProps {
    children?: ReactNode;
    className?: string;
  }

  export function ConnectWallet(props: ConnectWalletProps): JSX.Element;
  export function Wallet(props: WalletProps): JSX.Element;
  export function WalletDropdown(props: WalletDropdownProps): JSX.Element;
  export function WalletDropdownDisconnect(props: WalletDropdownDisconnectProps): JSX.Element;
}
