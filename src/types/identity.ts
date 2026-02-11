// src/types/identity.ts

import type { IIdentityData, IPrivateKeyEntry } from '@/bindings'

export type PurposeType = 0 | 1 | 2 | 3
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4

export interface DiscoveredIdentityWithKeys extends DiscoveredIdentity {
    derivedKeys?: DerivedKeyInfo[];
}

export interface IPublicKey {
    id: number; // This is the Key Index, not the Identity ID
    type: number;
    keyType: string;
    purpose: PurposeType;
    securityLevel: SecurityLevelType;
    contractBounds?: any;
    data?: string;
    dataBytes?: string | null;
    readOnly?: boolean;
    disabledAt?: string | null;
}

export interface IPrivateKey extends IPublicKey {
    privateKeyHex: string;
    privateKeyWif: string;
}

export interface IUser {
    docId?: string;
    username: string;
    displayName: string;
    name?: string;
    identityId: string;
    address?: string;
    avatar: string;
    bio?: string;
    revision?: number;
}

export interface IIdentity {
    identityId: string;
    identityIdx: number;
    balance: string;
    publicKeys: IPublicKey[];
    revision: number;
    username?: string;
    displayName?: string;
    publicKeyIds?: number[];
    isAuthenticated?: boolean;
    createdAt?: number;
}

export interface DiscoveredIdentity {
    identityId: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    publicKeyIds?: number[];
    balance?: string;
    username?: string;
    displayName?: string;
    revision?: number;
    dpnsUsername?: string | null;
}

export interface RustDiscoveredIdentity {
    identityId: string;
    identityIdx: number;
    dpnsUsername?: string | null;
    balance?: string | null;
    keyType: 'seed' | 'private';
    discoveredAt: string;
}

export interface RustDiscoveredIdentitiesStore {
    identities: Record<string, RustDiscoveredIdentity>;
    lastScan?: string | null;
}

export interface DiscoveryProgress {
    currentIdentityIndex: number;
    totalIdentities: number;
    scannedCount: number;
    foundCount: number;
    message?: string;
}

export interface IIdentityStoreMap {
    [key: string]: IIdentityData;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    identity?: IIdentity;
    error?: string;
}

export interface IKeystore {
    identities: Record<string, IPrivateKeyEntry[]>;
}

export interface IIdentityActions {
    // Discovery
    saveDiscoveredIdentities: (identities: DiscoveredIdentity[], network: 'mainnet' | 'testnet', keyType: 'seed' | 'private') => Promise<{ success: boolean; savedCount: number }>;
    loadDiscoveredIdentities: (network: 'mainnet' | 'testnet') => Promise<RustDiscoveredIdentitiesStore | null>;

    // Connection
    connectWithSeed: (seedPhrase: string, network: 'mainnet' | 'testnet', targetId: string, identityIdx: number) => Promise<ConnectionResult>;
    connectWithSingleKey: (privateKey: string, identityId: string, network: 'mainnet' | 'testnet') => Promise<ConnectionResult>;
    switchIdentity: (targetIdentityId: string) => Promise<ConnectionResult>;

    // Core Storage
    saveKeys: (network: 'mainnet' | 'testnet', identityId: string, keys: IPrivateKeyEntry[]) => Promise<any>;
    loadKeystore: (network: string) => Promise<any>;
    deleteIdentity: (network: string, identityId: string | null) => Promise<any>;

    // Auth
    logout: () => Promise<void>;
}

export interface IIdentityState extends IIdentityActions {
    identityId: string | null;
    identityIdx?: number;
    identity: IIdentity | null;
    balance: string;
    publicKeys: IPublicKey[];
    isAuthenticated: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    identities: IIdentityStoreMap;
    keystore: IKeystore | null;
}

export interface DiscoveryResult {
    success: boolean;
    identities?: DiscoveredIdentityWithKeys[] | null;
    error?: string;
    debug?: {
        step?: string;
        count?: number;
        network?: string;
    };
}

export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet';
    maxIdentityIndex?: number;
}

export interface DerivedKeyInfo {
    keyId: number;
    purpose: number;
    securityLevel: number;
    keyType: string;
    privateKeyWIF: string;
    publicKeyHex: string;
    derivationPath: string;
}
