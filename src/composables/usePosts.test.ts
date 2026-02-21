// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePosts } from './usePosts'
import * as filters from '@/services/posts/filters'
import * as stats from '@/services/posts/stats'

const mockPostsStore = {
    posts: [
        { id: 'p1', content: 'hello', ownerId: 'u1', language: 'en' },
        { id: 'p2', content: 'world', ownerId: 'u2', language: 'es' }
    ],
    sortedPosts: [
        { id: 'p1', content: 'hello', ownerId: 'u1', language: 'en' },
        { id: 'p2', content: 'world', ownerId: 'u2', language: 'es' }
    ],
    sortedUserPosts: [{ id: 'p1', content: 'hello', ownerId: 'u1' }],
    isLoading: false,
    error: null,
    lastFetched: null,
    hasNextPage: true,
    fetchPosts: vi.fn().mockResolvedValue({ success: true }),
    fetchMorePosts: vi.fn().mockResolvedValue({ success: true }),
    createNewPost: vi.fn().mockResolvedValue({ success: true }),
    isPostLiked: vi.fn(() => false),
    likePostById: vi.fn().mockResolvedValue({ success: true }),
    unlikePostById: vi.fn().mockResolvedValue({ success: true }),
    bookmarkPostById: vi.fn().mockResolvedValue({ success: true }),
    unbookmarkPostById: vi.fn().mockResolvedValue({ success: true }),
    deletePostById: vi.fn().mockResolvedValue({ success: true }),
    updateExistingPost: vi.fn().mockResolvedValue({ success: true }),
    refreshPostStats: vi.fn().mockResolvedValue({ success: true }),
    getPostById: vi.fn((id) => ({ id, content: 'test' })),
    debug: undefined
}

vi.mock('@/stores/posts', () => ({
    usePostsStore: vi.fn(() => mockPostsStore)
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn(() => ({ isAuthenticated: true, identityId: 'u1' }))
}))

vi.mock('@/stores/settings', () => ({
    useSettingsStore: vi.fn(() => ({ state: { network: 'testnet' } }))
}))

vi.mock('@/services/posts/filters', () => ({
    filterPosts: vi.fn((p) => p),
    getUniqueLanguages: vi.fn(() => ['en', 'es']),
    getUniqueHashtags: vi.fn(() => ['#dash', '#crypto']),
    countPostsByPeriod: vi.fn(() => ({ day: 1, week: 2, month: 5 }))
}))

vi.mock('@/services/posts/stats', () => ({
    isPostBookmarked: vi.fn(() => false),
    getPostStats: vi.fn(() => ({ likes: 10, comments: 5 })),
    getBookmarkedPostIds: vi.fn(() => ['p1']),
    applyStatsUpdate: vi.fn()
}))

vi.mock('./useDebounce', () => ({
    useDebounce: vi.fn((val) => val)
}))

describe('usePosts composable', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Computed Properties', () => {
        it('should compute filtered posts', () => {
            const { posts } = usePosts()
            const results = posts.value

            expect(filters.filterPosts).toHaveBeenCalled()
            expect(results).toHaveLength(2)
        })

        it('should compute user posts', () => {
            const { userPosts } = usePosts()
            expect(userPosts.value).toHaveLength(1)
        })

        it('should compute total posts count', () => {
            const { totalPosts } = usePosts()
            expect(totalPosts.value).toBe(2)
        })

        it('should compute hasMore correctly', () => {
            const { hasMore } = usePosts()
            expect(hasMore.value).toBe(true)
        })

        it('should compute isAuthenticated', () => {
            const { isAuthenticated } = usePosts()
            expect(isAuthenticated.value).toBe(true)
        })

        it('should compute currentUserId', () => {
            const { currentUserId } = usePosts()
            expect(currentUserId.value).toBe('u1')
        })

        it('should compute currentNetwork', () => {
            const { currentNetwork } = usePosts()
            expect(currentNetwork.value).toBe('testnet')
        })

        it('should compute uniqueLanguages', () => {
            const { uniqueLanguages } = usePosts()
            expect(uniqueLanguages.value).toContain('en')
            expect(uniqueLanguages.value).toContain('es')
        })

        it('should compute uniqueHashtags', () => {
            const { uniqueHashtags } = usePosts()
            expect(uniqueHashtags.value).toContain('#dash')
            expect(uniqueHashtags.value).toContain('#crypto')
        })

        it('should compute bookmarkedPosts', () => {
            vi.mocked(stats.isPostBookmarked).mockReturnValue(true)
            const { bookmarkedPosts } = usePosts()
            expect(bookmarkedPosts.value).toHaveLength(2)
        })

        it('should compute isLoading', () => {
            const { isLoading } = usePosts()
            expect(isLoading.value).toBe(false)
        })

        it('should compute error', () => {
            const { error } = usePosts()
            expect(error.value).toBeNull()
        })

        it('should compute lastFetched', () => {
            const { lastFetched } = usePosts()
            expect(lastFetched.value).toBeNull()
        })
    })

    describe('State Management', () => {
        it('should expose activeTab ref', () => {
            const { activeTab } = usePosts()
            expect(activeTab.value).toBe('posts')

            activeTab.value = 'remix'
            expect(activeTab.value).toBe('remix')
        })

        it('should expose searchQuery ref', () => {
            const { searchQuery } = usePosts()
            expect(searchQuery.value).toBe('')

            searchQuery.value = 'test search'
            expect(searchQuery.value).toBe('test search')
        })

        it('should expose languageFilter ref', () => {
            const { languageFilter } = usePosts()
            expect(languageFilter.value).toBe('')

            languageFilter.value = 'en'
            expect(languageFilter.value).toBe('en')
        })

        it('should expose sortBy ref', () => {
            const { sortBy } = usePosts()
            expect(sortBy.value).toBe('newest')

            sortBy.value = 'oldest'
            expect(sortBy.value).toBe('oldest')
        })

        it('should expose sensitiveFilter ref', () => {
            const { sensitiveFilter } = usePosts()
            expect(sensitiveFilter.value).toBe('show')

            sensitiveFilter.value = 'hide'
            expect(sensitiveFilter.value).toBe('hide')
        })
    })

    describe('clearFilters', () => {
        it('should reset all filter state', () => {
            const { searchQuery, languageFilter, sortBy, clearFilters } = usePosts()

            searchQuery.value = 'test'
            languageFilter.value = 'en'
            sortBy.value = 'oldest'

            clearFilters()

            expect(searchQuery.value).toBe('')
            expect(languageFilter.value).toBe('')
            expect(sortBy.value).toBe('newest')
        })
    })

    describe('setTab', () => {
        it('should set activeTab to posts', () => {
            const { activeTab, setTab } = usePosts()
            setTab('posts')
            expect(activeTab.value).toBe('posts')
        })

        it('should set activeTab to remix', () => {
            const { activeTab, setTab } = usePosts()
            setTab('remix')
            expect(activeTab.value).toBe('remix')
        })
    })

    describe('fetchPosts', () => {
        it('should call store fetchPosts', async () => {
            const { fetchPosts } = usePosts()
            await fetchPosts()
            expect(mockPostsStore.fetchPosts).toHaveBeenCalled()
        })

        it('should pass options to store fetchPosts', async () => {
            const { fetchPosts } = usePosts()
            const options = { limit: 10, offset: 0 }
            await fetchPosts(options)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledWith(options)
        })
    })

    describe('fetchMorePosts', () => {
        it('should call store fetchMorePosts', async () => {
            const { fetchMorePosts } = usePosts()
            await fetchMorePosts()
            expect(mockPostsStore.fetchMorePosts).toHaveBeenCalled()
        })
    })

    describe('createPost', () => {
        it('should call store createNewPost', async () => {
            const { createPost } = usePosts()
            await createPost('Hello world')
            expect(mockPostsStore.createNewPost).toHaveBeenCalledWith('Hello world', undefined)
        })

        it('should pass options to createNewPost', async () => {
            const { createPost } = usePosts()
            const options = { replyTo: 'p1' }
            await createPost('Reply content', options)
            expect(mockPostsStore.createNewPost).toHaveBeenCalledWith('Reply content', options)
        })
    })

    describe('updatePost', () => {
        it('should call store updateExistingPost', async () => {
            const { updatePost } = usePosts()
            await updatePost('p1', { content: 'Updated' })
            expect(mockPostsStore.updateExistingPost).toHaveBeenCalledWith('p1', { content: 'Updated' })
        })
    })

    describe('deletePost', () => {
        it('should call store deletePostById', async () => {
            const { deletePost } = usePosts()
            await deletePost('p1')
            expect(mockPostsStore.deletePostById).toHaveBeenCalledWith('p1')
        })
    })

    describe('likePost', () => {
        it('should like post when not already liked', async () => {
            mockPostsStore.isPostLiked.mockReturnValue(false)
            const { likePost } = usePosts()

            await likePost('p1')

            expect(mockPostsStore.likePostById).toHaveBeenCalledWith('p1')
            expect(mockPostsStore.unlikePostById).not.toHaveBeenCalled()
        })

        it('should unlike post when already liked', async () => {
            mockPostsStore.isPostLiked.mockReturnValue(true)
            const { likePost } = usePosts()

            await likePost('p1')

            expect(mockPostsStore.unlikePostById).toHaveBeenCalledWith('p1')
            expect(mockPostsStore.likePostById).not.toHaveBeenCalled()
        })
    })

    describe('bookmarkPost', () => {
        it('should bookmark post when not already bookmarked', async () => {
            vi.mocked(stats.isPostBookmarked).mockReturnValue(false)
            const { bookmarkPost } = usePosts()

            await bookmarkPost('p1')

            expect(mockPostsStore.bookmarkPostById).toHaveBeenCalledWith('p1')
            expect(mockPostsStore.unbookmarkPostById).not.toHaveBeenCalled()
        })

        it('should unbookmark post when already bookmarked', async () => {
            vi.mocked(stats.isPostBookmarked).mockReturnValue(true)
            const { bookmarkPost } = usePosts()

            await bookmarkPost('p1')

            expect(mockPostsStore.unbookmarkPostById).toHaveBeenCalledWith('p1')
            expect(mockPostsStore.bookmarkPostById).not.toHaveBeenCalled()
        })
    })

    describe('refreshPostStats', () => {
        it('should call store refreshPostStats', async () => {
            const { refreshPostStats } = usePosts()
            await refreshPostStats('p1')
            expect(mockPostsStore.refreshPostStats).toHaveBeenCalledWith('p1')
        })
    })

    describe('getPostById', () => {
        it('should return post by id', () => {
            const { getPostById } = usePosts()
            const post = getPostById('p1')
            expect(post).toEqual({ id: 'p1', content: 'test' })
        })
    })

    describe('isPostLiked', () => {
        it('should check if post is liked', () => {
            mockPostsStore.isPostLiked.mockReturnValue(true)
            const { isPostLiked } = usePosts()
            expect(isPostLiked('p1')).toBe(true)
        })
    })

    describe('Auto Refresh', () => {
        it('startAutoRefresh should set interval and fetch posts', async () => {
            const { startAutoRefresh } = usePosts()

            startAutoRefresh(1000)

            await vi.advanceTimersByTimeAsync(1000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(1000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledTimes(2)
        })

        it('startAutoRefresh should not fetch while loading', async () => {
            mockPostsStore.isLoading = true
            const { startAutoRefresh } = usePosts()

            startAutoRefresh(1000)

            await vi.advanceTimersByTimeAsync(1000)
            expect(mockPostsStore.fetchPosts).not.toHaveBeenCalled()

            mockPostsStore.isLoading = false
        })

        it('stopAutoRefresh should clear interval', async () => {
            const { startAutoRefresh, stopAutoRefresh } = usePosts()

            startAutoRefresh(1000)
            await vi.advanceTimersByTimeAsync(1000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledTimes(1)

            stopAutoRefresh()
            await vi.advanceTimersByTimeAsync(5000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledTimes(1)
        })

        it('startAutoRefresh should stop existing interval before creating new one', async () => {
            const { startAutoRefresh } = usePosts()

            startAutoRefresh(1000)
            await vi.advanceTimersByTimeAsync(1000)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledTimes(1)

            startAutoRefresh(500)
            await vi.advanceTimersByTimeAsync(500)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalledTimes(2)
        })

        it('should use default interval of 120000ms', async () => {
            const { startAutoRefresh } = usePosts()

            startAutoRefresh()
            await vi.advanceTimersByTimeAsync(119999)
            expect(mockPostsStore.fetchPosts).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(1)
            expect(mockPostsStore.fetchPosts).toHaveBeenCalled()
        })
    })

    describe('countPostsByPeriod', () => {
        it('should count posts by day', () => {
            const { countPostsByPeriod } = usePosts()
            const result = countPostsByPeriod('day')
            expect(filters.countPostsByPeriod).toHaveBeenCalled()
            expect(result).toBeDefined()
        })

        it('should count posts by week', () => {
            const { countPostsByPeriod } = usePosts()
            countPostsByPeriod('week')
            expect(filters.countPostsByPeriod).toHaveBeenCalledWith(expect.anything(), 'week')
        })

        it('should count posts by month', () => {
            const { countPostsByPeriod } = usePosts()
            countPostsByPeriod('month')
            expect(filters.countPostsByPeriod).toHaveBeenCalledWith(expect.anything(), 'month')
        })
    })

    describe('stats helper', () => {
        it('should expose getPostStats', () => {
            const { stats } = usePosts()
            stats.getPostStats('p1')
            expect(stats.getPostStats).toBeDefined()
        })

        it('should expose isPostBookmarked', () => {
            const { stats } = usePosts()
            stats.isPostBookmarked('p1')
            expect(stats.isPostBookmarked).toBeDefined()
        })

        it('should expose getBookmarkedPostIds', () => {
            const { stats } = usePosts()
            const ids = stats.getBookmarkedPostIds()
            expect(ids).toEqual(['p1'])
        })
    })

    describe('debouncedSearch', () => {
        it('should use debounced search value', () => {
            const { searchQuery, debouncedSearch } = usePosts()
            searchQuery.value = 'test'
            expect(debouncedSearch.value).toBe('test')
        })
    })

    describe('debugStats', () => {
        it('should expose debugStats computed property', () => {
            const { debugStats } = usePosts()
            expect(debugStats).toBeDefined()
            expect(typeof debugStats.value).toBeDefined()
        })
    })
})
