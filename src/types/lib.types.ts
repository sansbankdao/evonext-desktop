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

export interface IdentityTransfer {
    amount: string; // BigInt as string
    sender: string | null;
    recipient: string;
    timestamp: string;
    txHash: string;
    type: string;
    blockHash: string;
    gasUsed: number;
}

export interface APIError {
    error: string;
    message?: string;
    code?: number;
}
