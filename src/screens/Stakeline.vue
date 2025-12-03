<!-- src/screens/Stakeline.vue -->
<template>
    <main>
        <Header title="Premium User Stakeline" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div class="flex flex-col items-center gap-12">

                    <!-- Hero Section -->
                    <div class="text-center space-y-6">
                        <!-- <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
                            Premium User Stakeline
                        </h1> -->

                        <h3 class="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 bg-clip-text text-transparent sm:text-4xl">
                            Unlock the FULL Potential of EvoNext
                        </h3>

                        <p class="max-w-3xl mx-auto text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                             During the 8-week Sansbank Bootstrap phase, you may stake your Sansnote (SANS) tokens to gain premium access, early features, and exclusive community perks.
                        </p>
                    </div>

                    <!-- Value Proposition / What You Get -->
                    <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Premium Access Features
                        </h2>

                        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            <div class="flex items-center space-x-3 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200">
                                <svg class="h-6 w-6 text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-700 dark:text-slate-300 font-medium">Early access to new app services</span>
                            </div>

                            <div class="flex items-center space-x-3 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200">
                                <svg class="h-6 w-6 text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-700 dark:text-slate-300 font-medium">Exclusive "Premium" badge</span>
                            </div>

                            <div class="flex items-center space-x-3 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200">
                                <svg class="h-6 w-6 text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-700 dark:text-slate-300 font-medium">Priority support queue</span>
                            </div>
                        </div>
                    </div>

                    <!-- STATE 1: User is NOT Staked -->
                    <div v-if="!isStaked" class="w-full max-w-2xl text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
                        <h3 class="text-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-200">
                            Stake to Unlock
                        </h3>

                        <div class="my-6 flex justify-center items-baseline gap-8">
                            <div class="text-center">
                                <span class="text-4xl font-bold text-slate-900 dark:text-slate-100">
                                    500
                                </span>

                                <span class="ml-1 text-lg font-medium text-slate-600 dark:text-slate-400">
                                    SANS
                                </span>
                            </div>

                            <div class="text-center">
                                <span class="text-4xl font-bold text-slate-900 dark:text-slate-100">
                                    30
                                </span>

                                <span class="ml-1 text-lg font-medium text-slate-600 dark:text-slate-400">
                                    Days
                                </span>
                            </div>
                        </div>

                        <p class="text-slate-700 dark:text-slate-300 text-lg">
                            A one-time stake of 500 SANS is required for a 30-day lock-up period.
                        </p>

                        <button @click="beginStaking" class="mt-8 w-full max-w-xs group inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-bold rounded-xl shadow-xl text-amber-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 hover:shadow-2xl hover:-translate-y-1 focus:ring-4 focus:ring-amber-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all duration-200">
                            Initiate Staking Process
                        </button>
                    </div>

                    <!-- STAKING PROCESS -->
                    <div v-if="isStaking" class="w-full max-w-2xl text-center p-8 border-2 border-cyan-400/30 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl shadow-2xl ring-2 ring-cyan-400/20">
                        <h3 class="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                            Complete Your Stake
                        </h3>

                        <p class="mt-2 text-slate-700 dark:text-slate-300">
                            To finalize, send exactly <strong class="text-slate-900 dark:text-slate-100 font-bold">500 SANS</strong> to the address below.
                        </p>

                        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl mt-6 inline-block shadow-xl border border-slate-200 dark:border-slate-700">
                            <svg class="h-48 w-48 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                <rect width="100" height="100" fill="#F3F4F6" rx="8" ry="8"/>
                                <rect x="10" y="10" width="20" height="20" fill="#1F2937" rx="4"/><rect x="40" y="10" width="10" height="10" fill="#1F2937" rx="2"/><rect x="60" y="10" width="30" height="10" fill="#1F2937" rx="2"/><rect x="10" y="40" width="10" height="30" fill="#1F2937" rx="2"/><rect x="40" y="40" width="30" height="30" fill="#1F2937" rx="4"/><rect x="80" y="40" width="10" height="20" fill="#1F2937" rx="2"/><rect x="10" y="80" width="30" height="10" fill="#1F2937" rx="2"/><rect x="60" y="70" width="20" height="20" fill="#1F2937" rx="4"/>
                            </svg>
                        </div>

                        <div class="mt-6 w-full max-w-md mx-auto">
                            <div class="relative">
                                <input type="text" readonly value="EvolutionFOMOStakeline.dash" class="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center p-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 pr-12 shadow-sm focus:ring-4 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 text-lg">
                                <button @click="completeStaking" class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200 shadow-sm hover:shadow-md" title="Copy Address">
                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                </button>
                            </div>
                        </div>

                        <p class="mt-6 text-sm text-slate-600 dark:text-slate-400">
                            Your access will be granted automatically after the transaction is confirmed.
                        </p>
                    </div>

                    <!-- STATE 2: User IS Staked -->
                    <div v-if="isStaked" class="w-full max-w-2xl text-center p-8 border-2 border-emerald-400/30 dark:border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl ring-2 ring-emerald-400/20">
                        <div class="flex justify-center items-center gap-3 mb-6">
                            <svg class="h-12 w-12 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>

                            <h3 class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                Premium Access Unlocked
                            </h3>
                        </div>

                        <p class="text-lg text-slate-700 dark:text-slate-300 mb-8">
                            Your SANS tokens are securely staked. Enjoy your premium features!
                        </p>

                        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 p-6 rounded-2xl mb-8 shadow-lg">
                            <div class="flex justify-between mb-4">
                                <span class="font-medium text-slate-700 dark:text-slate-400">
                                    Amount Staked:
                                </span>

                                <span class="font-bold text-2xl text-slate-900 dark:text-slate-100">
                                    500 SANS
                                </span>
                            </div>

                            <div class="flex justify-between">
                                <span class="font-medium text-slate-700 dark:text-slate-400">
                                    Stake Unlocks In:
                                </span>

                                <span class="font-bold text-xl text-slate-900 dark:text-slate-100">
                                    29 Days, 14 Hours, 21 Minutes
                                </span>
                            </div>
                        </div>

                        <button disabled class="w-full max-w-xs inline-flex items-center justify-center px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-lg font-bold rounded-xl text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed shadow-sm">
                            Unstake (Available After Lock-up)
                        </button>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Header from '@/components/Header.vue'

const isStaked = ref(false)
const isStaking = ref(false)

const init = async () => {
    isStaked.value = false
}

const beginStaking = async () => {
    isStaking.value = true
}

const completeStaking = async () => {
    isStaked.value = true
    isStaking.value = false
}

onMounted(async () => {
    init()
})

onUnmounted(() => {
    // TODO
})
</script>
