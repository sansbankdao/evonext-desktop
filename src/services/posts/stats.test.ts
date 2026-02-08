// src/services/posts/stats.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getPostStats,
    bookmarkPost,
    unbookmarkPost,
    getBookmarkedPostIds,
    likePost,
    unlikePost,
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
    it('should handle errors in getPostStats gracefully', async () => {
        const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
            throw new Error('Storage blocked')
        })
        const result = await getPostStats('1')
        expect(result.likes).toBe(0)
        expect(result.bookmarks).toBe(0)
        spy.mockRestore()
    })
    it('should bookmark and unbookmark posts', async () => {
        await bookmarkPost('abc')
        expect(localStorage.getItem('bookmark_abc')).toBe('true')
        await unbookmarkPost('abc')
        expect(localStorage.getItem('bookmark_abc')).toBeNull()
    })
    it('should retrieve all bookmarked IDs', () => {
        localStorage.setItem('bookmark_1', 'true')
        localStorage.setItem('bookmark_2', 'true')
        localStorage.setItem('other', 'val')
        const ids = getBookmarkedPostIds()
        expect(ids).toContain('1')
        expect(ids).toContain('2')
        expect(ids).toHaveLength(2)
    })
    it('should log mock actions for like and unlike', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
        expect(await likePost('p1')).toBe(true)
        expect(await unlikePost('p1')).toBe(true)
        spy.mockRestore()
    })
    it('should apply optimistic updates to post objects', () => {
        const post: any = { id: '1', likes: 10, remixes: 5 }
        const update = { postId: '1', likes: 20 }
        const result = applyStatsUpdate(post, update)
        expect(result.likes).toBe(20)
        expect(result.remixes).toBe(5)
    })
})
