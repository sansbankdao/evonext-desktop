<!-- src/screens/Send.vue -->
<template>
    <main class="max-w-2xl mx-auto">
        <header class="flex items-center justify-between mb-8">
            <h1 class="text-3xl font-bold text-white">
                Send Assets
            </h1>

            <button @click="router.back()" class="text-slate-400 hover:text-white transition-colors">
                &larr; Back to Wallet
            </button>
        </header>

        <form @submit.prevent="handleSend" class="bg-slate-800 p-6 rounded-xl space-y-6">
            <!-- Asset Selection -->
            <div>
                <label for="asset" class="block text-sm font-medium text-slate-300 mb-1">
                    Asset to Send
                </label>

                <select
                    id="asset"
                    v-model="selectedAssetTicker"
                    class="w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option v-for="asset in Wallet.assets" :key="asset.ticker" :value="asset.ticker">
                        {{ asset.name }} ({{ asset.ticker }})
                    </option>
                </select>

                <p v-if="selectedAsset" class="text-sm text-slate-400 mt-2">
                    Available Balance: {{ selectedAsset.amount.toLocaleString() }} {{ selectedAsset.ticker }}
                </p>
            </div>

            <!-- Recipient Address -->
            <div>
                <label for="recipient" class="block text-sm font-medium text-slate-300 mb-1">
                    Recipient Address
                </label>

                <input
                    id="recipient"
                    v-model="recipient"
                    type="text"
                    placeholder="Enter Dash identity or address"
                    class="w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white font-mono focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
            </div>

            <!-- Amount -->
            <div>
                <label for="amount" class="block text-sm font-medium text-slate-300 mb-1">
                    Amount
                </label>

                <input
                    id="amount"
                    v-model="amount"
                    type="number"
                    step="any"
                    placeholder="0.0"
                    class="w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
            </div>

            <!-- Error Message -->
            <div v-if="error" class="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg">
                {{ error }}
            </div>

            <!-- Submit Button -->
            <button
                type="submit"
                :disabled="isSending || !isFormValid"
                class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors
                       hover:bg-indigo-500
                       disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400"
            >
                <svg v-if="isSending" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isSending ? 'Processing...' : 'Review & Send' }}</span>
            </button>
        </form>
    </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import sendCredit from '@/libs/sendCredit'
// import sendToken from '@/libs/sendToken'

const router = useRouter()
const Wallet = useWalletStore()

const recipient = ref('')
const amount = ref<number | null>(null)
const selectedAssetTicker = ref(Wallet.assets.length > 0 ? Wallet.assets[0].ticker : '')

const isSending = ref(false)
const error = ref<string | null>(null)

const selectedAsset = computed(() => {
    return Wallet.assets.find(a => a.ticker === selectedAssetTicker.value)
})

const isFormValid = computed(() => {
    return recipient.value.trim() !== '' && amount.value && amount.value > 0
})

const handleSend = async () => {
    if (!isFormValid.value || !selectedAsset.value) return

    // Basic Validation
    if (amount.value > selectedAsset.value.amount) {
        error.value = 'Insufficient balance.'
        return
    }

    isSending.value = true
    error.value = null

    try {
        console.log(`Preparing to send ${amount.value} ${selectedAsset.value.ticker} to ${recipient.value}`)

        // This is where you would integrate your actual sending logic.
        // The example from your `Wallet.vue` for sending credits:
        if (selectedAsset.value.ticker === 'DASH' && amount.value) {
            const credits = BigInt(Math.floor(amount.value * 1000000000)) // Example conversion
            const identityId = Wallet.user.address // The sender's identity
            const result = await sendCredit('testnet', identityId, 1, recipient.value, credits)
            console.log('Send Credit Result:', result)
        } else {
            // Here you would handle sending other tokens (e.g., using a `sendToken` function)
            console.log('Token sending logic not implemented for this asset.')
            // Simulating a network delay
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        alert('Transaction successful!') // Replace with a better notification
        router.push('/wallet')

    } catch (e: any) {
        console.error('Failed to send transaction:', e)
        error.value = e.message || 'An unknown error occurred during the transaction.'
    } finally {
        isSending.value = false
    }
}
</script>
