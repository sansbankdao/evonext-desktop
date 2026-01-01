// src/types/identity.ts

export type PurposeType = 0 | 1 | 2 | 3 // 0=AUTHENTICATION, 1=ENCRYPTION, 2=DECRYPTION, 3=TRANSFER
export type SecurityLevelType = 0 | 1 | 2 | 3 | 4 // 0=MASTER, 1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW

export interface IPublicKey {
    type: number;
    keyType: string;
    purpose: PurposeType;
    securityLevel: SecurityLevelType;
    contractBounds: any;
    data: string;
    dataBytes: string | null;
    readOnly: boolean;
    disabledAt: string | null;
    id?: number; // Added to support UI indexing
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
    identityId: string;
    identityIdx: number;
    balance: string;
    revision: number;
    publicKeys?: Array<{
        purpose: number | string;
        securityLevel: number | string;
        keyType: string;
        dataB64?: string;
        data?: string;
        readOnly: boolean;
    }>;
    dpnsUsername?: string;
}

export interface IIdentityState {
    username: string | null;
    // Added these two to match useIdentity.ts expectations:
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
    // Optional methods
    getGreeting?: () => string;
    saveToStorage?: () => Promise<void>;
    clearStorage?: () => Promise<void>;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string; // Changed from identity object to ID string for lighter passing
    error?: string;
}

// Keep other types as they were...
export interface IUser {
    docId?: string;
    username: string;
    displayName: string;
    avatar: string;
    verified?: boolean;
}
