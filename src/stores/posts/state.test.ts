// src/stores/posts/state.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import postsState from './state'

describe('Posts State', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('should export valid IPostsState structure', () => {
        expect(postsState).toBeDefined()
        expect(postsState).toHaveProperty('posts')
        expect(postsState).toHaveProperty('userPosts')
        expect(postsState).toHaveProperty('likedPosts')
        expect(postsState).toHaveProperty('bookmarkedPosts')
        expect(postsState).toHaveProperty('isLoading')
        expect(postsState).toHaveProperty('error')
        expect(postsState).toHaveProperty('nextPage')
        expect(postsState).toHaveProperty('hasNextPage')
        expect(postsState).toHaveProperty('limit')
        expect(postsState).toHaveProperty('offset')
    })

    it('should initialize arrays with correct types', () => {
        expect(Array.isArray(postsState.posts)).toBe(true)
        expect(Array.isArray(postsState.userPosts)).toBe(true)
        expect(Array.isArray(postsState.likedPosts)).toBe(true)
        expect(Array.isArray(postsState.bookmarkedPosts)).toBe(true)
    })

    it('should initialize flags to false', () => {
        expect(postsState.isLoading).toBe(false)
        expect(postsState.hasNextPage).toBe(false)
    })

    it('should initialize numeric counters to 0', () => {
        expect(postsState.limit).toBe(10)
        expect(postsState.offset).toBe(0)
    })

    it('should handle undefined values for pagination', () => {
        expect(postsState.nextPage).toBeUndefined()
    })

    it('should initialize error as null', () => {
        expect(postsState.error).toBeNull()
    })

    it('should initialize lastFetched as null', () => {
        expect(postsState.lastFetched).toBeNull()
    })

    it('should initialize debug object with correct structure', () => {
        const debug = (postsState as any).debug
        expect(debug).toBeDefined()
        expect(debug.activeContracts).toEqual([])
        expect(debug.fetchCounts).toEqual({})
        expect(debug.mergeCount).toBe(0)
        expect(debug.duplicateCount).toBe(0)
        expect(debug.lastFetchTime).toBeNull()
    })

    it('should initialize all arrays as empty', () => {
        expect(postsState.posts).toHaveLength(0)
        expect(postsState.userPosts).toHaveLength(0)
        expect(postsState.likedPosts).toHaveLength(0)
        expect(postsState.bookmarkedPosts).toHaveLength(0)
    })
})
