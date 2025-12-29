<!-- src/screens/Connect.vue (Updated with proper typing) -->
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
                <form @submit.prevent="connect" class="space-y-6">
                    <!-- SEED PHRASE FORM -->
                    <ConnectSeedForm
                        v-if="connectionMethod === 'seed'"
                        v-model:wordCount="wordCount"
                        v-model:seedWords="seedWords"
                        @paste="handlePaste"
                    />

                    <!-- SINGLE PRIVATE KEY FORM -->
                    <div v-if="connectionMethod === 'privateKey'" class="space-y-6">
                        <!-- Private Key Input -->
                        <div class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                                <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Any Private Key</h3>
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Enter any one of your private keys (Authentication, Encryption, or Transfer).
                                We'll automatically discover your identity and all registered keys.
                            </p>

                            <div class="space-y-4">
                                <!-- Key Type Selection -->
                                <div>
                                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9m4 0a4 4 0 100-8 4 4 0 000 8z" />
                                        </svg>
                                        Key Type
                                    </label>
                                    <select
                                        v-model="selectedKeyType"
                                        class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 text-sm"
                                    >
                                        <option value="authentication">Authentication Key</option>
                                        <option value="transfer">Transfer Key</option>
                                        <option value="encryption">Encryption Key</option>
                                        <option value="unknown">Unknown Type (Auto-detect)</option>
                                    </select>
                                </div>

                                <!-- Single Key Input -->
                                <div>
                                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                                        </svg>
                                        Private Key (WIF or HEX)
                                    </label>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Enter as WIF (starts with cN/Kw) or raw HEX (64 characters). Accepts any key type.
                                    </p>
                                    <input
                                        type="password"
                                        v-model="privateKey"
                                        placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                        class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                        @input="clearDiscoveredIdentity"
                                    />
                                </div>

                                <!-- Discover Button -->
                                <button
                                    @click.prevent="discoverIdentity"
                                    :disabled="!privateKey.trim() || isDiscovering"
                                    class="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    <svg v-if="isDiscovering" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span>{{ isDiscovering ? 'Discovering...' : 'Discover Identity' }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Discovered Identity Display -->
                        <div v-if="discoveredIdentity" class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                                    <h3 class="font-bold text-emerald-800 dark:text-emerald-300">Identity Discovered</h3>
                                </div>
                                <span class="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">Auto-detected</span>
                            </div>

                            <!-- Identity Details -->
                            <div class="space-y-4">
                                <div>
                                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Identity Details
                                    </label>
                                    <div class="space-y-3">
                                        <!-- Identity ID -->
                                        <div class="flex items-start gap-2">
                                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px] pt-1">Identity ID:</span>
                                            <div class="flex-1">
                                                <code class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg break-all block">
                                                    {{ discoveredIdentity.identityId }}
                                                </code>
                                                <div class="flex justify-end mt-1">
                                                    <button @click="copyToClipboard(discoveredIdentity.identityId)" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- DPNS Name (if available) -->
                                        <div v-if="discoveredIdentity.dpnsUsername" class="flex items-center gap-2">
                                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">DPNS Name:</span>
                                            <span class="text-blue-600 dark:text-blue-400 font-medium">{{ discoveredIdentity.dpnsUsername }}</span>
                                        </div>

                                        <!-- Balance -->
                                        <div class="flex items-center gap-2">
                                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Balance:</span>
                                            <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {{ formatBalance(discoveredIdentity.balance) }} Dash
                                            </span>
                                        </div>

                                        <!-- Revision -->
                                        <div class="flex items-center gap-2">
                                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Revision:</span>
                                            <span class="text-slate-700 dark:text-slate-300">{{ discoveredIdentity.revision }}</span>
                                        </div>

                                        <!-- Found Keys Summary -->
                                        <div class="flex items-center gap-2">
                                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Keys Found:</span>
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span :class="[
                                                        'px-2 py-1 rounded text-xs font-medium',
                                                        keyCounts.authenticationKeys > 0 ?
                                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                    ]">
                                                        Auth: {{ keyCounts.authenticationKeys }}
                                                    </span>
                                                    <span :class="[
                                                        'px-2 py-1 rounded text-xs font-medium',
                                                        keyCounts.transferKeys > 0 ?
                                                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                    ]">
                                                        Transfer: {{ keyCounts.transferKeys }}
                                                    </span>
                                                    <span :class="[
                                                        'px-2 py-1 rounded text-xs font-medium',
                                                        keyCounts.encryptionKeys > 0 ?
                                                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                    ]">
                                                        Encryption: {{ keyCounts.encryptionKeys }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Manual Identity Input -->
                        <div v-if="!discoveredIdentity && !showManualIdentity" class="text-center">
                            <button
                                @click="showManualIdentity = true"
                                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
                            >
                                Can't discover identity? Enter Identity ID manually
                            </button>
                        </div>

                        <!-- Manual Identity Form -->
                        <div v-if="showManualIdentity" class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                                    <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Identity Manually</h3>
                                </div>
                                <button @click="showManualIdentity = false" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                    Cancel
                                </button>
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-400">
                                If auto-discovery fails, you can manually enter your Identity ID or DPNS name.
                            </p>
                            <div>
                                <label for="manualIdentityId" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Identity ID or DPNS Name
                                </label>
                                <input
                                    id="manualIdentityId"
                                    type="text"
                                    v-model="manualIdentityId"
                                    placeholder="username.dash or 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk"
                                    class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-slate-400/30 focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Helper Text -->
                    <div class="text-xs text-slate-500 dark:text-slate-400 text-center italic p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <svg class="w-4 h-4 inline mr-2 -ml-0.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span v-if="connectionMethod === 'seed'">
                            Your seed phrase is never sent to any server. All operations happen locally.
                        </span>
                        <span v-else>
                            Enter ANY of your private keys (Authentication, Transfer, or Encryption). We'll discover your identity and all associated keys.
                        </span>
                    </div>

                    <!-- Error Message Display -->
                    <ConnectErrorDisplay
                        v-if="identityStore.connectionError"
                        :error="identityStore.connectionError"
                    />

                    <!-- Action Button -->
                    <div class="pt-6">
                        <button
                            type="submit"
                            :disabled="!isFormValid || identityStore.isConnecting || isDiscovering"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-cyan-600 hover:to-cyan-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-cyan-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                        >
                            <svg v-if="identityStore.isConnecting || isDiscovering" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ identityStore.isConnecting || isDiscovering ? 'Processing...' : 'Connect Securely' }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import getNetwork from '@/libs/getNetwork'
import { useIdentityStore } from '@/stores/identity'
import { IdentityDiscoveryService, type DiscoveredIdentity } from '@/services/identityDiscovery.service'
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'
const router = useRouter()
const identityStore = useIdentityStore()

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')
const wordCount = ref<'12' | '24'>('12')
const seedWords = reactive<string[]>(Array(12).fill(''))

// Single private key input
const privateKey = ref('')
const selectedKeyType = ref<'authentication' | 'transfer' | 'encryption' | 'unknown'>('unknown')
const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
const manualIdentityId = ref('')
const showManualIdentity = ref(false)
const isDiscovering = ref(false)

const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
    connectionMethod.value = method
    // Reset discovery state when switching methods
    discoveredIdentity.value = null
    manualIdentityId.value = ''
    showManualIdentity.value = false
    privateKey.value = ''
}

const handlePaste = (words: string[]) => {
    const totalSlots = seedWords.length
    seedWords.length = 0
    for (let i = 0; i < totalSlots; i++) {
        seedWords.push(words[i] || '')
    }
}

// Watch for changes in the word count and resize the seedWords array accordingly.
watch(wordCount, (newCount) => {
    const count = parseInt(newCount, 10)
    seedWords.length = 0
    for (let i = 0; i < count; i++) {
        seedWords.push('')
    }
})

const isFormValid = computed(() => {
    if (connectionMethod.value === 'seed') {
        // All seed words must be non-empty
        return seedWords.every(word => word.trim() !== '')
    } else {
        // For single private key:
        // 1. Must have a private key entered
        // 2. Must have either discovered identity OR manual identity ID
        const hasPrivateKey = privateKey.value.trim() !== ''
        const hasIdentity = discoveredIdentity.value || manualIdentityId.value.trim() !== ''
        return hasPrivateKey && hasIdentity
    }
})

// Key counts computed property
const keyCounts = computed(() => {
    if (!discoveredIdentity.value?.publicKeys) {
        return { authenticationKeys: 0, transferKeys: 0, encryptionKeys: 0 }
    }
    return IdentityDiscoveryService.extractKeyTypes(discoveredIdentity.value)
})

// Clear discovered identity when user changes the key
const clearDiscoveredIdentity = () => {
    discoveredIdentity.value = null
    showManualIdentity.value = false
}

const discoverIdentity = async () => {
    if (!privateKey.value.trim()) {
        identityStore.connectionError = 'Please enter a private key to discover identity'
        return
    }

    isDiscovering.value = true
    identityStore.clearConnectionError()

    try {
        const network = await getNetwork()
        if (network !== 'mainnet' && network !== 'testnet') {
            identityStore.connectionError = 'Invalid network configuration'
            return
        }
        // Use single key discovery
        const result = await IdentityDiscoveryService.discoverIdentityFromSingleKey(privateKey.value, network)
        if (result.success && result.identity) {
            discoveredIdentity.value = result.identity
            manualIdentityId.value = result.identity.identityId
            identityStore.clearConnectionError()
        } else {
            identityStore.connectionError = result.error || 'Failed to discover identity. Please enter Identity ID manually.'
            showManualIdentity.value = true
        }
    } catch (err: any) {
        console.error('Error discovering identity:', err)
        identityStore.connectionError = 'Failed to discover identity. Please enter Identity ID manually.'
        showManualIdentity.value = true
    } finally {
        isDiscovering.value = false
    }
}

const useDiscoveredIdentity = () => {
    if (discoveredIdentity.value) {
        // Already using discovered identity
        console.log('Using discovered identity:', discoveredIdentity.value)
    }
}

const useManualIdentity = () => {
    if (manualIdentityId.value.trim()) {
        console.log('Using manual identity ID:', manualIdentityId.value)
        discoveredIdentity.value = {
            identityId: manualIdentityId.value,
            balance: '0',
            revision: '0',
            publicKeys: []
        }
    }
}

const formatBalance = (balance: string): string => {
    if (!balance) return '0.00000000'
    try {
        const bigIntBalance = BigInt(balance)
        const dashBalance = Number(bigIntBalance) / 100000000
        return dashBalance.toFixed(8)
    } catch {
        return '0.00000000'
    }
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Copied to clipboard:', text)
        })
        .catch(err => {
            console.error('Failed to copy:', err)
        })
}

const connect = async () => {
    if (!isFormValid.value) return

    identityStore.clearConnectionError()

    const network = await getNetwork()

    if (network !== 'mainnet' && network !== 'testnet') {
        identityStore.connectionError = 'Invalid network configuration'
        return
    }

    let result

    try {
        if (connectionMethod.value === 'seed') {
            const seedPhrase = seedWords.join(' ')
            result = await identityStore.connectWithSeed(seedPhrase, network)
        } else {
            const trimmedKey = privateKey.value.trim()

            // Use discovered identity or manual ID
            const identityId = discoveredIdentity.value?.identityId || manualIdentityId.value.trim()

            if (!identityId) {
                identityStore.connectionError = 'Please discover your identity or enter it manually'
                return
            }

            // For single key mode, we pass the same key for all three positions
            // The store will handle discovery of other keys from the identity
            result = await identityStore.connectWithPrivateKeys(
                identityId,
                trimmedKey, // auth key
                trimmedKey, // transfer key (will be discovered from identity)
                trimmedKey, // encryption key (will be discovered from identity)
                network
            )
        }

        if (result.success) {
            alert('Connection Successful! Navigating to home screen...')
            router.push('/')
        } else {
            console.error('Connection failed:', result.error)
        }
    } catch (err: any) {
        console.error('Unexpected error in connect:', err)
        identityStore.connectionError = 'An unexpected error occurred during connection.'
    }
}
</script>
