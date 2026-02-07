// src/stores/posts/getters.test.ts

import { describe, it, expect } from 'vitest'
import getters from './getters'

describe('posts store getters', () => {
    const state = {
        posts: [
            { id: '1', createdAt: 1000 },
            { id: '2', createdAt: 2000 }
        ],
        likedPosts: ['1'],
        userPosts: [{ id: 'u1', createdAt: 500 }]
    }

    it('getPostById returns the correct post', () => {
        const post = getters.getPostById(state)('1')
        expect(post?.id).toBe('1')
    })

    it('isPostLiked checks existence in liked list', () => {
        expect(getters.isPostLiked(state)('1')).toBe(true)
        expect(getters.isPostLiked(state)('2')).toBe(false)
    })

    it('sortedPosts returns posts in descending order', () => {
        const sorted = getters.sortedPosts(state)
        expect(sorted[0].id).toBe('2')
        expect(sorted[1].id).toBe('1')
    })

    it('recentPosts filters by the last 24 hours', () => {
        const now = Date.now()
        const recentState = {
            posts: [
                { id: 'old', createdAt: now - (48 * 60 * 60 * 1000) },
                { id: 'new', createdAt: now - (1 * 60 * 60 * 1000) }
            ]
        }
        const recent = getters.recentPosts(recentState)
        expect(recent).toHaveLength(1)
        expect(recent[0].id).toBe('new')
    })
})
