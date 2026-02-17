// src/composables/useConnect.ts

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import type { DiscoveredIdentity } from '@/types/identity'

export function useConnect() {
    const store = useIdentityStore()
    const router = useRouter()
    const manager = getIdentityManager(store)
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const manualIdentityId = ref('')
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const isSearchingSeed = ref(false)
    const isDiscoveringKey = ref(false)
    const seedDiscoveryError = ref<string | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref<any>(null)
    const privateKeyInput = ref<string>('')
    const discoveryProgress = computed(() => store.discoveryProgress)

    // Wire up the progress callback from SeedDiscovery to the store's discoveryProgress
    manager.setProgressCallback((details: any) => {
        store.discoveryProgress = {
            currentIdentityIndex: details.currentIdentityIndex ?? 0,
            totalIdentities: details.totalIdentities ?? 5,
            scannedCount: (details.currentIdentityIndex ?? 0) + 1,
            foundCount: seedDiscoveryResults.value.length
        }
    })

    watch(seedWordCount, (newCount) => {
        const size = parseInt(newCount)
        const current = [...seedWords.value]
        if (current.length < size) {
            seedWords.value = [...current, ...Array(size - current.length).fill('')]
        } else {
            seedWords.value = current.slice(0, size)
        }
    })
    const progressPercentage = computed(() => {
        const progress = store.discoveryProgress
        if (!progress || progress.totalIdentities === 0) return 0
        return Math.round((progress.currentIdentityIndex / progress.totalIdentities) * 100)
    })
    const handlePaste = async (words: string[]) => {
        if (words.length === 12 || words.length === 24) {
            seedWordCount.value = words.length === 12 ? '12' : '24'
            seedWords.value = words
            await startSeedDiscovery()
        } else {
            seedDiscoveryError.value = 'Invalid seed phrase length'
        }
    }
    const startSeedDiscovery = async () => {
        const mnemonic = seedWords.value.join(' ').trim()
        if (!mnemonic || mnemonic.split(' ').length < 12) {
            seedDiscoveryError.value = 'expected 12'
            return
        }
        isSearchingSeed.value = true
        seedDiscoveryError.value = null
        seedDiscoveryResults.value = []

        // Reset progress at start
        store.discoveryProgress = {
            currentIdentityIndex: 0,
            totalIdentities: 5,
            scannedCount: 0,
            foundCount: 0
        }

        try {
            const result = await manager.discoverFromSeed(mnemonic, { network: 'testnet' })
            if (result.success) {
                seedDiscoveryResults.value = result.identities || []
                if (result.identities && result.identities.length > 0) {
                    const firstMatch = result.identities[0]
                    if (firstMatch) {
                        selectedSeedIdentity.value = firstMatch
                        discoveredIdentity.value = firstMatch
                    }
                }
            } else {
                seedDiscoveryError.value = result.error || 'Discovery failed'
            }
        } catch (e) {
            seedDiscoveryError.value = String(e)
        } finally {
            isSearchingSeed.value = false
            // Clear progress when done
            store.discoveryProgress = null
        }
    }
    const handleDiscoverIdentity = async (key: string) => {
        seedDiscoveryError.value = null
        debugOutput.value = null
        discoveryDetails.value = null
        discoveredIdentity.value = null
        privateKeyInput.value = key
        isDiscoveringKey.value = true
        try {
            const result = await manager.discoverFromKey(key, { network: 'testnet' })
            if (result.success && result.identities && result.identities.length > 0) {
                const found = result.identities[0]!
                discoveredIdentity.value = found
                manualIdentityId.value = found.identityId
                discoveryDetails.value = {
                    associatedKeys: (found.publicKeys || []).map((pk: any) => ({
                        purpose: pk.purpose || 'AUTHENTICATION',
                        securityLevel: pk.securityLevel || 'HIGH',
                        keyType: pk.keyType || 'ECDSA_HASH160'
                    }))
                }
                debugOutput.value = {
                    step: 'discovery-complete',
                    identityId: found.identityId,
                    keyCount: (found.publicKeys || []).length
                }
            } else if (result.success && result.identity) {
                // Single identity result format
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId
                discoveryDetails.value = {
                    associatedKeys: (result.identity.publicKeys || []).map((pk: any) => ({
                        purpose: pk.purpose || 'AUTHENTICATION',
                        securityLevel: pk.securityLevel || 'HIGH',
                        keyType: pk.keyType || 'ECDSA_HASH160'
                    }))
                }
                debugOutput.value = {
                    step: 'discovery-complete',
                    identityId: result.identity.identityId,
                    keyCount: (result.identity.publicKeys || []).length
                }
            } else {
                seedDiscoveryError.value = result.error || 'Identity not found'
                debugOutput.value = {
                    step: 'discovery-failed',
                    error: result.error || 'Identity not found',
                    debug: result.debug || null
                }
            }
        } catch (e: any) {
            seedDiscoveryError.value = String(e)
            debugOutput.value = {
                step: 'discovery-failed',
                error: String(e)
            }
        } finally {
            isDiscoveringKey.value = false
        }
    }
    const handleConnect = async () => {
        if (connectionMethod.value === 'seed') {
            if (!selectedSeedIdentity.value) return
            const result = await store.connectWriteOnlyFromDiscovered(
                selectedSeedIdentity.value,
                seedWords.value.join(' ')
            )
            if (result?.success) {
                router.push('/')
            }
            return result
        } else {
            // Private key path — use discovered identity data directly
            // instead of re-fetching from DAPI (which may use unsupported methods)
            const identity = discoveredIdentity.value
            const key = privateKeyInput.value
            const identityId = manualIdentityId.value || identity?.identityId

            if (!identityId) {
                throw new Error('Missing identity id')
            }
            if (!key) {
                throw new Error('Missing private key')
            }

            // Use the already-discovered identity data to save directly,
            // bypassing the broken get_identity_info re-fetch
            store.isConnecting = true
            store.connectionError = null

            try {
                const network = 'testnet'

                // Build public keys for Rust payload from discovered identity
                const publicKeys = (identity?.publicKeys || []).map((pk: any) => ({
                    id: pk.idx ?? pk.id ?? 0,
                    type: pk.keyType || 'ECDSA_HASH160',
                    purpose: pk.purpose ?? 0,
                    securityLevel: pk.securityLevel ?? 0,
                    data: pk.data || '',
                    readOnly: pk.readOnly || false,
                    disabledAt: pk.disabledAt || null
                }))

                // Save identity details to .identity-{network}.json
                const saveResult = await store.saveIdentity(network, {
                    identityId,
                    username: identity?.dpnsUsername || identity?.username || '',
                    balance: identity?.balance || '0',
                    revision: Number(identity?.revision || 0),
                    publicKeys,
                    identityIdx: identity?.identityIdx || 0,
                    dpnsUsername: identity?.dpnsUsername || null,
                    createdAt: new Date().toISOString(),
                    activeIdentityId: identityId
                })

                if (!saveResult?.success) {
                    console.warn('[handleConnect:privateKey] Identity save warning:', saveResult)
                }

                // Save the private key to keystore (.safu-{network}.json)
                await store.saveKeys(network, identityId, [{
                    identityId,
                    keyId: 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: 'ECDSA_HASH160',
                    privateKey: key,
                    publicKey: '',
                    createdAt: new Date().toISOString(),
                    lastUsed: new Date().toISOString()
                }])

                // Update in-memory store state
                store.identityId = identityId
                store.identityIdx = identity?.identityIdx || 0
                store.username = identity?.dpnsUsername || identity?.username || null
                store.displayName = identity?.dpnsUsername || identity?.username || ''
                store.publicKeys = (identity?.publicKeys || []) as any
                store.balance = identity?.balance || '0'
                store.isConnected = true
                store.isAuthenticated = true

                // Also populate the identities map
                store.identities[identityId] = {
                    identityId,
                    identityIdx: identity?.identityIdx || 0,
                    username: identity?.dpnsUsername || identity?.username || '',
                    displayName: identity?.dpnsUsername || identity?.username || '',
                    balance: identity?.balance || '0',
                    publicKeys: (identity?.publicKeys || []) as any,
                    revision: Number(identity?.revision || 0),
                    isAuthenticated: true
                }

                router.push('/')
                return { success: true, identityId }
            } catch (e: any) {
                const errorMsg = e?.message || String(e)
                store.connectionError = errorMsg
                return { success: false, error: errorMsg }
            } finally {
                store.isConnecting = false
            }
        }
    }
    const resetDiscovery = () => {
        seedDiscoveryResults.value = []
        discoveredIdentity.value = null
        discoveryDetails.value = null
        debugOutput.value = null
        privateKeyInput.value = ''
        seedDiscoveryError.value = null
        store.discoveryProgress = null
    }
    const cleanup = () => {
        manager.cancelSeedDiscovery()
        store.discoveryProgress = null
    }
    return {
        connectionMethod,
        seedWordCount,
        seedWords,
        manualIdentityId,
        seedDiscoveryResults,
        selectedSeedIdentity,
        discoveredIdentity,
        isSearchingSeed,
        isDiscovering: isDiscoveringKey,
        seedDiscoveryError,
        privateKeyDiscoveryError: seedDiscoveryError,
        discoveryDetails,
        debugOutput,
        progressPercentage,
        discoveryProgress,
        progressMessage: computed(() => {
            const progress = store.discoveryProgress
            if (!progress) return ''
            return `Checking identity ${progress.currentIdentityIndex + 1} of ${progress.totalIdentities}...`
        }),
        discoveryStatus: computed(() => {
            if (isSearchingSeed.value) return 'Searching seed identities...'
            if (isDiscoveringKey.value) return 'Searching for identity by key...'
            return 'Idle'
        }),
        isFormValid: computed(() => {
            if (connectionMethod.value === 'seed') {
                return !!selectedSeedIdentity.value
            } else {
                // Private key path: need both a discovered/manual identity and a key
                const hasIdentity = !!(manualIdentityId.value || discoveredIdentity.value?.identityId)
                const hasKey = !!privateKeyInput.value
                return hasIdentity && hasKey
            }
        }),
        handlePaste,
        startSeedDiscovery,
        handleConnect,
        handleDiscoverIdentity,
        cleanup,
        resetDiscovery,
        formatBalance: (v: any) => `${v} DASH`,
        updateConnectionMethod: (v: any) => {
            connectionMethod.value = v
            // Reset key-specific state when switching methods
            if (v === 'seed') {
                discoveredIdentity.value = null
                discoveryDetails.value = null
                debugOutput.value = null
                privateKeyInput.value = ''
            }
        },
        selectSeedIdentity: (id: any) => {
            selectedSeedIdentity.value = id
            discoveredIdentity.value = id
        },
        closeResults: () => {},
        useManualIdentity: () => { connectionMethod.value = 'privateKey' },
        initialize: () => {},
        switchIdentity: (id: string) => store.switchIdentity(id),
        isConnecting: computed(() => store.isConnecting),
        connectionError: computed(() => store.connectionError)
    }
}
