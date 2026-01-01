// src/types/identity.ts

export interface IPublicKey {
    type: number;
    keyType: string;
    purpose: number;
    securityLevel: number;
    contractBounds: any; // FIXME Specify a proper type.
    data: string;
    dataBytes: string | null;
    readOnly: boolean;
    disabledAt: string | null;
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
    docId?: string;         // Document that stores the user's profile
    username: string;       // From DPNS - not stored in profile document
    displayName: string;
    name?: string;          // TBD (from IUser2)
    identityId?: string;    // TBD (from IUser2)
    address?: string;       // TBD (from IUser2)
    avatar: string;         // URL for display
    avatarId?: string;      // Reference to avatar document (32-byte array as string)
    avatarData?: string;    // The encoded avatar string (16-128 chars)
    bio?: string;
    followers: number;
    following: number;
    verified?: boolean;
    joinedAt: Date;
    revision: number;
}

/* Base interface definitions. */
export interface IExtendedPublicKey {
    keyType: string;
    dataBytes: string;
}

export interface IIdentity {
    id?: string;
    identityIdx: number;
    publicKeys: IPublicKey[];
    avatarUrl?: string;
    avatarHash?: string;
    avatarFingerprint?: string;
    displayName?: string;
    publicMessage?: string;
}

export interface IIdentityData {
    username: string;
    identityId: string;
    identityIdx: number;
    balance: string | null;
    isAuthenticated: boolean;
    publicKeys: IPublicKey[] | null;
    revision: number | null;
    createdAt: string | null;
    publicKeyIds: number[] | null;
}

// export interface IIdentityPublicKey {
//     id: number;
//     type_: string;
//     purpose: number;
//     security_level: number;
//     data: string;
//     data_bytes: string;
//     read_only: boolean;
//     disabled_at: string | null;
// }

// export interface IIdentityState {
//     username: string | null;
//     identity: IIdentity | null;
//     balance: string | null;
//     balanceBigInt?: bigint;
//     dashBigInt?: bigint;
//     publicKeys: IIdentityPublicKey[];
//     revision: number | null;
//     isAuthenticated: boolean;
//     isConnecting: boolean;
//     connectionError: string | null;
//     premiumAccess: boolean;
//     lastConnected: string | null;
// }
// src/types/index.ts - Update your interface
export interface IIdentityState {
    username: string | null;
    identity: DiscoveredIdentity | null;
    balance: string | null;
    balanceBigInt?: bigint;
    dashBigInt?: bigint;
    publicKeys: IPublicKey[];
    revision: string | null;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnecting: boolean
    lastConnected: number | null;

    // Optional: Add methods that will be called from actions
    getGreeting?: () => string;
    searchUserIdentities?: (network: string) => Promise<DiscoveredIdentity[]>;
    connectWithSeed?: (seedPhrase: string, network: string) => Promise<ConnectionResult>;
    connectWithSingleKey?: (privateKey: string, identityId: string, network: string) => Promise<ConnectionResult>;
    saveToStorage?: () => Promise<void>;
    clearStorage?: () => Promise<void>;
}

// Additional types for identity operations
export interface ConnectionResult {
    success: boolean;
    identity?: IIdentity;
    error?: string;
}

export interface SDKIdentityDetails {
    identity: any; // Keep as any since it's from SDK
    identityIdx: number;
    publicKeys: any[]; // Keep as any since it's from SDK
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
    masterKey: any; // Keep as any since it's from SDK
    authCritical: any;
    authHigh: any;
    transferKey: any;
    encryptionKey: any;
}

export interface DiscoveredIdentity {
    identityId: string;
    identityIdx: number;
    balance: string;
    revision: string;
    publicKeys?: Array<{
        purpose: string;
        securityLevel: string;
        keyType: string;
        dataB64: string;
        data?: string;
        readOnly: boolean;
    }>;
    dpnsUsername?: string;
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
