// src/stores/posts/actions/interactions.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    likePostByIdAction,
    unlikePostByIdAction,
    bookmarkPostByIdAction,
    unbookmarkPostByIdAction
} from './interactions'
import * as stats from '@/services/posts/stats'

vi.mock('@/services/posts/stats', () => ({
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    bookmarkPost: vi.fn(),
    unbookmarkPost: vi.fn(),
    applyStatsUpdate: vi.fn((post, updates) => ({ ...post, ...updates }))
}))

describe('interactions.ts Store Actions', () => {
    let mockStore: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockStore = {
            posts: [{ id: 'post_1', likes: 10 }],
            likedPosts: [],
            bookmarkedPosts: [],
            getPostById: vi.fn((id) => mockStore.posts.find((p: any) => p.id === id)),
            upsertPost: vi.fn((post) => {
                const idx = mockStore.posts.findIndex((p: any) => p.id === post.id)
                if (idx > -1) mockStore.posts[idx] = post
                else mockStore.posts.push(post)
            })
        }
    })

    describe('likePostByIdAction', () => {
        it('should optimistically increment and revert on API failure', async () => {
            vi.mocked(stats.likePost).mockRejectedValue(new Error('Network Error'))

            const result = await likePostByIdAction.call(mockStore, 'post_1')

            expect(result).toBe(false)
            expect(mockStore.posts[0].likes).toBe(10)
            expect(mockStore.likedPosts).not.toContain('post_1')
        })

        it('should succeed and keep incremented state', async () => {
            vi.mocked(stats.likePost).mockResolvedValue(true)

            const result = await likePostByIdAction.call(mockStore, 'post_1')

            expect(result).toBe(true)
            expect(mockStore.posts[0].likes).toBe(11)
            expect(mockStore.likedPosts).toContain('post_1')
        })
    })

    describe('bookmarkPostByIdAction', () => {
        it('should add to bookmarked list and revert on failure', async () => {
            vi.mocked(stats.bookmarkPost).mockRejectedValue(new Error('Fail'))

            const result = await bookmarkPostByIdAction.call(mockStore, 'post_1')

            expect(result).toBe(false)
            expect(mockStore.bookmarkedPosts).toHaveLength(0)
        })
    })
})
