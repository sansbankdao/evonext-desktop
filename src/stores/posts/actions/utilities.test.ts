// src/stores/posts/actions/utilities.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    refreshPostStatsAction,
    clearAction,
    updatePostAuthorAction,
    upsertPostAction,
    initializeLikedPostsAction
} from './utilities'
import { usePosts } from '@/composables/usePosts'

vi.mock('@/composables/usePosts', () => ({
    usePosts: vi.fn()
}))

describe('posts store utilities', () => {
    let mockStore: any
    let mockComposable: any

    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()

        mockComposable = {
            refreshPostStats: vi.fn(),
            getPostById: vi.fn()
        }

        vi.mocked(usePosts).mockReturnValue(mockComposable)

        mockStore = {
            posts: [],
            userPosts: [],
            likedPosts: [],
            bookmarkedPosts: [],
            identityId: 'u1',
            error: 'some error',
            lastFetched: new Date(),
            hasNextPage: true,
            // We bind the action to our mock store just like Pinia does
            upsertPost: vi.fn(function(this: any, p) {
                upsertPostAction.call(this, p)
            })
        }
    })

    it('refreshPostStatsAction should handle success and errors', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

        // Success path
        await refreshPostStatsAction.call(mockStore, 'p1')
        expect(mockComposable.refreshPostStats).toHaveBeenCalledWith('p1')

        // Error path
        mockComposable.refreshPostStats.mockRejectedValue(new Error('Stats Fail'))
        await refreshPostStatsAction.call(mockStore, 'p1')
        expect(spy).toHaveBeenCalled()

        spy.mockRestore()
    })

    it('clearAction should reset all store arrays and state', () => {
        clearAction.call(mockStore)
        expect(mockStore.posts).toEqual([])
        expect(mockStore.userPosts).toEqual([])
        expect(mockStore.likedPosts).toEqual([])
        expect(mockStore.bookmarkedPosts).toEqual([])
        expect(mockStore.hasNextPage).toBe(false)
        expect(mockStore.error).toBeNull()
        expect(mockStore.lastFetched).toBeNull()
    })

    it('updatePostAuthorAction should merge data if post exists', () => {
        mockComposable.getPostById.mockReturnValue({
            id: 'p1',
            author: { name: 'Old' }
        })

        updatePostAuthorAction.call(mockStore, 'p1', { name: 'New' })

        expect(mockStore.upsertPost).toHaveBeenCalledWith(expect.objectContaining({
            author: { name: 'New' }
        }))
    })

    it('upsertPostAction should update existing and sync userPosts', () => {
        mockStore.posts = [{ id: 'p1', content: 'old', ownerId: 'other' }]

        // Scenario 1: Update existing post not owned by user
        const updated = { id: 'p1', content: 'new', ownerId: 'other' }
        upsertPostAction.call(mockStore, updated)
        expect(mockStore.posts[0].content).toBe('new')
        expect(mockStore.userPosts).toHaveLength(0)

        // Scenario 2: New post owned by user
        const userPost = { id: 'p2', content: 'hello', ownerId: 'u1' }
        upsertPostAction.call(mockStore, userPost)
        expect(mockStore.posts[0].id).toBe('p2')
        expect(mockStore.userPosts[0].id).toBe('p2')

        // Scenario 3: Update existing post in userPosts
        const userUpdate = { id: 'p2', content: 'bye', ownerId: 'u1' }
        upsertPostAction.call(mockStore, userUpdate)
        expect(mockStore.userPosts[0].content).toBe('bye')
    })

    it('initializeLikedPostsAction should load from localStorage', async () => {
        const userId = 'user123'
        const storageKey = `likedPosts_${userId}`
        const storageData = JSON.stringify(['p1', 'p2'])

        // Set the item in real localStorage for the mock store to pick up
        localStorage.setItem(storageKey, storageData)

        await initializeLikedPostsAction.call(mockStore, userId)
        expect(mockStore.likedPosts).toEqual(['p1', 'p2'])
    })

    it('initializeLikedPostsAction should handle invalid json', async () => {
        const userId = 'user123'
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

        localStorage.setItem(`likedPosts_${userId}`, 'invalid-json')

        await initializeLikedPostsAction.call(mockStore, userId)

        expect(spy).toHaveBeenCalled()
        spy.mockRestore()
    })
})
