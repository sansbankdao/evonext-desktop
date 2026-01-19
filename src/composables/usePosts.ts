// src/composables/usePosts.ts

import { ref, computed, onBeforeUnmount } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
import { useDebounce } from './useDebounce'
import * as filters from '@/services/posts/filters'
import * as stats from '@/services/posts/stats'
import type { PostsFetchOptions } from '@/types/posts'
import type { FilterOptions } from '@/services/posts/filters'

export function usePosts() {
    const postsStore = usePostsStore()
    const identityStore = useIdentityStore()
    const settingsStore = useSettingsStore()

    // Local UI State
    const activeTab = ref<'posts' | 'remix'>('posts')
    const searchQuery = ref('')
    const languageFilter = ref<string>('')
    const sortBy = ref<filters.SortOrder>('newest')
    const sensitiveFilter = ref<filters.SensitiveFilter>('show')

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 500)

    // Computed Wrappers
    const isAuthenticated = computed(() => identityStore.isAuthenticated)
    const currentUserId = computed(() => identityStore.identity?.id || '')
    const currentNetwork = computed(() => {
        const net = settingsStore.state.network
        return (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
    })

    // Filter Logic
    const filteredPosts = computed(() => {
        const filterOptions: FilterOptions = {
            searchQuery: debouncedSearch.value,
            language: languageFilter.value,
            sensitiveFilter: sensitiveFilter.value,
            sortBy: sortBy.value
        }
        return filters.filterPosts(postsStore.sortedPosts, filterOptions)
    })

    const userPosts = computed(() => {
        if (!currentUserId.value) return []
        const filterOptions: FilterOptions = {
            ownerId: currentUserId.value,
            sortBy: sortBy.value
        }
        return filters.filterPosts(postsStore.sortedUserPosts, filterOptions)
    })

    // Actions - Delegate strictly to Store
    function fetchPosts(options?: PostsFetchOptions) {
        return postsStore.fetchPosts(options)
    }

    function fetchMorePosts() {
        return postsStore.fetchMorePosts()
    }

    function createPost(content: string, options?: any) {
        return postsStore.createNewPost(content, options)
    }

    function likePost(postId: string) {
        if (postsStore.isPostLiked(postId)) {
            return postsStore.unlikePostById(postId)
        }
        return postsStore.likePostById(postId)
    }

    function bookmarkPost(postId: string) {
        if (stats.isPostBookmarked(postId)) { // Or check store.bookmarkedPosts
            return postsStore.unbookmarkPostById(postId)
        }
        return postsStore.bookmarkPostById(postId)
    }

    function deletePost(postId: string) {
        return postsStore.deletePostById(postId)
    }

    function updatePost(postId: string, updates: any) {
        return postsStore.updateExistingPost(postId, updates)
    }

    function refreshPostStats(postId: string) {
        return postsStore.refreshPostStats(postId)
    }

    // UI Helpers
    function clearFilters() {
        searchQuery.value = ''
        languageFilter.value = ''
        sortBy.value = 'newest'
    }

    // Auto-refresh logic
    let refreshInterval: ReturnType<typeof setInterval>
    function startAutoRefresh(intervalMs = 120000) {
        stopAutoRefresh()
        refreshInterval = setInterval(() => {
            if (!postsStore.isLoading) fetchPosts()
        }, intervalMs)
    }
    function stopAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval)
    }

    onBeforeUnmount(() => {
        stopAutoRefresh()
    })

    return {
        // State
        activeTab,
        searchQuery,
        debouncedSearch,
        languageFilter,
        sortBy,
        sensitiveFilter,

        // Store Data
        isLoading: computed(() => postsStore.isLoading),
        error: computed(() => postsStore.error),
        posts: filteredPosts,
        userPosts,
        totalPosts: computed(() => postsStore.posts.length),
        lastFetched: computed(() => postsStore.lastFetched),
        hasMore: computed(() => postsStore.hasNextPage),

        // Debug (mapped from store state)
        debugStats: computed(() => (postsStore as any).debug), // Cast if using strict types without state update

        // Computed Helpers
        uniqueLanguages: computed(() => filters.getUniqueLanguages(postsStore.posts)),
        uniqueHashtags: computed(() => filters.getUniqueHashtags(postsStore.posts)),
        bookmarkedPosts: computed(() => postsStore.posts.filter(p => stats.isPostBookmarked(p.id!))),

        isAuthenticated,
        currentUserId,
        currentNetwork,

        // Actions
        fetchPosts,
        fetchMorePosts,
        createPost,
        updatePost,
        likePost,
        bookmarkPost,
        deletePost,
        refreshPostStats,
        clearFilters,
        setTab: (tab: 'posts' | 'remix') => activeTab.value = tab,
        startAutoRefresh,
        stopAutoRefresh,

        // Getters
        getPostById: (id: string) => postsStore.getPostById(id),
        isPostLiked: (id: string) => postsStore.isPostLiked(id),
        stats: {
            getPostStats: stats.getPostStats,
            isPostBookmarked: stats.isPostBookmarked,
            getBookmarkedPostIds: stats.getBookmarkedPostIds,
        },
        countPostsByPeriod: (period: 'day' | 'week' | 'month') =>
            filters.countPostsByPeriod(postsStore.posts, period)
    }
}
