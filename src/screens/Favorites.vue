<!-- src/screens/Favorites.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-slate-100 dark:text-slate-900 mb-4 sm:mb-0">
                My Favorites
            </h1>

            <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span class="w-[300px]">
                    <span class="text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-700 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">

                    <!-- Page Header -->
                    <div class="space-y-2">
                        <p class="text-lg text-slate-600 dark:text-slate-400">A collection of your saved posts, topics, and creators.</p>
                    </div>

                    <!-- Tab Navigation -->
                    <div>
                        <div class="border-b border-slate-200 dark:border-slate-700">
                            <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                                <button @click="activeTab = 'posts'" :class="[activeTab === 'posts' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium transition rounded-t-xl']">
                                    Posts
                                </button>
                                <button @click="activeTab = 'identities'" :class="[activeTab === 'identities' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium transition rounded-t-xl']">
                                    Identities
                                </button>
                                <button @click="activeTab = 'topics'" :class="[activeTab === 'topics' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium transition rounded-t-xl']">
                                    Topics
                                </button>
                            </nav>
                        </div>
                    </div>

                    <!-- Tab Content Area -->
                    <div>
                        <!-- Favorited Posts Tab -->
                        <div v-if="activeTab === 'posts'" class="space-y-6">
                            <div v-if="favoritedPosts.length > 0" v-for="post in favoritedPosts" :key="post.id" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-4">
                                        <img :src="post.authorAvatarUrl" :alt="post.authorName" class="size-12 rounded-2xl"/>
                                        <div>
                                            <p class="font-semibold text-slate-900 dark:text-slate-100">{{ post.authorName }}</p>
                                            <p class="text-sm text-slate-600 dark:text-slate-400">{{ post.authorUsername }} · {{ post.timestamp }}</p>
                                        </div>
                                    </div>
                                    <button class="text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-xl transition" title="Unfavorite Post">
                                        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path></svg>
                                    </button>
                                </div>
                                <p class="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">{{ post.content }}</p>
                            </div>
                            <!-- Empty State for Posts -->
                            <div v-else class="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">No Favorited Posts Yet</h3>
                                <p class="mt-1 text-slate-600 dark:text-slate-400">When you favorite a post, it will appear here.</p>
                            </div>
                        </div>

                        <!-- Favorited Identities Tab -->
                        <div v-if="activeTab === 'identities'" class="space-y-4">
                            <div v-if="favoritedIdentities.length > 0" v-for="identity in favoritedIdentities" :key="identity.id" class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div class="flex items-center gap-4">
                                    <img :src="identity.avatarUrl" :alt="identity.displayName" class="size-16 rounded-2xl"/>
                                    <div>
                                        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ identity.displayName }}</h3>
                                        <p class="text-sm text-slate-600 dark:text-slate-400">{{ identity.username }}</p>
                                        <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 truncate max-w-md">{{ identity.bio }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold px-4 py-2 rounded-xl text-sm transition shadow-sm border border-slate-200 dark:border-slate-600">View Profile</button>
                                    <button class="text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-xl transition" title="Unfavorite Identity">
                                        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <!-- Empty State for Identities -->
                            <div v-else class="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">No Favorited Identities</h3>
                                <p class="mt-1 text-slate-600 dark:text-slate-400">Save your favorite creators to find them easily.</p>
                            </div>
                        </div>

                        <!-- Favorited Topics Tab -->
                        <div v-if="activeTab === 'topics'" class="space-y-3">
                            <div v-if="favoritedTopics.length > 0" v-for="topic in favoritedTopics" :key="topic" class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span class="font-semibold text-lg text-sky-500 dark:text-sky-400">{{ topic }}</span>
                                <button class="text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-xl transition" title="Unfavorite Topic">
                                    <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path><path d="M5.13 1.002a1 1 0 011.09.847l.11.88a7.5 7.5 0 0110.138 9.538 1 1 0 01-1.597.433l-1.02-1.02a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.164.164a.75.75 0 01-1.06 0l-2.22-2.22a.75.75 0 00-1.06 0l-.82.82a1 1 0 01-1.597-1.192A7.5 7.5 0 015.13 1.002zM10.5 5.5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z"></path></svg>
                                </button>
                            </div>
                            <!-- Empty State for Topics -->
                            <div v-else class="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">No Favorited Topics</h3>
                                <p class="mt-1 text-slate-600 dark:text-slate-400">Following a #topic will make it appear here.</p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Define the TypeScript interfaces for our favorited items
interface FavoritePost {
    id: string;
    authorName: string;
    authorUsername: string;
    authorAvatarUrl: string;
    content: string;
    timestamp: string;
}

interface FavoriteIdentity {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    bio: string;
}

// State for the active tab
const activeTab = ref<'posts' | 'identities' | 'topics'>('posts');

// Sample Data
const favoritedPosts = ref<FavoritePost[]>([
    {
        id: 'p1',
        authorName: 'Alice',
        authorUsername: 'alice.dash',
        authorAvatarUrl: 'https://ui-avatars.com/api/?name=Alice&background=ec4899&color=fff',
        content: 'The Dash ecosystem is buzzing with so much innovation right now. Projects like EvoNext and the Sansbank Bootstrap are perfect examples of community-driven growth.',
        timestamp: '2d ago'
    },
    {
        id: 'p2',
        authorName: 'Satoshi',
        authorUsername: 'satoshi.dash',
        authorAvatarUrl: 'https://ui-avatars.com/api/?name=Satoshi&background=16a34a&color=fff',
        content: 'Decentralization is not just a technology; it\'s a paradigm shift in how we think about trust, ownership, and freedom.',
        timestamp: '5d ago'
    },
]);

const favoritedIdentities = ref<FavoriteIdentity[]>([
    {
        id: 'f1',
        displayName: 'Heidi',
        username: 'heidi.dash',
        avatarUrl: 'https://ui-avatars.com/api/?name=Heidi&background=14b8a6&color=fff',
        bio: 'Dash enthusiast and advocate for decentralized governance. Believes in building a better future on-chain.'
    },
]);

const favoritedTopics = ref<string[]>(['#Dash', '#Decentralization'])
</script>
