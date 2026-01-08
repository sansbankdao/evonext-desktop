<!-- src/screens/Bootstrap.vue -->
<template>
    <main>
        <Header title="Sansbank Bootstrap Fund" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div class="flex flex-col items-center gap-16">

                    <!-- Hero Section -->
                    <div class="text-center space-y-8">
                        <!-- <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
                            The Sansbank Bootstrap Fund
                        </h1> -->

                        <p class="max-w-3xl mx-auto text-2xl font-bold leading-relaxed text-rose-700 dark:text-rose-400">
                            A community-powered initiative to launch Sansbank, the next-generation permissionless financial tool for the Dash ecosystem. Let's build the future, together.
                        </p>

                        <!-- Progress Bar -->
                        <div class="pt-4">
                            <div class="flex justify-between mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <span>Funding Goal: 250 DASH</span>
                                <span>Raised: 162.5 DASH (65%)</span>
                            </div>
                            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 border border-slate-200/50 dark:border-slate-600/50">
                                <div class="bg-gradient-to-r from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500 h-4 rounded-full shadow-lg" style="width: 65%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- "What is Sansbank?" Section -->
                    <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            What is Sansbank?
                        </h2>
                        <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            Sansbank is a community-driven project designed to enhance the utility and power of the Dash network. By providing new, accessible financial tools, we aim to unlock the full potential of Dash for users, developers, and Masternode owners alike, creating a more robust and vibrant ecosystem.
                        </p>
                    </div>

                    <!-- Main Contribution Section -->
                    <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <!-- QR Code and Address -->
                        <div class="flex flex-col items-center text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                            <h3 class="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                                Contribute to the Fund
                            </h3>
                            <p class="mt-2 text-slate-600 dark:text-slate-400">Send Dash to the official bootstrap address below.</p>

                            <!-- Sample QR Code -->
                            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl mt-6 shadow-lg border border-slate-200 dark:border-slate-700">
                                <svg class="h-48 w-48 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                    <rect width="100" height="100" fill="#F9FAFB" rx="8" ry="8"/>
                                    <rect x="10" y="10" width="20" height="20" fill="#1F2937" rx="4"/><rect x="40" y="10" width="10" height="10" fill="#1F2937" rx="2"/><rect x="60" y="10" width="30" height="10" fill="#1F2937" rx="2"/><rect x="10" y="40" width="10" height="30" fill="#1F2937" rx="2"/><rect x="40" y="40" width="30" height="30" fill="#1F2937" rx="4"/><rect x="80" y="40" width="10" height="20" fill="#1F2937" rx="2"/><rect x="10" y="80" width="30" height="10" fill="#1F2937" rx="2"/><rect x="60" y="70" width="20" height="20" fill="#1F2937" rx="4"/>
                                </svg>
                            </div>

                            <div class="mt-6 w-full max-w-md">
                                <div class="relative">
                                    <input type="text" readonly value="XcYVp6iGZ2y5E5E5mY5N5xZ5f5Z5g5Z5" class="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 pr-12 shadow-sm focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all duration-200 text-lg">
                                    <button class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200 shadow-sm hover:shadow-md" title="Copy Address">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">All contributions are secured via InstantSend.</p>
                        </div>

                        <!-- Leaderboard -->
                        <div class="w-full p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                            <h3 class="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400">
                                Top Contributors
                            </h3>
                            <div class="mt-6 flow-root">
                                <ul class="divide-y divide-slate-200 dark:divide-slate-700">
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-amber-500">1.</span>
                                            <span class="font-mono text-slate-700 dark:text-slate-300">Xp...a4d3</span>
                                        </div>
                                        <span class="font-semibold text-2xl text-slate-900 dark:text-slate-100">50.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-600 dark:text-slate-400">2.</span>
                                            <span class="font-mono text-slate-700 dark:text-slate-300">Xf...h8e1</span>
                                        </div>
                                        <span class="font-semibold text-xl text-slate-900 dark:text-slate-100">25.5 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-orange-500">3.</span>
                                            <span class="font-mono text-slate-700 dark:text-slate-300">Xb...c9b7</span>
                                        </div>
                                        <span class="font-semibold text-xl text-slate-900 dark:text-slate-100">15.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-500 dark:text-slate-400">4.</span>
                                            <span class="font-mono text-slate-700 dark:text-slate-300">Xm...f2g9</span>
                                        </div>
                                        <span class="font-semibold text-lg text-slate-900 dark:text-slate-100">10.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-500 dark:text-slate-400">5.</span>
                                            <span class="font-mono text-slate-700 dark:text-slate-300">Xq...k5j6</span>
                                        </div>
                                        <span class="font-semibold text-lg text-slate-900 dark:text-slate-100">7.5 DASH</span>
                                    </li>
                                </ul>
                            </div>
                            <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">Leaderboard updates every 15 minutes.</p>
                        </div>
                    </div>

                    <!-- "Our Commitment" Section -->
                    <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Our Commitment to the Community
                        </h2>
                        <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            This is not just a funding round; it's a partnership. We are committed to full transparency and will provide regular updates on our progress. If this proposal is successful, we will submit a formal proposal to the Dash Treasury to secure long-term, sustainable funding, ensuring Sansbank becomes a permanent fixture of the Dash ecosystem.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue'
</script>
