<!-- src/screens/Apps.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Mini Apps
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

        <section class="bg-slate-900 font-sans text-slate-200 min-h-screen">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="flex flex-col gap-12">

                    <!-- 1. Featured Cards -->
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-4">Featured Apps</h2>
                        <div class="flex space-x-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                            <div v-for="app in featuredApps" :key="app.id" class="flex-shrink-0 h-32 md:h-48 group relative rounded-xl overflow-hidden">
                                <img
                                    :src="app.imageUrl"
                                    :alt="app.title"
                                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                                <div class="absolute bottom-0 left-0 p-6">
                                    <h3 class="text-xl font-bold text-white">
                                        {{ app.title }}
                                    </h3>

                                    <p class="text-slate-300 mt-1 text-sm">
                                        {{ app.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Installed Apps -->
                    <div>
                        <h2 class="text-xl font-semibold text-white mb-4">My Apps</h2>
                        <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                            <a v-for="app in installedApps" :key="app.id" href="#" class="flex flex-col items-center gap-2 flex-shrink-0 w-24 text-center group">
                                <div class="size-16 rounded-xl bg-slate-700 p-1 transition duration-300 group-hover:scale-105 group-hover:bg-slate-600">
                                    <img :src="app.iconUrl" :alt="app.name" class="w-full h-full object-cover rounded-lg">
                                </div>
                                <span class="text-xs text-slate-400 font-medium truncate w-full">{{ app.name }}</span>
                            </a>
                            <a href="#" class="flex flex-col items-center gap-2 flex-shrink-0 w-24 text-center group">
                                <div class="size-16 rounded-xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center transition duration-300 group-hover:border-slate-500 group-hover:bg-slate-700">
                                    <svg class="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </div>
                                <span class="text-xs text-slate-500 font-medium">Add New</span>
                            </a>
                        </div>
                    </div>

                    <!-- 3. Trending List -->
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-6">Trending Apps</h2>

                        <!-- Category Filters -->
                        <div class="mb-6 border-b border-slate-700">
                            <nav class="-mb-px flex space-x-6 overflow-x-auto">
                                <button v-for="category in categories" :key="category.id" @click="activeCategory = category.id"
                                    :class="[activeCategory === category.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-white', 'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium transition']">
                                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" v-html="category.icon"></svg>
                                    <span>{{ category.name }}</span>
                                </button>
                            </nav>
                        </div>

                        <!-- List of Trending Apps -->
                        <div class="space-y-3">
                            <div v-for="app in filteredTrendingApps" :key="app.id" class="bg-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 hover:bg-slate-700/50 transition">
                                <div class="flex items-center gap-4">
                                    <img :src="app.iconUrl" :alt="app.name" class="size-14 rounded-xl bg-slate-700 p-1"/>
                                    <div>
                                        <h3 class="font-bold text-white">{{ app.name }}</h3>
                                        <p class="text-sm text-slate-400">by {{ app.publisher }}</p>
                                    </div>
                                </div>
                                <button class="inline-flex justify-center rounded-lg bg-cyan-500 py-2 px-6 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 transition">
                                    Launch
                                </button>
                            </div>
                            <!-- Empty State -->
                            <div v-if="filteredTrendingApps.length === 0" class="text-center py-12 px-6 bg-slate-800 rounded-xl">
                                <h3 class="text-lg font-semibold text-white">No Apps in this Category</h3>
                                <p class="mt-1 text-slate-400">Check back later or explore another category.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<!-- src/screens/Apps.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Interfaces for our data types ---
interface FeaturedApp {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
}

interface InstalledApp {
    id: string;
    name: string;
    iconUrl: string;
}

interface TrendingApp {
    id: string;
    name: string;
    publisher: string;
    iconUrl: string;
    category: 'games' | 'social' | 'finance' | 'art' | 'utility';
}

interface Category {
    id: 'all' | 'games' | 'social' | 'finance' | 'art' | 'utility';
    name: string;
    icon: string; // SVG path data
}

// --- Component State ---
const activeCategory = ref<Category['id']>('all');

// --- Sample Data ---
const featuredApps = ref<FeaturedApp[]>([
    {
        id: 'f1',
        title: 'DashPay Wallet',
        description: 'The official, feature-rich Dash wallet.',
        imageUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&h=400&fit=crop',
    },
    {
        id: 'f2',
        title: 'Pixelated Realms',
        description: 'A decentralized RPG where you own your items.',
        imageUrl: 'https://images.unsplash.com/photo-1555864475-c7d3c013349b?w=600&h=400&fit=crop',
    },
    {
        id: 'f3',
        title: 'Artisan Hub',
        description: 'A marketplace for tokenized digital art.',
        imageUrl: 'https://images.unsplash.com/photo-1558286019-617a9c336dc6?w=600&h=400&fit=crop',
    },
])

const installedApps = ref<InstalledApp[]>([
    { id: 'i1', name: 'DashPay Wallet', iconUrl: 'https://ui-avatars.com/api/?name=DW&background=3b82f6&color=fff' },
    { id: 'i2', name: 'Stakehouse', iconUrl: 'https://ui-avatars.com/api/?name=SH&background=f59e0b&color=fff' },
    { id: 'i3', name: 'Chat', iconUrl: 'https://ui-avatars.com/api/?name=C&background=ec4899&color=fff' },
]);

const trendingApps = ref<TrendingApp[]>([
    { id: 't1', name: 'Decentral Games', publisher: 'DG-Labs', iconUrl: 'https://ui-avatars.com/api/?name=DG&background=8b5cf6&color=fff', category: 'games' },
    { id: 't2', name: 'DashPay Wallet', publisher: 'Dash Core Group', iconUrl: 'https://ui-avatars.com/api/?name=DW&background=3b82f6&color=fff', category: 'finance' },
    { id: 't3', name: 'EvoVerse', publisher: 'CommunityDAO', iconUrl: 'https://ui-avatars.com/api/?name=EV&background=ec4899&color=fff', category: 'social' },
    { id: 't4', 'name': 'Mintable Art', publisher: 'Artisan Hub', iconUrl: 'https://ui-avatars.com/api/?name=MA&background=f59e0b&color=fff', category: 'art' },
    { id: 't5', name: 'DPNS Manager', publisher: 'Dash Core Group', iconUrl: 'https://ui-avatars.com/api/?name=DPNS&background=14b8a6&color=fff', category: 'utility' },
    { id: 't6', name: 'CoinFlip', publisher: 'Community Games', iconUrl: 'https://ui-avatars.com/api/?name=CF&background=8b5cf6&color=fff', category: 'games' },
]);

const categories = ref<Category[]>([
    { id: 'all', name: 'All', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />' },
    { id: 'games', name: 'Games', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />' },
    { id: 'social', name: 'Social', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3 3 0 0115 9.185V6.75a3 3 0 00-3-3h-1.5a3 3 0 00-3 3v2.435a3 3 0 01-1.07 2.275L6 15m3 0v6m0 0h6m-6 0H6" />' },
    { id: 'finance', name: 'Finance', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.798 0m-15.798 0A60.07 60.07 0 012.25 5.25m15.798 13.5A60.07 60.07 0 002.25 5.25m15.798 13.5V5.25A2.25 2.25 0 0015.75 3h-6a2.25 2.25 0 00-2.25 2.25v13.5" />' },
    { id: 'art', name: 'Art', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.47 2.118 2.25 2.25 0 01-2.47-2.118c-.113-.028-.227-.06-.337-.098a2.25 2.25 0 01-2.47-2.118 2.25 2.25 0 01.337-.098 3 3 0 005.78-1.128 2.25 2.25 0 012.47-2.118 2.25 2.25 0 012.47 2.118.9.9 0 00.337.098 3 3 0 005.78 1.128 2.25 2.25 0 012.47 2.118 2.25 2.25 0 01-2.47 2.118.9.9 0 00-.337.098 3 3 0 00-5.78-1.128z" />' },
    { id: 'utility', name: 'Utility', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.242 1.451l-1.043.827c-.295.234-.417.62-.292.968.065.176.12.354.16.533.127.564.018 1.18-.292 1.656l-1.043.827a1.125 1.125 0 01-1.451.242l-1.296-2.247a1.125 1.125 0 01-.49-1.37l.456-1.217c.133-.355.072-.75-.124-1.075a6.321 6.321 0 00-.22-.127c-.332-.185-.582-.496-.645-.87l-.213-1.281zm-2.64-1.281c-.09.542-.56.94-1.11.94H3.75c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.32 6.32 0 00-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49L.324 2.653a1.125 1.125 0 01.242-1.451L1.61 0.376C1.905.142 2.29.02 2.664.143l1.217.456c.355.133.75.072 1.075-.124.073-.044.146-.087.22-.127.332-.185.582-.496.645-.87L7.05 1.281z" />' },
]);

// A computed property to dynamically filter the list
const filteredTrendingApps = computed(() => {
    if (activeCategory.value === 'all') {
        return trendingApps.value;
    }
    return trendingApps.value.filter(app => app.category === activeCategory.value);
})
</script>
