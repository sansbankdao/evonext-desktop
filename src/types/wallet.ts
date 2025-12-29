// src/types/wallet.ts

import type { IUser } from './identity'

// Constants
export const MIN_CREDIT_TRANSFER = BigInt(100000) // 0.000001 DASH

export interface ICurrency {
    USD: any;
}

export interface IMnemonic {
    seed_phrase: string;
}

export interface IToken {
    name: string;
    ticker: string;
    token_id_hex: string;
    iconUrl: string;
    duffs?: bigint;
    amount?: bigint;
    decimal_places: number;
    fiat: ICurrency;
}

export interface ITokenPaymentInfo {
    tokenContractId: string;
    tokenContractPosition: number;
    maximumTokenCost: bigint;
    // Removed: GasFeesPaidByWASM import since it's from pshenmic-dpp
    gasFeesPaidBy: any; // Was: GasFeesPaidByWASM - use appropriate type if needed
}

export interface ITxError {
    code: number;
    message: string;
    suggestions?: string[];
}

export interface ITxSuccess {
    txid: string;
}

export interface IAsset {
    ticker: string;
    name: string;
    amount: number;
    usdValue: number;
}

export interface ITransaction {
    id?: string;
    type: 'sent' | 'received' | 'swap';
    title: string;
    subtitle: string;
    amount: string; // Formatted amount with +/- and ticker
    status: 'Completed' | 'Pending...' | 'Failed';
    date: Date;
}

export interface IBalanceChange {
    isPositive: boolean;
    percent: number;
    amount: number;
}

export interface IWalletState {
    user: IUser | null;
    assets: IAsset[];
    transactions: ITransaction[];
    balanceChange: IBalanceChange | null;
    isLoading: boolean;
}

// Key management types
export interface KeyDerivationResult {
    masterKey: any;  // PrivateKeyWASM instance
    authCritical: any;
    authHigh: any;
    transferKey: any;
    encryptionKey: any;
}

export interface DerivationPath {
    purpose: number;
    coinType: number;
    account: number;
    change: number;
    identityIdx: number;
    keyIdx: number;
}

export interface TokenTransition {
    amount: number;
    recipient: string;
    owner: {
        identifier: string;
        aliases: Array<{
            alias: string;
            contested: boolean;
            documentId: string;
            status: string;
            timestamp: string;
        }>;
    };
    action: string;
    stateTransitionHash: string;
    timestamp: string;
    publicNote: string | null;
}

export interface TokenBalance {
    tokenId: {
        base58: () => string;
    };
    balance: bigint;
}

export interface BalanceResult {
    credits?: bigint;
    satoshis?: number;
    dash?: bigint;
    formatted?: string;
    raw?: string;
    tokens?: TokenBalance[];
}

export interface NetworkConfig {
    isTestnet: boolean;
    platformEndpoint: string;
    dapiEndpoint: string;
}

export interface TokenBalanceResponse {
    tokenId: string;
    balance: bigint;
    formattedBalance: string;
    decimals: number;
}

export interface AssetPriceUpdate {
    ticker: string;
    usdValue: number;
}

// Wallet operation types
export interface SendCreditParams {
    identityId: string;
    identityIdx: number;
    receiver: string;
    credits: bigint;
}

export interface SendTokenParams {
    identityId: string;
    identityIdx: number;
    tokenId: string;
    receiver: string;
    atomicUnits: bigint;
}

export interface TransactionResult {
    success: boolean;
    data?: ITxSuccess;
    error?: ITxError;
    hash?: string;
}

// Wallet client interface
export interface IWalletClient {
    sendCredits(params: SendCreditParams): Promise<TransactionResult>;
    sendToken(params: SendTokenParams): Promise<TransactionResult>;
    getBalances(identityId: string): Promise<BalanceResult>;
    getTokenBalance(identityId: string, tokenId: string): Promise<bigint>;
    hasSufficientBalance(identityId: string, requiredCredits: bigint): Promise<boolean>;
}
