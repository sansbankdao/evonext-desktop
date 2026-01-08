<!-- src/screens/Deposit.vue -->
<template>
    <main class="p-4 max-w-md mx-auto min-h-screen">
        <!-- Header -->
        <header class="flex items-center justify-between mb-8 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-4">
                <svg class="w-8 h-8 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Deposit Assets
                </h1>
            </div>

            <button @click="router.back()" class="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 font-semibold p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm hover:shadow-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Wallet
            </button>
        </header>

        <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center flex flex-col items-center space-y-8 shadow-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
            <div class="mb-8">
                <h2 class="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-center gap-3">
                    <svg class="w-7 h-7 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Share this address to receive assets
                </h2>
                <p class="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                    Supports DASH, DUSD, SANS, and other Dash Platform assets.
                </p>
            </div>

            <!-- QR Code -->
            <div class="bg-white/90 dark:bg-slate-800/90 p-8 rounded-2xl mb-8 border-2 border-slate-200/50 dark:border-slate-700 shadow-xl group-hover:shadow-3xl transition-all duration-300">
                <qrcode-vue
                    v-if="Wallet.user?.address"
                    :value="Wallet.user.address"
                    :size="280"
                    level="H"
                    :background="darkMode ? '#1e293b' : '#ffffff'"
                    foreground="#059669"
                />
                <div v-else class="size-[280px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-2xl text-slate-400 dark:text-slate-500 shadow-inner">
                    <svg class="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>

            <div class="w-full space-y-4">
                <label class="text-lg font-bold text-slate-700 dark:text-slate-300 text-center mb-3 flex items-center justify-center gap-3">
                    <svg class="w-6 h-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Your Dash Platform Address
                </label>

                <div class="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl w-full text-center mb-6 overflow-hidden border-2 border-slate-200/50 dark:border-slate-700 shadow-lg">
                    <p v-if="Wallet.user?.address" class="text-slate-900 dark:text-slate-100 font-mono text-lg break-all leading-7 font-semibold tracking-wide">
                        {{ Wallet.user.address }}
                    </p>
                    <p v-else class="text-slate-500 dark:text-slate-400 font-mono text-lg font-semibold">
                        Loading address...
                    </p>
                </div>
            </div>

            <button
                @click="copyAddress"
                :disabled="!Wallet.user?.address"
                class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black py-6 px-8 rounded-2xl transition-all duration-300 shadow-2xl hover:from-emerald-600 hover:to-emerald-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 text-xl tracking-wide"
            >
                <svg v-if="copyButtonText === 'Copied!'" class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <span>{{ copyButtonText }}</span>
            </button>

            <div class="text-sm text-slate-500 dark:text-slate-400 mt-8 text-center space-y-2 max-w-md mx-auto p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border-2 border-slate-200/50 dark:border-slate-700 shadow-sm">
                <p class="font-bold text-base text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-center gap-2">
                    <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Important:</span>
                </p>
                <p>Only share with trusted senders. Deposits are irreversible.</p>
                <p class="font-semibold">Scan the QR code or copy the address to receive funds instantly.</p>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useSettingsStore } from '@/stores/settings'
import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const Wallet = useWalletStore()
const Settings = useSettingsStore()

const darkMode = computed(() => Settings.state.theme === 'dark')

const copyButtonText = ref('Copy Address')

onMounted(() => {
    // if (!Wallet.user) {
    //     Wallet.initializeMockData()
    // }
})

const copyAddress = async () => {
    if (!Wallet.user?.address || copyButtonText.value === 'Copied!') return

    try {
        await navigator.clipboard.writeText(Wallet.user.address)
        copyButtonText.value = 'Copied!'
        setTimeout(() => {
            copyButtonText.value = 'Copy Address'
        }, 2000)
    } catch (err) {
        console.error('Failed to copy address: ', err)
        copyButtonText.value = 'Failed to Copy'
        setTimeout(() => {
            copyButtonText.value = 'Copy Address'
        }, 2000)
    }
}
</script>
