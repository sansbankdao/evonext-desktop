// src/services/posts/stats.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getPostStats,
    bookmarkPost,
    unbookmarkPost,
    isPostBookmarked,
    applyStatsUpdate
} from './stats'
describe('post stats service', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })
    it('should fetch stats and detect bookmark state', async () => {
        localStorage.setItem('bookmark_123', 'true')
        const stats = await getPostStats('123')
        expect(stats.bookmarks).toBe(1)
        expect(stats.likes).toBeLessThan(100)
    })
    it('should bookmark a post', async () => {
        const result = await bookmarkPost('abc')
        expect(result).toBe(true)
        expect(localStorage.getItem('bookmark_abc')).toBe('true')
    })
    it('should unbookmark a post', async () => {
        localStorage.setItem('bookmark_abc', 'true')
        await unbookmarkPost('abc')
        expect(localStorage.getItem('bookmark_abc')).toBeNull()
    })
    it('should check if post is bookmarked', () => {
        localStorage.setItem('bookmark_xyz', 'true')
        expect(isPostBookmarked('xyz')).toBe(true)
        expect(isPostBookmarked('other')).toBe(false)
    })
    it('should apply optimistic updates to a post object', () => {
        const post: any = { id: '1', likes: 10, remixes: 5, replies: 2 }
        const update = { postId: '1', likes: 11 }
        const result = applyStatsUpdate(post, update)
        expect(result.likes).toBe(11)
        expect(result.remixes).toBe(5) // Unchanged
    })
})
