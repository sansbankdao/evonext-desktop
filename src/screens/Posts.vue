<!-- src/screens/Posts.vue -->
<template>
    <main>
        <Header title="Posts | Remixes" />

        <!-- Main Container -->
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div class="flex flex-col gap-8">
                    <!-- Content Area -->
                    <div class="flex flex-col lg:flex-row gap-8">
                        <!-- Left Column: Create Post & Filters -->
                        <div class="lg:w-1/3 space-y-6">
                            <!-- Create Post Card -->
                            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Create Post
                                </h3>

                                <div class="flex items-start gap-4 mb-4">
                                    <img
                                        :src="identityStore.identity?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.username || 'You')}&background=8b5cf6&color=fff`"
                                        alt="Your Avatar"
                                        class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
                                    />
                                    <div class="flex-1">
                                        <button
                                            @click="showComposeModal = true"
                                            :disabled="!isAuthenticated"
                                            class="w-full text-left bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {{
                                                isAuthenticated
                                                ? 'Share your thoughts...'
                                                : 'Connect wallet to post'
                                            }}
                                        </button>
                                        <div v-if="!isAuthenticated" class="mt-3">
                                            <button
                                                @click="router.push('/connect')"
                                                class="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200"
                                            >
                                                Connect Wallet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Filters Card -->
                            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                    Filters
                                </h3>

                                <div class="space-y-4">
                                    <!-- Search -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Search
                                        </label>
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
                                                class="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <!-- Language Filter -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Language
                                        </label>
                                        <select
                                            v-model="languageFilter"
                                            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        >
                                            <option value="">All Languages</option>
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                            <option value="de">German</option>
                                            <option value="zh">Chinese</option>
                                            <option value="ja">Japanese</option>
                                            <option value="ko">Korean</option>
                                        </select>
                                    </div>

                                    <!-- Sort Order -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Sort By
                                        </label>
                                        <select
                                            v-model="sortBy"
                                            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        >
                                            <option value="newest">Newest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="likes">Most Liked</option>
                                            <option value="remixes">Most Remixed</option>
                                            <option value="replies">Most Replies</option>
                                        </select>
                                    </div>

                                    <!-- Sensitive Content Filter -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Content Settings
                                        </label>
                                        <div class="space-y-2">
                                            <label class="flex items-center">
                                                <input
                                                    type="radio"
                                                    v-model="sensitiveFilter"
                                                    value="show"
                                                    class="mr-2 text-cyan-500 focus:ring-cyan-500"
                                                />
                                                <span class="text-slate-700 dark:text-slate-300">Show All Content</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input
                                                    type="radio"
                                                    v-model="sensitiveFilter"
                                                    value="hide"
                                                    class="mr-2 text-cyan-500 focus:ring-cyan-500"
                                                />
                                                <span class="text-slate-700 dark:text-slate-300">Hide Sensitive Content</span>
                                            </label>
                                        </div>
                                    </div>

                                    <!-- Clear Filters -->
                                    <button
                                        @click="clearFilters"
                                        class="w-full mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Posts Feed -->
                        <div class="lg:w-2/3">
                            <!-- Tab Navigation -->
                            <div class="mb-6">
                                <div class="border-b border-slate-200 dark:border-slate-700">
                                    <nav class="-mb-px flex space-x-4" aria-label="Tabs">
                                        <button
                                            @click="setTab('posts')"
                                            :class="[
                                                'px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200',
                                                activeTab === 'posts'
                                                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            ]"
                                        >
                                            All Posts
                                            <span class="ml-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">
                                                {{ posts.length }}
                                            </span>
                                        </button>
                                        <button
                                            @click="setTab('remix')"
                                            :class="[
                                                'px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200',
                                                activeTab === 'remix'
                                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            ]"
                                        >
                                            Your Remixes
                                            <span class="ml-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">
                                                {{ userPosts.length }}
                                            </span>
                                        </button>
                                    </nav>
                                </div>
                            </div>

                            <!-- Loading State -->
                            <div v-if="isLoading && posts.length === 0" class="flex flex-col items-center justify-center py-12">
                                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                                <p class="mt-4 text-slate-600 dark:text-slate-400">
                                    Loading posts from {{ currentNetwork.toUpperCase() }}...
                                </p>
                            </div>

                            <!-- Error State -->
                            <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
                                <div class="flex items-center gap-3 mb-4">
                                    <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 3z" />
                                    </svg>
                                    <h3 class="text-lg font-semibold text-red-800 dark:text-red-300">
                                        Error Loading Posts
                                    </h3>
                                </div>
                                <p class="text-red-700 dark:text-red-400 mb-4">
                                    {{ error }}
                                </p>
                                <button
                                    @click="retryFetch"
                                    class="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
                                >
                                    Retry
                                </button>
                            </div>

                            <!-- Posts Feed -->
                            <div v-else class="space-y-6">
                                <!-- Empty State -->
                                <div v-if="!isLoading && posts.length === 0" class="text-center py-12">
                                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                        <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        No posts yet
                                    </h3>
                                    <p class="text-slate-600 dark:text-slate-400 mb-6">
                                        Be the first to share something on the blockchain!
                                    </p>
                                    <button
                                        @click="showComposeModal = true"
                                        :disabled="!isAuthenticated"
                                        class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create First Post
                                    </button>
                                </div>

                                <!-- Posts List -->
                                <template v-else>
                                    <div v-for="post in filteredPostsData" :key="post.id">
                                        <PostItem
                                            :post="post"
                                            @like="handleLike"
                                            @bookmark="handleBookmark"
                                            @delete="handleDelete"
                                            @refresh="handleRefresh"
                                        />
                                    </div>
                                </template>

                                <!-- Load More -->
                                <div v-if="hasMore && posts.length > 0" class="pt-6">
                                    <button
                                        @click="loadMore"
                                        :disabled="isLoading"
                                        class="w-full px-6 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <template v-if="isLoading">
                                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-cyan-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading...
                                        </template>
                                        <template v-else>
                                            Load More Posts
                                        </template>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

<!-- Network Status & Debug Header -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div class="flex items-center gap-4">
                                <div class="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                                    <svg class="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                        Social Feed
                                    </h1>
                                    <p class="text-slate-500 dark:text-slate-400">
                                        Viewing content from <span class="font-medium text-cyan-600 dark:text-cyan-400">{{ currentNetwork.toUpperCase() }}</span> blockchain
                                    </p>
                                </div>
                            </div>

                            <!-- Debug Toggle -->
                            <button
                                @click="showDebug = !showDebug"
                                :class="[
                                    'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                                    showDebug
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                ]"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <span class="font-medium">Debug</span>
                                <span class="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                                    {{ showDebug ? 'ON' : 'OFF' }}
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Debug Panel -->
                    <div v-if="showDebug" class="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-slate-200">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Network Debugger
                            </h3>
                            <button
                                @click="refreshWithDebug"
                                class="flex items-center gap-2 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-cyan-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 16m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Data
                            </button>
                        </div>

                        <!-- Debug Stats Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                <div class="text-xs text-slate-400 mb-1">Active Contracts</div>
                                <div class="text-base font-mono text-slate-100">
                                    {{ debugStats.activeContracts?.length || 0 }}
                                </div>
                                <div class="mt-2 space-y-1">
                                    <div v-for="contract in debugStats.activeContracts" :key="contract"
                                         class="text-xs text-cyan-400 truncate">
                                        {{ contract }}
                                    </div>
                                </div>
                            </div>

                            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                <div class="text-xs text-slate-400 mb-1">Fetch Counts</div>
                                <div class="space-y-1">
                                    <div v-for="(count, contract) in debugStats.fetchCounts" :key="contract"
                                         class="flex justify-between items-center text-sm">
                                        <span class="text-slate-300 truncate">{{ String(contract).slice(0, 12) }}...</span>
                                        <span class="text-emerald-400 font-mono">{{ count }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                <div class="text-xs text-slate-400 mb-1">Data Integrity</div>
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-300">Total Fetched:</span>
                                        <span class="text-slate-100 font-mono">{{ calculateTotalFetched() }}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-300">Duplicates Removed:</span>
                                        <span class="text-amber-400 font-mono">{{ debugStats.duplicateCount }}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-300">Final Posts:</span>
                                        <span class="text-emerald-400 font-mono">{{ debugStats.mergeCount }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Raw Data Toggle -->
                        <div>
                            <button
                                @click="showRawData = !showRawData"
                                class="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 mb-2"
                            >
                                <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-90': showRawData }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                                Raw Contract Data
                            </button>

                            <div v-if="showRawData" class="bg-slate-950 border border-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <div v-for="(data, contractId) in debugStats.rawData" :key="contractId" class="mb-4 last:mb-0">
                                    <div class="text-sm font-medium text-cyan-400 mb-2">
                                        {{ String(contractId).slice(0, 16) }}...
                                    </div>
                                    <pre class="text-xs text-slate-400 whitespace-pre-wrap break-words">{{ JSON.stringify(data, null, 2) }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        <!-- Compose Post Modal -->
        <div v-if="showComposeModal" class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <!-- Background overlay -->
                <div class="fixed inset-0 bg-black bg-opacity-75 transition-opacity" @click="showComposeModal = false"></div>

                <!-- Modal -->
                <div class="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <ComposePostModal
                        @post-created="handlePostCreated"
                        @close="showComposeModal = false"
                    />
                </div>
            </div>
        </div>
    </main>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePosts } from '@/composables/usePosts'
import { useIdentityStore } from '@/stores/identity'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import PostItem from '@/components/posts/Item.vue'
import ComposePostModal from '@/components/posts/ComposeModal.vue'

const router = useRouter()
const identityStore = useIdentityStore()

const {
    // State
    activeTab,
    searchQuery,
    languageFilter,
    sortBy,
    sensitiveFilter,
    isLoading,
    error,
    currentNetwork,
    debugStats,

    // Computed
    posts,
    userPosts,
    // totalPosts,
    hasMore,
    isAuthenticated,

    // Actions
    fetchPosts,
    fetchMorePosts,
    // createPost,
    likePost,
    bookmarkPost,
    deletePost,
    refreshPostStats,
    clearFilters,
    setTab,
    startAutoRefresh,
    stopAutoRefresh
} = usePosts()

const showComposeModal = ref(false)
const showDebug = ref(false)
const showRawData = ref(false)

const filteredPostsData = computed(() => {
    return activeTab.value === 'posts' ? posts.value : userPosts.value
})

const calculateTotalFetched = () => {
    if (!debugStats.value.fetchCounts) return 0
    // Cast to Record<string, number> to tell TS the values are numbers
    return Object.values(debugStats.value.fetchCounts as Record<string, number>).reduce(
      (sum: number, count: number) => sum + count,
      0
    )
}

const retryFetch = async () => {
    await fetchPosts()
}

const loadMore = async () => {
    await fetchMorePosts()
}

const handleLike = async (postId: string) => {
    await likePost(postId)
}

const handleBookmark = async (postId: string) => {
    await bookmarkPost(postId)
}

const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        await deletePost(postId)
    }
}

const handleRefresh = async (postId: string) => {
    await refreshPostStats(postId)
}

const handlePostCreated = async () => {
    showComposeModal.value = false
    await fetchPosts()
}

const refreshWithDebug = async () => {
    console.log('Refreshing with debug...')
    await fetchPosts()
}

onMounted(async () => {
    await fetchPosts()
    startAutoRefresh()
})

onUnmounted(() => {
    stopAutoRefresh()
})
</script>
