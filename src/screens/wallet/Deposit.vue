<!-- src/screens/wallet/Deposit.vue -->
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
                        {{ Wallet.network || 'testnet' }}
                    </span>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="w-full max-w-5xl px-6 pb-12 space-y-6">

            <div class="bg-surface-card rounded-card border border-edge shadow-sm overflow-hidden">

                <!-- Header -->
                <div class="p-8 pb-6 border-b border-edge">
                    <h1 class="text-2xl font-bold text-content mb-1">
                        Deposit
                    </h1>
                    <p class="text-content-faint text-sm">
                        Receive on the target you need — one address at a time.
                    </p>
                </div>

                <div class="p-8">

                    <!-- Segmented selector (F50): ONE address at a time -->
                    <div class="inline-flex rounded-control border border-edge bg-surface-raise p-1 mb-8">
                        <button
                            v-for="target in TARGETS"
                            :key="target.id"
                            @click="selectTarget(target.id)"
                            class="px-5 py-2 rounded-[calc(var(--radius-control,0.75rem)-0.25rem)] text-sm font-bold transition-colors"
                            :class="activeTarget === target.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-content-soft hover:text-content'"
                        >
                            {{ target.label }}
                        </button>
                    </div>

                    <!-- The single address card -->
                    <div class="rounded-card border border-edge bg-surface-raise p-8 flex flex-col sm:flex-row items-center gap-8">
                        <div class="relative bg-surface-card border border-edge rounded-inner p-5 shadow-sm flex-shrink-0">
                            <qrcode-vue
                                v-if="activeAddress"
                                :value="activeAddress"
                                :size="148"
                                level="H"
                                render-as="svg"
                                background="#ffffff"
                                foreground="#0f172a"
                                class="rounded-lg"
                            />
                            <div v-else class="w-[148px] h-[148px] flex items-center justify-center">
                                <svg class="w-8 h-8 text-content-faint animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                            </div>
                        </div>

                        <div class="flex-1 w-full min-w-0">
                            <p class="text-xs font-bold uppercase tracking-wide text-content-faint">
                                {{ activeTargetMeta.subtitle }}
                            </p>
                            <div class="flex items-center gap-2 mt-2">
                                <code class="flex-1 text-sm font-mono bg-surface-card border border-edge rounded-control px-4 py-3 break-all text-content select-all">
                                    {{ activeAddress || '…' }}
                                </code>
                                <button
                                    v-if="activeAddress"
                                    @click="copyActive"
                                    class="px-4 py-3 rounded-control border border-edge text-content text-sm font-bold hover:bg-surface-card transition-colors flex-shrink-0"
                                >
                                    {{ copied ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <p class="text-xs text-content-faint mt-3 leading-relaxed">
                                {{ activeTargetMeta.note }}
                            </p>
                        </div>
                    </div>

                    <!-- The internal-move card (F54: lives on the Receive tab) -->
                    <MoveCard class="mt-6" />

                    <!-- Per-target caution -->
                    <div class="flex items-start gap-3 mt-6 p-4 rounded-control bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                        <svg class="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div class="flex flex-col gap-1">
                            <p class="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">Attention</p>
                            <p class="text-xs text-content-soft leading-relaxed">
                                <template v-if="activeTarget === 'shielded'">
                                    Only shielded senders (<code class="font-mono">{{ Wallet.network === 'mainnet' ? 'dash1z' : 'tdash1z' }}…</code>) can deliver here.
                                    Transparent senders cannot target the pool.
                                </template>
                                <template v-else-if="activeTarget === 'transparent'">
                                    Platform-Transparent senders (<code class="font-mono">{{ Wallet.network === 'mainnet' ? 'dash1k' : 'tdash1k' }}…</code>) deliver here.
                                    Funds land in your Transparent pool.
                                </template>
                                <template v-else>
                                    Only send <strong class="text-content">Dash Platform assets</strong> to this Identity ID (direct credit transfers and tokens). Sending incompatible tokens from other chains may result in permanent loss.
                                </template>
                            </p>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { useShieldedEngine } from '@/composables/useShieldedEngine'
import { ensureWasmSdkService } from '@/lib/desktop-wasm'
import { derivePlatformReceiveAddress } from '@/lib/platform-address'
import { mnemonicManager } from '@/composables/useMnemonic'
import MoveCard from '@/components/wallet/MoveCard.vue'
import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()
const engine = useShieldedEngine()
const { ensure } = useNetwork()

/* --- Segmented targets (F50: one address at a time) ---------------------- */

type TargetId = 'transparent' | 'shielded' | 'identity'

const TARGETS: Array<{ id: TargetId; label: string }> = [
    { id: 'transparent', label: 'Transparent' },
    { id: 'shielded', label: 'Shielded' },
    { id: 'identity', label: 'Identity' },
]

const activeTarget = ref<TargetId>('transparent')
const transparentAddress = ref<string | null>(null)
const shieldedAddress = ref<string | null>(null)
const copied = ref(false)

const activeTargetMeta = computed(() => {
    switch (activeTarget.value) {
    case 'transparent':
        return {
            subtitle: 'Transparent (Platform) — DIP-17 address',
            note: 'Derives locally from your seed (m/9\'/coin\'/17\'/0\'/0\'/0). No Core (L1) balance is shown anywhere — Core is an on-ramp only.',
        }
    case 'shielded':
        return {
            subtitle: 'Shielded (private) — Orchard address',
            note: 'The pool address from the shielded engine. Funds here are visible only to this wallet.',
        }
    default:
        return {
            subtitle: 'Identity ID — direct credit transfers and tokens',
            note: 'The target for identity-level transfers (credit transfers, token sends, staking deposits).',
        }
    }
})

const activeAddress = computed(() => {
    switch (activeTarget.value) {
    case 'transparent': return transparentAddress.value
    case 'shielded': return shieldedAddress.value
    default: return Identity.identityId || null
    }
})

const selectTarget = (id: TargetId) => {
    activeTarget.value = id
    copied.value = false
}

const copyActive = async () => {
    if (!activeAddress.value || copied.value) return
    try {
        await navigator.clipboard.writeText(activeAddress.value)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch (err) {
        console.error('Failed to copy address: ', err)
    }
}

const deriveAddresses = async () => {
    const network = await ensure()
    /* The MAIN-thread sdk is initialized per network here so the Move
     * card's balance reads (moves-service) and any later main-thread
     * calls hit the F37-guarded service. */
    await ensureWasmSdkService(network).catch(() => { /* offline — the Move card degrades */ })
    /* Transparent: LOCAL derivation — no network I/O (the F49b path). */
    try {
        const mnemonic = await mnemonicManager.getMnemonic(network === 'mainnet' ? 'mainnet' : 'testnet')
        if (mnemonic) {
            // Prime the session bridge (the lib reads it via secure-storage).
            try { window.localStorage.setItem('mnemonic', mnemonic) } catch { /* private mode */ }
            transparentAddress.value = derivePlatformReceiveAddress(network === 'mainnet' ? 'mainnet' : 'testnet', 0)
        }
    } catch (error) {
        console.warn('[Deposit] transparent address derivation failed:', error)
    }
    /* Shielded: the engine worker's receiveAddress RPC (its trusted-context
     * prefetch can take seconds on first load — the F49b bounded retry). */
    if (await engine.ensureStarted()) {
        shieldedAddress.value = await engine.receiveAddress(0)
    }
}

onMounted(() => {
    void deriveAddresses()
})

/* Re-derive when the network flips (addresses are network-scoped). */
watch(() => Wallet.network, () => {
    transparentAddress.value = null
    shieldedAddress.value = null
    void deriveAddresses()
})
</script>
