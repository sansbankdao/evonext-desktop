// src/composables/useLicense.ts

import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ILicense } from '@/types'

interface LicenseState {
    licenseId: string | null
    loading: boolean
    error: string | null
}

const licenseState = ref<LicenseState>({
    licenseId: null,
    loading: false,
    error: null
})

async function loadLicense(): Promise<string | null> {
    if (licenseState.value.loading) {
        // Wait if already loading
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (!licenseState.value.loading) {
                    clearInterval(check)
                    resolve(null)
                }
            }, 10)
        })
        return licenseState.value.licenseId
    }

    licenseState.value.loading = true
    licenseState.value.error = null

    try {
        const licenseStore = await invoke<ILicense | null>('load_license')
        const licenseId = licenseStore?.license_id || null
        licenseState.value.licenseId = licenseId
        return licenseId
    } catch (error) {
        console.error('Failed to load license:', error)
        licenseState.value.error = 'Failed to load license'
        licenseState.value.licenseId = null
        return null
    } finally {
        licenseState.value.loading = false
    }
}

function hasPremiumLicense(): boolean {
    return !!licenseState.value.licenseId?.trim()
}

export function useLicense() {
    return {
        // Reactive state
        licenseId: computed(() => licenseState.value.licenseId),
        loading: computed(() => licenseState.value.loading),
        error: computed(() => licenseState.value.error),

        // Actions
        loadLicense,
        hasPremiumLicense: () => hasPremiumLicense(),

        // For convenience
        refreshLicense: loadLicense,
        clearLicense: () => {
            licenseState.value.licenseId = null
            licenseState.value.error = null
        }
    }
}
