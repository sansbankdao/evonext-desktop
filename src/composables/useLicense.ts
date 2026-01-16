import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ILicense } from '@/types'

interface LicenseState {
    license: ILicense | null
    loading: boolean
    error: string | null
}

/**
 * Global state defined outside the composable to ensure
 * consistent state across all components and the router.
 */
const licenseState = ref<LicenseState>({
    license: null,
    loading: false,
    error: null
})

/**
 * Loads the license from the local filesystem (.identity.json).
 */
async function loadLicense(): Promise<ILicense | null> {
    if (licenseState.value.loading) {
        return licenseState.value.license
    }

    licenseState.value.loading = true
    licenseState.value.error = null

    try {
        const data = await invoke<ILicense | null>('load_license')
        licenseState.value.license = data
        return data
    } catch (error) {
        console.error('Failed to load license from disk:', error)
        licenseState.value.error = 'Failed to load local license'
        licenseState.value.license = null
        return null
    } finally {
        licenseState.value.loading = false
    }
}

/**
 * Refreshes the license by querying the remote API and
 * saving the result to the local filesystem.
 *
 * @param identityId - The Identity ID to check status for
 */
async function refreshLicense(identityId: string): Promise<ILicense | null> {
    licenseState.value.loading = true
    licenseState.value.error = null

    try {
        const data = await invoke<ILicense>('refresh_license', {
            identityId
        })
        licenseState.value.license = data
        return data
    } catch (error) {
        console.error('Failed to refresh license from API:', error)
        licenseState.value.error = 'Failed to sync with licensing server'

        // We do not nullify license here to allow stale
        // local data to persist if the API is unreachable
        return licenseState.value.license
    } finally {
        licenseState.value.loading = false
    }
}

/**
 * Synchronous check for premium status.
 * Used primarily by the Vue Router navigation guard.
 */
function hasPremiumLicense(): boolean {
    return licenseState.value.license?.isPremium === true
}

export function useLicense() {
    return {
        // Reactive State
        license: computed(() => licenseState.value.license),
        loading: computed(() => licenseState.value.loading),
        error: computed(() => licenseState.value.error),

        // Computed status
        isPremium: computed(() => hasPremiumLicense()),
        identityId: computed(() => licenseState.value.license?.identityId || null),
        lastUpdatedAt: computed(() => licenseState.value.license?.updatedAt || null),

        // Actions
        loadLicense,
        refreshLicense,
        hasPremiumLicense,

        /**
         * Clears local state and deletes the license file.
         */
        clearLicense: async () => {
            try {
                await invoke('delete_license')
                licenseState.value.license = null
                licenseState.value.error = null
            } catch (error) {
                console.error('Failed to delete license:', error)
            }
        }
    }
}
