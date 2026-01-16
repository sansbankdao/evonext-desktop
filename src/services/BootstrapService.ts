import { useIdentityStore } from '@/stores/identity'
import { useLicense } from '@/composables/useLicense'
import { useWalletStore } from '@/stores/wallet'

export const BootstrapService = {
    async init() {
        const Identity = useIdentityStore()
        const Wallet = useWalletStore()

        // Use refreshLicense to match the source of useLicense.ts
        const { refreshLicense, loadLicense } = useLicense()

        try {
            // 1. Initialize identity from storage (Settings/Filesystem)
            await Identity.initFromStorage()

            /**
             * 2. Check for Identity ID.
             * We check both the store instance and the state object
             * depending on how your Pinia store is structured.
             */
            const currentId = Identity.identityId ||
                             (Identity as any).activeIdentityId ||
                             (Identity as any).state?.activeIdentityId

            if (currentId) {
                console.log('Syncing license for:', currentId)
                await refreshLicense(currentId)
            } else {
                console.log('No active identity found, loading local license cache...')
                await loadLicense()
            }

            // 3. Load wallet data
            await Wallet.refreshBalances()

            console.log('App Bootstrap Complete')
        } catch (error) {
            console.error('Bootstrap failed:', error)
        }
    }
}
