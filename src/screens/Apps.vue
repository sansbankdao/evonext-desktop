<!-- src/screens/Apps.vue -->
<template>
    <main>
        <Header title="Mini Apps" />

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="flex flex-col gap-12">

                    <!-- 1. Featured Cards -->
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                            Featured Apps
                        </h2>

                        <div class="flex space-x-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-500 dark:scrollbar-thumb-slate-700 scrollbar-track-slate-100 dark:scrollbar-track-slate-800">
                            <div v-for="app in featuredApps" :key="app.id" class="flex-shrink-0 h-32 md:h-48 group relative rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                                <img
                                    :src="app.imageUrl"
                                    :alt="app.title"
                                    class="h-full w-[400px] object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                                <div class="absolute bottom-0 left-0 p-6">
                                    <h3 class="text-xl font-bold text-white">
                                        {{ app.title }}
                                    </h3>

                                    <p class="text-slate-200 dark:text-slate-300 mt-1 text-sm">
                                        {{ app.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Installed Apps -->
                    <div>
                        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                            Installed Apps
                        </h2>

                        <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-500 dark:scrollbar-thumb-slate-700 scrollbar-track-slate-100 dark:scrollbar-track-slate-800">
                            <a v-for="app in installedApps" :key="app.id" href="#" class="flex flex-col items-center gap-2 flex-shrink-0 w-24 text-center group">
                                <div class="size-20 rounded-2xl bg-slate-100 dark:bg-slate-700 p-1 transition duration-300 group-hover:scale-105 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 border border-slate-200 dark:border-slate-600">
                                    <img
                                        :src="app.iconUrl"
                                        :alt="app.name"
                                        class="w-full h-full object-cover rounded-xl"
                                    />
                                </div>

                                <span class="text-xs text-slate-600 dark:text-slate-400 font-medium truncate w-full">
                                    {{ app.name }}
                                </span>
                            </a>

                            <router-link to="/studio" class="flex flex-col items-center gap-2 flex-shrink-0 w-24 text-center group">
                                <div class="size-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center transition duration-300 group-hover:border-slate-200 dark:group-hover:border-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                                    <svg class="h-8 w-8 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </div>

                                <span class="text-xs text-slate-500 dark:text-slate-500 font-medium">
                                    Add New
                                </span>
                            </router-link>
                        </div>
                    </div>

                    <!-- 3. Trending List -->
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                            Trending Apps
                        </h2>

                        <!-- Category Filters -->
                        <div class="mb-6 border-b border-slate-200 dark:border-slate-700">
                            <nav class="-mb-px flex space-x-6 overflow-x-auto">
                                <button v-for="category in categories" :key="category.id" @click="activeCategory = category.id"
                                    :class="[activeCategory === category.id ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium transition rounded-t-xl']">
                                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" v-html="category.icon"></svg>
                                    <span>{{ category.name }}</span>
                                </button>
                            </nav>
                        </div>

                        <!-- List of Trending Apps -->
                        <div class="space-y-3">
                            <div v-for="app in filteredTrendingApps" :key="app.id" class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div class="flex items-center gap-4">
                                    <img
                                        :src="app.iconUrl"
                                        :alt="app.name"
                                        class="size-20 rounded-2xl bg-slate-100 dark:bg-slate-700 p-1 border border-slate-200 dark:border-slate-600 object-cover"
                                    />

                                    <div>
                                        <h3 class="font-bold text-slate-900 dark:text-slate-100">
                                            {{ app.name }}
                                        </h3>

                                        <p class="text-sm text-slate-600 dark:text-slate-400">
                                            by {{ app.publisher }}
                                        </p>
                                    </div>
                                </div>

                                <button class="inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-2 px-6 text-sm font-semibold text-white shadow-sm transition border border-sky-300">
                                    Launch
                                </button>
                            </div>

                            <!-- Empty State -->
                            <div v-if="filteredTrendingApps.length === 0" class="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    No Apps in this Category
                                </h3>

                                <p class="mt-1 text-slate-600 dark:text-slate-400">
                                    Check back later or explore another category.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Header from '@/components/Header.vue'

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
    icon: string;
}

// --- Component State ---
const activeCategory = ref<Category['id']>('all');

// --- Sample Data ---
const featuredApps = ref<FeaturedApp[]>([
    {
        id: 'f1',
        title: `Rock, Paper, Scissors, Lizard, Spock`,
        description: `Come play the ultimate P2P strategy game with a chance to win real Dash USD in every match.`,
        imageUrl: 'https://i.ibb.co/7JwB98cQ/banner.webp',
    },
    {
        id: 'f2',
        title: `FarmVille`,
        description: `Grow crops, raise animals, and build your dream farm. Daily prizes available.`,
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 'f3',
        title: `Words with Friends`,
        description: `Challenge friends to a word game. Earn tokens for high-scoring words.`,
        imageUrl: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 'f4',
        title: `Candy Crush`,
        description: `Match colorful candies in this addictive puzzle game with daily rewards.`,
        imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 'f5',
        title: `Mafia Wars`,
        description: `Build your criminal empire and compete with other players.`,
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2070&auto=format&fit=crop',
    },
])

const installedApps = ref<InstalledApp[]>([
    {
        id: 'i1',
        name: `RPSLS`,
        iconUrl: 'https://i.ibb.co/xSCKqVbt/icon.webp',
    },
    {
        id: 'i2',
        name: `FarmVille`,
        iconUrl: 'https://i.ibb.co/ZzXNGKD5/tea.png',
    },
    {
        id: 'i3',
        name: `Pet Society`,
        iconUrl: 'https://i.ibb.co/zVqBq08C/dog.png',
    },
    {
        id: 'i4',
        name: `Texas HoldEm`,
        iconUrl: 'https://plus.unsplash.com/premium_photo-1694004710242-c90943f0c280?q=80',
    },
    {
        id: 'i5',
        name: `Quiz Planet`,
        iconUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?q=80',
    },
])

const trendingApps = ref<TrendingApp[]>([
    {
        id: 't1',
        name: `Rock, Paper, Scissors, Lizard, Spock`,
        publisher: `0xShomari`,
        iconUrl: 'https://i.ibb.co/xSCKqVbt/icon.webps',
        category: 'games',
    },
    {
        id: 't2',
        name: 'FarmVille',
        publisher: 'Zynga',
        iconUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't3',
        name: 'Words with Friends',
        publisher: 'Zynga',
        iconUrl: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't4',
        name: 'Candy Crush',
        publisher: 'King',
        iconUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't5',
        name: 'Pet Society',
        publisher: 'Playfish',
        iconUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't6',
        name: 'Mafia Wars',
        publisher: 'Zynga',
        iconUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't7',
        name: 'Texas HoldEm Poker',
        publisher: 'Zynga',
        iconUrl: 'https://plus.unsplash.com/premium_photo-1694004710242-c90943f0c280?q=80',
        category: 'games'
    },
    {
        id: 't8',
        name: 'Restaurant City',
        publisher: 'Playfish',
        iconUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't9',
        name: 'Quiz Planet',
        publisher: 'Fandom',
        iconUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?q=80',
        category: 'games'
    },
    {
        id: 't10',
        name: 'CityVille',
        publisher: 'Zynga',
        iconUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=500&auto=format&fit=crop',
        category: 'games'
    },
    {
        id: 't11',
        name: 'FishVille',
        publisher: 'Zynga',
        iconUrl: 'https://images.unsplash.com/photo-1592929043000-fbea34bc8ad5?q=80',
        category: 'games'
    },
])

const categories = ref<Category[]>([
    {
        id: 'all',
        name: 'All',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />',
    },
    {
        id: 'games',
        name: 'Games',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />',
    },
    {
        id: 'social',
        name: 'Social',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3 3 0 0115 9.185V6.75a3 3 0 00-3-3h-1.5a3 3 0 00-3 3v2.435a3 3 0 01-1.07 2.275L6 15m3 0v6m0 0h6m-6 0H6" />',
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.798 0m-15.798 0A60.07 60.07 0 012.25 5.25m15.798 13.5A60.07 60.07 0 002.25 5.25m15.798 13.5V5.25A2.25 2.25 0 0015.75 3h-6a2.25 2.25 0 00-2.25 2.25v13.5" />',
    },
    {
        id: 'art',
        name: 'Art',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.47 2.118 2.25 2.25 0 01-2.47-2.118c-.113-.028-.227-.06-.337-.098a2.25 2.25 0 01-2.47-2.118 2.25 2.25 0 01.337-.098 3 3 0 005.78-1.128 2.25 2.25 0 012.47-2.118 2.25 2.25 0 012.47 2.118.9.9 0 00.337.098 3 3 0 005.78 1.128 2.25 2.25 0 012.47 2.118 2.25 2.25 0 01-2.47 2.118.9.9 0 00-.337.098 3 3 0 00-5.78-1.128z" />',
    },
    {
        id: 'utility',
        name: 'Utility',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.242 1.451l-1.043.827c-.295.234-.417.62-.292.968.065.176.12.354.16.533.127.564.018 1.18-.292 1.656l-1.043.827a1.125 1.125 0 01-1.451.242l-1.296-2.247a1.125 1.125 0 01-.49-1.37l.456-1.217c.133-.355.072-.75-.124-1.075a6.321 6.321 0 00-.22-.127c-.332-.185-.582-.496-.645-.87l-.213-1.281zm-2.64-1.281c-.09.542-.56.94-1.11.94H3.75c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.32 6.32 0 00-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49L.324 2.653a1.125 1.125 0 01.242-1.451L1.61 0.376C1.905.142 2.29.02 2.664.143l1.217.456c.355.133.75.072 1.075-.124.073-.044.146-.087.22-.127.332-.185.582-.496.645-.87L7.05 1.281z" />',
    },
])

/* Computed property to dynamically filter the list. */
const filteredTrendingApps = computed(() => {
    if (activeCategory.value === 'all') {
        return trendingApps.value
    }

    return trendingApps.value
        .filter(app => app.category === activeCategory.value)
})
</script>
