<!-- src/screens/Plus.vue -->
<template>
    <main class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 overflow-x-hidden">
        <Header title="EvoNext Premium" />

        <!-- 1. CINEMATIC HERO SECTION -->
        <section class="relative h-[80vh] flex items-center justify-center overflow-hidden">
            <img
                src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=2000"
                class="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20 select-none"
                alt="Digital Architecture"
            />
            <div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50 dark:via-slate-950/50 dark:to-slate-950"></div>

            <div class="relative z-10 text-center px-4 max-w-4xl">
                <span class="inline-block px-4 py-1.5 mb-6 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] border border-cyan-500/20">
                    The Sovereign Tier
                </span>
                <h1 class="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter mb-8 italic">
                    Elevated <br/> <span class="text-cyan-500">Sovereignty.</span>
                </h1>
                <p class="text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                    EvoNext Premium is a status of total command over the Dash Platform.
                    Architect your digital legacy with the world's most advanced identity tools.
                </p>
            </div>
        </section>

        <!-- 2. THE FOUR SUITES (Marketing Content) -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-40 mb-40">

            <!-- Suite 1: Social Architect -->
            <section class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="order-2 lg:order-1">
                    <span class="text-cyan-500 font-black text-xs uppercase tracking-widest">Suite 01</span>
                    <h2 class="text-4xl font-black text-slate-900 dark:text-white mt-4 mb-6 uppercase tracking-tight">The Social Architect</h2>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Unlock **Advanced Posting** to attach encrypted data payloads and priority high-resolution media
                        directly to the Platform indexing layer.
                    </p>
                    <ul class="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Priority Feed Indexing</li>
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Rich Text Support</li>
                    </ul>
                </div>
                <div class="order-1 lg:order-2 bg-slate-200 dark:bg-slate-800 rounded-[3rem] aspect-video overflow-hidden shadow-2xl skew-y-2">
                    <img src="https://images.unsplash.com/photo-1614850523296-e8c041de4398?auto=format&fit=crop&q=80&w=1000" class="w-full h-full object-cover" />
                </div>
            </section>

            <!-- Suite 2: Sovereign Issuer -->
            <section class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="bg-slate-200 dark:bg-slate-800 rounded-[3rem] aspect-video overflow-hidden shadow-2xl -skew-y-2">
                    <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1000" class="w-full h-full object-cover" />
                </div>
                <div>
                    <span class="text-cyan-500 font-black text-xs uppercase tracking-widest">Suite 02</span>
                    <h2 class="text-4xl font-black text-slate-900 dark:text-white mt-4 mb-6 uppercase tracking-tight">Sovereign Issuer</h2>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        The **Advanced Asset Manager** transforms you into a central bank. Manage complex minting groups,
                        setup multi-sig control clusters, and execute programmed supply burns.
                    </p>
                    <ul class="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Custom Bonding Curves</li>
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Permission Logic</li>
                    </ul>
                </div>
            </section>

            <!-- Suite 3: Financial Commander -->
            <section class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="order-2 lg:order-1">
                    <span class="text-cyan-500 font-black text-xs uppercase tracking-widest">Suite 03</span>
                    <h2 class="text-4xl font-black text-slate-900 dark:text-white mt-4 mb-6 uppercase tracking-tight">Financial Commander</h2>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        The **Advanced Portfolio Manager** provides deep-lens analytics. Track real-time asset velocity,
                        identity credit burn rates, and historical performance across all connected wallets.
                    </p>
                    <ul class="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Net Worth Tracking</li>
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Exportable Analytics</li>
                    </ul>
                </div>
                <div class="order-1 lg:order-2 bg-slate-200 dark:bg-slate-800 rounded-[3rem] aspect-video overflow-hidden shadow-2xl rotate-2">
                    <img src="https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&q=80&w=1000" class="w-full h-full object-cover" />
                </div>
            </section>

            <!-- Suite 4: Community Warden -->
            <section class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="bg-slate-200 dark:bg-slate-800 rounded-[3rem] aspect-video overflow-hidden shadow-2xl -rotate-2">
                    <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000" class="w-full h-full object-cover" />
                </div>
                <div>
                    <span class="text-cyan-500 font-black text-xs uppercase tracking-widest">Suite 04</span>
                    <h2 class="text-4xl font-black text-slate-900 dark:text-white mt-4 mb-6 uppercase tracking-tight">Community Warden</h2>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        The **Advanced Community Manager** enables white-label group creation. Setup token-gated membership tiers
                        and decentralized voting modules for your followers.
                    </p>
                    <ul class="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Gated Feed Access</li>
                        <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Governance Voting</li>
                    </ul>
                </div>
            </section>
        </div>

        <!-- 3. FINAL CALL TO ACTION (The Checkout Terminal) -->
        <section class="max-w-5xl mx-auto px-4 py-24 mb-32">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-black text-slate-900 dark:text-white tracking-widest uppercase mb-4">Unlock Elite Evolution</h2>
                <div class="h-1 w-20 bg-cyan-500 mx-auto"></div>
            </div>

            <!-- STATE: PLAN SELECTION -->
            <div v-if="!isStaked && !isStaking" class="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-8">

                <!-- Option 1: DUSD Subscription -->
                <div class="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-xl relative overflow-hidden flex flex-col">
                    <div class="relative z-10 flex-1">
                        <div class="flex justify-between items-start mb-10">
                            <div class="p-3 bg-white/5 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Monthly Subscription</div>
                            <img src="/icons/dusd.svg" class="w-10 h-10" />
                        </div>
                        <h3 class="text-5xl font-black text-white mb-2">5 DUSD</h3>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Per Identity / Monthly</p>
                        <p class="text-slate-500 text-sm leading-relaxed mb-12">Instant activation. Full access to all premium suites without capital lockup.</p>
                    </div>
                    <button @click="handleDirectPay" class="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg shadow-cyan-900/40">
                        Activate Subscription
                    </button>
                    <div class="absolute -right-16 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
                </div>

                <!-- Option 2: SANS Staking -->
                <div class="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl flex flex-col group hover:border-cyan-500 transition-all">
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-10">
                            <div class="p-3 bg-cyan-500/10 rounded-2xl text-cyan-600 text-[10px] font-black uppercase tracking-[0.2em]">Asset Staking</div>
                            <img src="/icons/sans.svg" class="w-10 h-10" />
                        </div>
                        <h3 class="text-5xl font-black text-slate-900 dark:text-white mb-2">500 SANS</h3>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">30-day returnable lock</p>
                        <p class="text-slate-500 text-sm leading-relaxed mb-12">Zero cost. Your assets are returned to you after the lock period concludes.</p>
                    </div>
                    <button @click="beginStaking" class="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all">
                        Initiate Stake
                    </button>
                </div>
            </div>

            <!-- STATE: STAKING IN PROGRESS -->
            <div v-if="isStaking" class="max-w-2xl mx-auto text-center py-12 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-cyan-500/30 shadow-2xl">
                <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase mb-8">Verification Terminal</h3>
                <div class="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl inline-block mb-8 border border-slate-100 dark:border-slate-700">
                    <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=EvolutionStakeline`" class="w-40 h-40 dark:invert" />
                </div>
                <p class="text-slate-500 font-mono text-sm mb-12">EvolutionFOMOStakeline.dash</p>
                <div class="flex gap-4 justify-center">
                    <button @click="isStaking = false" class="px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
                    <button @click="completeStaking" class="px-8 py-4 bg-emerald-600 text-white rounded-2x font-black text-xs uppercase tracking-widest shadow-lg">Verify Stake</button>
                </div>
            </div>

            <!-- STATE: STAKED STATUS -->
            <div v-if="isStaked" class="text-center py-20 bg-slate-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                <div class="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 class="text-3xl font-black text-white uppercase tracking-tight mb-2">Access Granted</h2>
                <p class="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Identity: Premium Verified</p>
            </div>

            <!-- STAKING TERMINAL STATES -->
            <div v-if="isStaking" class="max-w-2xl mx-auto text-center py-12 mb-24 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-cyan-500/30">
                <h3 class="text-xl font-black text-white uppercase mb-8 tracking-widest">Verification Terminal</h3>
                <div class="bg-white p-6 rounded-3xl inline-block mb-8"><img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=EvolutionStakeline`" class="w-40 h-40" /></div>
                <p class="font-mono text-xs text-slate-500 mb-8">EvolutionFOMOStakeline.dash</p>
                <button @click="completeStaking" class="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Verify Stake</button>
            </div>

            <div v-if="isStaked" class="text-center py-20 bg-slate-900 rounded-[3rem] mb-24 border border-white/5">
                <h2 class="text-3xl font-black text-white uppercase tracking-tight">Access Granted</h2>
                <p class="text-cyan-500 font-bold uppercase text-[10px] tracking-widest mt-2">Premium Verified</p>
            </div>

            <!-- PREMIUM ADVANTAGE FOOTER -->
            <div class="mt-32 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-12 shadow-sm">
                <p class="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Premium Advantage</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div class="space-y-4 text-center md:text-left">
                        <h5 class="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">Advanced Launcher</h5>
                        <p class="text-slate-500 text-xs leading-relaxed font-medium">Deploy custom complex token curves and programmed distribution schedules.</p>
                    </div>
                    <div class="space-y-4 text-center md:text-left">
                        <h5 class="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">App Ecosystem</h5>
                        <p class="text-slate-500 text-xs leading-relaxed font-medium">Full access to the EvoNext App Store including DAO tools and yield vaults.</p>
                    </div>
                    <div class="space-y-4 text-center md:text-left">
                        <h5 class="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">Priority Governance</h5>
                        <p class="text-slate-500 text-xs leading-relaxed font-medium">Higher weighted voting power on platform upgrades and community proposals.</p>
                    </div>
                </div>
            </div>

        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Header from '@/components/Header.vue'

const isStaked = ref(false)
const isStaking = ref(false)

const beginStaking = () => { isStaking.value = true }
const completeStaking = () => { isStaked.value = true; isStaking.value = false }
const handleDirectPay = () => { if (confirm('Authorize 5 DUSD Subscription for this identity?')) isStaked.value = true }

onMounted(() => { /* Verify current identity license */ })
</script>
