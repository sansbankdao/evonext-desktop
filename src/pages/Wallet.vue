<!-- src/pages/Home.vue -->
<template>
    <main class="">
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Wallet Dashboard
            </h1>

            <div class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg">
                <span class="w-[300px]">
                    <span class="text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <!-- Balance Card & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-slate-800 p-6 rounded-xl">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-slate-400 text-sm">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold text-white mt-1">
                            <!-- $12,345.67 -->
                            {{Wallet.totalUsdValue}}
                        </p>

                        <p class="text-sm text-green-400 mt-1">
                            +1.25% ($152.34) vs last 24h
                        </p>
                    </div>

                    <div class="flex items-center gap-1 bg-slate-700 px-3 py-1 rounded-full text-sm">
                        <span class="w-2 h-2 rounded-full bg-green-400"></span>
                        <span>
                            Dash Credits
                        </span>
                    </div>
                </div>

                <div class="mt-6 flex flex-col sm:flex-row gap-3">
                    <button @click="send" class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Send</span>
                    </button>

                    <button class="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>Receive</span>
                    </button>

                    <button class="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Swap</span>
                    </button>
                </div>
            </div>

            <div class="bg-slate-800 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                <p class="text-3xl font-semibold text-white">
                    Collectibles
                </p>

                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                    unique digital assets
                </p>

                <button class="mt-4 bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors text-sm tracking-wide">
                    Open My Collection
                </button>
            </div>
        </div>

        <!-- Assets & Transactions -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <!-- Assets List -->
            <div class="bg-slate-800 p-6 rounded-xl">
                <h2 class="text-xl font-semibold text-white mb-4">
                    My Assets
                </h2>

                <div class="flex flex-col gap-4">
                    <!-- Asset Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img
                                src="/icons/dash.svg"
                                alt="DASH"
                                class="size-10 rounded-full bg-slate-700 p-1"
                            />

                            <div>
                                <p class="font-semibold text-white">
                                    Dash Credits
                                </p>

                                <p class="text-sm text-slate-400">
                                    DASH
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                112.55 DASH
                            </p>

                            <p class="text-sm text-slate-400">
                                $2,750.00
                            </p>
                        </div>
                    </div>

                    <!-- Asset Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img
                                src="/icons/sans.svg"
                                alt="SANS"
                                class="size-10 rounded-full bg-slate-700 p-1"
                            />

                            <div>
                                <p class="font-semibold text-white">
                                    Sansnote
                                </p>

                                <p class="text-sm text-slate-400">
                                    SANS
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                1337.88 SANS
                            </p>

                            <p class="text-sm text-slate-400">
                                $28.64
                            </p>
                        </div>
                    </div>

                    <!-- Asset Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img
                                src="/icons/dusd.svg"
                                alt="DUSD"
                                class="size-10 rounded-full bg-slate-700 p-1"
                            />

                            <div>
                                <p class="font-semibold text-white">
                                    Dash USD
                                </p>

                                <p class="text-sm text-slate-400">
                                    DUSD
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                1,100.67 DUSD
                            </p>

                            <p class="text-sm text-slate-400">
                                $1,100.67
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-slate-800 p-6 rounded-xl">
                <h2 class="text-xl font-semibold text-white mb-4">
                    Recent Activity
                </h2>

                <div class="flex flex-col gap-4">
                    <!-- Transaction Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-slate-700 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>

                            <div>
                                <p class="font-semibold text-white">
                                    Sent DASH
                                </p>

                                <p class="text-sm text-slate-400 font-mono">
                                    To: EWSqsaghuw...AkJWRTpY
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                -0.1 DASH
                            </p>

                            <p class="text-sm text-slate-400">
                                Completed
                            </p>
                        </div>
                    </div>

                    <!-- Transaction Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-slate-700 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>

                            <div>
                                <p class="font-semibold text-white">
                                    Received DUSD
                                </p>

                                <p class="text-sm text-slate-400 font-mono">
                                    From: 6Eb4tQdp24...cj1m87sj
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                +500.00 DUSD
                            </p>

                            <p class="text-sm text-slate-400">
                                Completed
                            </p>
                        </div>
                    </div>

                    <!-- Transaction Item -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-slate-700 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>

                            <div>
                                <p class="font-semibold text-white">
                                    Swap DASH to DUSD
                                </p>

                                <p class="text-sm text-slate-400">
                                    DashSwap Router
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="font-semibold text-white">
                                1.025 DASH
                            </p>

                            <p class="text-sm text-yellow-400">
                                Pending...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
// import { useRouter } from 'vue-router'

import init, {
    WasmSdkBuilder,
    identity_fetch,
    dpns_resolve_name,
    get_dpns_usernames,
    get_documents,
    get_identity_token_balances,
    prefetch_trusted_quorums_mainnet,
} from '../libs/dash/wasm_sdk.js'

import { DashPlatformSDK } from 'dash-platform-sdk'
import { GasFeesPaidByWASM, PrivateKeyWASM } from 'pshenmic-dpp'

/* Initialize app router. */
// const router = useRouter()

import { useWalletStore } from '@/stores/wallet'
const Wallet = useWalletStore()

/* Set top-level domain. */
const TOP_LEVEL_DOMAIN = '.dash'

const greeting = ref()

const startup = async () => {
    greeting.value = 'hi there'

    /* Request an Identity. */
    /* Initialize WASM module. */
    await init()

    /* Pre-fretch trusted quorums. */
    await prefetch_trusted_quorums_mainnet()

    /* Initialize SDK. */
    const sdk = await WasmSdkBuilder
        .new_mainnet_trusted()
        .build()

    const username = 'shomari'

    /* Resolve username. */
    const identityid = await dpns_resolve_name(sdk, username)
        .catch(err => {
            console.error(err)
            console.error('NAME NOT FOUND!!')
        })

console.log('GET IDENTITY (response)', identityid)
}

const send = async () => {
    console.log('SENDING ASSETS...')

    const sdk = new DashPlatformSDK({ network: 'testnet' })

    const myUsername = 'tranquil-untaken-sultry'

    const label = myUsername + TOP_LEVEL_DOMAIN
    console.log('\nLABEL', label)
    const normalized = sdk.utils.convertToHomographSafeChars(label)
    console.log('\nNORMALIZED', normalized)
}

// 2. Set up the listener when the component is mounted
onMounted(async () => {
    startup()
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    // TODO
})
</script>
