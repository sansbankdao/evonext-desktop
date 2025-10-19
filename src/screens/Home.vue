<!-- src/screens/Home.vue -->
<template>
    <main class="">
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Platform Overview
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

        <!-- Balance Card & Actions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-slate-800 p-6 rounded-xl">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-slate-400 text-sm">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold text-white mt-1">
                            $12,345.67
                        </p>

                        <p class="text-sm text-green-400 mt-1">
                            +1.25% ($152.34) vs last 24h
                        </p>
                    </div>

                    <div class="flex items-center gap-1 bg-slate-700 px-3 py-1 rounded-full text-sm">
                        <span class="w-2 h-2 rounded-full bg-green-400"></span>
                        <span>
                            Dash Credits
                        </span>
                    </div>
                </div>

                <!-- <div class="mt-6 flex flex-col sm:flex-row gap-3">
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
                </div> -->
            </div>

            <div class="bg-slate-800 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                <p class="text-3xl font-semibold text-white">
                    Collectibles
                </p>

                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                    unique digital assets
                </p>

                <button class="mt-4 bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors text-sm tracking-wide">
                    Open My Collection
                </button>
            </div>
        </section>

        <!-- Assets & Transactions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content Feed (2/3 width on large screens) -->
            <div class="lg:col-span-2 flex flex-col gap-6">

                <!-- Create Post -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <div class="flex items-start gap-4">
                        <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Your Avatar" class="size-12 rounded-full"/>
                        <textarea class="w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition" placeholder="What's on your mind?"></textarea>
                    </div>
                    <div class="flex justify-end items-center mt-4">
                        <!-- Action Icons for Post -->
                        <div class="flex items-center gap-4 text-slate-400">
                            <button class="hover:text-cyan-400 transition" title="Add Image">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                            </button>
                            <button class="hover:text-cyan-400 transition" title="Create Poll">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                            </button>
                        </div>
                        <button class="ml-6 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-2 rounded-full transition">
                            Post
                        </button>
                    </div>
                </div>

                <!-- Fresh Posts Title -->
                <h2 class="text-xl font-semibold text-white">Fresh Posts</h2>

                <!-- Post Item -->
                <div class="bg-slate-800 p-6 rounded-xl flex flex-col gap-4">
                    <!-- Post Header -->
                    <div class="flex items-center gap-4">
                        <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Alice's Avatar" class="size-12 rounded-full"/>
                        <div>
                            <p class="font-semibold text-white">Alice</p>
                            <p class="text-sm text-slate-400">@alice · 15m ago</p>
                        </div>
                    </div>
                    <!-- Post Content -->
                    <p class="text-slate-300 leading-relaxed">
                        Just exploring the new Sansbank Bootstrap page. The design is super clean! Really excited to see where this project goes for the Dash community. #Dash #Sansbank
                    </p>
                    <!-- Post Actions -->
                    <div class="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-700">
                        <button class="flex items-center gap-2 hover:text-cyan-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 2</button>
                        <button class="flex items-center gap-2 hover:text-green-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4"/></svg> 1</button>
                        <button class="flex items-center gap-2 hover:text-red-400 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> 12</button>
                        <button class="flex items-center gap-2 hover:text-slate-200 transition"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></button>
                    </div>
                </div>

            </div>

            <!-- Sidebar (1/3 width on large screens) -->
            <div class="lg:col-span-1 flex flex-col gap-6">

                <!-- Trending Topics -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <h2 class="text-xl font-semibold text-white mb-4">Trending Topics</h2>
                    <div class="flex flex-col gap-3">
                        <a href="#" class="text-cyan-400 hover:text-cyan-300 font-semibold">#Sansbank</a>
                        <a href="#" class="text-cyan-400 hover:text-cyan-300 font-semibold">#Dash</a>
                        <a href="#" class="text-cyan-400 hover:text-cyan-300 font-semibold">#CryptoFreedom</a>
                        <a href="#" class="text-cyan-400 hover:text-cyan-300 font-semibold">#EvoNext</a>
                    </div>
                </div>

                <!-- Contact Requests -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-white">Contact Requests</h2>
                        <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">2</span>
                    </div>
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Bob's Avatar" class="size-10 rounded-full"/>
                                <p class="font-semibold text-white">Bob</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button class="bg-green-500 hover:bg-green-600 p-2 rounded-full"><svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button>
                                <button class="bg-slate-700 hover:bg-slate-600 p-2 rounded-full"><svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                            </div>
                        </div>
                        <!-- ... other request items ... -->
                    </div>
                </div>

                <!-- Pending Messages -->
                <div class="bg-slate-800 p-6 rounded-xl">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-white">Pending Messages</h2>
                        <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">1</span>
                    </div>
                    <div class="flex flex-col gap-4">
                        <a href="#" class="block hover:bg-slate-700 p-2 rounded-lg transition">
                            <div class="flex items-center gap-3">
                                <img src="https://ui-avatars.com/api/?name=Alice&background=random" alt="Charlie's Avatar" class="size-10 rounded-full"/>
                                <div>
                                    <p class="font-semibold text-white">Charlie</p>
                                    <p class="text-sm text-slate-400 truncate">Hey, saw your post about the bootstrap...</p>
                                </div>
                            </div>
                        </a>
                        <!-- ... other message items ... -->
                    </div>
                </div>

            </div>
        </section>
    </main>
</template>
