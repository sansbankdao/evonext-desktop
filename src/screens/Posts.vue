<!-- src/screens/Posts.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-gray-50 dark:bg-slate-900 p-6 rounded-xl shadow-lg">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
                Platform Posts
            </h1>

            <div class="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <span class="w-[300px]">
                    <span class="text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-600/70 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="flex flex-col gap-8">

                    <!-- Page Header -->
                    <div class="space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                            Posts &amp; Remixes
                        </h1>

                        <p class="text-lg text-slate-600 dark:text-slate-400">
                            Discover the latest updates or share your own take on the conversation.
                        </p>
                    </div>

                    <!-- Tab Navigation -->
                    <div>
                        <div class="border-b-2 border-slate-200 dark:border-slate-700 rounded-t-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                            <nav class="-mb-px flex space-x-1 p-2" aria-label="Tabs">
                                <!-- Active Tab -->
                                <button class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                                    Posts
                                </button>

                                <!-- Inactive Tab -->
                                <button class="flex-1 py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                    Remix
                                </button>
                            </nav>
                        </div>
                    </div>

                    <!-- Tab Content Area -->
                    <div>
                        <!-- TAB CONTENT: POSTS -->
                        <div class="flex flex-col gap-6">
                            <!-- Post Item 1 (Text Only) -->
                            <article class="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group">
                                <div class="flex items-start gap-4">
                                    <img src="https://ui-avatars.com/api/?name=Alice&background=0ea5e9&color=fff" alt="Alice's Avatar" class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md group-hover:scale-105 transition-transform duration-200"/>

                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-slate-900 dark:text-slate-100">
                                            Alice
                                        </p>

                                        <p class="text-sm text-slate-500 dark:text-slate-400">
                                            @alice · 1h ago
                                        </p>
                                    </div>
                                </div>

                                <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                    The Dash ecosystem is buzzing with so much innovation right now. Projects like EvoNext and the Sansbank Bootstrap are perfect examples of community-driven growth. It's an exciting time to be involved! 🚀
                                </p>

                                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                                        <span>5</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg>
                                        <span>3</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                        <span>28</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                    </button>
                                </div>
                            </article>

                            <!-- Post Item 2 (With Image) -->
                            <article class="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group">
                                <div class="flex items-start gap-4">
                                    <img src="https://ui-avatars.com/api/?name=Bob&background=10b981&color=fff" alt="Bob's Avatar" class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md group-hover:scale-105 transition-transform duration-200"/>

                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-slate-900 dark:text-slate-100">
                                            Bob
                                        </p>

                                        <p class="text-sm text-slate-500 dark:text-slate-400">
                                            @bob · 3h ago
                                        </p>
                                    </div>
                                </div>

                                <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                    Visualizing the future of decentralized networks. The potential is limitless.
                                </p>

                                <img class="w-full h-64 rounded-2xl object-cover shadow-2xl ring-2 ring-slate-200 dark:ring-slate-700" src="https://images.unsplash.com/photo-1639322537228-f710d846310a" alt="Blockchain visualization"/>

                                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                                        <span>12</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg>
                                        <span>8</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                        <span>51</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                    </button>
                                </div>
                            </article>
                        </div>

                        <!-- TAB CONTENT: REMIX -->
                        <div class="hidden flex-col gap-6">
                            <!-- Remix Post Item -->
                            <article class="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group">
                                <!-- Your Remix Header -->
                                <div class="flex items-start gap-4">
                                    <img src="https://ui-avatars.com/api/?name=You&background=8b5cf6&color=fff" alt="Your Avatar" class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md group-hover:scale-105 transition-transform duration-200"/>

                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-slate-900 dark:text-slate-100">
                                            You (Remixed)
                                        </p>

                                        <p class="text-sm text-slate-500 dark:text-slate-400">
                                            @you · 5m ago
                                        </p>
                                    </div>
                                </div>

                                <!-- Your Remix Commentary -->
                                <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                    Completely agree with this! The community is the strongest asset. Building on these ideas is how we move forward.
                                </p>

                                <!-- Embedded Original Post -->
                                <div class="border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6 mt-4 bg-slate-50 dark:bg-slate-700/50 shadow-inner">
                                    <div class="flex items-start gap-3 mb-3">
                                        <img src="https://ui-avatars.com/api/?name=Alice&background=0ea5e9&color=fff" alt="Alice's Avatar" class="size-10 rounded-full ring-2 ring-slate-200 dark:ring-slate-600"/>

                                        <div>
                                            <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                Alice
                                            </p>

                                            <p class="text-xs text-slate-500 dark:text-slate-400">
                                                @alice
                                            </p>
                                        </div>
                                    </div>

                                    <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        The Dash ecosystem is buzzing with so much innovation right now. Projects like EvoNext and the Sansbank Bootstrap are perfect examples of community-driven growth. It's an exciting time to be involved! 🚀
                                    </p>
                                </div>

                                <!-- Actions for YOUR Remix Post -->
                                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                                        <span>1</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                        <span>3</span>
                                    </button>

                                    <button class="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-all duration-200 group-hover:scale-105">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                    </button>
                                </div>
                            </article>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>
