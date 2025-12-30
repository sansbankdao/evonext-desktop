// src/services/identity/types.ts

export interface DiscoveredIdentity {
    identityId: string
    balance: string
    revision: string
    publicKeys: any[]
    dpnsUsername?: string | null
}
export interface IdentityLookupResult {
    success: boolean
    identity?: DiscoveredIdentity
    error?: string
    debug?: any
}
export interface DAPIResponse {
    success: boolean
    method: string
    params: any[]
    network: string
    result?: {
        identityId?: string
        id?: string
        publicKeyHash?: string
        balance?: string | number
        revision?: string | number
        publicKeys?: any[]
        dpnsUsername?: string
        username?: string
    }
    error?: string
}
export interface KeyDerivationResult {
    identityIndex: number
    keys: DerivedKey[]
    success: boolean
    error?: string
}
export interface DerivedKey {
    keyIndex: number
    purpose: string
    securityLevel: string
    privateKey: any // PrivateKeyWASM instance
    publicKey: string // hex
    publicKeyHash: string // hex
}
export interface DiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex?: number
    maxKeyIndex?: number
}
export interface DiscoveryResult {
    success: boolean
    identities?: DiscoveredIdentity[]
    identity?: DiscoveredIdentity
    detectedKeyType?: string
    associatedKeys?: Array<{
        purpose: string
        securityLevel: string
        keyType: string
        data: string
        derivedFromInput: boolean
    }>
    error?: string
    debug?: any
}
