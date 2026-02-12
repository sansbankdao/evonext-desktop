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

    const activeTab = ref<'posts' | 'remix'>('posts')
    const searchQuery = ref('')
    const languageFilter = ref<string>('')
    const sortBy = ref<filters.SortOrder>('newest')
    const sensitiveFilter = ref<filters.SensitiveFilter>('show')

    const debouncedSearch = useDebounce(searchQuery, 500)

    const isAuthenticated = computed(() => identityStore.isAuthenticated)
    const currentUserId = computed(() => identityStore.identityId || '')
    const currentNetwork = computed(() => {
        const net = settingsStore.state.network
        return (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
    })

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
        if (stats.isPostBookmarked(postId)) {
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

    function clearFilters() {
        searchQuery.value = ''
        languageFilter.value = ''
        sortBy.value = 'newest'
    }

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
        activeTab,
        searchQuery,
        debouncedSearch,
        languageFilter,
        sortBy,
        sensitiveFilter,
        isLoading: computed(() => postsStore.isLoading),
        error: computed(() => postsStore.error),
        posts: filteredPosts,
        userPosts,
        totalPosts: computed(() => postsStore.posts.length),
        lastFetched: computed(() => postsStore.lastFetched),
        hasMore: computed(() => postsStore.hasNextPage),
        debugStats: computed(() => (postsStore as any).debug),
        uniqueLanguages: computed(() => filters.getUniqueLanguages(postsStore.posts)),
        uniqueHashtags: computed(() => filters.getUniqueHashtags(postsStore.posts)),
        // RESOLVED: Accessed guaranteed id property on IPost
        bookmarkedPosts: computed(() => postsStore.posts.filter(p => stats.isPostBookmarked(p.id))),
        isAuthenticated,
        currentUserId,
        currentNetwork,
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
