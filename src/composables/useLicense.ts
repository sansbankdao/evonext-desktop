// src/composables/useLicense.ts

import { ref, computed } from 'vue'
import { invoke } from '@/utils/tauri'
import type { ILicense } from '@/types'
interface LicenseState {
    license: ILicense | null
    loading: boolean
    error: string | null
}
const licenseState = ref<LicenseState>({
    license: null,
    loading: false,
    error: null
})
export function useLicense() {
    const loadLicense = async (identityId: string): Promise<ILicense | null> => {
        licenseState.value.loading = true
        try {
            const data = await invoke<ILicense | null>('load_license', {
                identityId
            })
            licenseState.value.license = data
            return data
        } catch (err) {
            licenseState.value.error = String(err)
            return null
        } finally {
            licenseState.value.loading = false
        }
    }
    const refreshLicense = async (identityId: string): Promise<ILicense | null> => {
        licenseState.value.loading = true
        licenseState.value.error = null
        try {
            const data = await invoke<ILicense>('refresh_license', {
                identityId
            })
            licenseState.value.license = data
            return data
        } catch (err) {
            licenseState.value.error = String(err)
            return licenseState.value.license
        } finally {
            licenseState.value.loading = false
        }
    }
    return {
        license: computed(() => licenseState.value.license),
        loading: computed(() => licenseState.value.loading),
        isPremium: computed(() => licenseState.value.license?.isPremium ?? false),
        loadLicense,
        refreshLicense,
        hasPremiumLicense: () => licenseState.value.license?.isPremium === true,
        clearLicense: async (identityId: string) => {
            await invoke('delete_license', { identityId })
            licenseState.value.license = null
        }
    }
}
