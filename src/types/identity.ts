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
    id?: number;
}

export interface IUser {
    docId?: string;
    username: string;
    displayName: string;
    avatar: string;
    verified?: boolean;
    // Fix for Wallet screens:
    address?: string;
    identityId?: string;
    bio?: string;
    publicMessage?: string;
}

export interface DiscoveredIdentity {
    id?: string;
    identityId: string;
    identityIdx: number;
    balance: string;
    revision: number;
    publicKeys?: IPublicKey[];
    dpnsUsername?: string;
}

export interface IIdentityState {
    username: string | null;
    identityId: string | null;
    displayName: string | null;
    identity: DiscoveredIdentity | null;
    balance: string | null;
    publicKeys: IPublicKey[];
    revision: number | null;
    isAuthenticated: boolean;
    premiumAccess: boolean;
    connectionError: string | null;
    isConnecting: boolean
    lastConnected: number | null;
    // Fix for Store Actions (allows 'this.method' calls in actions)
    searchUserIdentities?: (network: string) => Promise<any>;
    fetchBalance?: () => Promise<void>;
    saveToStorage?: () => Promise<void>;
    clearStorage?: () => Promise<void>;
    loadFromStorage?: () => Promise<void>;
}

export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    error?: string;
}
