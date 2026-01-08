<!-- src/screens/Home.vue -->
<template>
    <main class="">
        <Header title="Maīson Ξvolution" />

        <!-- Balance Card & Actions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="text-slate-600 dark:text-slate-400 text-sm">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {{ formatCurrency(totalBalance.usd) }}
                        </p>

                        <p class="text-xl text-slate-700 dark:text-slate-300 font-mono">
                            {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                        </p>

                        <p class="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {{ totalBalance.credits.toLocaleString() }} credits
                        </p>

                        <div class="mt-2 flex items-center gap-1">
                            <svg class="w-4 h-4" :class="systemStore.isPricePositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path v-show="systemStore.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4 10-10" />
                                <path v-show="!systemStore.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l-4 4 10-10" />
                            </svg>

                            <span class="text-sm" :class="systemStore.isPricePositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'">
                                {{ systemStore.priceChange24h > 0 ? '+' : '' }}{{ systemStore.priceChange24h.toFixed(2) }}% vs last 24h
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm border border-slate-200 dark:border-slate-600">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>

                        <span class="text-slate-700 dark:text-slate-300">
                            Dash Platform
                        </span>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                    Collectibles
                </p>

                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    unique digital assets
                </p>

                <button class="mt-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm tracking-wide border border-slate-200 dark:border-slate-600">
                    Open My Collection
                </button>
            </div>
        </section>

        <!-- Main Content Area (2/3 width on large screens) -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Create Post & Feed -->
            <div class="lg:col-span-2 flex flex-col gap-6">
                <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-start gap-4">
                        <img
                            :src="identityStore.identity?.avatarUrl || getFallbackAvatar(identityStore.username as string)"
                            alt="Your Avatar"
                            class="size-12 rounded-full"
                        />

                        <textarea
                            v-model="newPostContent"
                            class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition"
                            placeholder="What's on your mind?"
                            @keydown.enter.exact.prevent="handleQuickPost"
                        />
                    </div>

                    <div class="flex justify-end items-center mt-4">
                        <button
                            @click="handleQuickPost"
                            :disabled="!isAuthenticated || !newPostContent.trim()"
                            class="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-full transition"
                        >
                            Post
                        </button>
                    </div>
                </div>

                <!-- Fresh Posts Title -->
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Fresh Posts
                    </h2>
                    <span class="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {{ currentNetwork.toUpperCase() }}
                    </span>
                </div>

                <!-- Post Items -->
                <div v-if="posts.isLoading.value && !posts.error.value" class="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-4"></div>
                    <p>Loading posts...</p>
                </div>

                <div v-else-if="posts.error.value" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-800 dark:text-red-300">
                    <p class="font-semibold mb-2">Error Loading Posts</p>
                    <p class="mb-4">{{ posts.error.value }}</p>
                    <button @click="handlePostRefresh" class="underline hover:opacity-80">Retry</button>
                </div>

                <div v-else-if="recentPosts.length === 0" class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>No posts found on {{ currentNetwork.toUpperCase() }}.</p>
                    <p v-if="isAuthenticated" class="text-sm mt-2">Be the first to post!</p>
                </div>

                <div v-else class="flex flex-col gap-6">
                    <PostItem
                        v-for="post in recentPosts"
                        :key="post.id || post.ownerId + '-' + post.createdAt"
                        :post="enrichPost(post)"
                        @like="handleLike"
                        @repost="handleRepost"
                        @bookmark="handleBookmark"
                        @share="handleShare"
                    />
                </div>

                <div v-if="hasMore" class="text-center pt-4">
                    <button
                        @click="fetchMore"
                        :disabled="posts.isLoading.value"
                        class="text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition"
                    >
                        Load More Posts
                    </button>
                </div>
            </div>

            <!-- Sidebar (1/3 width on large screens) -->
            <div class="lg:col-span-1 flex flex-col gap-6">
                <PendingMessages />
                <ContactRequests />
                <TrendingTopics />
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { usePosts } from '@/composables/usePosts'
import { useNetwork } from '@/composables/useNetwork'

import Header from '@/components/Header.vue'
import PostItem from '@/components/PostItem.vue'
import TrendingTopics from '@/components/home/TrendingTopics.vue'
import ContactRequests from '@/components/home/ContactRequests.vue'
import PendingMessages from '@/components/home/PendingMessages.vue'

const identityStore = useIdentityStore()
const systemStore = useSystemStore()
const router = useRouter()

// Initialize Posts Composable
const postsComposable = usePosts()
const { network: currentNetwork } = useNetwork()

const posts = postsComposable

const newPostContent = ref('')

// Get the most recent 3 posts
const recentPosts = computed(() => {
    return posts.posts.value.slice(0, 3)
})

const isAuthenticated = computed(() => identityStore.isAuthenticated)

const totalBalance = computed(() => {
    if (isAuthenticated.value && identityStore.balance) {
        const rawBalance = parseInt(String(identityStore.balance), 10)
        const credits = rawBalance
        const duffs = credits * 1000
        const dash = duffs / 100000000
        const usd = dash * systemStore.currentDashPrice

        return { dash, usd, credits, duffs }
    }

    return { dash: 0.00, usd: 0.00, credits: 0, duffs: 0 }
})

// Helper to get a fallback avatar (Gravatar) if no avatarUrl is available
const getFallbackAvatar = (username: string | undefined) => {
    const name = username || 'You'
    return `https://www.gravatar.com/avatar/${encodeURIComponent(name)}?s=200&d=404&rating=g`
}

// Helper to enrich post data with identity info (Username/DPNS)
// Uses data already attached to the post object by usePosts()
const enrichPost = (post: any) => {
    // The usePosts composable attaches 'author' object. If not present, fallback.
    if (post.author) {
        return {
            ...post,
            author: post.author
        }
    }

    // Fallback: We don't have the profile locally yet.
    return {
        ...post,
        author: {
            username: `@user_${post.ownerId.slice(0, 8)}`,
            displayName: `User ${post.ownerId.slice(0, 8)}`,
            avatar: getFallbackAvatar(`User ${post.ownerId.slice(0, 8)}`),
            verified: false
        }
    }
}

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0.00'

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

const hasMore = computed(() => postsComposable.hasMore.value)

const handlePostRefresh = async () => {
    try {
        await postsComposable.fetchPosts({ orderBy: 'newest', limit: 10 })
    } catch (err: unknown) {
        console.error('Failed to refresh posts:', err)
    }
}

// FIX: Added missing fetchMore function
const fetchMore = async () => {
    try {
        await postsComposable.fetchMorePosts()
    } catch (err: unknown) {
        console.error('Failed to fetch more posts:', err)
    }
}

const handleQuickPost = async () => {
    if (!newPostContent.value.trim()) return

    try {
        await postsComposable.createPost(newPostContent.value.trim())
        newPostContent.value = ''
    } catch (err: unknown) {
        console.error('Failed to create post:', err)
        alert(`Failed to post: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
}

const handleLike = async (postId: string) => {
    await postsComposable.likePost(postId)
}

const handleRepost = (postId: string) => {
    console.log('Reposting:', postId)
}

const handleBookmark = async (postId: string) => {
    await postsComposable.bookmarkPost(postId)
}

const handleShare = (postId: string) => {
    const post = postsComposable.getPostById(postId)
    const shareText = post
        ? `Check out this post by ${post.author.displayName}: ${post.content.substring(0, 100)}...`
        : 'Check out this post on EvoNext!'

    if (navigator.share) {
        navigator.share({
            title: 'EvoNext Post',
            text: shareText,
            url: `https://app.evonext.app/posts/${postId}`
        }).catch(console.error)
    } else {
        navigator.clipboard.writeText(`https://app.evonext.app/posts/${postId}`)
            .then(() => alert('Post link copied to clipboard!'))
            .catch(console.error)
    }
}

onMounted(async () => {
    if (isAuthenticated.value) {
        if (!identityStore.balance) {
            identityStore.fetchBalance()
        }
    }

    // Fetch Fresh Posts
    await postsComposable.fetchPosts({ orderBy: 'newest', limit: 10 })
})
</script>
