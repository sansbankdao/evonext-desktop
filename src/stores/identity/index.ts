// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ErrorBoundary } from '@/utils/errors'
import { useStorage } from '@/composables/useStorage'
import type { IIdentityState, IIdentity, IIdentityPublicKey } from '@/types'

export const useIdentityStore = defineStore('identity', () => {
  // State
  const username = ref<string | null>(null)
  const identity = ref<IIdentity | null>(null)
  const balance = ref<string | null>(null)
  const balanceBigInt = ref<bigint | undefined>()
  const dashBigInt = ref<bigint | undefined>()
  const publicKeys = ref<IIdentityPublicKey[]>([])
  const revision = ref<number | null>(null)
  const isAuthenticated = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const premiumAccess = ref(false)
  const lastConnected = ref<string | null>(null)

  // Getters (computed)
  const greeting = computed(() => `Hello, ${username.value || 'Guest'}!`)
  const isConnected = computed(() => isAuthenticated.value && !!username.value)
  const hasPublicKeys = computed(() => publicKeys.value.length > 0)

  const getPublicKeyById = computed(() => (id: number) =>
    publicKeys.value.find(key => key.id === id)
  )

  const authPublicKey = computed(() =>
    publicKeys.value.find(key => key.purpose === 0)
  )

  const encryptionPublicKey = computed(() =>
    publicKeys.value.find(key => key.purpose === 1)
  )

  // Actions
  function $reset() {
    username.value = null
    identity.value = null
    balance.value = null
    balanceBigInt.value = undefined
    dashBigInt.value = undefined
    publicKeys.value = []
    revision.value = null
    isAuthenticated.value = false
    isConnecting.value = false
    connectionError.value = null
    premiumAccess.value = false
    lastConnected.value = null
  }

  async function fetchBalance() {
    return ErrorBoundary.wrap(async () => {
      // ... implementation using composition API
    }, 'FETCH_BALANCE_FAILED')
  }

  // ... other actions refactored similarly

  return {
    // State
    username,
    identity,
    balance,
    balanceBigInt,
    dashBigInt,
    publicKeys,
    revision,
    isAuthenticated,
    isConnecting,
    connectionError,
    premiumAccess,
    lastConnected,

    // Getters
    greeting,
    isConnected,
    hasPublicKeys,
    getPublicKeyById,
    authPublicKey,
    encryptionPublicKey,

    // Actions
    $reset,
    fetchBalance,
    // ... other actions
  }
})
