// src/stores/posts/actions/utilities.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    upsertPostAction,
    clearAction,
    updatePostAuthorAction
} from './utilities'
describe('posts store utilities', () => {
    let mockStore: any
    beforeEach(() => {
        mockStore = {
            posts: [],
            userPosts: [],
            likedPosts: [],
            bookmarkedPosts: [],
            identityId: 'user123',
            upsertPost: vi.fn((p) => upsertPostAction.call(mockStore, p))
        }
    })
    it('should add new post via upsert', () => {
        const post = { id: 'p1', ownerId: 'other' } as any
        upsertPostAction.call(mockStore, post)
        expect(mockStore.posts[0]).toEqual(post)
        expect(mockStore.posts.length).toBe(1)
    })
    it('should update existing post via upsert', () => {
        mockStore.posts = [{ id: 'p1', content: 'old' }]
        const updated = { id: 'p1', content: 'new' } as any
        upsertPostAction.call(mockStore, updated)
        expect(mockStore.posts.length).toBe(1)
        expect(mockStore.posts[0].content).toBe('new')
    })
    it('should sync userPosts if owner matches identityId', () => {
        const post = { id: 'p1', ownerId: 'user123' } as any
        upsertPostAction.call(mockStore, post)
        expect(mockStore.userPosts.length).toBe(1)
        expect(mockStore.userPosts[0].id).toBe('p1')
    })
    it('should clear all state', () => {
        mockStore.posts = [{ id: '1' }]
        mockStore.hasNextPage = true
        clearAction.call(mockStore)
        expect(mockStore.posts).toEqual([])
        expect(mockStore.hasNextPage).toBe(false)
        expect(mockStore.error).toBeNull()
    })
})
