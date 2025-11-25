// src/stores/identity/actions/identity.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import getIdentities from '@/libs/getIdentities'
import type { IIdentity } from '../types'
export const identityActions = (state: any, store: any) => ({
    async searchUserIdentities(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<IIdentity | null> {
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
                await store.queryIdentityDetails(primaryIdentity.id)
            } catch (error) {
                console.warn('Failed to query detailed identity information:', error)
            }
            await store.fetchBalance()
            await store.saveToStorage()
            return primaryIdentity
        } catch (err) {
            console.error('Failed to search for identities:', err)
            state.connectionError = 'Failed to search for existing identities. Please check your credentials.'
            return null
        }
    },
    async queryIdentityDetails(identityId: string): Promise<any> {
        try {
            console.log('Querying identity details for:', identityId)
            const sdk = new DashPlatformSDK({ network: 'mainnet' })
            const identity = await sdk.identities.getIdentityByIdentifier(identityId)
            console.log('SDK Identity details:', identity)
            const publicKeys = identity.getPublicKeys()
            const revision = identity.revision || 0n
            console.log('Identity public keys:', publicKeys)
            console.log('Identity revision:', revision)
            await store.updateIdentityWithSdkData(identityId, publicKeys, revision)
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
    async getPublicKeys(): Promise<any[]> {
        try {
            if (state.publicKeys.length > 0) {
                return state.publicKeys
            }
            if (state.identity?.id) {
                const details = await store.queryIdentityDetails(state.identity.id)
                return details.publicKeys || []
            }
            return []
        } catch (error) {
            console.error('Failed to get public keys:', error)
            return []
        }
    },
})
