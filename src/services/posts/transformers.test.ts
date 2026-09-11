// src/services/posts/transformers.test.ts

import { describe, it, expect, vi } from 'vitest'
import {
    getUserInfo,
    transformPostDocument,
    transformPostDocuments
} from './transformers'
import type { IPostDocument } from '@/types'
vi.mock('./utils', () => ({
    generateAvatarUrl: (id: string, name: string) => `https://avatar.com/${id}/${name}`
}))
describe('transformers', () => {
    const ownerId = 'identity_1234567890_abcdefg'
    describe('getUserInfo profile priority', () => {
        it('prioritizes YAPPR displayName (handoff §6 priority)', () => {
            const dpnsProfile = { displayName: 'DPNS Name', avatarUrl: 'dpns.png' }
            const yapprProfile = { displayName: 'YAPPR Name' }
            const result = getUserInfo(ownerId, dpnsProfile as any, yapprProfile as any, 'alice.dash')
            expect(result.displayName).toBe('YAPPR Name')
            expect(result.username).toBe('@alice.dash')
            expect(result.verified).toBe(true)
        })
        it('uses @username when no YAPPR displayName exists', () => {
            const dpnsProfile = { displayName: 'DPNS Name', avatarUrl: 'dpns.png' }
            const result = getUserInfo(ownerId, dpnsProfile as any, null, 'alice.dash')
            expect(result.displayName).toBe('@alice.dash')
        })
        it('bio comes from the DashPay profile (publicMessage), never YAPPR', () => {
            const dashpayProfile = { publicMessage: 'Hello' }
            const yapprProfile = { displayName: 'YAPPR Name', publicMessage: 'WRONG SOURCE' }
            const result = getUserInfo(ownerId, dashpayProfile as any, yapprProfile as any, null)
            expect(result.displayName).toBe('YAPPR Name')
            expect(result.bio).toBe('Hello')
            expect(result.verified).toBe(false)
        })
        it('falls back to abbreviated ID logic when no profiles exist', () => {
            const result = getUserInfo(ownerId, null, null, null)
            expect(result.displayName).toBe('identity_12...defg')
            expect(result.avatar).toContain('data:image/svg+xml')
        })
    })
    describe('getUserInfo avatar resolution (BUG 2/3 regression)', () => {
        it('never leaks identity IDs to api.dicebear.com', () => {
            const result = getUserInfo(ownerId, null, null, null)
            expect(result.avatar).not.toContain('api.dicebear.com')
            expect(result.avatar).toMatch(/^data:image\/svg\+xml/)
        })
        it('parses the YAPPR avatar DiceBear JSON field', () => {
            const yapprProfile = { avatar: '{"style":"bottts","seed":"xyz"}' }
            const result = getUserInfo(ownerId, null, yapprProfile as any, null)
            expect(result.avatar).toMatch(/^data:image\/svg\+xml/)
            expect(decodeURIComponent(result.avatar!)).toContain('<svg')
        })
        it('passes image URIs through and maps ipfs to the gateway', () => {
            const yapprProfile = { avatar: 'ipfs://QmXyZ' }
            const result = getUserInfo(ownerId, null, yapprProfile as any, null)
            expect(result.avatar).toBe('https://ipfs.io/ipfs/QmXyZ')
        })
        it('falls back to the DashPay avatarUrl when YAPPR has none', () => {
            const dpnsProfile = { avatarUrl: 'https://x.io/pic.png' }
            const result = getUserInfo(ownerId, dpnsProfile as any, null, null)
            expect(result.avatar).toBe('https://x.io/pic.png')
        })
    })
    describe('transformPostDocument', () => {
        const mockDoc: IPostDocument = {
            id: 'post_1',
            ownerId: 'owner_1',
            content: 'Hello World',
            isSensitive: true,
            language: 'en',
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
            revision: 1,
            dataContractId: 'contract_1'
        }
        it('converts a blockchain document to a hydrated UI post', () => {
            const post = transformPostDocument(mockDoc)
            expect(post.id).toBe('post_1')
            expect(post.author.username).toContain('@owner_1')
            expect(post.isSensitive).toBe(true)
        })
        it('handles optional media and hashtags', () => {
            const docWithMedia = { ...mockDoc, mediaUrl: ['img1.png'], hashtag: '#dash' }
            const post = transformPostDocument(docWithMedia)
            expect(post.mediaUrls).toEqual(['img1.png'])
            expect(post.hashtag).toBe('#dash')
        })
    })
    describe('transformPostDocuments batching', () => {
        it('maps parent posts to replies during transformation', () => {
            const parent = { id: 'parent_1', content: 'Parent' } as any
            const replyDoc = { id: 'reply_1', ownerId: 'o1', replyToPostId: ['parent_1'] } as any
            const parentMap = new Map([['parent_1', parent]])
            const results = transformPostDocuments([replyDoc], new Map(), new Map(), new Map(), parentMap)
            expect(results[0]!.quotedPost).toBe(parent)
            expect(results[0]!.replyToPostId).toBe('parent_1')
        })
    })
})
