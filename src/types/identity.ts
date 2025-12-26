// src/types/identity.ts

export interface IPublicKey {
    type: number;
    keyType: string;
    purpose: number;
    securityLevel: number;
    contractBounds: any; // You might want to specify a proper typestring
    data: string;
    dataBytes: string | null;
    readOnly: boolean;
    disabledAt: string | null;
}

export interface IUser {
    docId?: string;
    username: string;
    displayName: string;
    avatar: string;
    avatarId?: string;
    avatarData?: string;
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
    identity_idx: number;
    publicKeys: IPublicKey[];
    avatarUrl?: string;
    avatarHash?: string;
    avatarFingerprint?: string;
    displayName?: string;
    publicMessage?: string;
}

export interface IIdentityData {
    username: string;
    identity_id: string;
    identity_idx: number;
    balance: string | null;
    is_authenticated: boolean;
    public_keys: IIdentityPublicKey[] | null;
    revision: number | null;
    created_at: string | null;
    public_key_ids: number[] | null;
}

export interface IIdentityPublicKey {
    id: number;
    type_: string;
    purpose: number;
    security_level: number;
    data: string;
    data_bytes: string;
    read_only: boolean;
    disabled_at: string | null;
}

export interface IIdentityState {
    username: string | null;
    identity: IIdentity | null;
    balance: string | null;
    balanceBigInt?: bigint;
    dashBigInt?: bigint;
    publicKeys: IIdentityPublicKey[];
    revision: number | null;
    isAuthenticated: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    premiumAccess: boolean;
    lastConnected: string | null;
}

// Additional types for identity operations
export interface ConnectionResult {
    success: boolean;
    identity?: IIdentity;
    error?: string;
}

export interface BalanceResult {
    satoshis: bigint;
    dash: bigint;
    formatted: string;
    raw: string;
}

export interface SDKIdentityDetails {
    identity: any; // Keep as any since it's from SDK
    identityIdx: number;
    publicKeys: any[]; // Keep as any since it's from SDK
    revision: number;
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

export interface IdentitySearchResult {
    username?: string;
    balance?: string;
    publicKeys?: IIdentityPublicKey[];
}
