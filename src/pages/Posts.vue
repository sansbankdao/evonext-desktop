<!-- src/pages/Home.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Platform Posts
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
            <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="flex flex-col gap-8">

                    <!-- Page Header -->
                    <div class="space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Posts & Remixes
                        </h1>
                        <p class="text-lg text-slate-400">
                            Discover the latest updates or share your own take on the conversation.
                        </p>
                    </div>

                    <!-- Tab Navigation -->
                    <div>
                        <div class="border-b border-slate-700">
                            <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                                <!-- Active Tab -->
                                <a href="#" class="border-cyan-400 text-cyan-400 whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium" aria-current="page">
                                    Posts
                                </a>
                                <!-- Inactive Tab -->
                                <a href="#" class="border-transparent text-slate-400 hover:border-slate-500 hover:text-white whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium">
                                    Remix
                                </a>
                            </nav>
                        </div>
                    </div>

                    <!-- Tab Content Area -->
                    <div>
                        <!-- ====================================================================== -->
                        <!-- TAB CONTENT: POSTS                                                     -->
                        <!-- Show this content when the "Posts" tab is active.                    -->
                        <!-- Use v-if="activeTab === 'posts'" in Vue                              -->
                        <!-- ====================================================================== -->
                        <div class="flex flex-col gap-6">
                            <!-- Post Item 1 (Text Only) -->
                            <div class="bg-slate-800 p-6 rounded-xl flex flex-col gap-4">
                                <div class="flex items-center gap-4">
                                    <img src="https://ui-avatars.com/api/?name=Alice&background=0ea5e9&color=fff" alt="Alice's Avatar" class="size-12 rounded-full"/>
                                    <div>
                                        <p class="font-semibold text-white">Alice</p>
                                        <p class="text-sm text-slate-400">@alice · 1h ago</p>
                                    </div>
                                </div>
                                <p class="text-slate-300 leading-relaxed">
                                    The Dash ecosystem is buzzing with so much innovation right now. Projects like EvoNext and the Sansbank Bootstrap are perfect examples of community-driven growth. It's an exciting time to be involved! 🚀
                                </p>
                                <div class="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-700">
                                    <button class="flex items-center gap-2 hover:text-cyan-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 5</button>
                                    <button class="flex items-center gap-2 hover:text-green-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg> 3</button>
                                    <button class="flex items-center gap-2 hover:text-red-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> 28</button>
                                    <button class="flex items-center gap-2 hover:text-slate-200 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></button>
                                </div>
                            </div>

                            <!-- Post Item 2 (With Image) -->
                            <div class="bg-slate-800 p-6 rounded-xl flex flex-col gap-4">
                                <div class="flex items-center gap-4">
                                    <img src="https://ui-avatars.com/api/?name=Bob&background=10b981&color=fff" alt="Bob's Avatar" class="size-12 rounded-full"/>
                                    <div>
                                        <p class="font-semibold text-white">Bob</p>
                                        <p class="text-sm text-slate-400">@bob · 3h ago</p>
                                    </div>
                                </div>
                                <p class="text-slate-300 leading-relaxed">
                                    Visualizing the future of decentralized networks. The potential is limitless.
                                </p>
                                <img class="w-full h-auto rounded-lg object-cover" src="https://images.unsplash.com/photo-1639322537228-f710d846310a" alt="Blockchain visualization"/>
                                <div class="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-700">
                                    <button class="flex items-center gap-2 hover:text-cyan-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 12</button>
                                    <button class="flex items-center gap-2 hover:text-green-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg> 8</button>
                                    <button class="flex items-center gap-2 hover:text-red-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> 51</button>
                                    <button class="flex items-center gap-2 hover:text-slate-200 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></button>
                                </div>
                            </div>
                        </div>

                        <!-- ====================================================================== -->
                        <!-- TAB CONTENT: REMIX                                                     -->
                        <!-- Show this content when the "Remix" tab is active.                    -->
                        <!-- Use v-if="activeTab === 'remix'" in Vue                              -->
                        <!-- ====================================================================== -->
                        <div class="hidden flex-col gap-6"> <!-- Add the 'hidden' class for the static example -->
                            <!-- Remix Post Item -->
                            <div class="bg-slate-800 p-6 rounded-xl flex flex-col gap-4">
                                <!-- Your Remix Header -->
                                <div class="flex items-center gap-4">
                                    <img src="https://ui-avatars.com/api/?name=You&background=8b5cf6&color=fff" alt="Your Avatar" class="size-12 rounded-full"/>
                                    <div>
                                        <p class="font-semibold text-white">You (Remixed)</p>
                                        <p class="text-sm text-slate-400">@you · 5m ago</p>
                                    </div>
                                </div>
                                <!-- Your Remix Commentary -->
                                <p class="text-slate-300 leading-relaxed">
                                    Completely agree with this! The community is the strongest asset. Building on these ideas is how we move forward.
                                </p>
                                <!-- Embedded Original Post -->
                                <div class="border border-slate-700 rounded-lg p-4 mt-2">
                                    <div class="flex items-center gap-3">
                                        <img src="https://ui-avatars.com/api/?name=Alice&background=0ea5e9&color=fff" alt="Alice's Avatar" class="size-8 rounded-full"/>
                                        <div>
                                            <p class="text-sm font-semibold text-white">Alice</p>
                                            <p class="text-xs text-slate-500">@alice</p>
                                        </div>
                                    </div>
                                    <p class="text-slate-400 mt-3">
                                        The Dash ecosystem is buzzing with so much innovation right now. Projects like EvoNext and the Sansbank Bootstrap are perfect examples of community-driven growth. It's an exciting time to be involved! 🚀
                                    </p>
                                </div>
                                <!-- Actions for YOUR Remix Post -->
                                <div class="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-700">
                                <button class="flex items-center gap-2 hover:text-cyan-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 1</button>
                                <button class="flex items-center gap-2 hover:text-green-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg></button>
                                <button class="flex items-center gap-2 hover:text-red-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> 3</button>
                                <button class="flex items-center gap-2 hover:text-slate-200 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>
