// src/composables/useNetwork.ts

import { computed, readonly, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export type Network = 'mainnet' | 'testnet'

interface PartialSettings {
    network?: string
}

const _network = ref<Network>('testnet')
const _loading = ref(false)
const _error = ref<string | null>(null)

const network = computed(() => _network.value)
const loading = computed(() => _loading.value)
const error = computed(() => _error.value)

async function ensureNetwork(): Promise<Network> {
    if (_loading.value) {
        // Await resolution if already loading
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (!_loading.value) {
                    clearInterval(check)
                    resolve(null)
                }
            }, 10)
        })
        return _network.value
    }

    _loading.value = true
    _error.value = null

    try {
        const settings = await invoke<PartialSettings>('load_settings')
        _network.value = (settings?.network === 'testnet') ? 'testnet' : 'mainnet'
    } catch (err) {
        console.error('Failed to load network settings:', err)
        _error.value = 'Failed to load network settings'
        _network.value = 'testnet' // Fallback
    } finally {
        _loading.value = false
    }

    return _network.value
}

/**
 * Synchronous getter (for libs/utils that can't await).
 * Throws if not loaded; call ensureNetwork() first in async contexts.
 */
function getCurrentNetwork(): Network {
    if (_loading.value) {
        throw new Error('Network is still loading. Await ensureNetwork() first.')
    }
    if (_error.value) {
        throw new Error(`Network load failed: ${_error.value}`)
    }
    return _network.value
}

export function useNetwork() {
    return {
        network: readonly(network),
        loading: readonly(loading),
        error: readonly(error),
        ensure: ensureNetwork,
        getCurrent: getCurrentNetwork
    }
}
