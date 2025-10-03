<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const greetMsg = ref('')
const name = ref('')

async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg.value = await invoke('greet', { name: name.value })
}
</script>

<template>
    <div class="flex h-screen bg-slate-900 text-slate-300 font-sans">
        <!-- ## Sidebar ## -->
        <aside class="w-64 flex-shrink-0 bg-slate-800 p-4 flex flex-col justify-between">
            <div>
                <!-- Logo -->
                <div class="flex items-center gap-3 mb-8">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xl font-bold text-white">TauriWallet</span>
                </div>
    A
                <!-- Navigation -->
                <nav class="flex flex-col gap-2">
                    <a href="#" class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-700 text-white font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="#" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Assets</span>
                    </a>
                    <a href="#" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fill-rule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <span>Settings</span>
                    </a>
                </nav>
            </div>

            <!-- User/Lock -->
            <div class="border-t border-slate-700 pt-4">
                <button class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                    <span>Lock Wallet</span>
                </button>
            </div>
        </aside>

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

<style scoped>
/* You can add component-specific styles here if needed. */
</style>
