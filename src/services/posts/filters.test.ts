// src/services/posts/filters.test.ts

import { describe, it, expect } from 'vitest'
import type { IPost } from '@/types/posts'
import type { IUser } from '@/types/identity'
import {
    applySearchFilter,
    applyLanguageFilter,
    applySensitiveFilter,
    applyDateFilter,
    applySorting,
    applyOwnerFilter,
    filterPosts,
    hasMorePosts,
    getUniqueLanguages,
    getUniqueHashtags,
    countPostsByPeriod
} from './filters'

const mockUser: IUser = {
    username: 'dash_user',
    displayName: 'Dash User',
    avatar: 'https://example.com/avatar.png'
}

const createMockPost = (id: string, content: string, overrides: Partial<IPost> = {}): IPost => ({
    id,
    content,
    isSensitive: false,
    language: 'en',
    contractId: 'contract_1',
    ownerId: 'owner_1',
    author: { ...mockUser },
    createdAt: Date.now(),
    updatedAt: null,
    likes: 0,
    remixes: 0,
    replies: 0,
    views: 0,
    ...overrides
})

describe('posts filters suite', () => {
    const posts: IPost[] = [
        createMockPost('1', 'UniqueApple #fruit', {
            likes: 10,
            createdAt: new Date('2024-01-01').getTime(),
            language: 'en',
            hashtag: '#fruit'
        }),
        createMockPost('2', 'Banana #yellow', {
            likes: 50,
            createdAt: new Date('2024-01-02').getTime(),
            language: 'fr',
            isSensitive: true,
            hashtag: 'yellow'
        }),
        createMockPost('3', 'Cherry', {
            likes: 25,
            createdAt: new Date('2024-01-03').getTime(),
            replies: 10,
            remixes: 5,
            ownerId: 'owner_2'
        })
    ]

    describe('applySearchFilter', () => {
        it('matches content regardless of case', () => {
            const result = applySearchFilter(posts, 'UNIQUEAPPLE')
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('matches author display name', () => {
            const result = applySearchFilter(posts, 'Dash User')
            expect(result).toHaveLength(3)
        })

        it('matches hashtags', () => {
            const result = applySearchFilter(posts, 'yellow')
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('2')
        })

        it('returns all posts on empty query', () => {
            expect(applySearchFilter(posts, '   ')).toHaveLength(3)
        })
    })

    describe('applyLanguageFilter', () => {
        it('filters by specific language', () => {
            expect(applyLanguageFilter(posts, 'fr')).toHaveLength(1)
        })

        it('returns all when no language provided', () => {
            expect(applyLanguageFilter(posts)).toHaveLength(3)
        })
    })

    describe('applySensitiveFilter', () => {
        it('hides sensitive content', () => {
            const result = applySensitiveFilter(posts, 'hide')
            expect(result.every(p => !p.isSensitive)).toBe(true)
            expect(result).toHaveLength(2)
        })

        it('shows only sensitive content', () => {
            const result = applySensitiveFilter(posts, 'only')
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('2')
        })

        it('shows everything on "show"', () => {
            expect(applySensitiveFilter(posts, 'show')).toHaveLength(3)
        })
    })

    describe('applyDateFilter', () => {
        it('filters by fromDate', () => {
            const from = new Date('2024-01-02T00:00:00Z')
            const result = applyDateFilter(posts, from)
            expect(result).toHaveLength(2)
        })

        it('filters by toDate', () => {
            const to = new Date('2024-01-01T23:59:59Z')
            const result = applyDateFilter(posts, undefined, to)
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })
    })

    describe('applySorting', () => {
        it('sorts by newest', () => {
            const result = applySorting(posts, 'newest')
            expect(result[0].id).toBe('3')
        })

        it('sorts by oldest', () => {
            const result = applySorting(posts, 'oldest')
            expect(result[0].id).toBe('1')
        })

        it('sorts by most-liked', () => {
            const result = applySorting(posts, 'most-liked')
            expect(result[0].likes).toBe(50)
        })

        it('sorts by most-replies', () => {
            const result = applySorting(posts, 'most-replies')
            expect(result[0].id).toBe('3')
        })

        it('sorts by most-remixed', () => {
            const result = applySorting(posts, 'most-remixed')
            expect(result[0].id).toBe('3')
        })
    })

    describe('applyOwnerFilter', () => {
        it('filters by ownerId', () => {
            const result = applyOwnerFilter(posts, 'owner_2')
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('3')
        })
    })

    describe('filterPosts (Integration)', () => {
        it('applies multiple filters simultaneously', () => {
            const options = {
                searchQuery: 'UniqueApple',
                language: 'en',
                sortBy: 'newest' as any
            }
            const result = filterPosts(posts, options)
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('applies pagination', () => {
            const options = { limit: 1, offset: 1 }
            const result = filterPosts(posts, options)
            expect(result).toHaveLength(1)
            // Sort newest: Cherry(3), Banana(2), Apple(1). Offset 1 is Banana.
            expect(result[0].id).toBe('2')
        })
    })

    describe('hasMorePosts', () => {
        it('detects when more pages are available', () => {
            expect(hasMorePosts(posts, posts, 1, 0)).toBe(true)
            expect(hasMorePosts(posts, posts, 3, 0)).toBe(false)
        })
    })

    describe('Metadata extraction', () => {
        it('extracts unique languages sorted', () => {
            const langs = getUniqueLanguages(posts)
            expect(langs).toEqual(['en', 'fr'])
        })

        it('extracts unique hashtags without # prefix', () => {
            const tags = getUniqueHashtags(posts)
            expect(tags).toContain('fruit')
            expect(tags).toContain('yellow')
        })
    })

    describe('countPostsByPeriod', () => {
        it('counts by day', () => {
            const counts = countPostsByPeriod(posts, 'day')
            expect(counts['2024-01-01']).toBe(1)
        })

        it('counts by month', () => {
            const counts = countPostsByPeriod(posts, 'month')
            expect(counts['2024-01']).toBe(3)
        })
    })
})
