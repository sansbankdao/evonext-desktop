// src/stores/identity/actions/identity.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import { ErrorBoundary } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import getIdentities from '@/libs/getIdentities'
import getNetwork from '@/libs/getNetwork'
import type { IIdentityState } from '@/types'
import type { SDKIdentityDetails } from '@/types'
import { hexHash160ToBase64 } from '../utils'

export const identityActions = () => ({
    async searchUserIdentities(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            log('info', 'Searching for user identities...')

            const identities = await getIdentities()
            log('info', 'Identities found:', identities)

            if (!identities || identities.length === 0) {
                log('warn', 'No identities found for the provided credentials.')
                return null
            }

            // FIXME: Allow selection from MULTIPLE identities.
            const primaryIdentity = identities[0]
            console.log('[DEBUG] Primary identity ID:', primaryIdentity?.id)
            console.log('[DEBUG] Primary identity object:', primaryIdentity)

            // Create SDK instance ONCE to avoid WebAssembly memory issues
            const network = await getNetwork()
            console.log('[DEBUG] Network:', network)

            const sdk = new DashPlatformSDK({
                network: network as 'testnet' | 'mainnet'
            })
            console.log('[DEBUG] SDK instance created')

            // DEBUGGING DPNS LOOKUP - Use DAPI instead of broken SDK method
            if (typeof primaryIdentity?.id !== 'undefined' && primaryIdentity?.id !== null) {
                console.log('[DEBUG] Getting DPNS username from DAPI for:', primaryIdentity.id)
                try {
                    const dpnsUsername = await this.getDpnsUsername(primaryIdentity.id)
                    if (dpnsUsername) {
                        state.username = dpnsUsername
                        console.log('[DEBUG] Set username from DPNS:', state.username)
                    } else {
                        state.username = primaryIdentity.id
                        console.log('[DEBUG] No DPNS name found, using identity ID')
                    }
                } catch (dpnsError: any) {
                    console.error('[DEBUG] DPNS lookup failed:', dpnsError)
                    console.error('[DEBUG] Error message:', dpnsError.message)
                    state.username = primaryIdentity.id
                    console.log('[DEBUG] Using identity ID due to DPNS error')
                }
            } else {
                state.username = primaryIdentity.id || null
                console.log('[DEBUG] No identity ID available')
            }

            state.identity = primaryIdentity
            state.isAuthenticated = true

            // Get detailed identity info using the SAME SDK instance
            console.log('[DEBUG] Calling queryIdentityDetails...')
            try {
                await this.queryIdentityDetails(primaryIdentity.id, primaryIdentity.identity_idx, sdk)
            } catch (error: any) {
                console.error('[DEBUG] queryIdentityDetails failed:', error)
                log('warn', 'Failed to query detailed identity information:', error?.message || error)
            }

            await this.fetchBalance()
            await this.saveToStorage()
            return primaryIdentity
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    async getDpnsUsername(identityId: string): Promise<string | null> {
        return ErrorBoundary.wrap(async () => {
            try {
                const network = await getNetwork()
                const body = JSON.stringify({
                    method: 'get_dpns_username',
                    params: [identityId],
                    network,
                })

                console.log('[DPNS] Fetching username for identity:', identityId)
                const response = await fetch(getDapiEndpoint(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body,
                })

                console.log('[DPNS] Response status:', response.status)
                if (!response.ok) {
                    const errorText = await response.text()
                    console.log('[DPNS] Error response:', errorText)
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const result = await response.json()
                console.log('[DPNS] Full response:', result)
                console.log('[DPNS] Response keys:', Object.keys(result))
                console.log('[DPNS] result.success:', result.success)
                console.log('[DPNS] result.result:', result.result)

                if (result) {
                    // Check different possible response formats
                    if (typeof result === 'string') {
                        console.log('[DPNS] Got string response:', result)
                        return result
                    } else if (result.success && result.result) {
                        console.log('[DPNS] Got result field:', result.result)
                        return result.result
                    } else if (result.success && result.data) {
                        console.log('[DPNS] Got data field:', result.data)
                        return result.data
                    } else if (result.success && result.username) {
                        console.log('[DPNS] Got username field:', result.username)
                        return result.username
                    } else if (result.result && typeof result.result === 'string') {
                        console.log('[DPNS] Got result without success flag:', result.result)
                        return result.result
                    } else if (typeof result === 'object' && result[0]) {
                        // Handle array response
                        console.log('[DPNS] Got array response first item:', result[0])
                        return result[0]
                    }
                }

                console.log('[DPNS] No username found in response')
                return null
            } catch (error) {
                console.error('[DPNS] Failed to get username:', error)
                return null
            }
        }, 'GET_DPNS_USERNAME_FAILED')
    },

    async queryIdentityDetails(
        this: any,
        identityId: string,
        identityIdx: number,
        sdk?: DashPlatformSDK // Accept optional SDK parameter
    ): Promise<SDKIdentityDetails> {
        return ErrorBoundary.wrap(async () => {
            console.log('[QUERY DETAILS] Starting with identityId:', identityId)

            try {
                let sdkInstance = sdk
                if (!sdkInstance) {
                    const network = await getNetwork()
                    console.log('[QUERY DETAILS] Creating new SDK instance')
                    sdkInstance = new DashPlatformSDK({
                        network: network as 'testnet' | 'mainnet'
                    })
                } else {
                    console.log('[QUERY DETAILS] Using provided SDK instance')
                }

                // Test SDK connection
                console.log('[QUERY DETAILS] Testing SDK connection...')
                try {
                    const status = await sdkInstance.node.status()
                    console.log('[QUERY DETAILS] SDK connection test passed')
                } catch (statusError: any) {
                    console.error('[QUERY DETAILS] SDK connection test failed:', statusError?.message || statusError)
                }

                // Get identity details
                console.log('[QUERY DETAILS] Calling getIdentityByIdentifier...')
                const identity = await sdkInstance.identities.getIdentityByIdentifier(identityId)
                console.log('[QUERY DETAILS] Identity retrieved successfully')

                const publicKeys = identity.getPublicKeys()
                console.log('[QUERY DETAILS] Got public keys:', publicKeys.length)
                console.log('[QUERY DETAILS] First key example:', publicKeys[0] ? {
                    keyId: publicKeys[0].keyId,
                    keyType: publicKeys[0].keyType,
                    purpose: publicKeys[0].purpose,
                    purposeNumber: publicKeys[0].purposeNumber,
                    securityLevel: publicKeys[0].securityLevel,
                    securityLevelNumber: publicKeys[0].securityLevelNumber,
                    data: publicKeys[0].data?.substring(0, 20) + '...',
                    readOnly: publicKeys[0].readOnly,
                    disabledAt: publicKeys[0].disabledAt
                } : 'No keys')

                const revision = identity.revision || BigInt(0)
                const formattedKeys = publicKeys.map((_key: any, index: number) => ({
                    id: _key.keyId || _key.id || 0,
                    type_: _key.keyType,
                    purpose: _key.purposeNumber,
                    security_level: _key.securityLevelNumber,
                    data: _key.data,
                    dataB64: hexHash160ToBase64(_key.data),
                    read_only: _key.readOnly,
                    disabled_at: _key.disabledAt,
                }))

                // Call update method
                await this.updateIdentityWithSdkData(identityId, identityIdx, formattedKeys, revision)

                return {
                    identity,
                    identityIdx,
                    publicKeys: formattedKeys,
                    revision: Number(revision)
                }
            } catch (error: any) {
                console.error('[QUERY DETAILS] Error in queryIdentityDetails:')
                console.error('[QUERY DETAILS] Error type:', typeof error)
                console.error('[QUERY DETAILS] Error message:', error?.message || error)
                console.error('[QUERY DETAILS] Error stack:', error?.stack)

                if (error?.message && error.message.includes('ByteArrayAllocate')) {
                    console.error('[QUERY DETAILS] WebAssembly memory allocation error!')
                }

                // Return minimal data instead of throwing
                return {
                    identity: null,
                    identityIdx,
                    publicKeys: [],
                    revision: 0
                }
            }
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    },

    async getPublicKeys(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            if (state.publicKeys.length > 0) {
                return state.publicKeys
            }
            if (state.identity?.id) {
                const details = await this.queryIdentityDetails(
                    state.identity.id, state.identity.identity_idx)
                return details.publicKeys || []
            }
            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
    },

    updateIdentityWithSdkData(
        this: any,
        identityId: string,
        identityIdx: number,
        publicKeys: any[],
        revision: bigint
    ): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            console.log('[UPDATE SDK DATA] Updating with:', {
                identityId,
                identityIdx,
                publicKeysCount: publicKeys.length,
                revision: revision.toString()
            })

            const state = this as IIdentityState

            // Update public keys if we have them
            if (publicKeys && publicKeys.length > 0) {
                state.publicKeys = publicKeys.map(key => ({
                    id: key.id || 0,
                    type_: key.type_ || 'ECDSA_SECP256K1',
                    purpose: key.purpose || 0,
                    security_level: key.security_level || 3,
                    data: key.data || '',
                    data_bytes: key.dataB64 || '',
                    read_only: key.read_only || false,
                    disabled_at: key.disabled_at || null
                }))
                console.log('[UPDATE SDK DATA] Updated public keys count:', state.publicKeys.length)
            }

            // Update revision
            if (revision) {
                state.revision = Number(revision)
                console.log('[UPDATE SDK DATA] Updated revision:', state.revision)
            }

            console.log('[UPDATE SDK DATA] Update complete')
        }, 'UPDATE_IDENTITY_WITH_SDK_DATA_FAILED')
    }
})
