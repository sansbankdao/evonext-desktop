// src/services/BootstrapService.ts

import { useIdentityStore } from '@/stores/identity'
import { useLicense } from '@/composables/useLicense'
import { useWalletStore } from '@/stores/wallet'

export const BootstrapService = {
    async init() {
        const Identity = useIdentityStore()
        const Wallet = useWalletStore()
        const { refreshLicense } = useLicense()

        try {
            // 1. Restore identity session
            await Identity.initFromStorage()

            const id = Identity.identityId

            // 2. Load license specifically for this identity
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

            // 3. Populate Wallet
            await Wallet.refreshBalances()

            console.log('Bootstrap: Sequence reached completion')
        } catch (error) {
            console.error('Bootstrap: Failed to initialize app services', error)
        }
    }
}
