// src/stores/identity/actions/identity.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import getIdentities from '@/libs/getIdentities'
import type { State, IdentityPublicKey } from '../types'

function hexHash160ToBase64(hex: string): string {
    // Hex string → Uint8Array (binary data)
    const matches = hex.match(/.{2}/g)
    if (!matches) throw new Error(`Invalid hex string: ${hex}`)
    const bytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)))
    // Uint8Array → Base64
    return btoa(String.fromCharCode(...Array.from(bytes)))
}

export const identityActions = () => ({
    async searchUserIdentities(this: any, network: 'mainnet' | 'testnet' = 'mainnet') {
        const state = this as State
        try {
            console.log('Searching for user identities...')
            const identities = await getIdentities(network === 'mainnet' ? 'mainnet' : 'testnet', false)
            console.log('Identities found:', identities)
            if (!identities || identities.length === 0) {
                console.warn('No identities found for the provided credentials.')
                return null
            }
            const primaryIdentity = identities[0]
            console.log('Primary identity:', primaryIdentity)
            const username = primaryIdentity.id
            state.username = username
            state.identity = primaryIdentity
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
        const state = this as State
        try {
            console.log('Querying identity details for:', identityId)
            const sdk = new DashPlatformSDK({ network: 'mainnet' })
            const identity = await sdk.identities.getIdentityByIdentifier(identityId)
            console.log('SDK Identity details:', identity)
            const publicKeys = identity.getPublicKeys().map((_key, _index) => {
                // return _key.data
                return {
                    id: _index,
                    type_: _key.keyType,
                    purpose: _key.purposeNumber,
                    security_level: _key.securityLevelNumber,
                    // data: _key.data,
                    data: hexHash160ToBase64(_key.data),
                    read_only: _key.readOnly,
                    disabled_at: _key.disabledAt,
                }
            })
            const revision = identity.revision || 0n
            console.log('Identity public keys:', publicKeys)
            console.log('Identity revision:', revision)
            await this.updateIdentityWithSdkData(identityId, publicKeys, revision)
            return {
                identity,
                publicKeys,
                revision: Number(revision)
            }
        } catch (error) {
            console.error('Failed to query identity details:', error)
            throw error
        }
    },
    async getPublicKeys(this: any) {
        const state = this as State
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
