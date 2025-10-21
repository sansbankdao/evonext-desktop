<!-- src/screens/_Blank.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Connect
            </h1>

            <div class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg">
                <span class="w-[300px]">
                    <span class="text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-slate-900 font-sans text-slate-200 min-h-screen flex items-center justify-center">
            <div class="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="space-y-8">

                    <!-- Page Header -->
                    <div class="text-center space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Connect to Dash Platform
                        </h1>
                        <p class="text-lg text-slate-400">
                            Securely access your identity using one of the methods below.
                        </p>
                    </div>

                    <!-- Connection Method Tabs -->
                    <div class="flex border-b border-slate-700">
                        <button
                            @click="connectionMethod = 'seed'"
                            :class="['flex-1 py-3 text-center font-semibold transition-colors', connectionMethod === 'seed' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white']"
                        >
                            Seed Phrase
                        </button>
                        <button
                            @click="connectionMethod = 'privateKey'"
                            :class="['flex-1 py-3 text-center font-semibold transition-colors', connectionMethod === 'privateKey' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white']"
                        >
                            Private Key
                        </button>
                    </div>

                    <!-- Security Warning -->
                    <div class="bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 p-4 rounded-lg flex items-start gap-3">
                        <svg class="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                        <div>
                            <h3 class="font-semibold">Security Notice</h3>
                            <p class="text-sm">Your credentials are handled locally and will never be sent to a server. Ensure you are in a private location.</p>
                        </div>
                    </div>

                    <!-- Form Container -->
                    <form @submit.prevent="connect" class="bg-slate-800 p-8 rounded-xl space-y-6">
                        <!-- SEED PHRASE FORM -->
                        <div v-if="connectionMethod === 'seed'" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-2">Phrase Length</label>
                                <fieldset class="grid grid-cols-2 gap-4">
                                    <label :class="['text-center p-3 rounded-lg border-2 cursor-pointer transition', wordCount === '12' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500']">
                                        <input type="radio" value="12" v-model="wordCount" class="sr-only">
                                        <span class="font-semibold">12 Words</span>
                                    </label>
                                    <label :class="['text-center p-3 rounded-lg border-2 cursor-pointer transition', wordCount === '24' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500']">
                                        <input type="radio" value="24" v-model="wordCount" class="sr-only">
                                        <span class="font-semibold">24 Words</span>
                                    </label>
                                </fieldset>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                <div v-for="(_word, index) in seedWords" :key="index" class="relative">
                                    <span class="absolute top-2 left-2 text-xs text-slate-500 font-mono">{{ index + 1 }}</span>
                                    <input v-model="seedWords[index]" type="text" autocomplete="off" spellcheck="false" class="w-full bg-slate-700 border-slate-600 rounded-lg pt-6 pb-2 px-2 text-center text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition">
                                </div>
                            </div>
                        </div>

                        <!-- PRIVATE KEY FORM -->
                        <div v-if="connectionMethod === 'privateKey'" class="space-y-6">
                            <div>
                                <label for="identityId" class="block text-sm font-medium text-slate-300 mb-1">Identity ID</label>
                                <input id="identityId" type="text" v-model="identityId" placeholder="e.g., 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors" required>
                            </div>
                            <div>
                                <label for="privateKey" class="block text-sm font-medium text-slate-300 mb-1">Private Key (WIF format)</label>
                                <input id="privateKey" type="password" v-model="privateKey" placeholder="e.g., XK6CFyvYUMvY9FVQLeYBZBF..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors" required>
                            </div>
                        </div>

                        <!-- Error Message Display -->
                        <div v-if="error" class="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-medium text-center">
                            {{ error }}
                        </div>

                        <!-- Action Button -->
                        <div class="pt-4">
                            <button type="submit" :disabled="!isFormValid || isLoading" class="w-full inline-flex items-center justify-center rounded-lg bg-cyan-500 py-3 px-6 text-base font-semibold text-white shadow-sm hover:bg-cyan-600 transition disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">
                                <div v-if="isLoading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span v-else>Connect Securely</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    </main>
</template>

<!-- src/screens/Connect.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

// --- Component State ---
const connectionMethod = ref<'seed' | 'privateKey'>('seed')

// Controls whether we show 12 or 24 input fields
const wordCount = ref<'12' | '24'>('12')

/* Initialize an array to hold the words from the input fields. */
// NOTE: We use `reactive` because we will be changing its size.
const seedWords = reactive<string[]>(Array(12).fill(''))

/* Initailize local handlers. */
const identityId = ref('')
const privateKey = ref('')

// State for loading and error feedback
const isLoading = ref(false)
const error = ref<string | null>(null)

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
const isFormValid = computed(() => {
    return seedWords.every(word => word.trim() !== '') || (identityId.value !== '' && privateKey.value !== '')
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
console.log(`Attempting to connect with a private key.`)
            /* Set payload. */
            payload = {
                identity_id: identityId.value,
                private_key: privateKey.value
            }

            /* Save private key. */
            await invoke('save_private_key', { payload })
        }

        alert('Connection Successful! Navigating to home screen...')
        // Example: router.push('/wallet')
    } catch (err: any) {
        console.error('Connection failed:', err)
        error.value = typeof err === 'string' ? err : 'An unknown error occurred.'
    } finally {
        isLoading.value = false
    }
}
</script>
