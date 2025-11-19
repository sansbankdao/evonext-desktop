<!-- src/screens/Connect.vue -->
<template>
    <main class="min-h-screen bg-slate-900">
        <!-- Header (unchanged) -->
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-slate-700 p-4">
            <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h1 class="text-3xl font-bold text-white">
                    Connect to Dash
                </h1>
            </div>

            <div class="flex items-center gap-3 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-slate-700 w-full sm:w-auto mt-4 sm:mt-0">
                <div class="flex-grow flex flex-col overflow-hidden">
                    <span class="text-cyan-100 text-base font-semibold px-2 tracking-wide truncate">
                        BetaTesterExtraordinaire
                    </span>
                    <span class="text-slate-400 text-xs font-mono px-2 tracking-tight truncate">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </div>

                <button @click="copyAddress" class="p-2 rounded-md hover:bg-slate-700/50 transition-colors flex-shrink-0 relative">
                    <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="h-5 w-5 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
            <div class="max-w-2xl w-full mx-auto space-y-8">
                <!-- Page Header (unchanged) -->
                <div class="text-center space-y-3">
                    <h2 class="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-2">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Connect to Dash Platform
                    </h2>
                    <p class="text-slate-400 text-sm leading-relaxed">
                        Securely access your identity using one of the methods below. Your data stays local.
                    </p>
                </div>

                <!-- Connection Method Tabs (unchanged) -->
                <div class="bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg border border-slate-700 flex">
                    <button
                        @click="connectionMethod = 'seed'"
                        :class="[
                            'flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all duration-200',
                            connectionMethod === 'seed'
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        ]"
                    >
                        <svg v-if="connectionMethod === 'seed'" class="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                        </svg>
                        <span>Seed Phrase</span>
                    </button>
                    <button
                        @click="connectionMethod = 'privateKey'"
                        :class="[
                            'flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all duration-200',
                            connectionMethod === 'privateKey'
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        ]"
                    >
                        <svg v-if="connectionMethod === 'privateKey'" class="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                        </svg>
                        <span>Private Keys</span>
                    </button>
                </div>

                <!-- Security Warning (unchanged) -->
                <div class="bg-amber-900/20 border border-amber-800/50 text-amber-300 p-4 rounded-xl flex items-start gap-3 shadow-lg">
                    <svg class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 class="font-semibold text-sm mb-1">Security Notice</h3>
                        <p class="text-sm leading-relaxed">Your credentials are processed locally and never sent to any server. Always connect in a secure, private environment.</p>
                    </div>
                </div>

                <!-- Form Container -->
                <form @submit.prevent="connect" class="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl space-y-6 shadow-lg border border-slate-700">
                    <!-- SEED PHRASE FORM (unchanged) -->
                    <div v-if="connectionMethod === 'seed'" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                                </svg>
                                Phrase Length
                            </label>
                            <fieldset class="grid grid-cols-2 gap-3">
                                <label :class="[
                                    'flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 shadow-sm group',
                                    wordCount === '12'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 border-cyan-500 text-white shadow-cyan-500/25'
                                        : 'border-slate-600/50 text-slate-400 hover:border-cyan-500 hover:bg-slate-700/30 hover:text-white'
                                ]">
                                    <input type="radio" value="12" v-model="wordCount" class="sr-only">
                                    <span class="font-semibold text-sm">12 Words</span>
                                </label>
                                <label :class="[
                                    'flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 shadow-sm group',
                                    wordCount === '24'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 border-cyan-500 text-white shadow-cyan-500/25'
                                        : 'border-slate-600/50 text-slate-400 hover:border-cyan-500 hover:bg-slate-700/30 hover:text-white'
                                ]">
                                    <input type="radio" value="24" v-model="wordCount" class="sr-only">
                                    <span class="font-semibold text-sm">24 Words</span>
                                </label>
                            </fieldset>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <div v-for="(_word, index) in seedWords" :key="index" class="relative group">
                                <span class="absolute -top-6 left-0 text-xs text-slate-500 font-mono bg-slate-900 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">{{ index + 1 }}</span>
                                <input
                                    v-model="seedWords[index]"
                                    type="text"
                                    autocomplete="off"
                                    spellcheck="false"
                                    :placeholder="index + 1"
                                    class="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pt-8 pb-2 px-3 text-center text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-200 font-mono text-sm tracking-wide"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- PRIVATE KEYS FORM (updated placeholders for WIF/HEX support) -->
                    <div v-if="connectionMethod === 'privateKey'" class="space-y-6">
                        <div>
                            <label for="identityId" class="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Identity ID
                            </label>
                            <input
                                id="identityId"
                                type="text"
                                v-model="identityId"
                                placeholder="e.g., 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk"
                                class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-200 font-mono text-sm"
                                required
                            />
                        </div>

                        <div class="space-y-4">
                            <div>
                                <label for="authKey" class="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.413a2.7 2.7 0 001.946-.661 2.7 2.7 0 014.438 0 2.7 2.7 0 001.946.661 2.7 2.7 0 012.611 2.611v3.686a2.7 2.7 0 002.611 2.611h2.064a2.7 2.7 0 001.946.661 2.704 2.704 0 01.682 2.15 2.7 2.7 0 00.661 2.146 2.7 2.7 0 000 3.806 2.7 2.7 0 00-.661 2.146 2.7 2.7 0 01-.946 1.946 2.7 2.7 0 01-2.146.682 2.7 2.7 0 01-1.946-.661V23a2.7 2.7 0 01-2.611-2.611H4.413a2.7 2.7 0 01-2.611-2.611 2.7 2.7 0 00-.661-1.946 2.7 2.7 0 010-3.806 2.7 2.7 0 00.661-2.146 2.7 2.7 0 01.946-1.946 2.7 2.7 0 012.146-.682h3.686z" />
                                    </svg>
                                    Authorization Key (WIF or HEX)
                                </label>
                                <p class="text-xs text-slate-500 mb-2">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>
                                <input
                                    id="authKey"
                                    type="password"
                                    v-model="authKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-200 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label for="transferKey" class="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Transfer Key (WIF or HEX)
                                </label>
                                <p class="text-xs text-slate-500 mb-2">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>
                                <input
                                    id="transferKey"
                                    type="password"
                                    v-model="transferKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-200 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label for="encryptionKey" class="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                                    </svg>
                                    Encryption Key (WIF or HEX)
                                </label>
                                <p class="text-xs text-slate-500 mb-2">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>
                                <input
                                    id="encryptionKey"
                                    type="password"
                                    v-model="encryptionKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-200 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Helper Text for Private Keys (new addition) -->
                    <div v-if="connectionMethod === 'privateKey'" class="text-xs text-slate-500 text-center italic p-3 bg-slate-900/50 rounded-lg">
                        <svg class="w-4 h-4 inline mr-1 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        At least one key is required. The backend will handle WIF (compressed/uncompressed) or raw HEX private keys (64 hex characters). Empty fields will be ignored.
                    </div>

                    <!-- Error Message Display (unchanged) -->
                    <div v-if="error" class="bg-red-900/30 border border-red-800/50 text-red-300 p-4 rounded-lg text-sm font-medium text-center shadow-md">
                        <svg class="w-4 h-4 inline mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {{ error }}
                    </div>

                    <!-- Action Button (unchanged) -->
                    <div class="pt-4">
                        <button
                            type="submit"
                            :disabled="!isFormValid || isLoading"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:from-cyan-500 hover:to-cyan-400 hover:shadow-cyan-500/25 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                            <svg v-if="isLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ isLoading ? 'Connecting...' : 'Connect Securely' }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')

// Controls whether we show 12 or 24 input fields
const wordCount = ref<'12' | '24'>('12')

/* Initialize an array to hold the words from the input fields. */
// NOTE: We use `reactive` because we will be changing its size.
const seedWords = reactive<string[]>(Array(12).fill(''))

/* Initialize local handlers. */
const identityId = ref('')
const authKey = ref('') // Authorization Key (WIF or HEX)
const transferKey = ref('') // Transfer Key (WIF or HEX)
const encryptionKey = ref('') // Encryption Key (WIF or HEX)

// State for loading and error feedback
const isLoading = ref(false)
const error = ref<string | null>(null)

// Copy address state (from wallet pattern)
const isCopied = ref(false)
const copyAddress = async () => {
    const address = 'v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5' // Mock; use from store in real app
    if (isCopied.value) return
    try {
        await navigator.clipboard.writeText(address)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy address: ', err)
    }
}

// --- Logic ---

// Watch for changes in the word count and resize the seedWords array accordingly.
watch(wordCount, (newCount) => {
    const count = parseInt(newCount, 10)
    seedWords.length = 0 // NOTE: Clear the array.
    for (let i = 0; i < count; i++) {
        seedWords.push('')
    }
})

// A computed property to check if all inputs are filled, used to disable the button.
// For seed: All words must be filled.
// For private keys: Identity ID + at least one key (WIF or HEX) non-empty.
const isFormValid = computed(() => {
    if (connectionMethod.value === 'seed') {
        return seedWords.every(word => word.trim() !== '')
    } else {
        // Trim to check non-empty; no format validation in UI (backend handles WIF/HEX parsing)
        return identityId.value.trim() !== '' &&
               (authKey.value.trim() !== '' || transferKey.value.trim() !== '' || encryptionKey.value.trim() !== '')
    }
})

// The main function to handle the connection process.
const connect = async () => {
    /* Validate form values. */
    if (!isFormValid.value) return

    /* Set flags. */
    isLoading.value = true
    error.value = null

    /* Initialize locals. */
    let payload

    try {
        if (connectionMethod.value === 'seed') {
            console.log(`Attempting to connect with a ${wordCount.value}-word mnemonic.`)
            /* Join the array into a single space-separated string. */
            const mnemonic = seedWords.join(' ')

            /* Set payload. */
            payload = { mnemonic }

            /* Save mnemonic. */
            await invoke('save_mnemonic', { payload })
        } else { // privateKey
            console.log(`Attempting to connect with private keys (WIF or HEX).`)
            /* Set payload with all three keys (empty strings if not provided). */
            /* Backend should parse WIF (if starts with cN/Kw/KL) or accept raw HEX (64 chars). */
            payload = {
                identity_id: identityId.value.trim(),
                auth_key: authKey.value.trim(), // Authorization Key (WIF or HEX)
                transfer_key: transferKey.value.trim(), // Transfer Key (WIF or HEX)
                encryption_key: encryptionKey.value.trim() // Encryption Key (WIF or HEX)
            }

            /* Save private keys (backend handles format: WIF decode or HEX as-is). */
            await invoke('save_private_keys', { payload })
        }

        alert('Connection Successful! Navigating to home screen...')
        // Example: router.push('/wallet')
        router.push('/') // Navigate to home after success
    } catch (err: any) {
        console.error('Connection failed:', err)
        error.value = typeof err === 'string' ? err : 'An unknown error occurred. Check key formats (WIF or 64-char HEX).'
    } finally {
        isLoading.value = false
    }
}
</script>
