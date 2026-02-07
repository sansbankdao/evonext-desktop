// src/composables/usePosts.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosts } from './usePosts'
import { usePostsStore } from '@/stores/posts'
import { ref } from 'vue'

vi.mock('@/stores/posts', () => ({
    usePostsStore: vi.fn(() => ({
        posts: [],
        sortedPosts: [],
        sortedUserPosts: [],
        isLoading: false,
        error: null,
        fetchPosts: vi.fn(),
        isPostLiked: vi.fn().mockReturnValue(false),
        likePostById: vi.fn()
    }))
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({ isAuthenticated: true, identityId: 'u1' })
}))

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))

vi.mock('./useDebounce', () => ({
    useDebounce: (val: any) => val
}))

describe('usePosts composable', () => {
    let postsStore: any

    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
        postsStore = usePostsStore()
    })

    it('starts and stops auto-refresh', async () => {
        const { startAutoRefresh, stopAutoRefresh } = usePosts()

        startAutoRefresh(10000)
        vi.advanceTimersByTime(10000)
        expect(postsStore.fetchPosts).toHaveBeenCalled()

        stopAutoRefresh()
        vi.advanceTimersByTime(10000)
        expect(postsStore.fetchPosts).toHaveBeenCalledTimes(1)
    })

    it('handles liking logic correctly', () => {
        const { likePost } = usePosts()
        likePost('post_1')
        expect(postsStore.likePostById).toHaveBeenCalledWith('post_1')
    })
})
