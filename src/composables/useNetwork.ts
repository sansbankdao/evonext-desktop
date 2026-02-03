// src/composables/useNetwork.ts

import { computed, readonly, ref } from 'vue'
import { invoke } from '@/utils/tauri'

export type Network = 'mainnet' | 'testnet'

// We define the Settings interface to match the Rust backend structure
interface RustSettings {
    settings: {
        network: string
        // ... other settings
    }
}

// Local cache state
const _network = ref<Network>('testnet')
const _loading = ref(false)
const _error = ref<string | null>(null)

// Computed getters for the UI
const network = computed(() => _network.value)
const loading = computed(() => _loading.value)
const error = computed(() => _error.value)

export function useNetwork() {
    /**
     * Force refreshes the network from the Rust Backend (.settings.json).
     * Updates the local reactive cache.
     */
    const refresh = async (): Promise<Network> => {
        if (_loading.value) {
            // Prevent concurrent refreshes
            return _network.value
        }

        _loading.value = true
        _error.value = null

        try {
            // 1. Call the EXISTING Rust command
            const settings = await invoke<RustSettings>('load_settings')

            // 2. Extract and Validate
            const net = settings?.settings?.network

            if (net === 'mainnet' || net === 'testnet') {
                _network.value = net
                return net
            }

            // 3. Handle Invalid/Missing Data (Fail-safe default)
            console.warn('[useNetwork] Settings returned invalid network, defaulting to testnet.', settings)
            _network.value = 'testnet'
            return 'testnet'

        } catch (err) {
            console.error('[useNetwork] Failed to load settings from backend:', err)
            // 4. Handle Crash/Empty File (Fail-safe default)
            _error.value = 'Failed to load network settings'
            _network.value = 'testnet'
            return 'testnet'
        } finally {
            _loading.value = false
        }
    }

    /**
     * Ensures the network is loaded (refreshed) and returns it.
     */
    const ensure = async (): Promise<Network> => {
        return await refresh()
    }

    /**
     * Synchronous getter.
     * Throws if not loaded; call ensureNetwork() first in async contexts.
     */
    const getCurrent = (): Network => {
        if (_loading.value) {
            throw new Error('Network is still loading. Await ensure() first.')
        }

        if (_error.value) {
            throw new Error(`Network load failed: ${_error.value}`)
        }

        return _network.value
    }

    return {
        network: readonly(network),
        loading: readonly(loading),
        error: readonly(error),
        ensure,
        refresh,
        getCurrent
    }
}
