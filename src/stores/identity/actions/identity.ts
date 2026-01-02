// src/stores/identity/actions/identity.ts

import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { useIdentity } from '@/composables/useIdentity'

export const identityActions = () => ({
    // Delegating to the composable
    async searchUserIdentities(this: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            return await identityComposable.searchUserIdentities()
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    // This method is now internal to useIdentity, but we keep a proxy here if other actions directly call it
    // However, it should be removed if not used elsewhere in the store.
    async getDpnsUsername(identityId: string): Promise<string | null> {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            return await identityComposable.getDpnsUsername(identityId)
        }, 'GET_DPNS_USERNAME_FAILED')
    },

    async queryIdentityDetails(
        this: any,
        identityId: string,
        identityIdx: number,
        sdk?: any
    ) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            return await identityComposable.queryIdentityDetails(identityId, identityIdx, sdk)
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    },

    async getPublicKeys(this: any): Promise<any[]> {
        const store = this as any
        return ErrorBoundary.wrap(async () => {
            if (store.publicKeys.length > 0) {
                return store.publicKeys
            }
            if (store.identity?.id) {
                const identityComposable = useIdentity()
                const details = await identityComposable.queryIdentityDetails(
                    store.identity.id,
                    store.identity.identityIdx || 0
                )
                return details.publicKeys || []
            }
            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
    },

    // This logic is now handled inside the composable's queryIdentityDetails flow
    async updateIdentityWithSdkData(
        this: any,
        _identityId: string,
        _identityIdx: number,
        _publicKeys: any[],
        _revision: bigint
    ): Promise<void> {
        // No-op or trigger store update directly if needed,
        // but the composable handles the store patching via logic
        // const identityComposable = useIdentity()
        // Accessing private method via 'any' if strictly necessary,
        // but it's better to call the public wrapper that performs the update.
        // For now, we rely on queryIdentityDetails to have updated the state.
        log('debug', 'updateIdentityWithSdkData called on store - delegated to composable.')
    }
})
