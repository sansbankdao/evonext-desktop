<!-- src/screens/Home.vue -->
<template>
    <main class="">
        <Header title="Maīson Ξvolution" />

        <!-- Balance Card & Actions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="text-slate-600 dark:text-slate-400 text-sm">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {{ formatCurrency(totalBalance.usd) }}
                        </p>

                        <p class="text-xl text-slate-700 dark:text-slate-300 font-mono">
                            {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                        </p>

                        <p class="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {{ totalBalance.credits.toLocaleString() }} credits
                        </p>

                        <div class="mt-2 flex items-center gap-1">
                            <svg class="w-4 h-4" :class="System.isPricePositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path v-show="System.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4 10-10" />
                                <path v-show="!System.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l-4 4-10 10" />
                            </svg>

                            <span class="text-sm" :class="System.isPricePositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'">
                                {{ System.priceChange24h > 0 ? '+' : '' }}{{ System.priceChange24h.toFixed(2) }}% vs last 24h
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm border border-slate-200 dark:border-slate-600">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>

                        <span class="text-slate-700 dark:text-slate-300">
                            Dash Platform
                        </span>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl flex flex-col justify-center items-center text-center border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                    Collectibles
                </p>

                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    unique digital assets
                </p>

                <button class="mt-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm tracking-wide border border-slate-200 dark:border-slate-600">
                    Open My Collection
                </button>
            </div>
        </section>

        <!-- Assets & Transactions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content Feed (2/3 width on large screens) -->
            <div class="lg:col-span-2 flex flex-col gap-6">
                <!-- Create Post -->
                <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-start gap-4">
                        <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Your Avatar" class="size-12 rounded-full"/>

                        <textarea
                            class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition"
                            placeholder="What's on your mind?">
                        </textarea>
                    </div>

                    <div class="flex justify-end items-center mt-4">
                        <!-- Action Icons for Post -->
                        <div class="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                            <button class="hover:text-sky-500 dark:hover:text-sky-400 transition" title="Add Image">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                            </button>

                            <button class="hover:text-sky-500 dark:hover:text-sky-400 transition" title="Create Poll">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                            </button>
                        </div>

                        <button class="ml-6 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2 rounded-full transition">
                            Post
                        </button>
                    </div>
                </div>

                <!-- Fresh Posts Title -->
                <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Fresh Posts
                </h2>

                <!-- Post Item -->
                <div class="bg-white dark:bg-slate-800 p-6 rounded-xl flex flex-col gap-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <!-- Post Header -->
                    <div class="flex items-center gap-4">
                        <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Alice's Avatar" class="size-12 rounded-full"/>

                        <div>
                            <p class="font-semibold text-slate-900 dark:text-slate-100">
                                Alice
                            </p>

                            <p class="text-sm text-slate-600 dark:text-slate-400">
                                @alice · 15m ago
                            </p>
                        </div>
                    </div>

                    <!-- Post Content -->
                    <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
                        Just exploring the new Sansbank Bootstrap page. The design is super clean! Really excited to see where this project goes for the Dash community. #Dash #Sansbank
                    </p>

                    <!-- Post Actions -->
                    <div class="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <button class="flex items-center gap-2 hover:text-sky-500 dark:hover:text-sky-400 transition">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                            </svg>
                            2
                        </button>

                        <button class="flex items-center gap-2 hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/>
                            </svg>
                            1
                        </button>

                        <button class="flex items-center gap-2 hover:text-red-500 dark:hover:text-red-400 transition">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                            12
                        </button>

                        <button class="flex items-center gap-2 hover:text-slate-700 dark:hover:text-slate-200 transition">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sidebar (1/3 width on large screens) -->
            <div class="lg:col-span-1 flex flex-col gap-6">
                <PendingMessages />
                <ContactRequests />
                <TrendingTopics />
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
/* Import modules. */
import { computed, onMounted } from 'vue'

import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'

import Header from '@/components/Header.vue'
import TrendingTopics from '@/components/home/TrendingTopics.vue'
import ContactRequests from '@/components/home/ContactRequests.vue'
import PendingMessages from '@/components/home/PendingMessages.vue'

const Identity = useIdentityStore()
const System = useSystemStore()

const totalBalance = computed(() => {
    if (Identity.isAuthenticated && Identity.balance) {
        const credits = parseInt(Identity.balance, 10)
        const duffs = credits / 1000 // Convert credits to duffs (1 duff = 1,000 credits)
        const dash = duffs / 100000000 // Convert duffs to DASH (1 DASH = 100,000,000 duffs)
        const usd = dash * System.currentDashPrice

        return { dash, usd, credits, duffs }
    }

    // Fallback to mock
    return { dash: 0.00, usd: 0.00, credits: 0, duffs: 0 }
})

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0.00'

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

onMounted(() => {
    if (Identity.isConnected && Identity.username) {
        // Ensure balance is fetched if not already
        if (!Identity.balance) {
            Identity.fetchBalance()
        }
    }
})
</script>
