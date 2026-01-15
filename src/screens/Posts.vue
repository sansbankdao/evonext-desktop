<!-- src/screens/Posts.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import PostItem from '@/components/PostItem.vue'
import { usePosts } from '@/composables/usePosts'
import { useIdentityStore } from '@/stores/identity'

const router = useRouter()
const identityStore = useIdentityStore()

// Use new composable
const postsComposable = usePosts()

// Destructure with renamed methods to avoid conflicts
const {
    activeTab,
    searchQuery,
    languageFilter,
    showSensitive,
    isLoading,
    error,
    posts,
    totalPosts,
    hasMore,
    isAuthenticated,
    debugStats, // <--- ADDED: Expose debug stats
    currentNetwork, // <--- ADDED: Expose network

    fetchPosts,
    fetchMorePosts,
    createPost,
    likePost,
    bookmarkPost,
    setTab,
    startAutoRefresh,
    stopAutoRefresh,
    getPostById
} = postsComposable

// Constants for Explorer Links
// const EXPLORER_URLS: Record<string, string> = {
//     testnet: 'https://testnet.platform-explorer.com',
//     mainnet: 'https://platform-explorer.com'
// }

// Compute explorer URL for the current network
// const explorerUrl = computed(() => EXPLORER_URLS[currentNetwork.value] || EXPLORER_URLS.testnet)

// --- DEBUG STATE ---
const isDebugOpen = ref(true)
// const isRefreshing = ref(false)

// Create computed property for filtered posts
const filteredPostsData = computed(() => {
    let filtered = posts.value

    // Apply search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(post =>
            post.content.toLowerCase().includes(query) ||
            post.author.displayName?.toLowerCase().includes(query) ||
            post.author.username?.toLowerCase().includes(query) ||
            (post.hashtag && post.hashtag.toLowerCase().includes(query))
        )
    }

    // Apply language filter
    if (languageFilter.value) {
        filtered = filtered.filter(post => post.language === languageFilter.value)
    }

    // Apply sensitive content filter
    if (!showSensitive.value) {
        filtered = filtered.filter(post => !post.isSensitive)
    }

    return filtered
})

// --- CLIENT LOGS (For Debug UI) ---
const clientLogs = ref<{ timestamp: string; message: string; type: 'info' | 'error' | 'warn' }[]>([])
const addLog = (msg: string, type: 'info' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    clientLogs.value.unshift({ timestamp, message: msg, type })
    if (clientLogs.value.length > 50) clientLogs.value.pop()
}

// Sync with global logger if available
if ((window as any).debugLogs) {
    let originalLogs = (window as any).debugLogs
    Object.defineProperty(window, 'debugLogs', {
        get() { return originalLogs },
        set(newVal) {
            if (Array.isArray(newVal)) {
                clientLogs.value = newVal
            }
            originalLogs = newVal
        }
    })
    clientLogs.value = originalLogs
}

// Local state for compose modal
const showComposeModal = ref(false)
const newPostContent = ref('')
const isSensitive = ref(false)
const postLanguage = ref('en')

const remainingCharacters = computed(() => 500 - newPostContent.value.length)
const canPost = computed(() => newPostContent.value.trim().length > 0 && newPostContent.value.length <= 500)

const handleContentInput = () => {
    if (newPostContent.value.length > 500) {
        newPostContent.value = newPostContent.value.substring(0, 500)
    }
}

const retryFetch = () => {
    fetchPosts()
}

const loadMore = () => {
    fetchMorePosts()
}

const createPostAction = async () => {
    if (!canPost.value) return

    try {
        const post = await createPost(newPostContent.value.trim(), {
            isSensitive: isSensitive.value,
            language: postLanguage.value
        })

        if (post) {
            showComposeModal.value = false
            newPostContent.value = ''
            isSensitive.value = false
            // Refresh posts list
            await fetchPosts()
        }
    } catch (err: any) {
        console.error('Failed to create post:', err)
        // Error is already handled in composable
    }
}

const handleLike = async (postId: string) => {
    await likePost(postId)
}

const handleRepost = async (postId: string) => {
    console.log('Reposting:', postId)
    alert('Repost functionality coming soon!')
}

const handleBookmark = async (postId: string) => {
    await bookmarkPost(postId)
}

const handleShare = (postId: string) => {
    const post = getPostById(postId)
    const shareText = post
        ? `Check out this post on EvoNext by ${post.author.displayName}: ${post.content.substring(0, 100)}...`
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

// Watch for network changes using composable value
watch(
    currentNetwork,
    () => {
        addLog(`Network switched to ${currentNetwork.value}. Refetching posts...`, 'info')
        fetchPosts()
    }
)

// Watch for authentication changes
watch(
    () => identityStore.isAuthenticated,
    (isAuth) => {
        if (isAuth) {
            addLog('User connected. Refreshing posts...', 'info')
            fetchPosts()
        }
    }
)

onMounted(async () => {
    // Start auto-refresh
    startAutoRefresh()

    // Initialize posts
    await fetchPosts()
    addLog('Posts screen mounted', 'info')
})

onUnmounted(() => {
    // Clean up auto-refresh
    stopAutoRefresh()
})
</script>

<template>
    <main>
        <Header title="Posts | Remixes" />

        <!-- Widened UI to max-w-7xl -->
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="flex flex-col gap-8">

                    <!-- Network Info Section -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                                <svg class="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                                    Network Info
                                </h2>
                                <p class="text-slate-500 dark:text-slate-400 text-sm">
                                    Viewing content from <span class="font-medium text-cyan-600 dark:text-cyan-400">{{ currentNetwork.toUpperCase() }}</span>
                                </p>
                            </div>
                        </div>

                        <div class="flex-1 w-full sm:w-auto">
                            <div class="flex flex-col gap-2 text-sm">
                                <div class="flex items-center justify-between sm:justify-start sm:gap-8">
                                    <span class="text-slate-500 dark:text-slate-400">Total Posts:</span>
                                    <span class="font-bold text-slate-900 dark:text-white">{{ totalPosts }}</span>
                                </div>
                                <div class="flex items-center justify-between sm:justify-start sm:gap-8">
                                    <span class="text-slate-500 dark:text-slate-400">Status:</span>
                                    <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <span class="relative flex h-2 w-2">
                                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Operational
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Navigation -->
                    <div>
                        <div class="border-b-2 border-slate-200 dark:border-slate-700 rounded-t-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                            <nav class="-mb-px flex space-x-1 p-2" aria-label="Tabs">
                                <button
                                    @click="setTab('posts')"
                                    :class="[
                                        'flex-1 py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                                        activeTab === 'posts'
                                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow-md'
                                    ]"
                                >
                                    Posts
                                </button>

                                <button
                                    @click="setTab('remix')"
                                    :class="[
                                        'flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                                        activeTab === 'remix'
                                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white'
                                    ]"
                                >
                                    Remix
                                </button>
                            </nav>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="isLoading && posts.length === 0" class="flex flex-col items-center justify-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                        <p class="mt-4 text-slate-600 dark:text-slate-400">
                            Loading posts from {{ currentNetwork.toUpperCase() }} blockchain...
                        </p>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                        <div class="flex items-center gap-3">
                            <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 3z" />
                            </svg>
                            <p class="text-red-800 dark:text-red-300">
                                {{ error }}
                            </p>
                        </div>
                        <button
                            @click="retryFetch"
                            class="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
                        >
                            Retry
                        </button>
                    </div>

                    <!-- Tab Content Area -->
                    <div v-if="!isLoading || posts.length > 0">
                        <!-- TAB CONTENT: POSTS -->
                        <div v-if="activeTab === 'posts'" class="flex flex-col gap-6">
                            <!-- Persistent Input Area (If Authenticated) -->
                            <div v-if="isAuthenticated" class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                <div class="flex items-start gap-4">
                                    <img
                                        :src="identityStore.identity?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.username || 'You')}&background=8b5cf6&color=fff`"
                                        alt="Your Avatar"
                                        class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md"
                                    />
                                    <div class="flex-1">
                                        <button
                                            @click="showComposeModal = true"
                                            class="w-full text-left bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-2xl px-6 py-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-all duration-200"
                                        >
                                            Share your thoughts...
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- "Connect Wallet" Card (If NOT Authenticated) -->
                            <div v-else class="bg-white dark:bg-slate-800 p-6 rounded-2xl text-center border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                <p class="text-slate-600 dark:text-slate-400 mb-4">
                                    Connect your wallet to create posts and interact with the community.
                                </p>
                                <button
                                    @click="router.push('/connect')"
                                    class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200"
                                >
                                    Connect Wallet
                                </button>
                            </div>

                            <!-- Network Indicator & Filters -->
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-slate-500 dark:text-slate-400">
                                        Showing posts from {{ currentNetwork.toUpperCase() }}
                                    </span>
                                    <span class="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                                        {{ posts.length }} {{ posts.length === 1 ? 'post' : 'posts' }}
                                    </span>
                                </div>
                                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                                    <label class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
                                        <input type="checkbox" v-model="showSensitive" class="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500" />
                                        <span>Show sensitive content</span>
                                    </label>
                                    <select v-model="languageFilter"
                                            class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                                        <option value="">All Languages</option>
                                        <option value="en">English</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="zh">Chinese</option>
                                        <option value="ja">Japanese</option>
                                        <option value="ko">Korean</option>
                                        <option value="ru">Russian</option>
                                        <option value="ar">Arabic</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Search Bar -->
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    v-model="searchQuery"
                                    type="text"
                                    placeholder="Search posts..."
                                    class="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                            </div>

                            <!-- Post Items -->
                            <div v-if="filteredPostsData.length === 0 && searchQuery" class="text-center py-8">
                                <p class="text-slate-500 dark:text-slate-400">
                                    No posts found for "{{ searchQuery }}"
                                </p>
                            </div>
                            <div v-else class="space-y-4">
                                <PostItem
                                    v-for="post in filteredPostsData"
                                    :key="post.id || post.ownerId + '-' + post.createdAt"
                                    :post="post"
                                    @like="handleLike"
                                    @repost="handleRepost"
                                    @bookmark="handleBookmark"
                                    @share="handleShare"
                                />
                            </div>
                        </div>

                        <!-- TAB CONTENT: REMIX -->
                        <div v-if="activeTab === 'remix'" class="flex flex-col gap-6">
                            <div class="bg-white dark:bg-slate-800 p-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm text-center">
                                <svg class="h-16 w-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4-4M14 4h6m0 0v6m0 0l4 4m-4-4l4 4" />
                                </svg>
                                <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Remix Feature Coming Soon
                                </h3>
                                <p class="text-slate-600 dark:text-slate-400 mb-6">
                                    The remix feature is under development. Check back soon!
                                </p>
                                <a
                                    href="https://docs.evonext.app/remix"
                                    target="_blank"
                                    class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    Learn more about Remix
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0 0l4 4m-4-4l4 4" /></svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Load More Button -->
                    <div v-if="hasMore && activeTab === 'posts'" class="text-center">
                        <button
                            @click="loadMore"
                            :disabled="isLoading"
                            :class="[
                                'px-6 py-3 rounded-xl font-medium transition-all duration-200',
                                isLoading
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 shadow-lg hover:shadow-xl'
                            ]"
                        >
                            <span v-if="isLoading">Loading...</span>
                            <span v-else>Load More Posts</span>
                        </button>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Showing {{ filteredPostsData.length }} of {{ totalPosts }} posts
                        </p>
                    </div>

                    <!-- DEBUG SECTION -->
                    <div class="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
                        <div class="p-4 border-b border-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors" @click="isDebugOpen = !isDebugOpen">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3, 1.732 3z"/></svg>
                                <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest">Debug Information</h3>
                            </div>
                            <svg class="w-4 h-4 text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': isDebugOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        <div v-if="isDebugOpen" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                            <!-- Client Logs Section -->
                            <div class="bg-black/50 p-4 rounded border border-slate-700 md:col-span-2">
                                <div class="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                                    <p class="font-bold text-slate-300">Client Logs (Live)</p>
                                    <button @click="clientLogs = []" class="text-cyan-500 hover:text-cyan-400 underline">Clear</button>
                                </div>
                                <div class="h-32 overflow-y-auto space-y-1">
                                    <div v-for="(log, idx) in clientLogs" :key="idx" class="flex gap-2" :class="{
                                        'text-red-400': log.type === 'error',
                                        'text-amber-400': log.type === 'warn',
                                        'text-emerald-400': log.type === 'info'
                                    }">
                                        <span class="opacity-50">[{{ log.timestamp }}]</span>
                                        <span>{{ log.message }}</span>
                                    </div>
                                    <div v-if="clientLogs.length === 0" class="text-slate-500 italic">No client logs yet.</div>
                                </div>
                            </div>

                            <!-- Contract Stats (New) -->
                            <div class="bg-black/50 p-4 rounded border border-slate-700 md:col-span-2">
                                <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Contract Fetch Stats</p>
                                <ul class="space-y-1 text-slate-400">
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Network:</span>
                                        <span class="text-emerald-400">{{ currentNetwork.toUpperCase() }}</span>
                                    </li>
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Active Contracts:</span>
                                        <span class="text-white">{{ debugStats.activeContracts.length }}</span>
                                    </li>
                                    <li v-for="(count, contract) in debugStats.fetchCounts" :key="contract" class="flex justify-between">
                                        <span class="opacity-70 truncate max-w-[200px]" :title="contract as string">
                                            {{ contract === 'AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf' ? 'YAPPR Contract' : 'EvoNext Contract' }}
                                        </span>
                                        <span :class="count > 0 ? 'text-emerald-400' : 'text-red-400'">{{ count }} docs</span>
                                    </li>
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Total Raw Fetched:</span>
                                        <span class="text-white">
                                            {{ Object.values(debugStats.fetchCounts).reduce((a: any, b) => a + b, 0) }}
                                        </span>
                                    </li>
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Duplicates Removed:</span>
                                        <span :class="debugStats.duplicateCount > 0 ? 'text-amber-400' : 'text-slate-400'">
                                            {{ debugStats.duplicateCount }}
                                        </span>
                                    </li>
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Final Merged Count:</span>
                                        <span class="text-white font-bold">{{ debugStats.mergeCount }}</span>
                                    </li>
                                    <li class="flex justify-between">
                                        <span class="opacity-70">Last Fetch:</span>
                                        <span class="text-slate-500">{{ debugStats.lastFetchTime }}</span>
                                    </li>
                                </ul>
                            </div>

                            <div class="bg-black/50 p-4 rounded border border-slate-700">
                                <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Identity Store State</p>
                                <ul class="space-y-1 text-slate-400">
                                    <li class="flex justify-between"><span class="opacity-70">Is Connected:</span> <span class="text-emerald-400">{{ identityStore.isAuthenticated }}</span></li>
                                    <li class="flex justify-between"><span class="opacity-70">Username:</span> <span class="text-white">{{ identityStore.username }}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Compose Post Modal -->
        <div v-if="showComposeModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-slate-200 dark:border-slate-700">
                <div class="p-4">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Create Post
                        </h3>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-300">
                                {{ currentNetwork.toUpperCase() }}
                            </span>
                            <button
                                @click="showComposeModal = false"
                                class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                            >
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="flex items-start gap-4">
                            <img
                                :src="identityStore.identity?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.username || 'You')}&background=8b5cf6&color=fff`"
                                alt="Your Avatar"
                                class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
                            />
                            <div class="flex-1">
                                <p class="font-bold text-slate-900 dark:text-slate-100">
                                    {{ identityStore.username || 'You' }}
                                </p>
                                <p class="text-sm text-slate-500 dark:text-slate-400">
                                    Posting to {{ currentNetwork.toUpperCase() }} blockchain
                                </p>
                            </div>
                        </div>

                        <textarea
                            v-model="newPostContent"
                            @input="handleContentInput"
                            placeholder="What's on your mind?"
                            class="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                            maxlength="500"
                        ></textarea>

                        <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <div class="flex items-center gap-4">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" v-model="isSensitive" class="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500" />
                                    <span>Contains sensitive content</span>
                                </label>
                                <select v-model="postLanguage"
                                        class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                    <option value="ja">Japanese</option>
                                    <option value="ko">Korean</option>
                                    <option value="ru">Russian</option>
                                    <option value="ar">Arabic</option>
                                </select>
                            </div>

                            <div>
                                {{ remainingCharacters }}/500
                            </div>
                        </div>

                        <div class="pt-4 border-t-2 border-slate-200 dark:border-slate-700 flex items-center gap-6">
                            <button
                                @click="showComposeModal = false"
                                class="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                @click="createPostAction"
                                :disabled="!canPost || isLoading"
                                :class="[
                                    'px-6 py-3 rounded-xl font-medium transition-all duration-200 flex-1',
                                    !canPost || isLoading
                                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 shadow-lg hover:shadow-xl'
                                ]"
                            >
                                <span v-if="isLoading">Posting...</span>
                                <span v-else>Post to {{ currentNetwork.toUpperCase() }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
