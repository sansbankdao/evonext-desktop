// src/libs/getIdentities.ts

/* Import modules. */
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'

import getNetwork from './getNetwork'
import getPrivateKeys from './getPrivateKeys'
import { IIdentity, IPublicKey } from '@/types'

/* Initialize constants. */
const MIN_INDEX_SEARCH = 3
const QUERY_REGISTRY = false
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
    /* Request network. */
    const network = await getNetwork()

    try {
        const response = await fetch(WEB_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: _method,
                params: _params,
                network,
            }),
        })
console.log({
    method: _method,
    params: _params,
    network,
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
export default async (): Promise<IIdentity[] | null> => {
    /* Initialize Identities handler. */
    const identities: IIdentity[] = []

    for (let i = 0; i < MIN_INDEX_SEARCH; i++) {
        /* Request query by Hash160. */
        const hash160Result = await searchByHash160(i)
console.log('***HASH160 RESULT', hash160Result)

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
        const secp256k1Result = await searchBySecp256k1(i)

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
export const searchByHash160 = async (_identityIdx: number) => {
    /* Initialize locals. */
    let identityId: string | undefined
    let regPubKeys: IPublicKey[] | undefined

    /* Request private keys. */
    const privateKeys = await getPrivateKeys(_identityIdx, QUERY_REGISTRY)
console.log('PRIVATE KEYS (searchByHash160)', privateKeys)

    /* Set public key. */
    const publicKey = privateKeys.masterKey.getPublicKey()
console.log('PUBLIC KEY (searchByHash160)', binToHex(publicKey.bytes()))

    /* Calculate public key hash. */
    const publicKeyHash = binToHex(hash160(publicKey.bytes()))
    console.log('HASH160 PKH', publicKeyHash)

    let result: any

    /* Use Web API (normalized to [] for no results). */
    result = await queryWebAPI('get_identity_by_non_unique_public_key_hash', [publicKeyHash])

    /* Handle ECDSA_HASH160 signature scheme (array from both WASM/Web API). */
    if (result && typeof result === 'object' && result.result.identityId) {
        /* Web API result as plain single object (expected for unique query). */
        identityId = result.result.identityId
        regPubKeys = result.result.publicKeys
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
export const searchBySecp256k1 = async (_identityIdx: number) => {
    /* Initialize locals. */
    let identityId: string | undefined
    let regPubKeys: IPublicKey[] | undefined

    /* Request private keys. */
    const privateKeys = await getPrivateKeys(_identityIdx, QUERY_REGISTRY)
console.log('DEBUG-1', privateKeys)
    /* Set public key. */
    const publicKey = privateKeys.masterKey.getPublicKey()
console.log('DEBUG-2', publicKey)

    /* Calculate public key hash. */
    const publicKeyHash = binToHex(hash160(publicKey.bytes()))
console.log('DEBUG-3', publicKeyHash)
    console.log('SECP256K1 PKH', publicKeyHash)
    let result: any

    /* Use Web API (normalized to [] for no results). */
    result = await queryWebAPI('get_identity_by_public_key_hash', [publicKeyHash])
console.log('DEBUG-4', result)
    /* Handle ECDSA_SECP256k1 signature scheme (consistent with normalized Web API or WASM). */
    // if (result && typeof result === 'object' && result.toJSON) {
    if (result && typeof result === 'object' && result.result.identityId) {
        /* Web API result as plain single object (expected for unique query). */
        identityId = result.result.identityId
        regPubKeys = result.result.publicKeys
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
