<!-- src/screens/Identity/Register.vue -->

<template>
    <main>
        <Header title="Identity Registration" />

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Stepper Header -->
                    <div class="relative pt-8 pb-12">
                        <div class="overflow-hidden h-2 mb-6 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                            <div
                                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-sky-500 transition-all duration-500 ease-in-out"
                                :style="{ width: `${progressWidth}%` }"
                            ></div>
                        </div>
                        <div class="flex justify-between text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 0}">1. Details</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 1}">2. Payment</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 2}">3. Register</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 3}">4. Secure</span>
                        </div>
                    </div>

                    <!-- Step 1: Form -->
                    <div v-if="step === 'form'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                Create Identity
                            </h1>
                            <p class="text-lg text-slate-600 dark:text-slate-400">
                                Register a new profile on the Dash Network.
                            </p>
                        </div>

                        <div>
                            <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                            <div class="relative mt-1 rounded-md shadow-sm">
                                <input
                                    v-model="formData.username"
                                    @input="handleUsernameInput"
                                    type="text"
                                    id="username"
                                    placeholder="alice"
                                    :disabled="isChecking"
                                    class="block w-full rounded-md border-0 py-3 pl-3 pr-16 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span class="text-slate-500 sm:text-sm">.dash</span>
                                </div>
                            </div>
                            <div class="mt-2 text-xs" :class="isAvailable === true ? 'text-green-600' : (isAvailable === false ? 'text-red-600' : 'text-slate-500')">
                                <span v-if="isChecking">Checking availability...</span>
                                <span v-else-if="isAvailable === true">Username is available!</span>
                                <span v-else-if="isAvailable === false">Username is taken or invalid.</span>
                                <span v-else>&nbsp;</span>
                            </div>
                        </div>

                        <div>
                            <label for="displayName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Display Name (Optional)</label>
                            <div class="mt-1">
                                <input
                                    v-model="formData.displayName"
                                    type="text"
                                    id="displayName"
                                    placeholder="Alice Smith"
                                    class="block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div class="pt-4">
                            <button
                                @click="goToReview"
                                :disabled="!isAvailable || !formData.username || isChecking"
                                class="flex w-full justify-center rounded-md bg-sky-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    </div>

                    <!-- Step 2: Payment -->
                    <div v-if="step === 'payment'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">Deposit Required</h3>
                        <p class="text-slate-600 dark:text-slate-400 text-sm">
                            To register your identity, please send <span class="font-bold text-sky-500">0.1 DASH</span> to the address below.
                        </p>

                        <div v-if="payAddress" class="space-y-4">
                            <div class="flex justify-center bg-white p-2 rounded-lg border border-slate-200 w-fit mx-auto">
                                <qrcode-vue :value="paymentUri" :size="200" level="H" />
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p class="text-xs text-slate-500 mb-1">Payment Address</p>
                                <p class="font-mono text-xs break-all text-slate-900 dark:text-slate-100">
                                    {{ payAddress }}
                                </p>
                            </div>

                            <div class="flex items-center justify-center gap-2 text-sky-500 text-sm font-medium animate-pulse">
                                <svg class="animate-spin h-4 w-4 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Awaiting blockchain confirmation...</span>
                            </div>
                        </div>

                        <div v-else class="flex flex-col items-center justify-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                            <p class="mt-4 text-slate-500 text-sm">Initializing payment...</p>
                        </div>
                    </div>

                    <!-- Step 3: Loading (Broadcasting) -->
                    <div v-if="step === 'loading'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        <div class="flex justify-center">
                            <div class="relative flex h-16 w-16">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-16 w-16 bg-sky-500 items-center justify-center text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25zm3-6h6" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ loadingState }}</h3>
                        <p class="text-sm text-slate-500">This usually takes about 10-20 seconds.</p>
                    </div>

                    <!-- Step 4: Seed Phrase -->
                    <div v-if="step === 'seed'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <h3 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Save Your Recovery Phrase</h3>
                            <p class="text-slate-600 dark:text-slate-400">
                                Your identity <span class="font-bold text-sky-500">{{ formData.username }}.dash</span> has been successfully registered.
                            </p>
                        </div>

                        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-4">
                            <svg class="h-6 w-6 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <p class="text-sm text-amber-800 dark:text-amber-200">
                                This phrase is the <strong>ONLY</strong> way to recover your account. Write it down on paper and store it securely. Do not share it with anyone.
                            </p>
                        </div>

                        <div class="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div v-for="(word, i) in seedPhrase.split(' ')" :key="i" class="flex items-center gap-2">
                                <span class="text-xs text-slate-400 font-mono select-none">{{ i + 1 }}.</span>
                                <span class="font-medium text-slate-900 dark:text-slate-100">{{ word }}</span>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 pt-2">
                            <div class="flex h-6 items-center">
                                <input
                                    id="confirmation"
                                    v-model="seedPhraseConfirmed"
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sky-500 focus:ring-sky-500 dark:focus:ring-sky-400"
                                >
                            </div>
                            <div class="text-sm leading-6">
                                <label for="confirmation" class="font-medium text-slate-900 dark:text-slate-100">I have securely written down my recovery phrase.</label>
                            </div>
                        </div>

                        <div class="pt-4">
                            <button
                                @click="finishRegistration"
                                :disabled="!seedPhraseConfirmed"
                                class="w-full inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed border border-sky-300"
                            >
                                Complete Registration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import Header from '@/components/Header.vue'
import QrcodeVue from 'qrcode.vue'
import { useIdentityStore } from '@/stores/identity'
import { mnemonicManager } from '@/composables/useMnemonic'
import { RegistrationService } from '@/services/identity/registration.service'
import { debugLogger } from '@/utils/debugLogger'

const router = useRouter()
const identityStore = useIdentityStore()

// State Machine
type Step = 'form' | 'payment' | 'loading' | 'seed'
const step = ref<Step>('form')
const steps = ['form', 'payment', 'loading', 'seed'] as const
const currentStepIdx = computed(() => steps.indexOf(step.value))
const progressWidth = computed(() => ((currentStepIdx.value + 1) / steps.length) * 100)

// Form Data
const formData = reactive({
    displayName: '',
    username: ''
})

// Validation State
const isChecking = ref(false)
const isAvailable = ref<boolean | null>(null)

// Async State
const loadingState = ref('')
const seedPhrase = ref('')
const seedPhraseConfirmed = ref(false)
const payAddress = ref('')
const paymentUri = computed(() => `dash:${payAddress.value}?amount=0.1`)

// Polling
let pollTimer: number | null = null

/**
 * Handle username input with simple debounced validation simulation
 */
let debounceTimeout: number | null = null
const handleUsernameInput = () => {
    isAvailable.value = null
    if (!formData.username) return

    if (debounceTimeout) window.clearTimeout(debounceTimeout)
    debounceTimeout = window.setTimeout(async () => {
        isChecking.value = true
        try {
            // Note: Replace with actual SDK username check if available
            // Simulation logic:
            isAvailable.value = formData.username.length >= 3
        } finally {
            isChecking.value = false
        }
    }, 500)
}

/**
 * Transitions to the Payment step after generating/finding a mnemonic.
 */
const goToReview = async () => {
    try {
        if (!(await mnemonicManager.hasMnemonic())) {
            debugLogger.log('[Register] No mnemonic found. Generating new one...', 'info')
            await invoke('generate_new_mnemonic')
        }

        seedPhrase.value = (await mnemonicManager.getMnemonic()) || ''
        step.value = 'payment'
        await setupPayment()
    } catch (err: any) {
        debugLogger.log(`[Register] Error in goToReview: ${err}`, 'error')
        alert('Failed to initialize secure storage.')
    }
}

/**
 * Initiates the registration process by getting a payment address
 */
const setupPayment = async () => {
    try {
        loadingState.value = 'Initializing registrar...'
        payAddress.value = await RegistrationService.getPaymentAddress(formData.username, '', 'testnet')
        debugLogger.log(`[Register] Payment address received: ${payAddress.value}`, 'info')
        startPolling()
    } catch (e: any) {
        debugLogger.log(`[Register] Registrar init failed: ${e.message}`, 'error')
        alert('Failed to connect to registration service.')
        step.value = 'form'
    }
}

const startPolling = () => {
    if (pollTimer) clearInterval(pollTimer)

    pollTimer = window.setInterval(async () => {
        try {
            const result = await RegistrationService.pollForProof('testnet')
            if (result) {
                stopPolling()
                debugLogger.log('[Register] Payment detected. Proceeding to registration.', 'info')
                await finalizeRegistration(result.proof, result.wif)
            }
        } catch (e: any) {
            debugLogger.log(`[Register] Polling error: ${e.message}`, 'error')
        }
    }, 5000)
}

const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer)
}

const finalizeRegistration = async (proof: string, wif: string) => {
    step.value = 'loading'
    loadingState.value = 'Creating Identity on Dash Platform...'
    try {
        const identityId = await RegistrationService.registerOnPlatform(
            proof,
            wif,
            formData.username,
            'testnet'
        )

        loadingState.value = 'Securing account...'
        debugLogger.log(`[Register] Platform ID created: ${identityId}`, 'info')

        await identityStore.saveIdentityDataToStore('testnet', identityId, {
            identityIdx: 0,
            username: `${formData.username}.dash`,
            balance: '0',
            revision: 0,
            publicKeys: []
        })

        await identityStore.saveMnemonicToStore('testnet', seedPhrase.value)
        step.value = 'seed'
    } catch (e: any) {
        debugLogger.log(`[Register] Finalization failed: ${e}`, 'error')
        alert('Registration failed. Please check your connection and try again.')
        step.value = 'form'
    }
}

const finishRegistration = () => {
    debugLogger.log('[Register] User confirmed seed phrase. Routing to identity.', 'info')
    router.push('/identity')
}

onUnmounted(() => {
    stopPolling()
})
</script>
