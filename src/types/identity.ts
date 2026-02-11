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
    security_level?: number;
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
export interface ConnectionResult {
    success: boolean;
    identityId?: string;
    error?: string;
}
export interface IIdentityActions {
    saveDiscoveredIdentities: (
        identities: DiscoveredIdentity[],
        network: string,
        keyType: string
    ) => Promise<any>;
    connectWithSingleKey: (
        privateKey: string,
        identityId: string,
        network: string,
        preloaded?: any
    ) => Promise<any>;
    saveKeys: (
        network: string,
        identityId: string,
        keys: any[]
    ) => Promise<any>;
    loadFromStorage: () => Promise<void>;
    saveToStorage: () => Promise<void>;
    clearStorage: () => Promise<void>;
    getCurrentNetwork: () => Promise<string>;
    clearConnectionError: () => void;
    saveMnemonicToStore: (
        network: string,
        phrase: string
    ) => Promise<void>;
    saveIdentityDataToStore: (
        network: string,
        identityId: string,any
    ) => Promise<void>;
}
export interface IIdentityState extends IIdentityActions {
    identityId: string | null;
    identityIdx: number;
    username: string | null;
    displayName: string | null;
    identity: IIdentity | null;
    balance: string;
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
    error?: string;
    debug?: any;
}
export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet';
    maxIdentityIndex?: number;
}
export type RustDiscoveredIdentitiesStore = Record<string, DiscoveredIdentity>;
export type PrivateKeyEntry = IPrivateKeyEntry;
export type SDKIdentityDetails = any;
export type ScanProgress = DiscoveryProgress;
export type AssociatedKey = any;
