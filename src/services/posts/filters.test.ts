// src/services/posts/filters.test.ts

import { describe, it, expect } from 'vitest'
import type { IPost } from '@/types/posts'
import type { IUser } from '@/types/identity'
import {
    applySearchFilter,
    filterPosts,
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

describe('posts filters type-safe', () => {
    it('filters posts with full IUser compliance', () => {
        const posts = [
            createMockPost('1', 'Hello #world'),
            createMockPost('2', 'Goodbye', { language: 'fr' })
        ]

        const result = applySearchFilter(posts, 'world')
        expect(result).toHaveLength(1)
        expect(result[0].author.avatar).toBe('https://example.com/avatar.png')
    })

    it('counts periods correctly using timestamps', () => {
        const posts = [
            createMockPost('1', 'p1', { createdAt: new Date('2024-01-01').getTime() }),
            createMockPost('2', 'p2', { createdAt: new Date('2024-01-02').getTime() })
        ]
        const counts = countPostsByPeriod(posts, 'day')
        expect(counts['2024-01-01']).toBe(1)
    })
})
