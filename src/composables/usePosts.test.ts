// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosts } from './usePosts'
import { ref } from 'vue'

// Mock dependencies
vi.mock('@/stores/posts', () => ({
    usePostsStore: () => ({
        posts: [],
        sortedPosts: [],
        sortedUserPosts: [],
        isLoading: false,
        error: null,
        fetchPosts: vi.fn(),
        isPostLiked: vi.fn().mockReturnValue(false),
        likePostById: vi.fn()
    })
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        isAuthenticated: true,
        identityId: 'user_123'
    })
}))

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({
        state: { network: 'testnet' }
    })
}))

vi.mock('./useDebounce', () => ({
    useDebounce: (val: any) => val
}))

describe('usePosts composable', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
    })

    it('manages tab state and filters', () => {
        const { activeTab, setTab, clearFilters, searchQuery } = usePosts()

        setTab('remix')
        expect(activeTab.value).toBe('remix')

        searchQuery.value = 'searching...'
        clearFilters()
        expect(searchQuery.value).toBe('')
    })

    it('starts and stops auto-refresh', () => {
        const { startAutoRefresh, stopAutoRefresh } = usePosts()
        const postsStore = require('@/stores/posts').usePostsStore()

        startAutoRefresh(10000)
        vi.advanceTimersByTime(10000)
        expect(postsStore.fetchPosts).toHaveBeenCalled()

        stopAutoRefresh()
        vi.advanceTimersByTime(10000)
        expect(postsStore.fetchPosts).toHaveBeenCalledTimes(1)
    })

    it('handles liking logic correctly', () => {
        const { likePost } = usePosts()
        const postsStore = require('@/stores/posts').usePostsStore()

        likePost('post_1')
        expect(postsStore.likePostById).toHaveBeenCalledWith('post_1')
    })
})
