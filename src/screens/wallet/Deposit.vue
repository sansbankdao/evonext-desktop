<!-- src/screens/wallet/Deposit.vue -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button
                @click="router.back()"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-medium"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Wallet</span>
            </button>

            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                        {{ Wallet.network || 'testnet' }}
                    </span>
                </div>
            </div>
        </header>

        <!-- Main Content (Responsive: Stacked on mobile, Side-by-Side on lg+) -->
        <div class="w-full max-w-5xl px-6 pb-12">

            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                <!-- Header -->
                <div class="p-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        Deposit Assets
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 text-sm">
                        Receive Dash Platform supported tokens to your identity.
                    </p>
                </div>

                <div class="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    <!-- LEFT COLUMN: QR Code & Primary Action (Span 7) -->
                    <div class="lg:col-span-7 flex flex-col items-center justify-center space-y-8">

                        <!-- QR Code Area -->
                        <div class="relative group flex flex-col items-center">
                            <!-- Decorative border -->
                            <div class="absolute -inset-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>

                            <div class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <qrcode-vue
                                    v-if="Identity.identityId"
                                    :value="Identity.identityId"
                                    :size="280"
                                    level="H"
                                    render-as="svg"
                                    background="#ffffff"
                                    foreground="#0f172a"
                                    class="rounded-lg"
                                />
                                <div v-else class="w-[280px] h-[280px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-lg">
                                    <svg class="w-10 h-10 text-slate-300 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span class="text-xs text-slate-400 font-medium">Generating Identity...</span>
                                </div>
                            </div>

                            <p class="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                Scan to send assets directly to your identity.
                            </p>
                        </div>

                        <!-- Main CTA Button -->
                        <button
                            @click="copyIdentityId"
                            :disabled="!Identity.identityId"
                            class="w-full max-w-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        >
                            <svg v-if="copyButtonText === 'Copied!'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>{{ copyButtonText === 'Copied!' ? 'Copied!' : 'Copy Identity ID' }}</span>
                        </button>

                    </div>

                    <!-- RIGHT COLUMN: Details & Assets (Span 5) -->
                    <div class="lg:col-span-5 flex flex-col space-y-6 h-full">

                        <!-- Identity ID Display -->
                        <div class="space-y-3">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                                Identity ID
                            </label>
                            <div class="relative group/field">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                </div>
                                <div class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-2 text-slate-900 dark:text-slate-100 font-mono text-sm transition-colors group-hover/field:border-slate-300 dark:group-hover/field:border-slate-700 overflow-hidden">
                                    <div class="flex items-center justify-between w-full min-w-0">
                                        <span class="truncate text-slate-500 dark:text-slate-400 font-medium select-all">
                                            {{ Identity.identityId || 'No Identity Connected' }}
                                        </span>
                                        <button
                                            @click="copyIdentityId"
                                            :disabled="!Identity.identityId"
                                            class="ml-2 p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                                            title="Copy Identity ID"
                                        >
                                            <svg v-if="copyButtonText === 'Copied!'" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Supported Assets Grid -->
                        <div class="space-y-3">
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                                Supported Assets
                            </p>
                            <div class="grid grid-cols-4 gap-3">
                                <div class="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                                    </div>
                                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">DASH</span>
                                </div>
                                <div class="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div class="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center border border-green-100 dark:border-green-800">$</div>
                                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">DUSD</span>
                                </div>
                                <div class="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div class="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center border border-purple-100 dark:border-purple-800">
                                        <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                    </div>
                                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">SANS</span>
                                </div>
                                <div class="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                        <svg class="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
                                    </div>
                                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">Other</span>
                                </div>
                            </div>
                        </div>

                        <!-- Spacer for visual balance -->
                        <div class="flex-1 min-h-[100px]"></div>

                        <!-- Warning Footer -->
                        <div class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                            <svg class="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div class="flex flex-col gap-1">
                                <p class="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">Attention</p>
                                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Only send <strong class="text-slate-900 dark:text-slate-200">Dash Platform Assets</strong> (DASH, DUSD, etc.) to this Identity ID. Sending incompatible tokens from other chains may result in permanent loss.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

        </div>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()

const copyButtonText = ref('Copy Identity ID')

const copyIdentityId = async () => {
    if (!Identity.identityId || copyButtonText.value === 'Copied!') return

    try {
        await navigator.clipboard.writeText(Identity.identityId)
        copyButtonText.value = 'Copied!'
        setTimeout(() => {
            copyButtonText.value = 'Copy Identity ID'
        }, 2000)
    } catch (err) {
        console.error('Failed to copy address: ', err)
        copyButtonText.value = 'Failed'
        setTimeout(() => {
            copyButtonText.value = 'Copy Identity ID'
        }, 2000)
    }
}
</script>
