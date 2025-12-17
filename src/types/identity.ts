// src/types/identity.ts
/* Base interface definitions. */
export interface IExtendedPublicKey {
    keyType: string
    dataBytes: string
}
export interface IIdentity {
    identity_idx: number
    publicKeys: IPublicKey[]
}
export interface IIdentityData {
    username: string
    identity_id: string
    identity_idx: number
    balance: string | null
    is_authenticated: boolean
    public_keys: IIdentityPublicKey[] | null
    revision: number | null
    created_at: string | null
    public_key_ids: number[] | null
}
export interface IIdentityPublicKey {
    type_: string
    purpose: number
    security_level: numberstring
    read_only: boolean
    disabled_at: string | null
}
export interface IIdentityState {
    username: string | null
    identity: IIdentity | null
    balance: string | null
    balanceBigInt?: bigint
    dashBigInt?: bigint
    publicKeys: IIdentityPublicKey[]
    revision: number | null
    isAuthenticated: boolean
    isConnecting: boolean
    connectionError: string | null
    premiumAccess: boolean
    lastConnected: string | null
}
// Additional types for identity operations
export interface ConnectionResult {
    success: boolean
    identity?: IIdentity
    error?: string
}
export interface BalanceResult {
    satoshis: bigint
    dash: bigint
    formatted: string
    raw: string
} | null
export interface SDKIdentityDetails {
    identity: any // Keep as any since it's from SDK
    identityIdx: number
    publicKeys: any[] // Keep as any since it's from SDK
    revision: number
}
export interface StorageKeys {
    mnemonic: string
    privateKeys: string
    identityData: string
    license: string
    settings: string
}
export interface KeyGenerationResult {
    masterKey: any // Keep as any since it's from SDK
    authCritical: any
    authHigh: any
    transferKey: any
    encryptionKey: any
}
export interface IdentitySearchResult {
    username?: string
    balance?: string
    publicKeys?: IIdentityPublicKey[]
}
