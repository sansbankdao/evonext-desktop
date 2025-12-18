// src/stores/identity/actions/identity.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
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
            if (typeof primaryIdentity?.id !== 'undefined' && primaryIdentity?.id !== null) {
                const network = await getNetwork()
                const sdk = new DashPlatformSDK({
                    network: network as 'testnet' | 'mainnet'
                 })
                const [document] = await sdk.names.searchByIdentity(primaryIdentity.id)
                if (typeof document?.properties?.label !== 'undefined' && document?.properties?.label !== null) {
                    state.username = document.properties.label
                } else {
                    state.username = primaryIdentity.id
                }
            } else {
                state.username = primaryIdentity.id || null
            }
            state.identity = primaryIdentity
            state.isAuthenticated = true
            try {
                await this.queryIdentityDetails(primaryIdentity.id, primaryIdentity.identity_idx)
            } catch (error) {
                log('warn', 'Failed to query detailed identity information:', error)
            }
            await this.fetchBalance()
            await this.saveToStorage()
            return primaryIdentity
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    async queryIdentityDetails(
        this: any,
        identityId: string,
        identityIdx: number
    ): Promise<SDKIdentityDetails> {
        return ErrorBoundary.wrap(async () => {
            console.log('[QUERY DETAILS] Starting with identityId:', identityId)
            console.log('[QUERY DETAILS] identityId length:', identityId.length)
            console.log('[QUERY DETAILS] identityId sample:', identityId.substring(0, 20) + '...')
            try {
                const network = await getNetwork()
                console.log('[QUERY DETAILS] Network:', network)
                // Create new SDK instance
                const sdk = new DashPlatformSDK({
                    network: network as 'testnet' | 'mainnet'
                })
                console.log('[QUERY DETAILS] SDK instance created')
                // Test a simple SDK call first - USING CORRECT METHOD FROM DOCS
                console.log('[QUERY DETAILS] Testing SDK with node.status()...')
                try {
                    const status = await sdk.node.status()
                    console.log('[QUERY DETAILS] SDK node.status() succeeded')
                    console.log('[QUERY DETAILS] Latest block hash:', status.chain.latestBlockHash)
                    console.log('[QUERY DETAILS] Epoch:', status.time.epoch)
                } catch (statusError: any) {
                    console.error('[QUERY DETAILS] SDK node.status() failed:', statusError)
                    console.error('[QUERY DETAILS] Error message:', statusError.message)
                }
                // Now try getIdentityByIdentifier - FROM DOCS
                console.log('[QUERY DETAILS] Calling identities.getIdentityByIdentifier with:', identityId)
                const identity = await sdk.identities.getIdentityByIdentifier(identityId)
                console.log('[QUERY DETAILS] Identity retrieved successfully')
                const publicKeys = identity.getPublicKeys()
                console.log('[QUERY DETAILS] Got public keys:', publicKeys.length)
                const revision = identity.revision || BigInt(0)
                const formattedKeys = publicKeys.map((_key: any, _index: number) => ({
                    type_: _key.keyType,
                    purpose: _key.purposeNumber,
                    security_level: _key.securityLevelNumber,
                    data: _key.data,
                    dataB64: hexHash160ToBase64(_key.data),
                    read_only: _key.readOnly,
                    disabled_at: _key.disabledAt,
                }))
                await this.updateIdentityWithSdkData(identityId, identityIdx, formattedKeys, revision)
                return {
                    identity,
                    identityIdx,
                    publicKeys: formattedKeys,
                    revision: Number(revision)
                }
            } catch (error: any) {
                console.error('[QUERY DETAILS] Full error:', error)
                console.error('[QUERY DETAILS] Error name:', error.name)
                console.error('[QUERY DETAILS] Error message:', error.message)
                console.error('[QUERY DETAILS] Error stack:', error.stack)
                // Check if it's the ByteArrayAllocate error
                if (error.message && error.message.includes('ByteArrayAllocate')) {
                    console.error('[QUERY DETAILS] ByteArrayAllocate error - WebAssembly memory issue')
                    console.error('[QUERY DETAILS] This is likely a WASM loading issue in the SDK')
                }
                throw error // Re-throw to see original error
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
})
