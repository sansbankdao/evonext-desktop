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
                const sdk = new DashPlatformSDK({ network })
                const [document] = await sdk.names.searchByIdentity(primaryIdentity.id)
                if (typeof document?.properties?.label !== 'undefined' && document?.properties?.label !== null) {
                    state.username = document.properties.label
                } else {
                    state.username = primaryIdentity.id
                }
            } else {
                state.username = primaryIdentity.id
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
            const state = this as IIdentityState
            const network = await getNetwork()
            log('info', 'Querying identity details for:', identityId)
            const sdk = new DashPlatformSDK({ network })
            const identity = await sdk.identities.getIdentityByIdentifier(identityId)
            log('info', 'SDK Identity details:', identity)
            const publicKeys = identity.getPublicKeys().map((_key: any, _index: number) => ({
                type_: _key.keyType,
                purpose: _key.purposeNumber,
                security_level: _key.securityLevelNumber,
                data: _key.data,
                dataB64: hexHash160ToBase64(_key.data),
                read_only: _key.readOnly,
                disabled_at: _key.disabledAt,
            }))
            log('info', 'Identity public keys:', publicKeys)
            const revision = identity.revision || BigInt(0)
            log('info', 'Identity revision:', revision)
            await this.updateIdentityWithSdkData(identityId, identityIdx, publicKeys, revision)
            return {
                identity,
                identityIdx,
                publicKeys,
                revision: Number(revision)
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
