<template>
    <main>
        <Header title="Identity Registration" />
        <section class="bg-white dark:bg-slate-900 min-h-screen rounded-2xl mx-4">
            <div class="max-w-2xl mx-auto px-4 py-12">
                <!-- Stepper -->
                <div class="flex justify-between items-center mb-12">
                    <div v-for="(s, idx) in ['Details', 'Payment', 'Review', 'Secure']" :key="s" class="flex-1 text-center">
                        <span class="block text-xs font-bold uppercase tracking-widest mb-2" :class="currentStepIdx >= idx ? 'text-sky-500' : 'text-slate-400'">{{ s }}</span>
                        <div class="h-1 rounded-full" :class="currentStepIdx >= idx ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'"></div>
                    </div>
                </div>

                <!-- Step 1: Form -->
                <div v-if="step === 'form'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
                    <h2 class="text-2xl font-bold">Choose your handle</h2>
                    <div>
                        <label class="block text-sm font-medium mb-1">Display Name</label>
                        <input v-model="formData.displayName" type="text" placeholder="Alice Smith" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Username</label>
                        <div class="relative">
                            <input v-model="formData.username" type="text" placeholder="alice" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 pr-16">
                            <span class="absolute inset-y-0 right-4 flex items-center text-slate-400">.dash</span>
                        </div>
                    </div>
                    <button @click="goToReview" :disabled="!formData.username" class="w-full bg-sky-500 text-white py-4 rounded-xl font-bold">Review Details</button>
                </div>

                <!-- Step 2: Payment -->
                <div v-if="step === 'payment'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-6">
                    <h2 class="text-2xl font-bold">Deposit Credits</h2>
                    <p class="text-slate-500">To secure your identity on the decentralized web, a one-time deposit of 0.1 DASH is required.</p>

                    <div v-if="payAddress" class="space-y-4">
                        <div class="bg-white p-4 rounded-xl inline-block border">
                            <qrcode-vue :value="`dash:${payAddress}?amount=0.1`" :size="200" level="H" />
                        </div>
                        <div class="font-mono text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg break-all">
                            {{ payAddress }}
                        </div>
                        <div class="animate-pulse text-sky-500 font-bold">Waiting for payment...</div>
                    </div>
                    <div v-else class="flex justify-center py-12">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
                    </div>
                </div>

                <!-- Step 3: Creation (SDK) -->
                <div v-if="step === 'loading'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-6">
                    <div class="flex justify-center">
                        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-500"></div>
                    </div>
                    <h2 class="text-2xl font-bold">Broadcasting...</h2>
                    <p class="text-slate-500">{{ loadingState }}</p>
                </div>

                <!-- Step 4: Seed Phrase -->
                <div v-if="step === 'seed'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
                    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                        <strong>CRITICAL:</strong> Your account is now live. Write down these 12 words. There is no password reset in the decentralized web.
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div v-for="(word, i) in seedPhrase.split(' ')" :key="i" class="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg font-mono text-center">
                            <span class="text-[10px] block text-slate-400">{{ i + 1 }}</span>
                            {{ word }}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <input type="checkbox" v-model="seedPhraseConfirmed" id="sc" class="h-5 w-5 rounded border-slate-300">
                        <label for="sc" class="text-sm">I have backed up my recovery phrase.</label>
                    </div>
                    <button @click="finishRegistration" :disabled="!seedPhraseConfirmed" class="w-full bg-sky-500 text-white py-4 rounded-xl font-bold">Finish</button>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import QrcodeVue from 'qrcode.vue'
import { mnemonicManager } from '@/composables/useMnemonic'
import { RegistrationService } from '@/services/identity/registration.service'
import { invoke } from '@tauri-apps/api/core'

const router = useRouter()
const step = ref<'form' | 'payment' | 'loading' | 'seed'>('form')
const loadingState = ref('')
const payAddress = ref('')
const seedPhrase = ref('')
const seedPhraseConfirmed = ref(false)

const steps = ['form', 'payment', 'loading', 'seed']
const currentStepIdx = computed(() => steps.indexOf(step.value))

const formData = reactive({
    displayName: '',
    username: '',
    bio: ''
})

let pollTimer: number | null = null

const goToReview = async () => {
    // 1. Ensure a mnemonic exists in the backend
    if (!(await mnemonicManager.hasMnemonic())) {
        await invoke('generate_new_mnemonic') // Assuming this command exists in your Tauri main.rs
    }
    seedPhrase.value = (await mnemonicManager.getMnemonic()) || ''

    // 2. Transition to payment
    step.value = 'payment'
    await setupPayment()
}

const setupPayment = async () => {
    try {
        payAddress.value = await RegistrationService.getPaymentAddress(formData.username, '', 'testnet')
        startPolling()
    } catch (e) {
        console.error(e)
        alert('Failed to initialize registrar.')
        step.value = 'form'
    }
}

const startPolling = () => {
    pollTimer = window.setInterval(async () => {
        const result = await RegistrationService.pollForProof('testnet')
        if (result) {
            stopPolling()
            await finalizeRegistration(result.proof, result.wif)
        }
    }, 5000)
}

const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer)
}

const finalizeRegistration = async (proof: string, wif: string) => {
    step.value = 'loading'
    try {
        loadingState.value = 'Creating Identity on Dash Platform...'
        await RegistrationService.registerOnPlatform(proof, wif, formData.username, 'testnet')
        step.value = 'seed'
    } catch (e) {
        console.error(e)
        alert('Platform error. Please check your connection and try again.')
        step.value = 'form'
    }
}

const finishRegistration = () => {
    router.push('/identity')
}

onUnmounted(() => stopPolling())
</script>
