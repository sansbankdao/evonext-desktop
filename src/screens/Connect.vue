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

                    <!-- PRIVATE KEYS FORM -->
                    <ConnectPrivateKeyForm
                        v-if="connectionMethod === 'privateKey'"
                        v-model:authKey="authKey"
                        v-model:transferKey="transferKey"
                        v-model:encryptionKey="encryptionKey"
                        v-model:discoveredIdentity="discoveredIdentity"
                        v-model:manualIdentityId="manualIdentityId"
                        @discover-identity="discoverIdentity"
                        @use-discovered-identity="useDiscoveredIdentity"
                        @use-manual-identity="useManualIdentity"
                    />

                    <!-- Error Message Display -->
                    <ConnectErrorDisplay
                        v-if="identityStore.connectionError"
                        :error="identityStore.connectionError"
                    />

                    <!-- Action Button -->
                    <div class="pt-6">
                        <button
                            type="submit"
                            :disabled="!isFormValid || identityStore.isConnecting"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-cyan-600 hover:to-cyan-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-cyan-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                        >
                            <svg v-if="identityStore.isConnecting" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ identityStore.isConnecting ? 'Connecting...' : 'Connect Securely' }}</span>
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
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectPrivateKeyForm from '@/components/connect/ConnectPrivateKeyForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'

const router = useRouter()
const identityStore = useIdentityStore()

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')
const wordCount = ref<'12' | '24'>('12')
const seedWords = reactive<string[]>(Array(12).fill(''))
const authKey = ref('')
const transferKey = ref('')
const encryptionKey = ref('')
const discoveredIdentity = ref<any>(null)
const manualIdentityId = ref('')

const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
    connectionMethod.value = method
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
        return seedWords.every(word => word.trim() !== '')
    } else {
        // For private keys, require at least one key and either discovered identity or manual ID
        const hasKeys = authKey.value.trim() !== '' ||
                       transferKey.value.trim() !== '' ||
                       encryptionKey.value.trim() !== ''
        const hasIdentity = discoveredIdentity.value || manualIdentityId.value.trim() !== ''
        return hasKeys && hasIdentity
    }
})

const discoverIdentity = async () => {
    // Placeholder - implement actual discovery logic
    console.log('Discovering identity from keys...')
}

const useDiscoveredIdentity = () => {
    if (discoveredIdentity.value) {
        // Set the identity ID from discovered identity
        // This would be implemented based on your identity discovery logic
        console.log('Using discovered identity:', discoveredIdentity.value)
    }
}

const useManualIdentity = () => {
    if (manualIdentityId.value.trim()) {
        console.log('Using manual identity ID:', manualIdentityId.value)
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
            const seedPhrase = seedWords.join(' ')
            result = await identityStore.connectWithSeed(seedPhrase, network)
        } else {
            const trimmedAuth = authKey.value.trim()
            const trimmedTransfer = transferKey.value.trim()
            const trimmedEncryption = encryptionKey.value.trim()

            // Use discovered identity if available, otherwise manual ID
            const identityId = discoveredIdentity.value?.identityId || manualIdentityId.value.trim()

            if (!identityId) {
                identityStore.connectionError = 'Please enter an identity ID or discover one from your keys'
                return
            }

            result = await identityStore.connectWithPrivateKeys(
                identityId,
                trimmedAuth,
                trimmedTransfer,
                trimmedEncryption,
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
