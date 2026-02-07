// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosts } from './usePosts'
import { usePostsStore } from '@/stores/posts'
import * as filters from '@/services/posts/filters'
import * as stats from '@/services/posts/stats'

const mockPostsStore = {
    posts: [],
    sortedPosts: [],
    sortedUserPosts: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    hasNextPage: false,
    fetchPosts: vi.fn().mockResolvedValue([]),
    fetchMorePosts: vi.fn().mockResolvedValue([]),
    createNewPost: vi.fn().mockResolvedValue({ success: true }),
    isPostLiked: vi.fn().mockReturnValue(false),
    likePostById: vi.fn().mockResolvedValue(true),
    unlikePostById: vi.fn().mockResolvedValue(true),
    bookmarkPostById: vi.fn().mockResolvedValue(true),
    unbookmarkPostById: vi.fn().mockResolvedValue(true),
    deletePostById: vi.fn().mockResolvedValue(true),
    updateExistingPost: vi.fn().mockResolvedValue(true),
    refreshPostStats: vi.fn().mockResolvedValue(true),
    getPostById: vi.fn()
}

vi.mock('@/stores/posts', () => ({
    usePostsStore: vi.fn(() => mockPostsStore)
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({ isAuthenticated: true, identityId: 'u1' })
}))

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))

vi.mock('@/services/posts/filters', () => ({
    filterPosts: vi.fn((p) => p),
    getUniqueLanguages: vi.fn(() => []),
    getUniqueHashtags: vi.fn(() => []),
    countPostsByPeriod: vi.fn(() => ({}))
}))

vi.mock('@/services/posts/stats', () => ({
    isPostBookmarked: vi.fn(() => false),
    getPostStats: vi.fn(),
    getBookmarkedPostIds: vi.fn(() => [])
}))

vi.mock('./useDebounce', () => ({ useDebounce: (val: any) => val }))

const mockOnBeforeUnmount = vi.fn()
vi.mock('vue', async () => {
    const actual = await vi.importActual('vue')
    return {
        ...actual,
        onBeforeUnmount: (fn: any) => mockOnBeforeUnmount.mockImplementation(fn)
    }
})

describe('usePosts composable complete suite', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
        mockPostsStore.isLoading = false
    })

    describe('Auto-Refresh Logic', () => {
        it('intervals fetchPosts based on provided time', async () => {
            const { startAutoRefresh } = usePosts()
            startAutoRefresh(5000)
            await vi.advanceTimersByTimeAsync(5000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalled()
        })

        it('stops refresh and cleans up on unmount', () => {
            const { startAutoRefresh, stopAutoRefresh } = usePosts()
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

            // Start it first so the interval ID exists
            startAutoRefresh(5000)

            stopAutoRefresh()
            mockOnBeforeUnmount()

            expect(clearIntervalSpy).toHaveBeenCalled()
        })
    })

    describe('Action Delegation', () => {
        it('toggles liking based on state', async () => {
            const { likePost } = usePosts()
            vi.mocked(mockPostsStore.isPostLiked).mockReturnValue(false)
            await likePost('p1')
            expect(mockPostsStore.likePostById).toHaveBeenCalledWith('p1')
        })
    })
})
