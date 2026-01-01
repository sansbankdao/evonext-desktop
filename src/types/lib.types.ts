// src/types/lib.types.ts

import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { PrivateKeyWASM } from 'pshenmic-dpp'

export interface DashPlatformSDKInstance extends DashPlatformSDK {
    // Add any missing methods here
}

export interface PrivateKeyWASMInstance extends PrivateKeyWASM {
    WIF(): string;
    hex(): string;
    // Add other methods you use
}

export interface SDKKeyPair {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}

export interface DerivationResult {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}

export interface DerivationDebugInfo {
    error?: string;
    input?: string;
    reason?: string;
    hash?: string;
    format?: KeyType;
    description?: string;
    step?: string;
    [key: string]: any;
}

export interface KeyHashDerivationResult {
    success?: boolean;
    hashes: string[];
    keyType: KeyType | string;
    debug?: DerivationDebugInfo;
}

// Fix for getPrivateKeys.ts
export type PrivateKeys = {
    masterKey: PrivateKeyWASMInstance;
    authCritical: PrivateKeyWASMInstance;
    authHigh: PrivateKeyWASMInstance;
    transferKey: PrivateKeyWASMInstance;
    encryptionKey: PrivateKeyWASMInstance;
}

export interface PlatformHttpResponse<T> {
    resultSet: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    }
}

export interface APIError {
    error: string;
    message?: string;
    code?: number;
}

export interface IdentityLookupResponse {
    success: boolean;
    identityId?: string;
    result?: {
        identityId: string;
        balance: string;
        revision: number;
        publicKeys?: Array<{
            purpose: string;
            securityLevel: string;
            keyType: string;
            data: string;
            dataB64: string;
            readOnly: boolean;
        }>;
        publicKeyHash: string;
        dpnsUsername?: string;
    };
    [key: string]: any;
}

export interface TauriCommandResponse<T = any> {
    success: boolean;
    error?: string;
    result?: T;
    // Allow flexible response shapes
    [key: string]: any;
}
