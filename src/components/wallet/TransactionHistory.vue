<!-- src/components/wallet/TransactionHistory.vue -->
 <template>
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-0 flex flex-col h-full">
        <!-- Header -->
        <div class="p-8 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recent Activity
                </h2>
                <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Page <span class="text-indigo-600 dark:text-indigo-400">{{ currentPage }}</span> of {{ totalPages || 1 }}
                </div>
            </div>
        </div>

        <!-- Transactions List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4 space-y-3">
            <div
                v-for="tx in displayedTransactions"
                :key="tx.id"
                role="button"
                @click="router.push(`/wallet/transaction/${tx.id}`)"
                class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
            >
                <div class="flex items-center gap-4">
                    <!-- Icon Logic -->
                    <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                        <svg v-if="tx.type === 'sent'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <svg v-else-if="tx.type === 'received'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <svg v-else-if="tx.type === 'swap'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <svg v-else class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ tx.title }}</p>
                        <p class="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{{ tx.subtitle }}</p>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <span class="font-bold text-slate-900 dark:text-white">
                        {{ getDisplayAmount(tx) }}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="getStatusClasses(tx.status)">
                        {{ tx.status }}
                    </span>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="displayedTransactions.length === 0 && !isLoading" class="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400">
                <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-sm font-medium">No recent activity</p>
            </div>
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-8 text-slate-400 animate-pulse">
                <p>Loading History...</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="flex-1 py-2 px-4 mr-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
            >
                Previous
            </button>
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mx-2">
                {{ displayedTransactions.length }} / {{ allTransactions.length }}
            </span>
            <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="flex-1 py-2 px-4 ml-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
            >
                Next
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { fetchTokenTransitions } from '@/stores/wallet/actions/api'
import { transformTokenTransitions } from '@/stores/wallet/actions/transforms'
import { useIdentityStore } from '@/stores/identity'
import { DUSD_CONTRACT_ID_TESTNET, SANS_CONTRACT_ID_TESTNET, DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'
import type { ITransaction } from '@/types'

const props = defineProps<{
    transactions: ITransaction[] // From store
    isLoading: boolean
}>()

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()

// Local state to hold combined transactions (Store + Explicit Token Fetch)
const localTokenTransactions = ref<ITransaction[]>([])
const isFetchingTokens = ref(false)

const currentPage = ref(1)
const txPageSize = 5

// --- 1. Combine Store Transactions with Fetched Token Txs ---
const allTransactions = computed(() => {
    // Merge store transactions with local token transactions
    // Deduplicate by ID to be safe
    const combined = [...props.transactions]

    localTokenTransactions.value.forEach(tokenTx => {
        if (!combined.find(t => t.id === tokenTx.id)) {
            combined.push(tokenTx)
        }
    })

    // Sort by Date Descending
    return combined.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime()
        const dateB = new Date(b.date || b.createdAt || 0).getTime()
        return dateB - dateA
    })
})

const totalPages = computed(() => Math.ceil(allTransactions.value.length / txPageSize))

const displayedTransactions = computed(() => {
    const start = (currentPage.value - 1) * txPageSize
    const end = start + txPageSize
    return allTransactions.value.slice(start, end)
})

// --- 2. Fix 0.00 Bug ---
const getDisplayAmount = (tx: ITransaction) => {
    // If the amount is already a non-numeric string (e.g., "1.00 DUSD"), return it directly.
    // The transform functions in transforms.ts return formatted strings in the 'amount' field.
    if (typeof tx.amount === 'string' && isNaN(Number(tx.amount))) {
        return tx.amount
    }

    // Fallback: If it's a number, format it
    if (typeof tx.amount === 'number') {
        return tx.amount.toLocaleString()
    }

    // Fallback for formatted field
    return tx.amountFormatted || '0.00'
}

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed':
        case 'CONFIRMED':
            return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        case 'Pending...':
        case 'PENDING':
            return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
        case 'Failed':
        case 'FAILED':
            return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        default: return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    }
}

// --- 3. Explicitly Fetch Token History (DUSD/SANS) ---
const fetchMissingTokens = async () => {
    if (!Identity.identityId) return
    isFetchingTokens.value = true

    try {
        // Fetch DUSD
        const dusdRaw = await fetchTokenTransitions(DUSD_CONTRACT_ID_TESTNET, 20, Wallet.network)
        const dusdTxs = transformTokenTransitions(dusdRaw, Identity.identityId, 'DUSD', DUSD_DECIMAL_PLACES)

        // Fetch SANS
        const sansRaw = await fetchTokenTransitions(SANS_CONTRACT_ID_TESTNET, 20, Wallet.network)
        const sansTxs = transformTokenTransitions(sansRaw, Identity.identityId, 'SANS', SANS_DECIMAL_PLACES)

        localTokenTransactions.value = [...dusdTxs, ...sansTxs]
    } catch (e) {
        console.error("Failed to fetch token history:", e)
    } finally {
        isFetchingTokens.value = false
    }
}

watch(() => Identity.identityId, (newId) => {
    if (newId) fetchMissingTokens()
})

onMounted(() => {
    if (Identity.identityId) fetchMissingTokens()
})
</script>
