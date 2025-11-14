<!-- src/screens/Receive.vue -->
<template>
    <main class="max-w-md mx-auto">
        <header class="flex items-center justify-between mb-8">
            <h1 class="text-3xl font-bold text-white">
                Receive Assets
            </h1>

            <button @click="router.back()" class="text-slate-400 hover:text-white transition-colors">
                &larr; Back to Wallet
            </button>
        </header>

        <div class="bg-slate-800 p-8 rounded-xl text-center flex flex-col items-center">
            <p class="text-slate-300">
                Share your address to receive any asset.
            </p>

            <!-- QR Code: Assumes you have `qrcode.vue` installed -->
            <div class="bg-white p-4 rounded-lg my-6">
                <qrcode-vue
                    v-if="Wallet.user?.address"
                    :value="Wallet.user.address"
                    :size="220"
                    level="H"
                />
                <div v-else class="size-[220px] bg-slate-200 flex items-center justify-center text-slate-500">
                    Address not available
                </div>
            </div>

            <p class="text-sm text-slate-400 mb-2">
                Your Dash Platform Address
            </p>

            <div class="bg-slate-900/70 p-3 rounded-lg w-full text-center mb-4">
                <p class="text-white font-mono break-words">
                    {{ Wallet.user?.address ?? 'Loading...' }}
                </p>
            </div>

            <button
                @click="copyAddress"
                class="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <span>{{ copyButtonText }}</span>
            </button>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
// import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const Wallet = useWalletStore()

const copyButtonText = ref('Copy Address')

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
