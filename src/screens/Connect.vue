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
                <form @submit.prevent="connect" class="space-y-6">
                    <!-- SEED PHRASE FORM -->
                    <ConnectSeedForm
                        v-if="connectionMethod === 'seed'"
                        v-model:wordCount="wordCount"
                        v-model:seedWords="seedWords"
                        @paste="handlePaste"
                    />

                    <!-- SINGLE PRIVATE KEY FORM -->
                    <KeyDiscoveryForm
                        v-else
                        :discovered-identity="discoveredIdentity"
                        :discovery-details="discoveryDetails"
                        :manual-identity-id="manualIdentityId"
                        :is-discovering="isDiscovering"
                        @update:manual-identity-id="manualIdentityId = $event"
                        @discover-identity="handleDiscoverIdentity"
                        @reset-discovery="handleResetDiscovery"
                        @use-manual-identity="handleUseManualIdentity"
                    />

                    <!-- Helper Text -->
                    <div class="text-xs text-slate-500 dark:text-slate-400 text-center italic p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <svg class="w-4 h-4 inline mr-2 -ml-0.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span v-if="connectionMethod === 'seed'">
                            Your seed phrase is never sent to any server. All operations happen locally.
                        </span>
                        <span v-else>
                            Enter ANY of your private keys. We'll discover your identity and all associated keys.
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
import { IdentityDiscoveryService } from '@/services/identityDiscovery.service'
import type { DiscoveredIdentity, IdentityDiscoveryDetails } from '@/types'
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'
import KeyDiscoveryForm from '@/components/connect/KeyDiscoveryForm.vue'

const router = useRouter()
const identityStore = useIdentityStore()

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')
const wordCount = ref<'12' | '24'>('12')
const seedWords = reactive<string[]>(Array(12).fill(''))

// Private key discovery state
const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
const discoveryDetails = ref<IdentityDiscoveryDetails | null>(null)
const manualIdentityId = ref('')
const isDiscovering = ref(false)

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

watch(wordCount, (newCount) => {
    const count = parseInt(newCount, 10)
    seedWords.length = 0
    for (let i = 0; i < count; i++) {
        seedWords.push('')
    }
})

const isFormValid = computed(() => {
    if (connectionMethod.value === 'seed') {
        return seedWords.every(word => word.trim() !== '')
    } else {
        const hasIdentity = discoveredIdentity.value || manualIdentityId.value.trim() !== ''
        return hasIdentity
    }
})

const handleResetDiscovery = () => {
    discoveredIdentity.value = null
    discoveryDetails.value = null
    manualIdentityId.value = ''
}

const handleDiscoverIdentity = async (key: string) => {
    if (!key.trim()) {
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

        // Use the new enhanced discovery method
        const result = await IdentityDiscoveryService.discoverIdentityFromAnyKey(key, network)

        if (result.success && result.identity && result.associatedKeys) {
            discoveredIdentity.value = result.identity
            manualIdentityId.value = result.identity.identityId
            identityStore.clearConnectionError()

            // Map the result to our UI detail type
            discoveryDetails.value = {
                detectedKeyType: result.detectedKeyType || 'Unknown',
                keyDescription: IdentityDiscoveryService.getKeyDescription(result.detectedKeyType || ''),
                keyIcon: IdentityDiscoveryService.getKeyIcon(result.detectedKeyType || ''),
                associatedKeys: result.associatedKeys
            }
        } else {
            identityStore.connectionError = result.error || 'Failed to discover identity. Please enter Identity ID manually.'
            // If discovery fails, we implicitly show manual input by clearing discovery
        }
    } catch (err: any) {
        console.error('Error discovering identity:', err)
        identityStore.connectionError = 'Failed to discover identity. Please enter Identity ID manually.'
    } finally {
        isDiscovering.value = false
    }
}

const handleUseManualIdentity = (id: string) => {
    manualIdentityId.value = id
    discoveredIdentity.value = {
        identityId: id,
        balance: '0',
        revision: '0',
        publicKeys: []
    }
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
            // FIX: Ensure network is passed correctly to the seed handler
            const seedPhrase = seedWords.join(' ')
            result = await identityStore.connectWithSeed(seedPhrase, network)
        } else {
            const identityId = discoveredIdentity.value?.identityId || manualIdentityId.value.trim()

            if (!identityId) {
                identityStore.connectionError = 'Please discover your identity or enter it manually'
                return
            }

            // For single key mode, pass the identityId directly.
            // Note: The store handles the actual key material if it was stored during discovery,
            // or we might need to pass the raw key if the store expects it.
            // Assuming the store can handle just Identity ID if keys were already discovered
            // or we need to pass the raw key. Based on the regression error, it seems
            // we might need to pass the raw key back.
            // We will use `null` for keys here to rely on store discovery,
            // or pass the last used key if available.
            result = await identityStore.connectWithPrivateKeys(
                identityId,
                null, // auth key
                null, // transfer key
                null, // encryption key
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
