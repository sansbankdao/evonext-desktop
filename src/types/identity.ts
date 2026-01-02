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
    id?: string;
    identityId?: string;
    identityIdx: number;
    balance?: string;
    publicKeys: IPublicKey[];
    username?: string;
    avatarUrl?: string;
    avatarHash?: string;
    avatarFingerprint?: string;
    displayName?: string;
    publicMessage?: string;
    revision?: number;
}

export interface IIdentityData {
    username: string;
    identityId: string;
    identityIdx: number;
    balance: string | null;
    isAuthenticated: boolean;
    publicKeys: IPublicKey[] | null;
    revision: number | null;
    createdAt: number | null;
    publicKeyIds: number[] | null;
}

export interface DiscoveredIdentity {
    id?: string;
    identityId?: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    balance?: number | string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    revision?: number;
    dpnsUsername?: string;
}

export interface IIdentityState {
    username: string | null;
    // Added to match useIdentity expectations
    identityId: string | null;
    displayName: string | null;

    identity: DiscoveredIdentity | null;
    balance: string | null;
    balanceBigInt?: bigint;
    dashBigInt?: bigint;
    publicKeys: IPublicKey[];
    revision: number | null;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnecting: boolean
    lastConnected: number | null;

    // Optional methods called from actions
    getGreeting?: () => string;
    searchUserIdentities?: (network: string) => Promise<any>;
    connectWithSeed?: (seedPhrase: string, network: string) => Promise<ConnectionResult>;
    connectWithSingleKey?: (privateKey: string, identityId: string, network: string) => Promise<ConnectionResult>;
    saveToStorage?: () => Promise<void>;
    clearStorage?: () => Promise<void>;
    loadFromStorage?: () => Promise<void>;
    fetchBalance?: () => Promise<void>;
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
