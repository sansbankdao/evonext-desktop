<!-- src/screens/Connect.vue -->
<template>
    <main>
        <Header title="Connect to Platform" />
        <section class="flex items-center justify-center min-h-[calc(100vh-140px)] px-4">
            <div class="max-w-2xl w-full mx-auto space-y-8 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-8 bg-white dark:bg-slate-900">
                <!-- Page Header -->
                <div class="text-center space-y-3">
                    <p class="text-slate-600 dark:text-slate-400 text-xl leading-relaxed">
                        Securely access your identity using one of the methods below. Your data stays local.
                    </p>
                </div>

                <!-- Connection Method Tabs -->
                <ConnectMethodTabs
                    :model-value="connectionMethod"
                    @update-connection-method="updateConnectionMethod"
                />

                <!-- Security Warning -->
                <SecurityWarning />

                <!-- Form Container -->
                <form @submit.prevent="handleConnect" class="space-y-6">
                    <!-- Seed Phrase Form -->
                    <div v-if="connectionMethod === 'seed'">
                        <ConnectSeedForm
                            v-model:wordCount="seedWordCount"
                            v-model:seedWords="seedWords"
                            @paste="handlePaste"
                        />

                        <!-- Seed Discovery Results -->
                        <div v-if="seedDiscoveryResults.length > 0" class="mt-4 space-y-3">
                            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Found {{ seedDiscoveryResults.length }} Identities
                            </h3>
                            <div v-for="(identity, index) in seedDiscoveryResults" :key="identity.identityId"
                                 class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                 @click="selectSeedIdentity(identity)">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-medium text-slate-800 dark:text-slate-200">
                                            {{ identity.identityId.substring(0, 16) }}...
                                        </p>
                                        <p class="text-xs text-slate-600 dark:text-slate-400">
                                            {{ identity.dpnsUsername || 'No DPNS name' }} • {{ formatBalance(identity.balance) }} Credits
                                        </p>
                                    </div>
                                    <div v-if="selectedSeedIdentityId === identity.identityId"
                                         class="text-cyan-500">
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Seed Discovery Error -->
                        <div v-if="seedDiscoveryError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p class="text-sm text-red-600 dark:text-red-400">{{ seedDiscoveryError }}</p>
                        </div>
                    </div>

                    <!-- Private Key Form -->
                    <div v-else>
                        <KeyDiscoveryForm
                            :debug-output="debugOutput"
                            :discovered-identity="discoveredIdentity"
                            :discovery-details="discoveryDetails"
                            :manual-identity-id="manualIdentityId"
                            :is-discovering="isDiscovering"
                            @update:manual-identity-id="manualIdentityId = $event"
                            @discover-identity="handleDiscoverIdentity"
                            @reset-discovery="handleResetDiscovery"
                            @use-manual-identity="handleUseManualIdentity"
                        />

                        <!-- Discovery Status -->
                        <div v-if="isDiscovering" class="text-center py-4">
                            <div class="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span class="text-sm">Searching for identity...</span>
                            </div>
                        </div>

                        <!-- Advanced Options -->
                        <div v-if="discoveredIdentity" class="mt-4 space-y-3">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Network:</span>
                                <span class="font-medium text-slate-800 dark:text-slate-200">Testnet</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Balance:</span>
                                <span class="font-medium text-emerald-600 dark:text-emerald-400">
                                    {{ formatBalance(discoveredIdentity.balance) }} Credits
                                </span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Revision:</span>
                                <span class="font-medium text-slate-800 dark:text-slate-200">#{{ discoveredIdentity.revision }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Connection Error Display -->
                    <ConnectErrorDisplay
                        v-if="identityStore.connectionError"
                        :error="identityStore.connectionError"
                    />

                    <!-- Debug Output (Visible only when there's debug data) -->
                    <div v-if="debugOutput && debugOutput.step" class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 mr-2 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">Discovery Debug</h3>
                            </div>
                            <button @click="debugOutput = null" class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                Hide
                            </button>
                        </div>
                        <div class="text-xs font-mono space-y-1">
                            <div><span class="text-slate-600 dark:text-slate-400">Step:</span> <span class="text-blue-600 dark:text-blue-400">{{ debugOutput.step }}</span></div>
                            <div v-if="debugOutput.method"><span class="text-slate-600 dark:text-slate-400">Method:</span> <code class="text-purple-600 dark:text-purple-400">{{ debugOutput.method }}</code></div>
                            <div v-if="debugOutput.hash"><span class="text-slate-600 dark:text-slate-400">Hash:</span> <code class="text-pink-600 dark:text-pink-400">{{ debugOutput.hash.substring(0, 24) }}...</code></div>
                            <div v-if="debugOutput.keyType"><span class="text-slate-600 dark:text-slate-400">Key Type:</span> {{ debugOutput.keyType }}</div>
                            <div v-if="debugOutput.derivedHashes" class="pt-2">
                                <span class="text-slate-600 dark:text-slate-400">Derived Hashes:</span>
                                <ul class="mt-1 space-y-1">
                                    <li v-for="(hash, idx) in debugOutput.derivedHashes" :key="idx" class="text-xs">
                                        <code class="text-slate-600 dark:text-slate-400">{{ hash.substring(0, 24) }}...</code>
                                    </li>
                                </ul>
                            </div>
                            <div v-if="debugOutput.response" class="pt-2">
                                <span class="text-slate-600 dark:text-slate-400">Response:</span>
                                <pre class="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-40">{{ JSON.stringify(debugOutput.response, null, 2) }}</pre>
                            </div>
                        </div>
                    </div>

                    <!-- Connect Button -->
                    <div class="pt-6">
                        <button
                            type="submit"
                            :disabled="!isFormValid || identityStore.isConnecting || isDiscovering || isSearchingSeed"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-cyan-600 hover:to-cyan-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-cyan-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                        >
                            <svg v-if="identityStore.isConnecting || isDiscovering || isSearchingSeed" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                                {{ identityStore.isConnecting ? 'Connecting...' :
                                   isDiscovering || isSearchingSeed ? 'Searching...' :
                                   connectionMethod === 'seed' ? 'Connect with Seed' : 'Connect with Private Key' }}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </main>
</template>

<!-- src/screens/Connect.vue - Updated Script Section -->
<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import getNetwork from '@/libs/getNetwork'
import { useIdentityStore } from '@/stores/identity'
import { getIdentityManager } from '@/services/identity'
import type { DiscoveredIdentity, DiscoveryResult } from '@/services/identity/types'

// Components
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'
import KeyDiscoveryForm from '@/components/connect/KeyDiscoveryForm.vue'

// Router and Store
const router = useRouter()
const identityStore = useIdentityStore()

// State
const connectionMethod = ref<'seed' | 'privateKey'>('seed')
const seedWordCount = ref<'12' | '24'>('12')
const seedWords = reactive<string[]>(Array(12).fill(''))
const selectedSeedIdentityId = ref<string>('')
const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
const seedDiscoveryError = ref<string>('')
const isSearchingSeed = ref(false)
const seedSearchTimer = ref<NodeJS.Timeout | null>(null)

// Single key flow state
const currentInputKey = ref('')
const debugOutput = ref<any>(null)
const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
const discoveryDetails = ref<any>(null)
const manualIdentityId = ref('')
const isDiscovering = ref(false)

// Methods
const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
    connectionMethod.value = method
    handleResetDiscovery()
}

const handlePaste = (words: string[]) => {
    const totalSlots = seedWords.length
    seedWords.length = 0
    for (let i = 0; i < totalSlots; i++) {
        seedWords.push(words[i] || '')
    }
}

const formatBalance = (balance: string | undefined | number) => {
    if (balance === undefined || balance === null) return '0'
    const num = typeof balance === 'number' ? balance : parseInt(balance.toString(), 10)
    if (isNaN(num)) return '0'
    return new Intl.NumberFormat().format(num)
}

const selectSeedIdentity = (identity: DiscoveredIdentity) => {
    selectedSeedIdentityId.value = identity.identityId
    manualIdentityId.value = identity.identityId
    console.log('[Connect] Selected seed identity:', identity.identityId)
}

// Seed phrase discovery
const handleDiscoverSeedIdentities = async () => {
    if (seedWords.some(word => !word.trim())) {
        identityStore.connectionError = 'Please fill in all seed words'
        return
    }

    const seedPhrase = seedWords.join(' ').trim()
    if (seedPhrase.split(/\s+/).length !== parseInt(seedWordCount.value)) {
        identityStore.connectionError = `Please enter exactly ${seedWordCount.value} words`
        return
    }

    isSearchingSeed.value = true
    seedDiscoveryResults.value = []
    seedDiscoveryError.value = ''
    identityStore.clearConnectionError()

    console.log(`[Connect] Starting seed discovery for ${seedWordCount.value} word phrase`)

    try {
        const network = await getNetwork()
        console.log(`[Connect] Network: ${network}`)

        const identityManager = getIdentityManager()
        const result = await identityManager.discoverFromSeed(seedPhrase, {
            network,
            maxIdentityIndex: 5
        })

        console.log('[Connect] Seed discovery result:', result)

        if (result.success && result.identities && result.identities.length > 0) {
            seedDiscoveryResults.value = result.identities
            if (result.identities.length === 1) {
                // Auto-select if only one identity found
                selectedSeedIdentityId.value = result.identities[0].identityId
                manualIdentityId.value = result.identities[0].identityId
            }
            debugOutput.value = result.debug
        } else {
            seedDiscoveryError.value = result.error || 'No identities found for this seed phrase'
            debugOutput.value = result.debug
        }
    } catch (error: any) {
        console.error('[Connect] Seed discovery error:', error)
        seedDiscoveryError.value = error.message || 'Failed to discover identities from seed'
        debugOutput.value = { error: error.message, stack: error.stack }
    } finally {
        isSearchingSeed.value = false
    }
}

// Single key discovery
const handleDiscoverIdentity = async (key: string) => {
    if (!key.trim()) {
        identityStore.connectionError = 'Please enter a private key or public key'
        return
    }

    isDiscovering.value = true
    identityStore.clearConnectionError()
    debugOutput.value = null
    discoveredIdentity.value = null
    discoveryDetails.value = null
    currentInputKey.value = key

    console.log(`[Connect] Starting key discovery: ${key.substring(0, 20)}...`)

    try {
        const network = await getNetwork()
        console.log(`[Connect] Network: ${network}`)

        const identityManager = getIdentityManager()
        const result = await identityManager.discoverFromKey(key, { network })
        console.log('[Connect] Key discovery result:', result)

        debugOutput.value = result.debug || { step: 'unknown' }

        if (result.success && result.identity) {
            discoveredIdentity.value = result.identity
            manualIdentityId.value = result.identity.identityId
            identityStore.clearConnectionError()

            discoveryDetails.value = {
                detectedKeyType: result.detectedKeyType || 'Unknown',
                keyDescription: 'Key successfully discovered identity',
                keyIcon: 'CheckCircleIcon',
                associatedKeys: result.associatedKeys || []
            }

            console.log(`[Connect] Identity found: ${result.identity.identityId}`)
        } else {
            identityStore.connectionError = result.error || 'No identity found. Please enter Identity ID manually.'
            console.log('[Connect] Discovery failed:', result.error)
        }
    } catch (error: any) {
        console.error('[Connect] Key discovery error:', error)
        identityStore.connectionError = error.message || 'Failed to discover identity'
        debugOutput.value = { error: error.message, stack: error.stack }
    } finally {
        isDiscovering.value = false
    }
}

const handleResetDiscovery = () => {
    discoveredIdentity.value = null
    discoveryDetails.value = null
    manualIdentityId.value = ''
    currentInputKey.value = ''
    debugOutput.value = null
    seedDiscoveryResults.value = []
    seedDiscoveryError.value = ''
    selectedSeedIdentityId.value = ''
    identityStore.clearConnectionError()
}

const handleUseManualIdentity = () => {
    if (manualIdentityId.value.trim()) {
        discoveredIdentity.value = {
            identityId: manualIdentityId.value.trim(),
            balance: '0',
            revision: '0',
            publicKeys: [],
            dpnsUsername: null
        }
        identityStore.clearConnectionError()
    }
}

// Main connection handler
const handleConnect = async () => {
    if (!isFormValid.value) return

    identityStore.clearConnectionError()
    seedDiscoveryError.value = ''

    try {
        const network = await getNetwork()
        console.log(`[Connect] Network: ${network}`)

        if (connectionMethod.value === 'seed') {
            await handleConnectWithSeed(network)
        } else {
            await handleConnectWithKey(network)
        }
    } catch (error: any) {
        console.error('[Connect] Connection error:', error)
        identityStore.connectionError = error.message || 'Connection failed'
    }
}

const handleConnectWithSeed = async (network: 'mainnet' | 'testnet') => {
    const seedPhrase = seedWords.join(' ').trim()

    // If we have discovery results and a selected identity, use that
    let identityId = selectedSeedIdentityId.value
    if (!identityId && seedDiscoveryResults.value.length > 0) {
        identityId = seedDiscoveryResults.value[0].identityId
    }

    if (!identityId) {
        // No specific identity selected, discover first
        await handleDiscoverSeedIdentities()
        if (seedDiscoveryResults.value.length === 0) {
            seedDiscoveryError.value = 'No identities found. Please try again or use private key method.'
            return
        }
        identityId = seedDiscoveryResults.value[0].identityId
    }

    console.log(`[Connect] Connecting with seed phrase to identity: ${identityId}`)

    const result = await identityStore.connectWithSeed(seedPhrase, network)

    if (result.success) {
        console.log('[Connect] Seed connection successful')
        alert('Connected successfully!')
        router.push('/')
    } else {
        identityStore.connectionError = result.error || 'Failed to connect with seed phrase'
    }
}

const handleConnectWithKey = async (network: 'mainnet' | 'testnet') => {
    const identityId = discoveredIdentity.value?.identityId || manualIdentityId.value.trim()

    if (!identityId) {
        identityStore.connectionError = 'Please discover your identity or enter it manually'
        return
    }

    if (!currentInputKey.value.trim()) {
        identityStore.connectionError = 'No private key provided'
        return
    }

    console.log(`[Connect] Connecting with key to identity: ${identityId}`)

    const result = await identityStore.connectWithSingleKey(
        currentInputKey.value,
        identityId,
        network
    )

    if (result.success) {
        console.log('[Connect] Key connection successful')
        alert('Connected successfully!')
        router.push('/')
    } else {
        identityStore.connectionError = result.error || 'Failed to connect with private key'
    }
}

const clearSeedDiscovery = () => {
    seedDiscoveryResults.value = []
    seedDiscoveryError.value = ''
    selectedSeedIdentityId.value = ''
    manualIdentityId.value = ''
}

// Computed
const isFormValid = computed(() => {
    if (connectionMethod.value === 'seed') {
        // For seed, either have discovered identities or valid seed words
        if (seedDiscoveryResults.value.length > 0) {
            return true // Can connect with discovered identity
        }
        return seedWords.every(word => word.trim() !== '')
    } else {
        // For key, either have discovered identity or entered manual ID + have key
        const hasIdentity = discoveredIdentity.value || manualIdentityId.value.trim() !== ''
        const hasKey = currentInputKey.value.trim() !== ''
        return hasIdentity && hasKey
    }
})

const discoveryStatus = computed(() => {
    if (connectionMethod.value === 'seed') {
        if (isSearchingSeed.value) return 'Searching seed identities...'
        if (seedDiscoveryResults.value.length > 0) return `Found ${seedDiscoveryResults.value.length} identities`
        if (seedDiscoveryError.value) return 'Discovery failed'
        return 'Enter seed phrase to discover identities'
    } else {
        if (isDiscovering.value) return 'Searching for identity...'
        if (discoveredIdentity.value) return 'Identity found!'
        if (identityStore.connectionError) return 'Discovery failed'
        return 'Enter private key or public key'
    }
})

// Watch for word count changes
watch(seedWordCount, (newCount) => {
    const count = parseInt(newCount, 10)
    seedWords.length = 0
    for (let i = 0; i < count; i++) {
        seedWords.push('')
    }
    clearSeedDiscovery()
})

// Auto-search when all seed words are filled (debounced)
watch(seedWords, (newWords) => {
    if (seedSearchTimer.value) {
        clearTimeout(seedSearchTimer.value)
    }

    if (connectionMethod.value === 'seed' &&
        newWords.length === parseInt(seedWordCount.value) &&
        newWords.every(word => word.trim() !== '')) {

        if (!isSearchingSeed.value && seedDiscoveryResults.value.length === 0) {
            seedSearchTimer.value = setTimeout(async () => {
                await handleDiscoverSeedIdentities()
            }, 1000) // 1 second debounce
        }
    }
}, { deep: true })

watch(connectionMethod, () => {
    clearSeedDiscovery()
    handleResetDiscovery()
})

// Initialize
onMounted(() => {
    console.log('[Connect] Component mounted')
})

onUnmounted(() => {
    if (seedSearchTimer.value) {
        clearTimeout(seedSearchTimer.value)
    }
    // Clean up identity manager resources
    const identityManager = getIdentityManager()
    identityManager.cleanup()
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
