// src/services/identity/types.ts

export interface DiscoveredIdentity {
    identityId: string;
    balance: string;
    revision: string;
    publicKeys: any[];
    dpnsUsername?: string | null;
}

export interface IdentityLookupResult {
    success: boolean;
    identity?: DiscoveredIdentity;
    error?: string;
    debug?: any;
}

export interface DAPIResponse {
    success: boolean;
    method: string;
    params: any[];
    network: string;
    result?: any[];
    error?: string;
}

export interface KeyDerivationResult {
    identityIndex: number;
    keys: DerivedKey[];
    success: boolean;
    error?: string;
}

export interface DerivedKey {
    keyIndex: number;
    purpose: string;
    securityLevel: string;
    privateKey: any; // PrivateKeyWASM instance
    publicKey: string; // hex
    publicKeyHash: string; // hex
    path: string; // Derivation path (e.g., m/9'/1'/0'/0/0)
}

export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet';
    maxIdentityIndex?: number;
    maxKeyIndex?: number;
}

export interface AssociatedKey {
    purpose: string;
    securityLevel: string;
    keyType: string;
    data: string;
    derivedFromInput: boolean;
}

export interface QueryTrace {
    step: number;
    identityIndex: number;
    keyIndex: number;
    path: string;
    publicKeyHash: string;
    method: 'unique' | 'non-unique';
    found: boolean;
    id?: string;
}

export interface ScanProgress {
    currentIdentityIndex: number;
    currentKeyIndex: number;
    totalIdentities: number;
    totalKeysPerIdentity: number;
    currentPublicKeyHash: string;
    currentPath: string;
    status: 'deriving' | 'scanning' | 'completed' | 'failed';
    scannedCount: number;
    foundCount: number;
}

export interface DiscoveryResult {
    success: boolean
    identities?: DiscoveredIdentity[] | null
    identity?: DiscoveredIdentity | null
    detectedKeyType?: string | null
    associatedKeys?: AssociatedKey[] | null
    error?: string
    debug?: {
        step?: string;
        count?: number;
        network?: string;
        trace?: QueryTrace[];
        progressSnapshot?: ScanProgress | undefined;
        error?: string;
    }
}
