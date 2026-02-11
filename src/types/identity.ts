// src/types/identity.ts

import type { IIdentityData } from '@/bindings'
export type PurposeType = 0 | 1 | 2 | 3
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4
export interface DiscoveredIdentityWithKeys extends DiscoveredIdentity {
    derivedKeys?: DerivedKeyInfo[];
}
export interface IPublicKey {
    type: number;
    keyType: string;
    purpose: PurposeType;
    securityLevel: SecurityLevelType;
    contractBounds?: any;
    data?: string;
    dataBytes?: string | null;
    readOnly?: boolean;
    disabledAt?: string | null;
    id?: number;
}
export interface IPrivateKey extends IPublicKey {
    privateKeyHex: string;
    privateKeyWif: string;
}
export interface IKeyTypes {
    masterKey: IPrivateKey | IPublicKey;
    authCritical: IPrivateKey | IPublicKey;
    authHigh: IPrivateKey | IPublicKey;
    transferKey: IPrivateKey | IPublicKey;
    encryptionKey: IPrivateKey | IPublicKey;
}
export interface IUser {
    docId?: string;
    username: string;
    displayName: string;
    name?: string;
    identityId?: string;
    address?: string;
    avatar: string;
    avatarId?: string;
    avatarData?: string;
    bio?: string;
    publicMessage?: string;
    followers?: number;
    following?: number;
    verified?: boolean;
    joinedAt?: Date;
    revision?: number;
}
export interface IIdentity {
    id?: string;
    identityId: string;
    identityIdx: number;
    balance: string;
    publicKeys: IPublicKey[];
    revision: number;
    username?: string;
    avatarUrl?: string;
    displayName?: string;
    publicMessage?: string;
    publicKeyIds?: number[];
    isAuthenticated?: boolean;
    createdAt?: number;
}
export interface DiscoveredIdentity {
    id?: string;
    identityId: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    publicKeyIds?: number[];
    balance?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    revision?: number;
    dpnsUsername?: string | null;
}
export interface RustDiscoveredIdentity {
    identityId: string;
    identityIdx: number;
    dpnsUsername?: string | null;
    balance?: string | null;
    keyType: 'seed' | 'private';
    discoveredKey?: string | null;
    discoveredAt: string;
}
export interface RustDiscoveredIdentitiesStore {
    identities: Record<string, RustDiscoveredIdentity>;
    lastScan?: string | null;
}
export interface DiscoveryProgress {
    currentIdentityIndex: number;
    totalIdentities: number;
    currentKeyIndex: number;
    totalKeysPerIdentity: number;
    scannedCount: number;
    foundCount: number;
    message?: string;
    currentPublicKeyHash?: string;
    currentPath?: string;
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
export interface StoredMnemonic {
    seedPhrase: string;
}
// Added IKeystore interface to represent the Rust-backed local keystore
export interface IKeystore {
    identities: Record<string, IPrivateKeyEntry[]>;
}
// --- STORE ACTIONS SIGNATURES ---
export interface IIdentityActions {
    // Discovery Storage
    saveDiscoveredIdentities: (identities: DiscoveredIdentity[], network: 'mainnet' | 'testnet', keyType: 'seed' | 'private') => Promise<{ success: boolean; savedCount: number, error?: string }>;
    loadDiscoveredIdentities: (network: 'mainnet' | 'testnet') => Promise<RustDiscoveredIdentitiesStore | null>;
    clearDiscoveredIdentities: (network: 'mainnet' | 'testnet') => Promise<{ success: boolean; error?: string }>;
    // Connection
    connectWithSeed: (seedPhrase: string, network: 'mainnet' | 'testnet', targetId: string, identityIdx: number) => Promise<ConnectionResult>;
    connectWithSingleKey: (privateKey: string, identityId: string, network: 'mainnet' | 'testnet', preloaded?: any) => Promise<ConnectionResult>;
    switchIdentity: (targetIdentityId: string) => Promise<ConnectionResult>;
    // Restore legacy action required by ConnectSeedForm
    connectWriteOnlyFromDiscovered: (identity: DiscoveredIdentity, seedPhrase: string) => Promise<ConnectionResult>;
    // Core Storage / Persistence
    saveKeys: (network: 'mainnet' | 'testnet', identityId: string, keys: any[]) => Promise<any>;
    loadFromStorage: () => Promise<void>;
    saveToStorage: (networkOverride?: 'mainnet' | 'testnet') => Promise<void>;
    clearStorage: () => Promise<void>;
    getCurrentNetwork: () => Promise<'mainnet' | 'testnet'>;
    // Added missing persistence actions
    loadKeystore: (network: string) => Promise<any>;
    deleteIdentity: (network: string, identityId: string | null) => Promise<any>;
    saveIdentityWithKeys: (network: string, identityPayload: any, keys: any[]) => Promise<any>;
    saveIdentity: (network: string, payload: any) => Promise<any>;
    // Identity Details & Search
    searchUserIdentities: () => Promise<any>;
    queryIdentityDetails: (identityId: string, identityIdx: number, sdk?: any) => Promise<any>;
    getPublicKeys: () => Promise<any>;
    // Helpers
    saveMnemonicToStore: (network: 'mainnet' | 'testnet', seedPhrase: string) => Promise<void>;
    loadMnemonic: (network: 'mainnet' | 'testnet') => Promise<{ seedPhrase: string } | null>;
    loadSettings: () => Promise<any>;
    saveIdentityDataToStore: (network: 'mainnet' | 'testnet', targetId: string, data: any) => Promise<void>;
    resetStoreState: () => void;
    // Auth
    logout: () => Promise<void>;
    clearConnectionError: () => void;
}
// --- STORE STATE / ACTIONS INTERFACE ---
export interface IIdentityState extends IIdentityActions {
    username: string | null;
    identityId: string | null;
    identityIdx?: number;
    displayName: string | null;
    identity: IIdentity | null;
    balance: string;
    balanceBigInt?: bigint | undefined;
    dashBigInt?: bigint | undefined;
    publicKeys: IPublicKey[];
    revision: number;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    lastConnected: number | null;
    discoveryProgress?: DiscoveryProgress | null | undefined;
    identities: IIdentityStoreMap;
    // Resolved ts(2353): added keystore to state interface
    keystore: IKeystore | null;
}
export interface SDKIdentityDetails {
    identity: any;
    identityIdx: number;
    publicKeys: any[];
    revision: number;
}
export interface IdentitySearchOptions {
    minIndexSearch?: number;
    queryRegistry?: boolean;
    signatureScheme?: 'ecdsa' | 'bls' | 'hash160';
}
export interface IdentitySearchResult {
    identities?: IIdentity[];
    username?: string;
    balance?: string;
    publicKeys?: IPublicKey[];
    error?: string;
}
export interface StorageKeys {
    mnemonic: string;
    privateKeys: string;
    identityData: string;
    license: string;
    settings: string;
    discoveredIdentities: string;
}
export interface KeyGenerationResult {
    masterKey: any;
    authCritical: any;
    authHigh: any;
    transferKey: any;
    encryptionKey: any;
}
export interface IdentityLookupResult {
    success: boolean;
    identity?: DiscoveredIdentity;
    error?: string;
    debug?: any;
}
export interface IdentityDiscoveryDetails {
    detectedKeyType: string;
    keyDescription: string;
    keyIcon: string;
    associatedKeys: Array<{
        purpose: string;
        securityLevel: string;
        keyType: string;
        derivedFromInput: boolean;
    }>;
}
export interface IPrivateKeyEntry {
    identityId: string;
    keyId: number;
    purpose: number;
    securityLevel: number;
    keyType: string;
    privateKey: string;
    publicKey: string;
    derivedFromMnemonic?: boolean;
    created_at?: string;
    last_used?: string;
}
export type PrivateKeyEntry = IPrivateKeyEntry;
export interface QueryTrace {
    step: number;
    identityIndex: number;
    keyIndex: number;
    path: string;
    publicKeyHash: string;
    method: 'unique' | 'non-unique';
    found: boolean;
    id?: string;
}
export interface ScanProgress {
    currentIdentityIndex: number;
    currentKeyIndex: number;
    totalIdentities: number;
    totalKeysPerIdentity: number;
    currentPublicKeyHash: string;
    currentPath: string;
    status: 'deriving' | 'scanning' | 'completed' | 'failed';
    scannedCount: number;
    foundCount: number;
}
export interface DiscoveryResult {
    success: boolean
    identities?: DiscoveredIdentityWithKeys[] | null
    identity?: DiscoveredIdentityWithKeys | null
    detectedKeyType?: string | null
    associatedKeys?: AssociatedKey[] | null
    error?: string
    stack?: string
    debug?: {
        step?: string;
        count?: number;
        network?: string;
        stack?: {};
        trace?: QueryTrace[];
        progressSnapshot?: ScanProgress | undefined;
        error?: string;
    }
}
export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet';
    maxIdentityIndex?: number;
    data?: DiscoveryResult;
    maxKeyIndex?: number;
    node?: any;
}
export interface DerivedKeyInfo {
    keyId: number;
    purpose: number;
    securityLevel: number;
    keyType: string;
    privateKeyWIF: string;
    publicKeyHex: string;
    derivationPath: string;
    createdAt?: string;
    lastUsed?: string;
}
export interface AssociatedKey {
    purpose: string;
    securityLevel: string;
    keyType: string;
    data: string;
    derivedFromInput: boolean;
}
export interface DiscoveryDetails {
    detectedKeyType: string | null;
    associatedKeys: AssociatedKey[];
}
