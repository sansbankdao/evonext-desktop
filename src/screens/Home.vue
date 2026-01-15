<!-- src/screens/Home.vue -->
<template>
    <main class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
        <Header title="Maīson Ξvolution" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <!-- Top Section: Balance & Assets -->
            <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                        <div class="flex-1">
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Total Balance
                            </p>

                            <div class="flex items-baseline gap-2">
                                <p class="text-4xl font-black text-slate-900 dark:text-white">
                                    {{ formatCurrency(totalBalance.usd) }}
                                </p>
                            </div>

                            <p class="text-lg font-medium text-slate-500 dark:text-slate-400">
                                {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                            </p>

                            <p class="text-xs font-mono text-slate-400 mt-1">{{ totalBalance.credits.toLocaleString() }} credits</p>
                        </div>

                        <div class="flex-1 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-6 pt-4 md:pt-0">
                            <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                                My Tokens
                            </p>

                            <div class="flex flex-wrap gap-3">
                                <div v-for="asset in walletStore.assets.slice(0, 4)" :key="asset.symbol"
                                    class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 min-w-[100px]">
                                    <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center">
                                        <img v-if="getIconSrc(asset.symbol)" :src="getIconSrc(asset.symbol) as string" class="w-5 h-5" />
                                        <span v-else class="text-sm font-bold uppercase">
                                            {{ asset.symbol[0] }}
                                        </span>
                                    </div>

                                    <div class="min-w-0">
                                        <p class="text-sm font-black text-slate-900 dark:text-white truncate">
                                            {{ getNormalizedBalance(asset) }}
                                        </p>

                                        <p class="text-xs font-bold text-slate-500 uppercase">
                                            {{ asset.symbol }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-white border border-slate-800 transition-transform">
                    <h3 class="text-xl font-bold mb-1">Collectibles</h3>
                    <button class="mt-4 w-full py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold transition-all">Coming Soon</button>
                </div>
            </section>

            <!-- Feed Section -->
            <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 flex flex-col gap-6">

                    <!-- Post Input Card -->
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div class="flex items-start gap-4">
                            <img :src="identityStore.identity?.avatarUrl ?? getFallbackAvatar(identityStore.username as string)" class="size-12 rounded-2xl object-cover bg-slate-100" />
                            <div class="flex-1">
                                <textarea v-model="newPostContent" rows="3" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-500 resize-none" placeholder="What's on your mind?"></textarea>
                                <div class="flex justify-between items-center mt-4">
                                    <span class="text-sm text-slate-400 font-bold uppercase tracking-widest pl-2">Post cost: ~1,000 credits</span>
                                    <button @click="handleQuickPost" :disabled="!isAuthenticated || !newPostContent.trim() || isSubmitting" class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-2 rounded-xl transition-all disabled:opacity-30">
                                        {{ isSubmitting ? 'Posting...' : 'Post' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Social Feed Header -->
                    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                    <div class="w-2 h-2 rounded-full bg-emerald-500" :class="posts.isLoading.value ? 'animate-pulse' : ''"></div>
                                </div>
                                <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Social Feed</h2>
                            </div>
                            <div class="flex items-center gap-4">
                                <button @click="refreshFeed" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-500 transition-colors">
                                    <svg class="w-5 h-5" :class="{'animate-spin': posts.isLoading.value}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button @click="showDebug = !showDebug" class="text-sm font-bold text-slate-400 uppercase">Debug</button>
                            </div>
                        </div>
                    </div>

                    <!-- Post List rendering -->
                    <div v-if="posts.isLoading.value && posts.posts.value.length === 0" class="space-y-6">
                        <!-- Skeleton Loader -->
                        <div v-for="i in 3" :key="'skeleton-' + i" class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
                            <div class="flex gap-4">
                                <div class="size-12 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                                <div class="flex-1 space-y-3 pt-2">
                                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/4"></div>
                                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="posts.posts.value.length > 0" class="flex flex-col gap-6">
                        <PostItem
                            v-for="post in posts.posts.value.slice(0, 5)"
                            :key="post.id || `${post.ownerId}-${post.createdAt}`"
                            :post="post"
                            @like="handleLike"
                            @repost="handleRepost"
                            @bookmark="handleBookmark"
                            @share="handleShare"
                        />
                    </div>

                    <div v-else-if="!posts.isLoading.value" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <h3 class="font-bold text-slate-900 dark:text-white">Empty Feed</h3>
                        <p class="text-slate-500 text-xs uppercase mt-1">No posts found on Testnet</p>
                        <button @click="refreshFeed" class="mt-4 text-cyan-500 text-sm font-bold underline">Try Refreshing</button>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="flex flex-col gap-8">
                    <PendingMessages />
                    <ContactRequests />
                    <TrendingTopics />
                </div>
            </section>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useWalletStore } from '@/stores/wallet'
import { usePosts } from '@/composables/usePosts'
import { useNetwork } from '@/composables/useNetwork'

import Header from '@/components/Header.vue'
import PostItem from '@/components/posts/Item.vue'
import TrendingTopics from '@/components/home/TrendingTopics.vue'
import ContactRequests from '@/components/home/ContactRequests.vue'
import PendingMessages from '@/components/home/PendingMessages.vue'

const identityStore = useIdentityStore()
const systemStore = useSystemStore()
const walletStore = useWalletStore()
const { network: currentNetwork } = useNetwork()
const posts = usePosts()

const newPostContent = ref('')
const showDebug = ref(false)
const isSubmitting = ref(false)

const isAuthenticated = computed(() => identityStore.isAuthenticated)

const totalBalance = computed(() => {
    if (isAuthenticated.value && identityStore.balance) {
        const raw = Number(identityStore.balance)
        const dash = (raw / 1000) / 100000000
        return { dash, usd: dash * (systemStore.currentDashPrice || 0), credits: raw }
    }
    return { dash: 0, usd: 0, credits: 0 }
})

/**
 * FIXED: Removed query parameters to match the working call in Posts.vue
 */
const refreshFeed = async () => {
    try {
        // Calling fetchPosts WITHOUT arguments ensures it uses the same
        // indexing/ordering as the main Posts page.
        await posts.fetchPosts()
    } catch (e) {
        console.error("Home Feed Refresh Error:", e)
    }
}

const getNormalizedBalance = (asset: any) => {
    const raw = Number(asset.balance) || 0
    const divisor = asset.symbol.toUpperCase().includes('USD') ? 100 : 100000000
    return (raw / divisor).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const getIconSrc = (symbol: string) => {
    const s = symbol.toLowerCase().replace(/^t/, '')
    const supported = ['dash', 'dusd', 'sans']
    return supported.includes(s) ? `/icons/${s}.svg` : null
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0).replace('$', '') + ' USD'
}

const getFallbackAvatar = (name: string | undefined): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Me')}&background=random`

const handleQuickPost = async () => {
    if (!newPostContent.value.trim() || isSubmitting.value) return
    isSubmitting.value = true
    try {
        await posts.createPost(newPostContent.value.trim())
        newPostContent.value = ''
        await Promise.all([
            identityStore.fetchBalance(),
            refreshFeed()
        ])
    } catch (e) {
        console.error('Post failed', e)
    } finally {
        isSubmitting.value = false
    }
}

const handleLike = (id: string) => posts.likePost(id)
const handleRepost = (id: string) => console.log('Repost', id)
const handleBookmark = (id: string) => posts.bookmarkPost(id)
const handleShare = (id: string) => {
    const url = `https://app.evonext.app/posts/${id}`
    if (navigator.share) navigator.share({ url })
    else navigator.clipboard.writeText(url).then(() => alert('Copied'))
}

onMounted(async () => {
    // 1. Fetch Posts immediately using the default call
    refreshFeed()

    // 2. Load balance logic
    if (isAuthenticated.value) {
        if (!identityStore.balance) identityStore.fetchBalance()
        await walletStore.refreshBalances(currentNetwork.value)
    }
})
</script>
