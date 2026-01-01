// src/stores/connect/shared.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSeedStore } from './seed'
import { usePrivateKeyStore } from './privateKey'

export const useConnectSharedStore = defineStore('connect.shared', () => {
    const method = ref<'seed' | 'privateKey'>('seed')
    const connectionError = ref<string | null>(null)
    const isConnecting = ref(false)

    const seedStore = useSeedStore()
    const keyStore = usePrivateKeyStore()

    const switchMethod = (newMethod: 'seed' | 'privateKey') => {
        method.value = newMethod
        if (newMethod === 'seed') {
            keyStore.reset()
        } else {
            seedStore.reset()
        }
        connectionError.value = null
    }

    const resetAll = () => {
        seedStore.reset()
        keyStore.reset()
        connectionError.value = null
        isConnecting.value = false
    }

    return {
        method,
        connectionError,
        isConnecting,
        switchMethod,
        resetAll,
        seedStore,
        keyStore
    }
})
