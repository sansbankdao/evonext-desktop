// src/types/identity.ts

export type PurposeType = 0 | 1 | 2 | 3 // 0=AUTHENTICATION, 1=ENCRYPTION, 2=DECRYPTION, 3=TRANSFER
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4 // 0=MASTER, 1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW

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
    id?: number; // Added for UI indexing
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
    address?: string;       // Required for Wallet screens
    avatar: string;
    avatarId?: string;
    avatarData?: string;
    bio?: string;
    publicMessage?: string; // Added to match transformers
    followers?: number;
    following?: number;
    verified?: boolean;
    joinedAt?: Date;
    revision?: number;
}

/* Base interface definitions. */
export interface IExtendedPublicKey {
    keyType: string;
    dataBytes: string;
}

export interface IIdentity {
    id?: string | undefined;
    identityId?: string | undefined;
    identityIdx: number;
    balance?: number | string | null | undefined;
    publicKeys: IPublicKey[];
    revision?: number | bigint | undefined;

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
    revision?: number | undefined; // FIX: Add | undefined
    dpnsUsername?: string | null | undefined;
}

export interface IIdentityState {
    username: string | null;
    // Added to match useIdentity expectations
    identityId: string | null;
    displayName: string | null;

    identity: DiscoveredIdentity | null;
    balance: number | string | null | undefined;
    balanceBigInt?: bigint;
    dashBigInt?: bigint;
    publicKeys: IPublicKey[];
    revision: number | null;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnecting: boolean
    lastConnected: number | null;

    // Connection methods
    connectWithSeed: (seedPhrase: string, network: string, targetId?: string, identityIndex?: number) => Promise<ConnectionResult>;
    connectWithSingleKey: (privateKey: string, identityId: string, network: string) => Promise<ConnectionResult>;

    // Storage methods
    saveToStorage: (networkOverride?: 'mainnet' | 'testnet') => Promise<void>;
    searchUserIdentities: (network: 'mainnet' | 'testnet') => Promise<DiscoveredIdentity[]>;

    getCurrentNetwork: () => Promise<'mainnet' | 'testnet'>;

    // Optional methods called from actions
    clearStorage?: () => Promise<void>;
    fetchBalance?: () => Promise<void>;
    getGreeting?: () => string;
    loadFromStorage?: () => Promise<void>;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    identity?: IIdentity; // Kept for backward compatibility
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

// FIXME -- MIGRATE DUPLICATES HERE
// export interface KeyDerivationResult {
//     identityIndex: number;
//     keys: DerivedKey[];
//     success: boolean;
//     error?: string;
// }
// export interface DerivedKey {
//     keyIndex: number;
//     purpose: string;
//     securityLevel: string;
//     privateKey: any; // PrivateKeyWASM instance
//     publicKey: string; // hex
//     publicKeyHash: string; // hex
//     path: string; // Derivation path (e.g., m/9'/1'/0'/0/0)
// }
