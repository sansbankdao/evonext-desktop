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
                <div class="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            @click="connectionMethod = 'seed'"
                            :class="[
                                'py-4 px-6 text-center font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5',
                                connectionMethod === 'seed'
                                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:from-cyan-600 hover:to-cyan-700 ring-2 ring-cyan-400/30 col-span-1'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white col-span-1'
                            ]"
                        >
                            <svg v-if="connectionMethod === 'seed'" class="w-5 h-5 inline ml-1 mb-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                            </svg>
                            <span>Seed Phrase</span>
                        </button>

                        <button
                            @click="connectionMethod = 'privateKey'"
                            :class="[
                                'py-4 px-6 text-center font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5',
                                connectionMethod === 'privateKey'
                                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:from-cyan-600 hover:to-cyan-700 ring-2 ring-cyan-400/30 col-span-1'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white col-span-1'
                            ]"
                        >
                            <svg v-if="connectionMethod === 'privateKey'" class="w-5 h-5 inline ml-1 mb-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                            </svg>
                            <span>Private Keys</span>
                        </button>
                    </div>
                </div>

                <!-- Security Warning -->
                <div class="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 p-6 rounded-2xl shadow-lg flex items-start gap-3">
                    <svg class="w-6 h-6 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>

                    <div>
                        <h3 class="font-bold text-base mb-2">Security Notice</h3>
                        <p class="text-sm leading-relaxed">Your credentials are processed locally and never sent to any server. Always connect in a secure, private environment.</p>
                    </div>
                </div>

                <!-- Form Container -->
                <form @submit.prevent="connect" class="space-y-6">
                    <!-- SEED PHRASE FORM -->
                    <div v-if="connectionMethod === 'seed'" class="space-y-6">
                        <div>
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                                </svg>
                                Phrase Length
                            </label>

                            <fieldset class="grid grid-cols-2 gap-3">
                                <label :class="[
                                    'flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group',
                                    wordCount === '12'
                                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'
                                ]">
                                    <input type="radio" value="12" v-model="wordCount" class="sr-only">
                                    <span class="font-bold text-lg">12 Words</span>
                                </label>

                                <label :class="[
                                    'flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group',
                                    wordCount === '24'
                                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'
                                ]">
                                    <input type="radio" value="24" v-model="wordCount" class="sr-only">
                                    <span class="font-bold text-lg">24 Words</span>
                                </label>
                            </fieldset>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <div v-for="(_word, index) in seedWords" :key="index" class="relative group">
                                <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-900/90 dark:bg-slate-800/90 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-md z-10">{{ index + 1 }}</span>
                                <input
                                    v-model="seedWords[index]"
                                    @paste.prevent="handlePaste"
                                    type="text"
                                    autocomplete="off"
                                    spellcheck="false"
                                    :placeholder="(index + 1).toString()"
                                    class="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl pt-10 pb-3 px-4 text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm tracking-wide shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- PRIVATE KEYS FORM -->
                    <div v-if="connectionMethod === 'privateKey'" class="space-y-6">
                        <div>
                            <label for="identityId" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Username or Identity ID
                            </label>

                            <input
                                id="identityId"
                                type="text"
                                v-model="identityId"
                                placeholder="e.g., username.dash or 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk"
                                class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                required
                            />
                        </div>

                        <!-- Divider Separator -->
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t-2 border-slate-200 dark:border-slate-600"></div>
                            </div>
                            <div class="relative flex justify-center text-xs">
                                <span class="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">Platform Private Keys</span>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <label for="authKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.413a2.7 2.7 0 001.946-.661 2.7 2.7 0 014.438 0 2.7 2.7 0 001.946.661 2.7 2.7 0 012.611 2.611v3.686a2.7 2.7 0 002.611 2.611h2.064a2.7 2.7 0 001.946.661 2.704 2.704 0 01.682 2.15 2.7 2.7 0 00.661 2.146 2.7 2.7 0 000 3.806 2.7 2.7 0 00-.661 2.146 2.7 2.7 0 01-.946 1.946 2.7 2.7 0 01-2.146.682 2.7 2.7 0 01-1.946-.661V23a2.7 2.7 0 01-2.611-2.611H4.413a2.7 2.7 0 01-2.611-2.611 2.7 2.7 0 00-.661-1.946 2.7 2.7 0 010-3.806 2.7 2.7 0 00.661-2.146 2.7 2.7 0 01.946-1.946 2.7 2.7 0 012.146-.682h3.686z" />
                                    </svg>
                                    Authentication Key (WIF or HEX)
                                </label>

                                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>

                                <input
                                    id="authKey"
                                    type="password"
                                    v-model="authKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                />
                            </div>

                            <div>
                                <label for="transferKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Transfer Key (WIF or HEX)
                                </label>

                                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>

                                <input
                                    id="transferKey"
                                    type="password"
                                    v-model="transferKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                />
                            </div>

                            <div>
                                <label for="encryptionKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                                    </svg>
                                    Encryption Key (WIF or HEX)
                                </label>

                                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Enter as WIF (starts with cN/Kw) or raw HEX (64 characters).</p>

                                <input
                                    id="encryptionKey"
                                    type="password"
                                    v-model="encryptionKey"
                                    placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                                    class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Helper Text for Private Keys -->
                    <div v-if="connectionMethod === 'privateKey'" class="text-xs text-slate-500 dark:text-slate-400 text-center italic p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <svg class="w-5 h-5 inline mr-2 -ml-0.5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Username will be resolved to Identity ID via DPNS (if valid). At least one key is required. WIF (compressed/uncompressed) or raw HEX private keys are supported.
                    </div>

                    <!-- Error Message Display -->
                    <div v-if="identityStore.connectionError" class="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-6 rounded-2xl text-sm font-bold text-center shadow-lg flex items-start gap-3">
                        <svg class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {{ identityStore.connectionError }}
                    </div>

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
/* Import modules. */
import { ref, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

import getNetwork from '@/libs/getNetwork'
import { useIdentityStore } from '@/stores/identity'
import Header from '@/components/Header.vue'

const router = useRouter()
const identityStore = useIdentityStore()

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')

// Controls whether we show 12 or 24 input fields
const wordCount = ref<'12' | '24'>('12')

/* Initialize an array to hold the words from the input fields. */
// NOTE: We use `reactive` because we will be changing its size.
const seedWords = reactive<string[]>(Array(12).fill(''))

/* Initialize local handlers. */
const identityId = ref('') // Username or Identity ID
const authKey = ref('') // Authentication Key (WIF or HEX)
const transferKey = ref('') // Transfer Key (WIF or HEX)
const encryptionKey = ref('') // Encryption Key (WIF or HEX)

// --- Paste Handler for Seed Words ---
const handlePaste = (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text') || ''

    const words = pastedText
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

    const totalSlots = seedWords.length

    // Always start from index 0, regardless of which field was pasted into
    for (let i = 0; i < words.length && i < totalSlots; i++) {
        seedWords[i] = words[i]
    }

    if (words.length > totalSlots) {
        console.warn(
            `Pasted ${words.length} words, but only ${totalSlots} slots available. Extra words ignored.`
        )
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
// For private keys: Identity ID (username or ID) + at least one key (WIF or HEX) non-empty.
const isFormValid = computed(() => {
    if (connectionMethod.value === 'seed') {
        return seedWords.every(word => word.trim() !== '')
    } else {
        // Trim to check non-empty; no format validation in UI (backend handles username resolution and WIF/HEX parsing)
        return identityId.value.trim() !== '' &&
               (authKey.value.trim() !== '' || transferKey.value.trim() !== '' || encryptionKey.value.trim() !== '')
    }
})

// The main function to handle the connection process (now delegates to store).
const connect = async () => {
    /* Validate form values. */
    if (!isFormValid.value) return

    /* Clear any previous errors. */
    identityStore.clearConnectionError()

    /* Initialize locals. */
    let result

    /* Request network. */
    const network = await getNetwork()

    try {
        if (connectionMethod.value === 'seed') {
            // Join the array into a single space-separated string.
            const seedPhrase = seedWords.join(' ')

            // Call store action (assume mainnet; make configurable if needed)
            result = await identityStore.connectWithSeed(seedPhrase, network)
        } else { // privateKey
            // Trim inputs before passing
            const trimmedId = identityId.value.trim()
            const trimmedAuth = authKey.value.trim()
            const trimmedTransfer = transferKey.value.trim()
            const trimmedEncryption = encryptionKey.value.trim()

            // Call store action
            result = await identityStore
                .connectWithPrivateKeys(
                    trimmedId,
                    trimmedAuth,
                    trimmedTransfer,
                    trimmedEncryption,
                    network
            )
        }

        if (result.success) {
            alert('Connection Successful! Navigating to home screen...')
            // Navigate to home after success (store handles auth state)
            router.push('/')
        } else {
            // Error is already set in store
            console.error('Connection failed:', result.error)
        }
    } catch (err: any) {
        console.error('Unexpected error in connect:', err)
        identityStore.connectionError = 'An unexpected error occurred during connection.'
    }
}
</script>
