// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosts } from './usePosts'
import { usePostsStore } from '@/stores/posts'
import * as filters from '@/services/posts/filters'
import * as stats from '@/services/posts/stats'
import { nextTick } from 'vue'

const mockPostsStore = {
    posts: [{ id: 'p1', content: 'hello' }],
    sortedPosts: [{ id: 'p1', content: 'hello' }],
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
    useSettingsStore: () => ({ state: { network: 'mainnet' } })
}))

vi.mock('@/services/posts/filters', () => ({
    filterPosts: vi.fn((p) => p),
    getUniqueLanguages: vi.fn(() => ['en']),
    getUniqueHashtags: vi.fn(() => ['#dash']),
    countPostsByPeriod: vi.fn(() => ({ day: 1 }))
}))

vi.mock('@/services/posts/stats', () => ({
    isPostBookmarked: vi.fn(() => false),
    getPostStats: vi.fn(),
    getBookmarkedPostIds: vi.fn(() => [])
}))

vi.mock('./useDebounce', () => ({ useDebounce: (val: any) => val }))

describe('usePosts UI & Filtering', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should clear all filters', async () => {
        const { searchQuery, languageFilter, sortBy, clearFilters } = usePosts()
        searchQuery.value = 'search'
        languageFilter.value = 'en'
        sortBy.value = 'oldest'

        clearFilters()

        expect(searchQuery.value).toBe('')
        expect(languageFilter.value).toBe('')
        expect(sortBy.value).toBe('newest')
    })

    it('should compute filteredPosts when dependencies change', async () => {
        // Destructure the property from the result of usePosts()
        const { searchQuery, posts } = usePosts()
        searchQuery.value = 'new search'

        const results = posts.value
        expect(filters.filterPosts).toHaveBeenCalled()
    })

    it('should handle bookmark toggling', async () => {
        const { bookmarkPost } = usePosts()

        // Scenario: Not bookmarked
        vi.mocked(stats.isPostBookmarked).mockReturnValue(false)
        await bookmarkPost('p1')
        expect(mockPostsStore.bookmarkPostById).toHaveBeenCalledWith('p1')

        // Scenario: Already bookmarked
        vi.mocked(stats.isPostBookmarked).mockReturnValue(true)
        await bookmarkPost('p1')
        expect(mockPostsStore.unbookmarkPostById).toHaveBeenCalledWith('p1')
    })

    it('should calculate unique metadata', () => {
        const { uniqueLanguages, uniqueHashtags } = usePosts()
        expect(uniqueLanguages.value).toContain('en')
        expect(uniqueHashtags.value).toContain('#dash')
    })

    it('should expose stats helpers', () => {
        const { countPostsByPeriod } = usePosts()
        const res = countPostsByPeriod('day')
        expect(res).toEqual({ day: 1 })
    })

    it('should handle tab switching', () => {
        const { activeTab, setTab } = usePosts()
        setTab('remix')
        expect(activeTab.value).toBe('remix')
    })
})
