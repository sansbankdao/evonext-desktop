<!-- src/pages/Home.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Sansbank Bootstrap
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
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div class="flex flex-col items-center gap-16">

                    <!-- Hero Section -->
                    <div class="text-center space-y-8">
                        <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                            The Sansbank Bootstrap Fund
                        </h1>
                        <p class="max-w-3xl mx-auto text-lg leading-relaxed text-slate-400">
                            A community-powered initiative to launch Sansbank, the next-generation permissionless financial tool for the Dash ecosystem. Let's build the future, together.
                        </p>

                        <!-- Progress Bar -->
                        <div class="pt-4">
                            <div class="flex justify-between mb-2 text-sm font-medium text-slate-300">
                                <span>Funding Goal: 250 DASH</span>
                                <span>Raised: 162.5 DASH (65%)</span>
                            </div>
                            <div class="w-full bg-slate-700 rounded-full h-4">
                                <div class="bg-gradient-to-r from-sky-400 to-blue-500 h-4 rounded-full" style="width: 65%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- "What is Sansbank?" Section -->
                    <div class="w-full text-center p-8 border border-slate-700 bg-slate-800/50 rounded-lg">
                        <h2 class="text-3xl font-bold tracking-tight text-white">
                            What is Sansbank?
                        </h2>
                        <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-400">
                            Sansbank is a community-driven project designed to enhance the utility and power of the Dash network. By providing new, accessible financial tools, we aim to unlock the full potential of Dash for users, developers, and Masternode owners alike, creating a more robust and vibrant ecosystem.
                        </p>
                    </div>

                    <!-- Main Contribution Section -->
                    <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <!-- QR Code and Address -->
                        <div class="flex flex-col items-center text-center">
                            <h3 class="text-2xl font-bold text-cyan-400">
                                Contribute to the Fund
                            </h3>
                            <p class="mt-2 text-slate-400">Send Dash to the official bootstrap address below.</p>

                            <!-- Sample QR Code -->
                            <div class="bg-white p-4 rounded-lg mt-6">
                                <svg class="h-48 w-48" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                    <rect width="100" height="100" fill="#E5E7EB"/>
                                    <rect x="10" y="10" width="20" height="20" fill="#1F2937"/>
                                    <rect x="40" y="10" width="10" height="10" fill="#1F2937"/>
                                    <rect x="60" y="10" width="30" height="10" fill="#1F2937"/>
                                    <rect x="10" y="40" width="10" height="30" fill="#1F2937"/>
                                    <rect x="40" y="40" width="30" height="30" fill="#1F2937"/>
                                    <rect x="80" y="40" width="10" height="20" fill="#1F2937"/>
                                    <rect x="10" y="80" width="30" height="10" fill="#1F2937"/>
                                    <rect x="60" y="70" width="20" height="20" fill="#1F2937"/>
                                </svg>
                            </div>

                            <div class="mt-6 w-full max-w-md">
                                <div class="relative">
                                    <input type="text" readonly value="XcYVp6iGZ2y5E5E5mY5N5xZ5f5Z5g5Z5" class="w-full bg-slate-800 text-slate-300 font-mono text-center p-3 rounded-lg border border-slate-700 pr-12">
                                    <button class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white" title="Copy Address">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <p class="mt-3 text-sm text-slate-500">All contributions are secured via InstantSend.</p>
                        </div>

                        <!-- Leaderboard -->
                        <div class="w-full">
                            <h3 class="text-2xl font-bold text-center text-cyan-400">
                                Top Contributors
                            </h3>
                            <div class="mt-6 flow-root">
                                <ul class="divide-y divide-slate-700">
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-amber-400">1.</span>
                                            <span class="font-mono text-slate-300">Xp...a4d3</span>
                                        </div>
                                        <span class="font-semibold text-white">50.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-300">2.</span>
                                            <span class="font-mono text-slate-300">Xf...h8e1</span>
                                        </div>
                                        <span class="font-semibold text-white">25.5 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-orange-400">3.</span>
                                            <span class="font-mono text-slate-300">Xb...c9b7</span>
                                        </div>
                                        <span class="font-semibold text-white">15.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-500">4.</span>
                                            <span class="font-mono text-slate-300">Xm...f2g9</span>
                                        </div>
                                        <span class="font-semibold text-white">10.0 DASH</span>
                                    </li>
                                    <li class="py-4 flex items-center justify-between space-x-4">
                                        <div class="flex items-center space-x-4">
                                            <span class="text-lg font-bold text-slate-500">5.</span>
                                            <span class="font-mono text-slate-300">Xq...k5j6</span>
                                        </div>
                                        <span class="font-semibold text-white">7.5 DASH</span>
                                    </li>
                                </ul>
                            </div>
                            <p class="mt-4 text-center text-sm text-slate-500">Leaderboard updates every 15 minutes.</p>
                        </div>
                    </div>

                    <!-- "Our Commitment" Section -->
                    <div class="w-full text-center p-8 border border-slate-700 bg-slate-800/50 rounded-lg">
                        <h2 class="text-3xl font-bold tracking-tight text-white">
                            Our Commitment to the Community
                        </h2>
                        <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-400">
                            This is not just a funding round; it's a partnership. We are committed to full transparency and will provide regular updates on our progress. If this proposal is successful, we will submit a formal proposal to the Dash Treasury to secure long-term, sustainable funding, ensuring Sansbank becomes a permanent fixture of the Dash ecosystem.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>
