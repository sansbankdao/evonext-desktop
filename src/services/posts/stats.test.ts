// src/services/posts/stats.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getPostStats,
    getBookmarkedPostIds,
    likePost,
    unlikePost
} from './stats'

describe('post stats service - Extended', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    it('should return empty array when no bookmarks exist', () => {
        const ids = getBookmarkedPostIds()
        expect(ids).toEqual([])
    })

    it('should return list of IDs from localStorage', () => {
        localStorage.setItem('bookmark_1', 'true')
        localStorage.setItem('bookmark_2', 'true')
        localStorage.setItem('other_key', 'true')

        const ids = getBookmarkedPostIds()
        expect(ids).toContain('1')
        expect(ids).toContain('2')
        expect(ids.length).toBe(2)
    })

    it('should handle errors in getPostStats gracefully', async () => {
        // Mock the entire return to simulate a crash before the random numbers generate
        const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
            throw new Error('Storage blocked')
        })

        const stats = await getPostStats('1')
        expect(stats.likes).toBe(0) // Now it will hit the catch block

        spy.mockRestore()
    })

    it('should log to console and return true for likes (mocked)', async () => {
        const logSpy = vi.spyOn(console, 'log')
        const res = await likePost('1')
        expect(res).toBe(true)
        expect(logSpy).toHaveBeenCalled()

        const res2 = await unlikePost('1')
        expect(res2).toBe(true)
    })
})
