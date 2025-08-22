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
