// src/types/addKey.ts

import type { IPublicKey } from '.'

export interface IdentityWithKeys {
    id?: string;
    identityIdx: number;
    revision?: bigint;
    username?: string;
    displayName?: string;
    publicKeys?: IPublicKey[];
    // Add other identity fields as needed
}

export interface AddKeyFormState {
    keyType: 'ECDSA_SECP256K1' | 'ECDSA_HASH160';
    securityLevel: 'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    confirmed: boolean;
}

export interface AddKeyProgress {
    step: 'initializing' | 'deriving' | 'signing' | 'broadcasting' | 'completed';
    message: string;
    percentage?: number;
}
