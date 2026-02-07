// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosts } from './usePosts'
import { usePostsStore } from '@/stores/posts'
import * as filters from '@/services/posts/filters'
import * as stats from '@/services/posts/stats'

const mockPostsStore = {
    posts: [{ id: 'p1', content: 'hello', ownerId: 'u1' }],
    sortedPosts: [{ id: 'p1', content: 'hello', ownerId: 'u1' }],
    sortedUserPosts: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    hasNextPage: false,
    fetchPosts: vi.fn(),
    fetchMorePosts: vi.fn(),
    createNewPost: vi.fn(),
    isPostLiked: vi.fn(),
    likePostById: vi.fn(),
    unlikePostById: vi.fn(),
    bookmarkPostById: vi.fn(),
    unbookmarkPostById: vi.fn(),
    deletePostById: vi.fn(),
    updateExistingPost: vi.fn(),
    refreshPostStats: vi.fn(),
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
    getUniqueLanguages: vi.fn(() => ['en']),
    getUniqueHashtags: vi.fn(() => ['#dash']),
    countPostsByPeriod: vi.fn(() => ({}))
}))

vi.mock('@/services/posts/stats', () => ({
    isPostBookmarked: vi.fn(() => false),
    getPostStats: vi.fn(),
    getBookmarkedPostIds: vi.fn(() => []),
    applyStatsUpdate: vi.fn()
}))

vi.mock('./useDebounce', () => ({
    useDebounce: vi.fn((val) => val)
}))

const mockOnBeforeUnmount = vi.fn()
vi.mock('vue', async () => {
    const actual = await vi.importActual('vue')
    return {
        ...actual,
        onBeforeUnmount: (fn: any) => mockOnBeforeUnmount.mockImplementation(fn)
    }
})

describe('usePosts composable', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
    })

    it('should compute posts and handle dependencies', () => {
        const { searchQuery, posts } = usePosts()
        searchQuery.value = 'search term'

        // Triggering computed access
        const results = posts.value
        expect(filters.filterPosts).toHaveBeenCalled()
        expect(results).toHaveLength(1)
    })

    it('clearFilters should reset UI state', () => {
        const { searchQuery, languageFilter, clearFilters } = usePosts()
        searchQuery.value = 'test'
        languageFilter.value = 'en'

        clearFilters()

        expect(searchQuery.value).toBe('')
        expect(languageFilter.value).toBe('')
    })

    it('auto-refresh should fetch posts at interval', async () => {
        const { startAutoRefresh } = usePosts()
        startAutoRefresh(1000)

        await vi.advanceTimersByTimeAsync(1000)
        expect(mockPostsStore.fetchPosts).toHaveBeenCalled()
    })

    it('bookmarkPost should toggle based on current state', async () => {
        const { bookmarkPost } = usePosts()

        vi.mocked(stats.isPostBookmarked).mockReturnValue(false)
        await bookmarkPost('p1')
        expect(mockPostsStore.bookmarkPostById).toHaveBeenCalledWith('p1')

        vi.mocked(stats.isPostBookmarked).mockReturnValue(true)
        await bookmarkPost('p1')
        expect(mockPostsStore.unbookmarkPostById).toHaveBeenCalledWith('p1')
    })

    it('should expose unique metadata from filters', () => {
        const { uniqueLanguages, uniqueHashtags } = usePosts()
        expect(uniqueLanguages.value).toContain('en')
        expect(uniqueHashtags.value).toContain('#dash')
    })
})
