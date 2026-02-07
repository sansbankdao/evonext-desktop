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
            posts: [{ id: 'p1', likes: 10 }],
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
    it('likePostByIdAction should return false if post not found', async () => {
        const result = await likePostByIdAction.call(mockStore, 'missing')
        expect(result).toBe(false)
    })
    it('likePostByIdAction should optimistically increment and revert on failure', async () => {
        vi.mocked(stats.likePost).mockRejectedValue(new Error('Fail'))
        const result = await likePostByIdAction.call(mockStore, 'p1')
        expect(result).toBe(false)
        expect(mockStore.posts[0].likes).toBe(10)
        expect(mockStore.likedPosts).not.toContain('p1')
    })
    it('unlikePostByIdAction should revert on failure', async () => {
        mockStore.likedPosts = ['p1']
        vi.mocked(stats.unlikePost).mockRejectedValue(new Error('Fail'))
        const result = await unlikePostByIdAction.call(mockStore, 'p1')
        expect(result).toBe(false)
        expect(mockStore.likedPosts).toContain('p1')
        expect(mockStore.posts[0].likes).toBe(10)
    })
    it('bookmarkPostByIdAction should manage list and revert', async () => {
        vi.mocked(stats.bookmarkPost).mockRejectedValue('Error')
        const result = await bookmarkPostByIdAction.call(mockStore, 'p1')
        expect(result).toBe(false)
        expect(mockStore.bookmarkedPosts).toHaveLength(0)
        vi.mocked(stats.bookmarkPost).mockResolvedValue(true)
        await bookmarkPostByIdAction.call(mockStore, 'p1')
        expect(mockStore.bookmarkedPosts).toContain('p1')
    })
    it('unbookmarkPostByIdAction should manage list and revert', async () => {
        mockStore.bookmarkedPosts = ['p1']
        vi.mocked(stats.unbookmarkPost).mockRejectedValue('Error')
        const result = await unbookmarkPostByIdAction.call(mockStore, 'p1')
        expect(result).toBe(false)
        expect(mockStore.bookmarkedPosts).toContain('p1')
        vi.mocked(stats.unbookmarkPost).mockResolvedValue(true)
        await unbookmarkPostByIdAction.call(mockStore, 'p1')
        expect(mockStore.bookmarkedPosts).not.toContain('p1')
    })
})
