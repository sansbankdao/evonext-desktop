<!-- src/pages/Home.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Stakehouse
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

        <section class="bg-slate-900 font-sans text-slate-200">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div class="flex flex-col items-center gap-12">

                    <!-- Hero Section -->
                    <div class="text-center space-y-6">
                        <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                            Sansbank Stakehouse
                        </h1>
                        <p class="max-w-3xl mx-auto text-lg leading-relaxed text-slate-400">
                            Unlock the full power of EvoNext. Stake your Sansnote (SANS) tokens to gain premium access, early features, and exclusive community perks.
                        </p>
                    </div>

                    <!-- Value Proposition / What You Get -->
                    <div class="w-full text-center p-8 border border-slate-700 bg-slate-800/50 rounded-lg">
                        <h2 class="text-3xl font-bold tracking-tight text-white">
                            Premium Access Features
                        </h2>
                        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            <div class="flex items-center space-x-3">
                                <svg class="h-6 w-6 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-300">Early access to new app services</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <svg class="h-6 w-6 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-300">Exclusive "Premium" badge</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <svg class="h-6 w-6 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-slate-300">Priority support queue</span>
                            </div>
                        </div>
                    </div>

                    <!-- ====================================================================== -->
                    <!-- STATE 1: User is NOT Staked (Show this by default)                     -->
                    <!-- Use v-if="!isStaked" in Vue                                            -->
                    <!-- ====================================================================== -->
                    <div v-if="!isStaked" class="w-full max-w-2xl text-center p-8 border border-slate-700 bg-slate-800 rounded-lg shadow-lg">
                        <h3 class="text-2xl font-bold text-amber-400">
                            Stake to Unlock
                        </h3>
                        <div class="my-6 flex justify-center items-baseline gap-8">
                            <div>
                                <span class="text-4xl font-bold text-white">500</span>
                                <span class="ml-1 text-lg font-medium text-slate-400">SANS</span>
                            </div>
                            <div>
                                <span class="text-4xl font-bold text-white">30</span>
                                <span class="ml-1 text-lg font-medium text-slate-400">Days</span>
                            </div>
                        </div>
                        <p class="text-slate-500">
                            A one-time stake of 500 SANS is required for a 30-day lock-up period.
                        </p>

                        <!-- This would trigger the next step (e.g., a modal with the QR code) -->
                        <button @click="beginStaking" class="mt-8 w-full max-w-xs inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-slate-900 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-900">
                            Initiate Staking Process
                        </button>
                    </div>

                    <!--
                        STAKING PROCESS MODAL/VIEW:
                        After clicking the button above, you would show this view.
                        It contains the QR code and instructions to complete the transaction.
                    -->
                    <div v-if="isStaking" class="w-full max-w-2xl text-center p-8 border border-cyan-400/50 bg-slate-800 rounded-lg shadow-lg">
                        <h3 class="text-2xl font-bold text-cyan-400">Complete Your Stake</h3>
                        <p class="mt-2 text-slate-400">To finalize, send exactly <strong class="text-white">500 SANS</strong> to the address below.</p>
                        <div class="bg-white p-4 rounded-lg mt-6 inline-block">
                            <svg class="h-48 w-48" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                <rect width="100" height="100" fill="#E5E7EB"/>
                                <rect x="10" y="10" width="20" height="20" fill="#1F2937"/><rect x="40" y="10" width="10" height="10" fill="#1F2937"/><rect x="60" y="10" width="30" height="10" fill="#1F2937"/><rect x="10" y="40" width="10" height="30" fill="#1F2937"/><rect x="40" y="40" width="30" height="30" fill="#1F2937"/><rect x="80" y="40" width="10" height="20" fill="#1F2937"/><rect x="10" y="80" width="30" height="10" fill="#1F2937"/><rect x="60" y="70" width="20" height="20" fill="#1F2937"/>
                            </svg>
                        </div>
                        <div class="mt-6 w-full max-w-md mx-auto">
                            <div class="relative">
                                <input type="text" readonly value="SANS_STAKE_ADDRESS_HERE_12345" class="w-full bg-slate-900 text-slate-300 font-mono text-center p-3 rounded-lg border border-slate-700 pr-12">
                                <button @click="completeStaking" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white" title="Copy Address">
                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                </button>
                            </div>
                        </div>

                        <p class="mt-4 text-sm text-slate-500">
                            Your access will be granted automatically after the transaction is confirmed.
                        </p>
                    </div>


                    <!-- ====================================================================== -->
                    <!-- STATE 2: User IS Staked                                                -->
                    <!-- Use v-if="isStaked" in Vue                                             -->
                    <!-- ====================================================================== -->
                    <div v-if="isStaked" class="w-full max-w-2xl text-center p-8 border border-green-500/50 bg-slate-800 rounded-lg shadow-lg">
                        <div class="flex justify-center items-center gap-3">
                            <svg class="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h3 class="text-2xl font-bold text-green-400">
                                Premium Access Unlocked
                            </h3>
                        </div>
                        <p class="mt-4 text-slate-400">Your SANS tokens are securely staked. Enjoy your premium features!</p>
                        <div class="mt-6 border-t border-slate-700 pt-6 space-y-4">
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-500">Amount Staked:</span>
                                <span class="font-bold text-white">500 SANS</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-500">Stake Unlocks In:</span>
                                <span class="font-bold text-white">29 Days, 14 Hours, 21 Minutes</span>
                            </div>
                        </div>
                        <button disabled class="mt-8 w-full max-w-xs inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-slate-500 bg-slate-700 cursor-not-allowed">
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
// import { useRouter } from 'vue-router'

/* Initialize app router. */
// const router = useRouter()

const isStaked = ref()
const isStaking = ref()

const init = async () => {
    isStaked.value = false
}

const beginStaking = async () => {
    isStaking.value = true
}

const completeStaking = async () => {
    isStaked.value = true
}

// 2. Set up the listener when the component is mounted
onMounted(async () => {
    init()
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    // TODO
})
</script>
