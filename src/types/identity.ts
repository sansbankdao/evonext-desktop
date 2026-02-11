// src/types/identity.ts

//@ts-nocheck
import type { IIdentityData, IPrivateKeyEntry } from '@/bindings'

export type PurposeType = 0 | 1 | 2 | 3
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4

export interface IPublicKey {
    idx: number;
    type?: number;
    keyType: string;
    purpose: PurposeType;
    securityLevel: SecurityLevelType;
    data?: string;
    dataBytes?: string;
    dataB64?: string;
    readOnly: boolean;
    disabledAt?: string | null;
}

export interface IUser {
    identityId: string;
    username: string;
    displayName: string;
    avatar?: string;
    avatarUrl?: string;
    verified?: boolean;
    bio?: string;
}

export interface IIdentity {
    identityId: string;
    identityIdx: number;
    balance: string;
    publicKeys: IPublicKey[];
    revision: number;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isAuthenticated?: boolean;
    createdAt?: number;
}

export interface DiscoveredIdentity {
    identityId: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    balance?: string;
    username?: string;
    revision?: number;
    dpnsUsername?: string | null;
}

export interface DiscoveryProgress {
    currentIdentityIndex: number;
    totalIdentities: number;
    scannedCount: number;
    foundCount: number;
}

export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet';
    checkPortfolios?: boolean;
}

export interface ScanProgress {
    phase: string;
    progress: number;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    error?: string;
}

export interface IIdentityActions {
    connectWithSeed: (phrase: string, net: string, id: string, idx: number) => Promise<ConnectionResult>;
    connectWithPrivateKey: (key: string, id: string, net: string) => Promise<ConnectionResult>;
    connectWriteOnlyFromDiscovered: (id: DiscoveredIdentity, phrase: string) => Promise<ConnectionResult>;
    refreshIdentity: () => Promise<void>;
    fetchBalance: () => Promise<void>;
    loadPublicKeys: () => Promise<IPublicKey[]>;
    switchIdentity: (identityId: string) => Promise<void>;
    deleteIdentity: (identityId: string) => Promise<void>;
    updateIdentityMetadata: (id: string, updates: Partial<IIdentity>) => Promise<void>;
    searchUserIdentities: () => Promise<IIdentity[]>;
    loadFromStorage: () => Promise<void>;
    saveToStorage: () => Promise<void>;
    clearStorage: () => Promise<void>;
    clearConnectionError: () => void;
    saveKeys: (network: string, identityId: string, keys: any[]) => Promise<void>;
    saveMnemonicToStore: (network: string, mnemonic: string) => Promise<void>;
    saveIdentityDataToStore: (network: string, id: string, data: any) => Promise<void>;
    getCurrentNetwork: () => Promise<string>;
    loadKeystore: (network: string) => Promise<any>;
}

export interface IIdentityState extends IIdentityActions {
    identityId: string | null;
    identityIdx: number;
    username: string | null;
    displayName: string | null;
    identity: IIdentity | null;
    balance: string;
    formattedBalance: string;
    balanceBigInt: bigint;
    dashBigInt: bigint;
    publicKeys: IPublicKey[];
    revision: number;
    isAuthenticated: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    premiumAccess: boolean;
    discoveryProgress: DiscoveryProgress | null;
    identities: Record<string, IIdentity>;
}

export interface DiscoveryResult {
    success: boolean;
    identities?: DiscoveredIdentity[];
    identity?: DiscoveredIdentity;
    error?: string;
    debug?: any;
}
