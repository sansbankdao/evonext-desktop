// src/stores/posts/actions/createUpdate.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNewPostAction, deletePostByIdAction } from './createUpdate'
import * as api from '@/services/posts/mutations'

vi.mock('@/services/posts/mutations', () => ({
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn()
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        isAuthenticated: true,
        identityId: 'user_123',
        identity: { username: 'tester', displayName: 'Test User' }
    })
}))

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))

describe('createUpdate.ts Store Actions', () => {
    let mockStore: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockStore = {
            posts: [],
            isLoading: false,
            error: null,
            identityId: 'user_123',
            upsertPost: vi.fn((p) => {
                const idx = mockStore.posts.findIndex((old: any) => old.id === p.id)
                if (idx > -1) mockStore.posts[idx] = p
                else mockStore.posts.push(p)
            }),
            deletePostById: vi.fn((id) => {
                mockStore.posts = mockStore.posts.filter((p: any) => p.id !== id)
            }),
            getPostById: vi.fn((id) => mockStore.posts.find((p: any) => p.id === id))
        }
    })

    describe('createNewPostAction', () => {
        it('should create a post and swap optimistic version for real one', async () => {
            const mockCreated = { id: 'real_id', content: 'hello', contractId: 'evo_test' }
            vi.mocked(api.createPost).mockResolvedValue(mockCreated as any)

            const result = await createNewPostAction.call(mockStore, 'hello')

            expect(result).toEqual(mockCreated)
            expect(mockStore.posts).toHaveLength(1)
            expect(mockStore.posts[0].id).toBe('real_id')
        })

        it('should revert and set error if creation fails', async () => {
            vi.mocked(api.createPost).mockRejectedValue(new Error('DAPI Error'))

            const result = await createNewPostAction.call(mockStore, 'hello')

            expect(result).toBeNull()
            expect(mockStore.error).toBe('DAPI Error')
            expect(mockStore.posts).toHaveLength(0)
        })
    })

    describe('deletePostByIdAction', () => {
        it('should block deletion of posts owned by others', async () => {
            mockStore.posts = [{ id: '1', ownerId: 'other_user' }]

            const result = await deletePostByIdAction.call(mockStore, '1')

            expect(result).toBe(false)
            expect(mockStore.error).toBe('You can only delete your own posts')
        })

        it('should allow deletion of own posts', async () => {
            mockStore.posts = [{ id: '1', ownerId: 'user_123' }]
            vi.mocked(api.deletePost).mockResolvedValue(true as any)

            const result = await deletePostByIdAction.call(mockStore, '1')

            expect(result).toBe(true)
            expect(mockStore.posts).toHaveLength(0)
        })
    })
})
