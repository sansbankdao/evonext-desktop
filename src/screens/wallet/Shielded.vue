<!-- src/screens/wallet/Shielded.vue -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-surface-raise bg-surface-base">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button
                @click="router.back()"
                class="flex items-center gap-2 px-4 py-2 rounded-control text-content-soft hover:text-content dark:hover:text-white hover:bg-surface-raise dark:hover:bg-surface-card transition-colors font-medium"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Wallet</span>
            </button>

            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raise bg-surface-card border border-edge">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold text-content  uppercase tracking-wide">
                        {{ Wallet.network || 'testnet' }} · shielded pool
                    </span>
                </div>
            </div>
        </header>

        <div class="w-full max-w-5xl px-6 pb-12 space-y-6">
            <!-- WIF-only sessions: the shielded pool derives from the SEED. -->
            <div v-if="!engine.engineAvailable.value" class="bg-surface-card rounded-card border border-edge shadow-sm p-8 text-center">
                <h1 class="text-2xl font-bold text-content mb-2">Shielded Wallet</h1>
                <p class="text-content-faint text-sm max-w-xl mx-auto">
                    The shielded pool derives its keys from your seed phrase. This session
                    was opened with a private key only (no seed), so the pool cannot be
                    scanned. Connect with your seed phrase to use it.
                </p>
            </div>

            <template v-else>
                <!-- 1. Balance + scan -->
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-8">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-xs font-bold uppercase tracking-wide text-content-faint flex items-center gap-2">
                                Shielded balance
                                <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </p>
                            <p class="text-4xl font-black text-content mt-2 font-mono">{{ engine.displayBalance.value }} <span class="text-lg text-content-faint">DASH</span></p>
                            <p class="text-sm text-content-faint mt-1">
                                ≈ {{ formatCurrency(engine.balanceDash.value * (System.currentDashPrice || 0)) }}
                            </p>
                        </div>

                        <button
                            @click="rescan"
                            :disabled="isScanning"
                            class="px-5 py-2.5 rounded-control bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                        >
                            {{ isScanning ? 'Scanning…' : 'Scan pool' }}
                        </button>
                    </div>

                    <div v-if="engine.scanStatus.value" class="mt-5 grid grid-cols-3 gap-4 text-center">
                        <div class="rounded-control border border-edge p-3">
                            <p class="text-xs text-content-faint font-bold uppercase">Notes scanned</p>
                            <p class="text-sm font-bold text-content font-mono mt-0.5">{{ engine.scanStatus.value.scanned }}</p>
                        </div>
                        <div class="rounded-control border border-edge p-3">
                            <p class="text-xs text-content-faint font-bold uppercase">Owned notes</p>
                            <p class="text-sm font-bold text-content font-mono mt-0.5">{{ engine.scanStatus.value.owned }}</p>
                        </div>
                        <div class="rounded-control border border-edge p-3">
                            <p class="text-xs text-content-faint font-bold uppercase">Aligned</p>
                            <p class="text-sm font-bold text-content font-mono mt-0.5">{{ engine.scanStatus.value.alignedCount }}</p>
                        </div>
                    </div>

                    <p v-if="engine.scanError.value" class="mt-4 text-sm text-red-500 font-medium">
                        {{ engine.scanError.value }}
                    </p>
                    <p v-else-if="isScanning" class="mt-4 text-sm text-content-faint font-medium">
                        The first scan can take a while — it resumes from the last scanned tree position.
                    </p>
                </div>

                <!-- 2. Receive -->
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-content">Receive</h2>
                        <button
                            @click="nextAddress"
                            class="px-4 py-2 rounded-control border border-edge text-content text-sm font-bold hover:bg-surface-raise transition-colors"
                        >
                            New address
                        </button>
                    </div>
                    <div class="flex flex-col sm:flex-row items-center gap-8">
                        <div class="relative bg-surface-card border border-edge rounded-inner p-6 shadow-sm">
                            <qrcode-vue
                                v-if="receiveAddr"
                                :value="receiveAddr"
                                :size="220"
                                level="H"
                                render-as="svg"
                                background="#ffffff"
                                foreground="#0f172a"
                                class="rounded-lg"
                            />
                        </div>
                        <div class="flex-1 w-full">
                            <p class="text-xs text-content-faint font-bold uppercase mb-2">Shielded address (index {{ addressIndex }})</p>
                            <div class="flex items-center gap-2">
                                <code class="flex-1 text-xs font-mono bg-surface-raise border border-edge rounded-control px-3 py-2.5 break-all text-content">{{ receiveAddr || '…deriving' }}</code>
                                <button
                                    v-if="receiveAddr"
                                    @click="copyAddress"
                                    class="px-3 py-2.5 rounded-control border border-edge text-content text-sm font-bold hover:bg-surface-raise transition-colors"
                                >
                                    {{ copied ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <p class="text-xs text-content-faint mt-3">
                                Only share this with senders you trust. Funds arriving here are visible only to this wallet.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 3. Send -->
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-8">
                    <h2 class="text-lg font-bold text-content mb-4">Send</h2>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs font-bold uppercase tracking-wide text-content-faint">Recipient shielded address</label>
                            <input
                                v-model="sendRecipient"
                                type="text"
                                :placeholder="Wallet.network === 'mainnet' ? 'dash1z…' : 'tdash1z…'"
                                class="w-full mt-1.5 bg-surface-raise border border-edge rounded-control px-4 py-2.5 text-sm font-mono text-content placeholder:text-content-faint focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold uppercase tracking-wide text-content-faint">Amount (DASH)</label>
                                <input
                                    v-model="sendAmount"
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    placeholder="0.00"
                                    class="w-full mt-1.5 bg-surface-raise border border-edge rounded-control px-4 py-2.5 text-sm font-mono text-content placeholder:text-content-faint focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                            </div>
                            <div>
                                <label class="text-xs font-bold uppercase tracking-wide text-content-faint">Memo (optional, ≤32 chars)</label>
                                <input
                                    v-model="sendMemo"
                                    type="text"
                                    maxlength="32"
                                    placeholder="for the recipient"
                                    class="w-full mt-1.5 bg-surface-raise border border-edge rounded-control px-4 py-2.5 text-sm text-content placeholder:text-content-faint focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                            </div>
                        </div>

                        <p v-if="sendError" class="text-sm text-red-500 font-medium">{{ sendError }}</p>
                        <p v-if="engine.sendPhase.value" class="text-sm text-indigo-500 font-medium">{{ engine.sendPhase.value }}</p>
                        <p v-if="sendResult" class="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            Sent — {{ displayDash(BigInt(sendResult.amountCredits)) }} DASH transferred
                            (fee {{ displayDash(BigInt(sendResult.feeCredits)) }}, change {{ displayDash(BigInt(sendResult.changeCredits)) }}).
                        </p>

                        <button
                            @click="send"
                            :disabled="!sendFormValid || isSending"
                            class="w-full py-3 rounded-control bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors"
                        >
                            {{ isSending ? 'Building transaction…' : `Send ${sendAmountDisplay} DASH` }}
                        </button>
                        <p class="text-xs text-content-faint text-center">
                            The first send builds the Halo2 proving key (~10s+); later sends reuse it.
                        </p>
                    </div>
                </div>

                <!-- 4. History -->
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-content">Transaction history</h2>
                        <button
                            @click="refreshHistory"
                            class="px-4 py-2 rounded-control border border-edge text-content text-sm font-bold hover:bg-surface-raise transition-colors"
                        >
                            Refresh
                        </button>
                    </div>

                    <div v-if="historyRows.length === 0 && !isLoadingHistory" class="py-8 text-center text-content-faint text-sm">
                        No shielded activity yet.
                    </div>

                    <div class="space-y-3">
                        <div
                            v-for="(row, idx) in historyRows"
                            :key="`${row.treeIndex}-${idx}`"
                            class="flex items-center justify-between p-4 rounded-control border border-edge"
                        >
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                                    :class="row.kind === 'received' ? 'bg-emerald-500/10 text-emerald-500' : row.kind === 'sent' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'"
                                >
                                    {{ row.kind === 'received' ? '↓' : row.kind === 'sent' ? '↑' : '~' }}
                                </div>
                                <div>
                                    <p class="font-bold text-content text-sm capitalize">
                                        {{ row.kind }}
                                        <span
                                            v-if="row.spent"
                                            class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-surface-raise border border-edge text-content-faint"
                                        >spent</span>
                                    </p>
                                    <p class="text-xs text-content-faint max-w-md truncate">
                                        {{ row.memo || row.address || '—' }} · tree #{{ row.treeIndex }}
                                    </p>
                                </div>
                            </div>
                            <p
                                class="font-bold font-mono text-sm"
                                :class="row.kind === 'received' ? 'text-emerald-500' : row.kind === 'sent' ? 'text-red-500' : 'text-content'"
                            >
                                {{ row.kind === 'received' ? '+' : row.kind === 'sent' ? '−' : '~' }}{{ displayDash(BigInt(row.credits)) }}
                            </p>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import { useWalletStore } from '@/stores/wallet'
import { useSystemStore } from '@/stores/system'
import { useNetwork } from '@/composables/useNetwork'
import { useShieldedEngine, displayDash, type ShieldedHistoryRow } from '@/composables/useShieldedEngine'

const Wallet = useWalletStore()
const System = useSystemStore()
const engine = useShieldedEngine()
const { ensure } = useNetwork()
const router = useRouter()

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)

/* --- scan ---------------------------------------------------------------- */
const isScanning = ref(false)

const rescan = async () => {
    if (isScanning.value) return
    isScanning.value = true
    try {
        await engine.runScan()
        await engine.fetchHistory()
    } finally {
        isScanning.value = false
    }
}

/* --- receive -------------------------------------------------------------- */
const addressIndex = ref(0)
const receiveAddr = ref<string | null>(null)
const copied = ref(false)

const deriveReceiveAddress = async () => {
    const addr = await engine.receiveAddress(addressIndex.value)
    receiveAddr.value = addr
}

const nextAddress = async () => {
    addressIndex.value += 1
    await deriveReceiveAddress()
}

const copyAddress = async () => {
    if (!receiveAddr.value) return
    try {
        await navigator.clipboard.writeText(receiveAddr.value)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch { /* clipboard unavailable */ }
}

/* --- send ------------------------------------------------------------------ */
const sendRecipient = ref('')
const sendAmount = ref<string>('')
const sendMemo = ref('')
const sendError = ref<string | null>(null)
const sendResult = ref<{ amountCredits: string; feeCredits: string; changeCredits: string } | null>(null)
const isSending = ref(false)

const amountCredits = computed(() => {
    const amount = Number(sendAmount.value)
    if (!isFinite(amount) || amount <= 0) return 0n
    return BigInt(Math.round(amount * 100_000_000_000))
})

const sendAmountDisplay = computed(() => {
    const amount = Number(sendAmount.value)
    return isFinite(amount) && amount > 0 ? String(amount) : '0'
})

const sendFormValid = computed(() => {
    const recipient = sendRecipient.value.trim()
    const prefix = Wallet.network === 'mainnet' ? 'dash1z' : 'tdash1z'
    return recipient.startsWith(prefix) && recipient.length > prefix.length && amountCredits.value > 0
})

const send = async () => {
    sendError.value = null
    sendResult.value = null
    isSending.value = true
    const baseline = engine.balanceCredits.value ?? 0n
    try {
        const memo = sendMemo.value.trim()
        const result = await engine.sendShielded({
            recipient: sendRecipient.value.trim(),
            amountCredits: amountCredits.value,
            ...(memo ? { memoText: memo } : {}),
        })
        sendResult.value = {
            amountCredits: amountCredits.value.toString(),
            feeCredits: result.feeCredits,
            changeCredits: result.changeCredits,
        }
        sendRecipient.value = ''
        sendAmount.value = ''
        sendMemo.value = ''
        // Post-broadcast the nullifier registry/tree updates only with the
        // next block — poll until the balance moves (the F40 settle poll).
        await engine.settle('below', baseline)
        await engine.fetchHistory()
    } catch (error) {
        sendError.value = error instanceof Error ? error.message : String(error)
    } finally {
        isSending.value = false
    }
}

/* --- history ---------------------------------------------------------------- */
const historyRows = ref<ShieldedHistoryRow[]>([])
const isLoadingHistory = ref(false)

const refreshHistory = async () => {
    isLoadingHistory.value = true
    try {
        historyRows.value = await engine.fetchHistory()
    } finally {
        isLoadingHistory.value = false
    }
}

onMounted(async () => {
    await ensure()
    const available = await engine.ensureStarted()
    if (available) {
        await deriveReceiveAddress()
        if (engine.balanceCredits.value !== null) {
            await refreshHistory()
        }
    }
})
</script>
