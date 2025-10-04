<template>
    <div class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <Sidebar class="h-full overflow-y-scroll px-8 py-3" />

        <!-- ## Main Content ## -->
        <main class="flex-1 p-6 lg:p-8 overflow-y-auto">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">Dashboard</h1>
                <div class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg">
                    <span class="text-sm font-mono px-2">0x1A2b...7c8D</span>
                    <button class="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Balance Card & Actions -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="lg:col-span-2 bg-slate-800 p-6 rounded-xl">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-slate-400 text-sm">Total Balance</p>
                            <p class="text-4xl font-bold text-white mt-1">$12,345.67</p>
                            <p class="text-sm text-green-400 mt-1">+1.25% ($152.34) vs last 24h</p>
                        </div>
                        <div class="flex items-center gap-1 bg-slate-700 px-3 py-1 rounded-full text-sm">
                            <span class="w-2 h-2 rounded-full bg-green-400"></span>
                            <span>Ethereum</span>
                        </div>
                    </div>
                    <div class="mt-6 flex flex-col sm:flex-row gap-3">
                        <button class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
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
                    <p class="text-lg font-semibold text-white">My NFTs</p>
                    <p class="text-sm text-slate-400 mt-1">Your unique digital collectibles.</p>
                    <button class="mt-4 bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors text-sm">
                        View Collection
                    </button>
                </div>
            </div>

            <!-- Assets & Transactions -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- Assets List -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <h2 class="text-xl font-semibold text-white mb-4">My Assets</h2>
                    <div class="flex flex-col gap-4">
                        <!-- Asset Item -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025" alt="ETH" class="w-10 h-10 rounded-full bg-slate-700 p-1" />
                                <div>
                                    <p class="font-semibold text-white">Ethereum</p>
                                    <p class="text-sm text-slate-400">ETH</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">1.25 ETH</p>
                                <p class="text-sm text-slate-400">$3,750.00</p>
                            </div>
                        </div>
                        <!-- Asset Item -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <img src="https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg?v=025" alt="WBTC" class="w-10 h-10 rounded-full bg-slate-700 p-1" />
                                <div>
                                    <p class="font-semibold text-white">Wrapped Bitcoin</p>
                                    <p class="text-sm text-slate-400">WBTC</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">0.05 WBTC</p>
                                <p class="text-sm text-slate-400">$3,500.00</p>
                            </div>
                        </div>
                        <!-- Asset Item -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=025" alt="USDC" class="w-10 h-10 rounded-full bg-slate-700 p-1" />
                                <div>
                                    <p class="font-semibold text-white">USD Coin</p>
                                    <p class="text-sm text-slate-400">USDC</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">5,100.67 USDC</p>
                                <p class="text-sm text-slate-400">$5,100.67</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Transactions -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <h2 class="text-xl font-semibold text-white mb-4">Recent Activity</h2>
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
                                    <p class="font-semibold text-white">Sent ETH</p>
                                    <p class="text-sm text-slate-400 font-mono">To: 0x9f5b...3a1e</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">-0.1 ETH</p>
                                <p class="text-sm text-slate-400">Completed</p>
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
                                    <p class="font-semibold text-white">Received USDC</p>
                                    <p class="text-sm text-slate-400 font-mono">From: 0x4d2a...8c7f</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">+500.00 USDC</p>
                                <p class="text-sm text-slate-400">Completed</p>
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
                                    <p class="font-semibold text-white">Swap ETH to USDC</p>
                                    <p class="text-sm text-slate-400">Uniswap Router</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-white">0.025 ETH</p>
                                <p class="text-sm text-yellow-400">Pending</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

/* Import components. */
import Sidebar from '../components/Sidebar.vue'

const greetMsg = ref('')
const name = ref('')

async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg.value = await invoke('greet', { name: name.value })
}
</script>

<style scoped>
/* You can add component-specific styles here if needed. */
</style>
