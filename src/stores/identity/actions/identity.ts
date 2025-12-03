// src/stores/identity/actions/identity.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'

import getIdentities from '@/libs/getIdentities'
import getNetwork from '@/libs/getNetwork'
import type { IIdentityState } from '@/types'

/* Hex string → Uint8Array (binary data). */
function hexHash160ToBase64(hex: string): string {
    const matches = hex.match(/.{2}/g)

    if (!matches) throw new Error(`Invalid hex string: ${hex}`)

    const bytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)))

    /* Return base64. */
    return btoa(String.fromCharCode(...Array.from(bytes)))
}

export const identityActions = () => ({
    async searchUserIdentities(this: any) {
        const state = this as IIdentityState

        try {
            console.log('Searching for user identities...')

            /* Request identities. */
            const identities = await getIdentities()
            console.log('Identities found:', identities)

            /* Validate identities. */
            if (!identities || identities.length === 0) {
                console.warn('No identities found for the provided credentials.')
                return null
            }

            /* Select (primary) identity. */
            const primaryIdentity = identities[0]

            /* Validate (primary) identity. */
            if (typeof primaryIdentity?.id !== 'undefined' && primaryIdentity?.id !== null) {
                /* Request network. */
                const network = await getNetwork()

                /* Initialize SDK. */
                const sdk = new DashPlatformSDK({ network })

                /* Search for username. */
                const [document] = await sdk.names.searchByIdentity(primaryIdentity.id)

                /* Validate (identity) document. */
                if (typeof document?.properties?.label !== 'undefined' && document?.properties?.label !== null) {
                    /* Set (registered) username. */
                    state.username = document.properties.label
                } else {
                    /* Set (fallback) username. */
                    state.username = primaryIdentity.id
                }
            } else {
                /* Set (fallback) username. */
                state.username = primaryIdentity.id
            }

            /* Set identity. */
            state.identity = primaryIdentity

            /* Set authentication flag. */
            state.isAuthenticated = true

            try {
                await this.queryIdentityDetails(primaryIdentity.id)
            } catch (error) {
                console.warn('Failed to query detailed identity information:', error)
            }

            await this.fetchBalance()
            await this.saveToStorage()

            return primaryIdentity
        } catch (err) {
            console.error('Failed to search for identities:', err)
            state.connectionError = 'Failed to search for existing identities. Please check your credentials.'
            return null
        }
    },

    async queryIdentityDetails(this: any, identityId: string) {
        const state = this as IIdentityState

        /* Request network. */
        const network = await getNetwork()

        try {
            console.log('Querying identity details for:', identityId)

            /* Initialize SDK. */
            const sdk = new DashPlatformSDK({ network })

            /* Retrieve identity. */
            const identity = await sdk.identities.getIdentityByIdentifier(identityId)
console.log('SDK Identity details:', identity)

            const publicKeys = identity.getPublicKeys().map((_key, _index) => {
                return {
                    id: _index,
                    type_: _key.keyType,
                    purpose: _key.purposeNumber,
                    security_level: _key.securityLevelNumber,
                    data: _key.data,
                    dataB64: hexHash160ToBase64(_key.data),
                    read_only: _key.readOnly,
                    disabled_at: _key.disabledAt,
                }
            })
console.log('Identity public keys:', publicKeys)

            /* Set revision. */
            const revision = identity.revision || BigInt(0)
console.log('Identity revision:', revision)

            await this.updateIdentityWithSdkData(identityId, publicKeys, revision)

            return {
                identity,
                publicKeys,
                revision: Number(revision)
            }
        } catch (error) {
            console.error('Failed to query identity details:', error)
            state.connectionError = `Failed to query identity details: ${JSON.stringify(error)}`
            throw error
        }
    },

    async getPublicKeys(this: any) {
        const state = this as IIdentityState

        try {
            if (state.publicKeys.length > 0) {
                return state.publicKeys
            }

            if (state.identity?.id) {
                const details = await this.queryIdentityDetails(state.identity.id)
                return details.publicKeys || []
            }

            return []
        } catch (error) {
            console.error('Failed to get public keys:', error)
            return []
        }
    },
})
