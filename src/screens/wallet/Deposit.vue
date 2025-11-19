<!-- src/screens/Deposit.vue -->
<template>
    <main class="max-w-md mx-auto p-4">
        <header class="flex items-center justify-between mb-8 pb-4 border-b border-slate-700">
            <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <h1 class="text-3xl font-bold text-white">
                    Deposit Assets
                </h1>
            </div>

            <button @click="router.back()" class="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Wallet
            </button>
        </header>

        <div class="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl text-center flex flex-col items-center shadow-lg border border-slate-700">
            <div class="mb-6">
                <h2 class="text-lg font-semibold text-slate-300 mb-2 flex items-center justify-center gap-2">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Share this address to receive assets
                </h2>
                <p class="text-slate-400 text-sm">
                    Supports DASH, DUSD, SANS, and other Dash Platform assets.
                </p>
            </div>

            <!-- QR Code -->
            <div class="bg-white p-5 rounded-xl mb-6 shadow-md border border-gray-200">
                <qrcode-vue
                    v-if="Wallet.user?.address"
                    :value="Wallet.user.address"
                    :size="220"
                    level="H"
                    background="#ffffff"
                    foreground="#000000"
                />
                <div v-else class="size-[220px] bg-slate-200 flex items-center justify-center rounded-lg text-slate-500">
                    <svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>

            <div class="w-full space-y-3">
                <label class="block text-sm font-medium text-slate-300 text-center mb-1 flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Your Dash Platform Address
                </label>

                <div class="bg-slate-900/70 p-3 rounded-lg w-full text-center mb-4 overflow-hidden">
                    <p v-if="Wallet.user?.address" class="text-white font-mono text-sm break-all leading-5">
                        {{ Wallet.user.address }}
                    </p>
                    <p v-else class="text-slate-400 font-mono text-sm">
                        Loading address...
                    </p>
                </div>
            </div>

            <button
                @click="copyAddress"
                :disabled="!Wallet.user?.address"
                class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:from-green-500 hover:to-green-400 hover:shadow-green-500/25 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed disabled:shadow-none"
            >
                <svg v-if="copyButtonText === 'Copied!'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <span>{{ copyButtonText }}</span>
            </button>

            <div class="text-xs text-slate-500 mt-4 text-center space-y-1">
                <p><strong>Important:</strong> Only share with trusted senders. Deposits are irreversible.</p>
                <p>Scan the QR code or copy the address to receive funds instantly.</p>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const Wallet = useWalletStore()

const copyButtonText = ref('Copy Address')

// Ensure mock data is initialized if not already done elsewhere in the app
onMounted(() => {
    if (!Wallet.user) {
        Wallet.initializeMockData()
    }
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
