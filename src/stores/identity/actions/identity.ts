// src/stores/identity/actions/identity.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import { ErrorBoundary } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import getIdentities from '@/libs/getIdentities'
import { useNetwork } from '@/composables'
import type { IIdentityState, SDKIdentityDetails, IIdentity, IPublicKey } from '@/types'
import { hexHash160ToBase64 } from '../utils'

export const identityActions = () => ({
    async searchUserIdentities(this: any) {
        const store = this as IIdentityState
        return ErrorBoundary.wrap(async () => {
            log('info', 'Searching for user identities...')
            const identities = await getIdentities()
            log('info', 'Identities found:', identities)
            if (!identities || identities.length === 0) {
                log('warn', 'No identities found for the provided credentials.')
                return null
            }
            // FIXME: Allow selection from MULTIPLE identities.
            const primaryIdentity = identities[0]
            log('debug', 'Primary identity ID:', primaryIdentity?.id)
            log('debug', 'Primary identity object:', primaryIdentity)
            // Create SDK instance ONCE to avoid WebAssembly memory issues
            const { ensure } = useNetwork()
            const network = await ensure()
            const sdk = new DashPlatformSDK({
                network: network as 'testnet' | 'mainnet'
            })
            log('debug', 'SDK instance created')
            // DEBUGGING DPNS LOOKUP - Use DAPI instead of broken SDK method
            if (typeof primaryIdentity?.id !== 'undefined' && primaryIdentity?.id !== null) {
                log('debug', 'Getting DPNS username from DAPI for:', primaryIdentity.id)
                try {
                    const dpnsUsername = await this.getDpnsUsername(primaryIdentity.id)
                    if (dpnsUsername) {
                        store.username = dpnsUsername
                        log('debug', 'Set username from DPNS:', store.username)
                    } else {
                        store.username = primaryIdentity.id
                        log('debug', 'No DPNS name found, using identity ID')
                    }
                } catch (dpnsError: any) {
                    log('error', 'DPNS lookup failed:', dpnsError)
                    store.username = primaryIdentity.id
                    log('debug', 'Using identity ID due to DPNS error')
                }
            } else {
                store.username = primaryIdentity?.id || null
                log('debug', 'No identity ID available')
            }
            store.identity = primaryIdentity || null
            store.isAuthenticated = true
            // Get detailed identity info using the SAME SDK instance
            log('debug', 'Calling queryIdentityDetails...')
            try {
                await this.queryIdentityDetails(
                    primaryIdentity.id,
                    primaryIdentity.identityIdx || 0,
                    sdk
                )
            } catch (error: any) {
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
                const { ensure } = useNetwork()
                const network = await ensure()
                const body = JSON.stringify({
                    method: 'get_dpns_username',
                    params: [identityId],
                    network,
                })
                log('info', 'Fetching username for identity:', identityId)
                const response = await fetch(getDapiEndpoint(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body,
                })
                log('debug', 'Response status:', response.status)
                if (!response.ok) {
                    const errorText = await response.text()
                    log('error', 'Error response:', errorText)
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const result = await response.json()
                log('debug', 'Full response:', result)
                if (result) {
                    // Check different possible response formats
                    if (typeof result === 'string') {
                        return result
                    } else if (result.success && result.result) {
                        return result.result
                    } else if (result.success && result.data) {
                        return result.data
                    } else if (result.success && result.username) {
                        return result.username
                    } else if (result.result && typeof result.result === 'string') {
                        return result.result
                    } else if (typeof result === 'object' && result[0]) {
                        // Handle array response
                        return result[0]
                    }
                }
                log('info', 'No username found in response')
                return null
            } catch (error) {
                log('error', 'Failed to get username:', error)
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
            log('debug', 'Starting queryIdentityDetails with identityId:', identityId)
            try {
                let sdkInstance = sdk
                if (!sdkInstance) {
                    const { ensure } = useNetwork()
                    const network = await ensure()
                    log('debug', 'Creating new SDK instance')
                    sdkInstance = new DashPlatformSDK({
                        network: network as 'testnet' | 'mainnet'
                    })
                } else {
                    log('debug', 'Using provided SDK instance')
                }
                // Test SDK connection
                log('debug', 'Testing SDK connection...')
                try {
                    await sdkInstance.node.status()
                    log('debug', 'SDK connection test passed')
                } catch (statusError: any) {
                    log('error', 'SDK connection test failed:', statusError?.message || statusError)
                }
                // Get identity details
                log('debug', 'Calling getIdentityByIdentifier...')
                const identity = await sdkInstance.identities.getIdentityByIdentifier(identityId)
                log('debug', 'Identity retrieved successfully')
                const publicKeys = identity.getPublicKeys()
                log('debug', `Got ${publicKeys.length} public keys`)
                const revision = identity.revision || BigInt(0)
                const formattedKeys = publicKeys.map((key: any, index: number) => ({
                    type: key.keyType || 'ECDSA_SECP256K1',
                    purpose: key.purposeNumber || 0,
                    securityLevel: key.securityLevelNumber || 3,
                    data: key.data || '',
                    dataB64: key.data ? hexHash160ToBase64(key.data) : '',
                    readOnly: key.readOnly || false,
                    disabledAt: key.disabledAt || null,
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
                log('error', 'Error in queryIdentityDetails:', error)
                if (error?.message && error.message.includes('ByteArrayAllocate')) {
                    log('error', 'WebAssembly memory allocation error!')
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
    async getPublicKeys(this: any): Promise<IPublicKey[]> {
        const store = this as IIdentityState
        return ErrorBoundary.wrap(async () => {
            if (store.publicKeys.length > 0) {
                return store.publicKeys
            }
            if (store.identity?.id) {
                const details = await this.queryIdentityDetails(
                    store.identity.id,
                    store.identity.identityIdx || 0
                )
                return details.publicKeys || []
            }
            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
    },
    async updateIdentityWithSdkData(
        this: any,
        identityId: string,
        identityIdx: number,
        publicKeys: any[],
        revision: bigint
    ): Promise<void> {
        const store = this as IIdentityState
        return ErrorBoundary.wrap(async () => {
            log('debug', 'Updating identity with SDK data:', {
                identityId,
                identityIdx,
                publicKeysCount: publicKeys.length,
                revision: revision.toString()
            })
            // Update public keys if we have them
            if (publicKeys && publicKeys.length > 0) {
                store.publicKeys = publicKeys.map(key => ({
                    type: key.type || key.type_ || 'ECDSA_SECP256K1',
                    purpose: key.purpose || 0,
                    securityLevel: key.securityLevel || key.security_level || 3,
                    data: key.data || '',
                    dataB64: key.dataB64 || (key.data ? hexHash160ToBase64(key.data) : ''),
                    readOnly: key.readOnly || key.read_only || false,
                    disabledAt: key.disabledAt || key.disabled_at || null,
                }))
                log('debug', `Updated ${store.publicKeys.length} public keys`)
            }
            // Update revision
            if (revision) {
                store.revision = Number(revision)
                log('debug', 'Updated revision:', store.revision)
            }
            log('debug', 'Update complete')
        }, 'UPDATE_IDENTITY_WITH_SDK_DATA_FAILED')
    }
})
