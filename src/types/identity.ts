// src/types/identity.ts

export type PurposeType = 0 | 1 | 2 | 3
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4

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
    id?: string | undefined;
    identityId: string;
    identityIdx: number;
    balance?: number | string | null | undefined;
    publicKeys: IPublicKey[];
    revision?: number | undefined;
    username?: string | undefined;
    avatarUrl?: string | undefined;
    avatarHash?: string | undefined;
    avatarFingerprint?: string | undefined;
    displayName?: string | undefined;
    publicMessage?: string | undefined;
    publicKeyIds?: number[] | undefined;
    isAuthenticated?: boolean | undefined;
    createdAt?: number | undefined;
}

export interface DiscoveredIdentity {
    id?: string | undefined;
    identityId: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    balance?: number | string | null | undefined;
    username?: string | undefined;
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    revision?: number | undefined;
    dpnsUsername?: string | null | undefined;
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
    [key: string]: IIdentity;
}

export interface IIdentityState {
    username: string | null;
    identityId: string | null;
    displayName: string | null;
    identity: DiscoveredIdentity | null;
    balance: number | string | null | undefined;
    balanceBigInt?: bigint | undefined;
    dashBigInt?: bigint | undefined;
    publicKeys: IPublicKey[];
    revision: number | null;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnecting: boolean
    lastConnected: number | null;
    discoveryProgress?: DiscoveryProgress | null;
    identitiesMap: IIdentityStoreMap;

    connectWithSeed: (seedPhrase: string, network: string, targetId?: string, identityIndex?: number) => Promise<ConnectionResult>;
    connectWithSingleKey: (privateKey: string, identityId: string, network: string) => Promise<ConnectionResult>;
    switchIdentity: (targetIdentityId: string) => Promise<ConnectionResult>;
    saveDiscoveredIdentities: (identities: DiscoveredIdentity[], network: 'mainnet' | 'testnet', keyType: 'seed' | 'private') => Promise<{success: boolean, savedCount: number, error?: string}>;
    loadDiscoveredIdentities: (network: 'mainnet' | 'testnet') => Promise<RustDiscoveredIdentitiesStore | null>;
    clearDiscoveredIdentities: (network: 'mainnet' | 'testnet') => Promise<{success: boolean, error?: string}>;
    saveToStorage: (networkOverride?: 'mainnet' | 'testnet') => Promise<void>;
    searchUserIdentities: (network: 'mainnet' | 'testnet') => Promise<DiscoveredIdentity[]>;
    getCurrentNetwork: () => Promise<'mainnet' | 'testnet'>;
    clearStorage?: () => Promise<void>;
    fetchBalance?: () => Promise<void>;
    getGreeting?: () => string;
    loadFromStorage?: () => Promise<void>;
    logout: () => Promise<void>;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    identity?: IIdentity;
    error?: string;
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
    balance?: number | string | null | undefined;
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
