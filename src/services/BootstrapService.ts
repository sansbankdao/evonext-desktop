// src/services/BootstrapService.ts

import { useIdentityStore } from '@/stores/identity'
import { useStorageStore } from '@/stores/storage'
import { useLicense } from '@/composables/useLicense'
import { useWalletStore } from '@/stores/wallet'
import { invoke } from '@/utils/tauri'
export const BootstrapService = {
    async init() {
        const Identity = useIdentityStore()
        const Storage = useStorageStore()
        const Wallet = useWalletStore()
        const { refreshLicense } = useLicense()
        try {
            // 1. Restore identity session via the Storage store
            // Note: useStorageStore must export initFromStorage
            await Storage.initFromStorage()

            // 2. If no identity restored from Storage, try the network-specific identity file
            if (!Identity.identityId) {
                try {
                    // Determine network (default to testnet if settings unavailable)
                    let network = 'testnet'
                    try {
                        const settings = await invoke<any>('load_settings')
                        if (settings?.network) {
                            network = settings.network
                        }
                    } catch {
                        // Settings not available, use default
                    }

                    // Load active identity from .identity-{network}.json (network-specific)
                    const activeResult = await invoke<any>('load_active_identity', { network })
                    console.log('Bootstrap: load_active_identity result:', activeResult)

                    if (activeResult?.activeIdentityId) {
                        const activeId = activeResult.activeIdentityId
                        const identityData = activeResult.identity
                        console.log('Bootstrap: Restoring active identity from identity file:', activeId)

                        Identity.identityId = activeId
                        Identity.isConnected = true
                        Identity.isAuthenticated = true

                        if (identityData) {
                            Identity.identityIdx = identityData.identityIdx ?? 0
                            Identity.username = identityData.dpnsUsername || identityData.username || null
                            Identity.displayName = identityData.dpnsUsername || identityData.username || ''
                            Identity.balance = identityData.balance || '0'
                            Identity.revision = identityData.revision || 0
                            // Store in identities map for Identity Manager
                            Identity.identities[activeId] = {
                                identityId: activeId,
                                identityIdx: identityData.identityIdx ?? 0,
                                username: identityData.dpnsUsername || identityData.username || '',
                                displayName: identityData.dpnsUsername || identityData.username || '',
                                balance: identityData.balance || '0',
                                publicKeys: identityData.publicKeys || [],
                                revision: identityData.revision || 0,
                                isAuthenticated: true
                            }
                        }

                        console.log('Bootstrap: Identity restored:', activeId)
                    }
                } catch (restoreErr) {
                    console.warn('Bootstrap: Failed to restore from identity file:', restoreErr)
                }
            }

            const id = Identity.identityId
            // 3. Load license specifically for this identity
            if (id) {
                console.log('Bootstrap: Syncing license for ID', id)
                const data = await refreshLicense(id)
                // Update identity store flag for UI consistency
                if (data) {
                    Identity.premiumAccess = data.isPremium
                }
            } else {
                console.log('Bootstrap: No identity found, premium access disabled')
                Identity.premiumAccess = false
            }
            // 4. Populate Wallet
            await Wallet.refreshBalances()
            console.log('Bootstrap: Sequence reached completion')
        } catch (error) {
            console.error('Bootstrap: Failed to initialize app services', error)
        }
    }
}
