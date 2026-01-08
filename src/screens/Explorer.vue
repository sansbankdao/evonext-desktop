<!-- src/screens/Explorer.vue -->
<template>
    <main>
        <Header title="Platform Explorer" />

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="space-y-12">

                    <!-- Header and Search Section -->
                    <div class="text-center space-y-6">
                        <p class="text-xl text-slate-600 dark:text-slate-400">
                            Discover trending content, topics, and creators across the network.
                        </p>

                        <div class="max-w-xl mx-auto">
                            <div class="relative">
                                <input type="text" placeholder="Search for posts, topics, or people..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-4">
                                    <svg class="h-6 w-6 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Trending Topics -->
                    <div>
                        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 text-center">Trending Topics</h2>
                        <div class="flex flex-wrap justify-center gap-3">
                            <a v-for="topic in trendingTopics" :key="topic" href="#" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-200 font-medium py-1.5 px-4 rounded-2xl transition border border-slate-200 dark:border-slate-600">
                                {{ topic }}
                            </a>
                        </div>
                    </div>

                    <!-- Trending Posts Grid -->
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                            Trending Posts
                        </h2>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <!-- Use v-for to loop through posts -->
                            <a v-for="post in trendingPosts" :key="post.id" href="#" class="group relative block w-full aspect-[2/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                <img :src="post.imageUrl" :alt="`Post by ${post.authorName}`" class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105">

                                <!-- Hover Overlay -->
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div class="p-4 flex flex-col h-full justify-end">
                                        <div class="flex items-center gap-3">
                                            <img :src="post.authorAvatarUrl" :alt="post.authorName" class="size-8 rounded-2xl border-2 border-slate-200 dark:border-slate-400">

                                            <div>
                                                <p class="font-bold text-white">
                                                    {{ post.authorName }}
                                                </p>

                                                <p class="text-sm text-slate-300 dark:text-slate-200">
                                                    {{ post.authorUsername }}
                                                </p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-4 text-slate-200 dark:text-slate-100 mt-3 text-sm">
                                            <span class="flex items-center gap-1.5">
                                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                                {{ post.likes }}
                                            </span>

                                            <span class="flex items-center gap-1.5">
                                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                                                {{ post.comments }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>

                    <!-- Featured Identities -->
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                            Featured Identities
                        </h2>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div v-for="identity in featuredIdentities" :key="identity.id" class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center text-center transition hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm">
                                <img :src="identity.avatarUrl" :alt="identity.displayName" class="size-20 rounded-2xl"/>

                                <h3 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {{ identity.displayName }}
                                </h3>

                                <p class="text-sm text-slate-600 dark:text-slate-400">

                                    {{ identity.username }}</p>

                                <button class="mt-4 w-full inline-flex justify-center rounded-2xl bg-sky-500/20 dark:bg-sky-500/30 py-2 px-4 text-sm font-semibold text-sky-600 dark:text-sky-400 shadow-sm hover:bg-sky-500/30 dark:hover:bg-sky-400/40 border border-sky-300 dark:border-sky-700">
                                    Follow
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
/* Import modules. */
import { ref } from 'vue'

import Header from '@/components/Header.vue'
import type { IFeaturedIdentity, ITrendingPost } from '@/types'

// Sample Data
const trendingTopics = ref<string[]>(['#Dash', '#EvoNext', '#Decentralization', '#CryptoArt', '#Privacy'])

const trendingPosts = ref<ITrendingPost[]>([
    { id: 'p1', imageUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&h=600&fit=crop', authorName: 'Alice', authorUsername: 'alice.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Alice&background=ec4899&color=fff', likes: 102, comments: 12 },
    { id: 'p2', imageUrl: 'https://images.unsplash.com/photo-1642104704074-af05b94d3b5b?w=400&h=500&fit=crop', authorName: 'Bob', authorUsername: 'bob.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Bob&background=8b5cf6&color=fff', likes: 98, comments: 7 },
    { id: 'p3', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=550&fit=crop', authorName: 'Charlie', authorUsername: 'charlie.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Charlie&background=f59e0b&color=fff', likes: 85, comments: 22 },
    { id: 'p4', imageUrl: 'https://images.unsplash.com/photo-1640540824233-3b15de34E35b?w=400&h=650&fit=crop', authorName: 'Diana', authorUsername: 'diana.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Diana&background=10b981&color=fff', likes: 76, comments: 5 },
    { id: 'p5', imageUrl: 'https://images.unsplash.com/photo-1639762681057-401886cea556?w=400&h=450&fit=crop', authorName: 'Frank', authorUsername: 'frank.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Frank&background=3b82f6&color=fff', likes: 68, comments: 15 },
    { id: 'p6', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=520&fit=crop', authorName: 'Grace', authorUsername: 'grace.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Grace&background=ef4444&color=fff', likes: 62, comments: 9 },
    { id: 'p7', imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop', authorName: 'Heidi', authorUsername: 'heidi.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Heidi&background=14b8a6&color=fff', likes: 55, comments: 18 },
    { id: 'p8', imageUrl: 'https://images.unsplash.com/photo-1620321023395-d1a1a7f7426b?w=400&h=500&fit=crop', authorName: 'Satoshi', authorUsername: 'satoshi.dash', authorAvatarUrl: 'https://ui-avatars.com/api/?name=Satoshi&background=16a34a&color=fff', likes: 150, comments: 42 },
]);

const featuredIdentities = ref<IFeaturedIdentity[]>([
    { id: 'f1', displayName: 'Heidi', username: 'heidi.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Heidi&background=14b8a6&color=fff' },
    { id: 'f2', displayName: 'CryptoArt Digest', username: 'cryptoart.dash', avatarUrl: 'https://ui-avatars.com/api/?name=CAD&background=fbbf24&color=000' },
    { id: 'f3', displayName: 'Diana', username: 'diana.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Diana&background=10b981&color=fff' },
    { id: 'f4', displayName: 'Dash News', username: 'dash-news.dash', avatarUrl: 'https://ui-avatars.com/api/?name=DN&background=3b82f6&color=fff' },
])
</script>
