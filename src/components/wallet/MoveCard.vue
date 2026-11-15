<!-- src/components/wallet/MoveCard.vue -->
<template>
    <!-- The internal-move card (the F54 owner directive: the internal-move
         UI lives on the RECEIVE/Deposit tab, Dashpay-style).
         Lanes (all live-verified on testnet 2026-11-15, evonext.app F54):
           Transparent → Identity   (type 11 — the consensus-exact reference
                                     wire + the direct grpc transport)
           Transparent → Shielded   (type 15 — same transport, the prover
                                     builds the zk proof)
           Shielded    → Identity   (type 22 via the engine's poolExit)
           Shielded    → Transparent(type 17 via the engine's poolExit)
         Amounts are entered in DASH (1 DASH = 1e11 credits). -->
    <section class="rounded-card border border-violet-200 dark:border-violet-900/40 bg-gradient-to-br from-white via-violet-50/80 to-violet-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-violet-900 dark:text-violet-300 uppercase tracking-wide">
                Move between balances
            </h2>
            <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        </div>

        <!-- FROM -->
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-content-faint w-10">From</span>
            <div class="flex flex-1 rounded-control bg-violet-100/80 dark:bg-slate-900/60 border border-violet-200 dark:border-violet-900/40 p-1 gap-1">
                <button
                    v-for="opt in FROM_OPTIONS"
                    :key="opt.key"
                    @click="from = opt.key"
                    class="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                    :class="from === opt.key ? 'bg-violet-600 text-white shadow-sm' : 'text-violet-700 dark:text-violet-300 hover:bg-white/70 dark:hover:bg-slate-800/70'"
                >
                    {{ opt.label }}
                </button>
            </div>
            <span class="text-xs text-content-faint tabular-nums shrink-0">
                {{ balDisplay(from === 'transparent' ? transparentBalance : shieldedBalance) }}
            </span>
        </div>

        <!-- TO -->
        <div class="flex items-center gap-2 mb-3">
            <span class="text-xs text-content-faint w-10">To</span>
            <div class="flex flex-1 rounded-control bg-violet-100/80 dark:bg-slate-900/60 border border-violet-200 dark:border-violet-900/40 p-1 gap-1">
                <button
                    v-for="opt in toOptions"
                    :key="opt.key"
                    @click="to = opt.key"
                    class="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                    :class="effectiveTo === opt.key ? 'bg-violet-600 text-white shadow-sm' : 'text-violet-700 dark:text-violet-300 hover:bg-white/70 dark:hover:bg-slate-800/70'"
                >
                    {{ opt.label }}
                </button>
            </div>
        </div>

        <!-- Amount -->
        <div class="flex items-center gap-2">
            <input
                v-model="amountDash"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.0001"
                placeholder="0.0000"
                :disabled="busy"
                class="flex-1 rounded-control border border-edge bg-surface-card px-3 py-2 text-sm font-mono text-content focus:border-violet-400 focus:outline-none disabled:opacity-50"
            />
            <span class="text-xs text-content-faint font-mono">DASH</span>
        </div>

        <button
            @click="move"
            :disabled="busy || !Identity.identityId"
            class="mt-3 w-full rounded-control bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
        >
            {{ busy ? (phase || 'Moving…') : `Move ${toOptions.find((o) => o.key === effectiveTo)?.label ?? ''}` }}
        </button>
        <p v-if="moveError" class="mt-2 text-xs text-red-500 font-medium break-all">{{ moveError }}</p>
        <p v-if="moveSuccess" class="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium break-all">{{ moveSuccess }}</p>
        <p v-if="!Identity.identityId" class="mt-2 text-xs text-content-faint">Sign in to move funds between your balances.</p>
    </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { useShieldedEngine, CREDITS_PER_DASH } from '@/composables/useShieldedEngine'
import { getMnemonic } from '@/lib/secure-storage'
import { ensureWasmSdkService } from '@/lib/desktop-wasm'
import { moveTransparentToIdentity, moveTransparentToShielded, readTransparentAddress } from '@/lib/moves-service'

type Lane = 'transparent' | 'shielded' | 'identity'

const FROM_OPTIONS: { key: 'transparent' | 'shielded'; label: string }[] = [
    { key: 'transparent', label: 'Transparent' },
    { key: 'shielded', label: 'Shielded' },
]

const TO_OPTIONS: Record<'transparent' | 'shielded', { key: Lane; label: string }[]> = {
    transparent: [
        { key: 'identity', label: 'Identity' },
        { key: 'shielded', label: 'Shielded' },
    ],
    shielded: [
        { key: 'identity', label: 'Identity' },
        { key: 'transparent', label: 'Transparent' },
    ],
}

const Identity = useIdentityStore()
const engine = useShieldedEngine()
const { ensure } = useNetwork()

const from = ref<'transparent' | 'shielded'>('transparent')
const to = ref<Lane>('identity')
const amountDash = ref('')
const busy = ref(false)
const phase = ref('')
const transparentBalance = ref<bigint | null>(null)
const shieldedBalance = ref<bigint | null>(null)
const moveError = ref<string | null>(null)
const moveSuccess = ref<string | null>(null)

const toOptions = computed(() => TO_OPTIONS[from.value])
const effectiveTo = computed<Lane>(() =>
    toOptions.value.some((o) => o.key === to.value)
        ? to.value
        : toOptions.value[0]!.key)

const balDisplay = (credits: bigint | null): string =>
    credits === null ? '…' : `${Number(credits) / Number(CREDITS_PER_DASH)} DASH`

const refreshBalances = async () => {
    /* ensureStarted primes the session bridge (secure-storage 'mnemonic')
     * that the ported lib's LOCAL derivations read synchronously. */
    const engineUp = await engine.ensureStarted()
    try {
        const network = await ensure()
        /* The MAIN-thread sdk must be initialized for THIS network before
         * readTransparentAddress's getAddressesInfos (the F37 rule). */
        await ensureWasmSdkService(network)
        const addr = await readTransparentAddress(network === 'mainnet' ? 'mainnet' : 'testnet', 0)
        transparentBalance.value = addr.balance
    } catch { transparentBalance.value = null }
    try {
        if (engineUp) {
            shieldedBalance.value = engine.balanceCredits.value
        }
    } catch { shieldedBalance.value = null }
}

const move = async () => {
    moveError.value = null
    moveSuccess.value = null
    const dash = parseFloat(amountDash.value || '0')
    if (!(dash > 0)) {
        moveError.value = 'Enter an amount first'
        return
    }
    const credits = BigInt(Math.round(dash * 1e11))
    if (!Identity.identityId) {
        moveError.value = 'Sign in first'
        return
    }
    const mnemonic = getMnemonic()
    if (!mnemonic && from.value === 'transparent') {
        moveError.value = 'Session phrase missing — sign in again'
        return
    }
    busy.value = true
    try {
        const network = await ensure()
        /* Primes the mnemonic bridge for the local derivations below. */
        await engine.ensureStarted()
        const net = network === 'mainnet' ? 'mainnet' : 'testnet'
        if (from.value === 'transparent' && effectiveTo.value === 'identity') {
            const r = await moveTransparentToIdentity({
                network: net,
                identityId: Identity.identityId,
                addressIndex: 0,
                amountCredits: credits,
                onProgress: (p: string) => { phase.value = p },
            })
            moveSuccess.value = `Moved! Input ${Number(r.inputCredits) / 1e11} DASH · tx ${r.transitionHash.slice(0, 16)}…`
        } else if (from.value === 'transparent' && effectiveTo.value === 'shielded') {
            const r = await moveTransparentToShielded({
                network: net,
                mnemonic: mnemonic || '',
                addressIndex: 0,
                recipientIndex: 0,
                amountCredits: credits,
                memoText: 'evonext move',
                onProgress: (p: string) => { phase.value = p },
            })
            moveSuccess.value = `Shielded! tx ${r.transitionHash.slice(0, 16)}…`
        } else if (from.value === 'shielded' && effectiveTo.value === 'identity') {
            await engine.ensureStarted()
            const r = await engine.poolExit({
                kind: 'topUpIdentity',
                identityId: Identity.identityId,
                netCredits: credits,
            })
            moveSuccess.value = `Topped up the identity by ${Number(r.netCredits) / 1e11} DASH`
        } else {
            await engine.ensureStarted()
            const addr = await readTransparentAddress(net, 0)
            const r = await engine.poolExit({
                kind: 'unshield',
                outputAddress: addr.bech32m,
                netCredits: credits,
            })
            moveSuccess.value = `Unshielded ${Number(r.netCredits) / 1e11} DASH to Transparent`
        }
        amountDash.value = ''
        await refreshBalances()
    } catch (err: any) {
        const detail = err?.consensusError ?? err?.message ?? 'Unknown error'
        moveError.value = `Move failed: ${String(detail).slice(0, 200)}`
    } finally {
        busy.value = false
        phase.value = ''
    }
}

onMounted(() => { void refreshBalances() })

watch(from, () => { to.value = toOptions.value[0]!.key })
</script>
