// src/stores/identity/types.ts

/* Interface definitions. */
export interface IExtendedPublicKey {
    keyType: string
    dataBytes: string
}

export interface State {
    username: string | null
    identity: any | null
    balance: string | null                    // Raw satoshis string from API
    balanceBigInt?: bigint                    // ✅ NEW: Computed satoshis BigInt
    dashBigInt?: bigint                       // ✅ NEW: Computed DASH BigInt
    publicKeys: IdentityPublicKey[]
    revision: number | null
    isAuthenticated: boolean
    isConnecting: boolean
    connectionError: string | null
    premiumAccess: boolean
    lastConnected: string | null
}

export interface IdentityData {
    username: string
    identity_id: string
    balance: string | null
    is_authenticated: boolean
    public_keys: IdentityPublicKey[] | null
    revision: number | null
    created_at: string | null
    public_key_ids: number[] | null
}

export interface IdentityPublicKey {
    id: number
    type_: string
    purpose: number
    security_level: number
    read_only: boolean
    disabled_at: string | null
}

export interface IIdentity {
}
