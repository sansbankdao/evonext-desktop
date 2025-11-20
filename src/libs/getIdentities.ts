// src/libs/getIdentities.ts
/* Import modules. */
import init, {
    WasmSdkBuilder,
    prefetch_trusted_quorums_mainnet,
    prefetch_trusted_quorums_testnet,
} from '@/libs/dash/wasm_sdk.js'
import getPrivateKeys from './getPrivateKeys'
import {
    get_identity_by_public_key_hash,
    get_identity_by_non_unique_public_key_hash,
} from './dash/wasm_sdk'
import { IIdentity, IPublicKey } from './types'
// @ts-ignore
import { hash160 } from '@nexajs/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@nexajs/utils'
/* Initialize constants. */
const MIN_INDEX_SEARCH = 3
const QUERY_REGISTRY = false
/* Initialize Web API endpoint. */
const WEB_API_ENDPOINT = 'https://dashqt.org/v1/dapi'
/**
 * Get Key Type
 *
 * FIXME -- ENUMERATE KEY TYPE
 */
const getKeyType = (_type: number | undefined): string => {
    return 'FIXME -- ENUMERATE KEY TYPE'
}
const decodeBase64ToHex = (_base64String: string): string | null => {
  try {
    // 1. Decode the Base64 string into a binary string
    const byteString = atob(_base64String)
    // 2. Create an array to hold the byte values
    const bytes: string[] = []
    for (let i = 0; i < byteString.length; i++) {
      // 3. Convert each character to its byte value
      const byte = byteString.charCodeAt(i)
      // 4. Convert the byte to a two-digit hex string and add to the array
      const hex = byte.toString(16).padStart(2, '0')
      bytes.push(hex)
    }
    // 5. Join the array elements to form the final hex string
    return bytes.join('')
  } catch (e) {
    console.error('Failed to decode Base64 string:', e)
    return null
  }
}
/**
 * Web API Query
 *
 * Wrapper for DAPI web service calls. Normalizes "not found" responses to empty array [] for consistency.
 * Both get_identity_by_public_key_hash and get_identity_by_non_unique_public_key_hash will now return [] for no results (status 200).
 */
const queryWebAPI = async (_method: string, _params: any[]): Promise<any> => {
    try {
        const response = await fetch(WEB_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: _method,
                params: _params,
            }),
        })
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json()
        // Normalize "not found" responses for identity lookup methods to empty array for consistency
        const isIdentityLookup = _method.includes('get_identity_by_')
        if (isIdentityLookup && (
            result === null ||
            (Array.isArray(result) && result.length === 0) ||
            (result.error && typeof result.error === 'string' && (
                result.error.includes('Resource not found.') ||
                result.error.includes('not found')
            ))
        )) {
            console.debug(`Normalized ${ _method } to empty array (no results found)`)
            return []
        }
        return result
    } catch (error) {
        console.error(`Web API query failed for ${_method}:`, error)
        return null
    }
}
/**
 * Get Identities
 *
 * Will search ALL keys and signature schemes for an Identity's
 * registered public keys.
 *
 * Option to "force" DAPI connections ONLY.
 * (default: false)
 */
export default async (
    _network: string,
    _dapiOnly: boolean = false
): Promise<IIdentity[] | null> => {
    /* Initialize Identities handler. */
    const identities: IIdentity[] = []
    for (let i = 0; i < MIN_INDEX_SEARCH; i++) {
        /* Request query by Hash160. */
        const hash160Result = await searchByHash160(_network, i, _dapiOnly)
        /* Validate result. */
        if (typeof hash160Result !== 'undefined' && hash160Result !== null) {
            identities.push({
                id: hash160Result.identityId,
                idx: i,
                publicKeys: hash160Result.regPubKeys.map((_key: IPublicKey) => {
                    return {
                        id: _key.id,
                        type: _key.type,
                        keyType: getKeyType(_key.type),
                        purpose: _key.purpose,
                        securityLevel: _key.securityLevel,
                        contractBounds: _key.contractBounds,
                        data: _key.data,
                        dataBytes: decodeBase64ToHex(_key.data),
                        readOnly: _key.readOnly,
                        disabledAt: _key.disabledAt,
                    }
                }),
            })
            break // exit for-loop
        }
        /* Request query by Secp256k1. */
        const secp256k1Result = await searchBySecp256k1(_network, i, _dapiOnly)
        /* Validate result. */
        if (typeof secp256k1Result !== 'undefined' && secp256k1Result !== null) {
            identities.push({
                id: secp256k1Result.identityId,
                idx: i,
                publicKeys: secp256k1Result.regPubKeys.map((_key: IPublicKey) => {
                    return {
                        id: _key.id,
                        type: _key.type,
                        keyType: getKeyType(_key.type),
                        purpose: _key.purpose,
                        securityLevel: _key.securityLevel,
                        contractBounds: _key.contractBounds,
                        data: _key.data,
                        dataBytes: decodeBase64ToHex(_key.data),
                        readOnly: _key.readOnly,
                        disabledAt: _key.disabledAt,
                    }
                }),
            })
            break // exit for-loop
        }
    }
    /* Validate Identities. */
    if (identities.length === 0) {
        return null
    } else {
        return identities
    }
}
/**
 * Search By Hash160
 *
 * Will search the blockchain for ECDSA_HASH160 public keys, matching
 * the primary public key.
 */
export const searchByHash160 = async (_network: string, _identityIdx: number, _dapiOnly: boolean = false) => {
    /* Initialize locals. */
    let identityId: string | undefined
    let regPubKeys: IPublicKey[] | undefined
    /* Request private keys. */
    const privateKeys = await getPrivateKeys(_network, _identityIdx, QUERY_REGISTRY)
    /* Set public key. */
    const publicKey = privateKeys.masterKey.public_key
    /* Calculate public key hash. */
    const publicKeyHash = binToHex(hash160(hexToBin(publicKey)))
    console.log('HASH160 PKH', publicKeyHash)
    let result: any
    if (_dapiOnly) {
        /* Use WebAssembly SDK for dapiOnly mode (no Web API). */
        await init()
        let sdk
        if (_network === 'mainnet') {
            /* Pre-fetch (trusted) quorums. */
            await prefetch_trusted_quorums_mainnet()
            /* Initialize SDK. */
            sdk = await WasmSdkBuilder.new_mainnet_trusted().build()
        } else {
            /* Pre-fetch (trusted) quorums. */
            await prefetch_trusted_quorums_testnet()
            /* Initialize SDK. */
            sdk = await WasmSdkBuilder.new_testnet_trusted().build()
        }
        /* Request (HASH160) Identity using WebAssembly SDK. */
        result = await get_identity_by_non_unique_public_key_hash(
            sdk,
            publicKeyHash,
            undefined
        ).catch(err => console.error(err))
    } else {
        /* Use Web API (normalized to [] for no results). */
        result = await queryWebAPI('get_identity_by_non_unique_public_key_hash', [publicKeyHash])
    }
    console.log('HASH160 RESULT FOR', publicKeyHash, result)
    /* Handle ECDSA_HASH160 signature scheme (array from both WASM/Web API). */
    if (result && Array.isArray(result) && result.length > 0) {
        /* Set Identity ID. */
        identityId = result[0].id
        /* Set registered public keys. */
        regPubKeys = result[0].publicKeys
    }
    /* If empty array or null, no identity found (consistent handling). */
    if (result === null || (Array.isArray(result) && result.length === 0)) {
        return null
    }
    /* Validate Identity. */
    if (typeof identityId === 'undefined' || identityId === null) {
        return null
    }
    /* Validate registered keys. */
    if (typeof regPubKeys === 'undefined' || regPubKeys === null || !Array.isArray(regPubKeys)) {
        return null
    }
    /* Return (registered) Identity + public keys. */
    return {
        identityId,
        regPubKeys,
    }
}
/**
 * Search By Secp256k1
 *
 * Will search the blockchain for ECDSA_SECP256k1 public keys, matching
 * the primary public key.
 */
export const searchBySecp256k1 = async (_network: string, _identityIdx: number, _dapiOnly: boolean = false) => {
    /* Initialize locals. */
    let identityId: string | undefined
    let regPubKeys: IPublicKey[] | undefined
    /* Request private keys. */
    const privateKeys = await getPrivateKeys(_network, _identityIdx, QUERY_REGISTRY)
    /* Set public key. */
    const publicKey = privateKeys.masterKey.public_key
    /* Calculate public key hash. */
    const publicKeyHash = binToHex(hash160(hexToBin(publicKey)))
    console.log('SECP256K1 PKH', publicKeyHash)
    let result: any
    if (_dapiOnly) {
        /* Use WebAssembly SDK for dapiOnly mode (no Web API). */
        await init()
        let sdk
        if (_network === 'mainnet') {
            /* Pre-fetch (trusted) quorums. */
            await prefetch_trusted_quorums_mainnet()
            /* Initialize SDK. */
            sdk = await WasmSdkBuilder.new_mainnet_trusted().build()
        } else {
            /* Pre-fetch (trusted) quorums. */
            await prefetch_trusted_quorums_testnet()
            /* Initialize SDK. */
            sdk = await WasmSdkBuilder.new_testnet_trusted().build()
        }
        /* Request (SECP256k1) Identity using WebAssembly SDK. */
        result = await get_identity_by_public_key_hash(
            sdk,
            publicKeyHash
        ).catch(err => console.error(err))
    } else {
        /* Use Web API (normalized to [] for no results). */
        result = await queryWebAPI('get_identity_by_public_key_hash', [publicKeyHash])
    }
    console.log('SECP256K1 RESULT FOR', publicKeyHash, result)
    /* Handle ECDSA_SECP256k1 signature scheme (consistent with normalized Web API or WASM). */
    if (result && typeof result === 'object' && result.toJSON) {
        /* WASM SDK result (wrapped object). */
        const jsonResult = result.toJSON()
        if (jsonResult && typeof jsonResult === 'object' && jsonResult.id) {
            identityId = jsonResult.id
            regPubKeys = jsonResult.publicKeys
        }
    } else if (result && Array.isArray(result) && result.length > 0) {
        /* Web API result as array (fallback for non-unique, but treat similarly). */
        identityId = result[0].id
        regPubKeys = result[0].publicKeys
    } else if (result && typeof result === 'object' && result.id) {
        /* Web API result as plain single object (expected for unique query). */
        identityId = result.id
        regPubKeys = result.publicKeys
    }
    /* If empty array or null, no identity found (consistent handling). */
    if (result === null || (Array.isArray(result) && result.length === 0)) {
        return null
    }
    /* Validate Identity. */
    if (typeof identityId === 'undefined' || identityId === null) {
        return null
    }
    /* Validate registered keys. */
    if (typeof regPubKeys === 'undefined' || regPubKeys === null || !Array.isArray(regPubKeys)) {
        return null
    }
    /* Return (registered) Identity + public keys. */
    return {
        identityId,
        regPubKeys,
    }
}
