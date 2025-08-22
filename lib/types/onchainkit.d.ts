import { Address } from 'viem';

export type TransactionStatus = 
  | { statusName: 'init'; statusData: null }
  | { statusName: 'error'; statusData: { message: string } }
  | { statusName: 'transactionIdle'; statusData: null }
  | { statusName: 'buildingTransaction'; statusData: null }
  | { statusName: 'transactionPending'; statusData: null }
  | { statusName: 'transactionLegacyExecuted'; statusData: { transactionHashList: string[] } }
  | { statusName: 'success'; statusData: { transactionReceipts: { transactionHash: string }[] } };
