// src/composables/useIdentity.ts

import { computed, unref } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork' // Assume you create this
import { usePlatformSdk } from '@/composables/usePlatformSdk' // Singleton SDK
import type { Ref } from 'vue'
import type { ConnectionResult, DiscoveredIdentity, IPublicKey } from '@/types'

export function useIdentity() {
  const store = useIdentityStore()
  const { network } = useNetwork()
  const { sdk, ensureSDK } = usePlatformSdk()

  // Computed shortcuts
  const isConnected = computed(() => store.isAuthenticated && !!store.identityId)
  const authPublicKey = computed(() => store.publicKeys.find((k: IPublicKey) => k.purpose === 0))
  const displayName = computed(() => store.displayName || store.identityId || 'Guest')

  // Init: Load from storage + verify
  async function init() {
    await store.loadFromStorage()
    if (store.isAuthenticated && store.identityId) {
      await refreshIdentity()
    }
  }

  // Connect flows (consolidate seed/single-key)
  async function connect(
    method: 'seed' | 'key',
    payload: { seedPhrase?: string; privateKey?: string; discoveredId?: string }
  ): Promise<ConnectionResult> {
    store.$patch({ isConnecting: true, connectionError: null })
    try {
      let id = payload.discoveredId
      if (!id) {
        const identities = await discoverIdentities()
        id = identities[0]?.identityId
        if (!id) throw new Error('No identity found')
      }
      // Derive/save keys (use KeyDerivationService)
      // ... (store-specific save)
      store.$patch({ identityId: id, isAuthenticated: true })
      await refreshIdentity()
      await store.saveToStorage()
      return { success: true, identityId: id }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connection failed'
      store.$patch({ connectionError: msg, isAuthenticated: false })
      return { success: false, error: msg }
    } finally {
      store.$patch({ isConnecting: false })
    }
  }

  // Discover/refresh identity details
  async function discoverIdentities(): Promise<DiscoveredIdentity[]> {
    if (!store.identityId) return []
    await ensureSDK(unref(network))
    const identity = await sdk.value!.identities.getIdentityByIdentifier(store.identityId)
    const details = {
      identityId: identity.id,
      publicKeys: transformPublicKeys(identity.getPublicKeys()), // From utils
      revision: identity.revision.toString(),
      balance: await fetchBalance(store.identityId), // External
      dpnsUsername: await sdk.value!.platform.names.getNameByIdentityId(store.identityId)
    }
    store.$patch({
      publicKeys: details.publicKeys,
      revision: Number(details.revision),
      displayName: details.dpnsUsername || store.identityId,
      balance: details.balance
    })
    return [details]
  }

  const refreshIdentity = discoverIdentities // Alias

  // Balance
  async function refreshBalance() {
    if (store.identityId) {
      const balance = await getIdentityBalance(unref(network), store.identityId)
      store.balance = balance || null
    }
  }

  // Logout
  async function logout() {
    await store.clearStorage()
    store.$reset()
  }

  return {
    // State refs
    identityId: computed({ get: () => store.identityId, set: (v: string | null) => store.identityId = v }),
    publicKeys: readonly(store.publicKeys),
    balance: readonly(store.balance),
    isConnected,
    isConnecting: readonly(store.isConnecting),
    connectionError: readonly(store.connectionError),
    displayName,
    authPublicKey,

    // Actions
    init,
    connect,
    refreshIdentity,
    refreshBalance,
    logout
  }
}
