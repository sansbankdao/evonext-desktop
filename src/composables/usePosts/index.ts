// src/composables/usePosts/index.ts

import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
import { useDebounce } from '../useDebounce'
import * as api from './api'
import * as transformers from './transformers'
import * as stats from './stats'
import * as filters from './filters'
import { getContractId } from './utils'
import type { IPost, PostsFetchOptions } from '@/types/posts'

export function usePosts() {
    const postsStore = usePostsStore()
    const identityStore = useIdentityStore()
    const settingsStore = useSettingsStore()

    // State
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const activeTab = ref<'posts' | 'remix'>('posts')
    const searchQuery = ref('')
    const languageFilter = ref<string>('')
    const showSensitive = ref(true)
    const sortBy = ref<filters.SortOrder>('newest')
    const sensitiveFilter = ref<filters.SensitiveFilter>('show')

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 500)

    // Computed values
    const isAuthenticated = computed(() => identityStore.isAuthenticated)
    const currentUserId = computed(() => identityStore.identity?.id)
    const currentNetwork = computed(() => settingsStore.network || 'testnet')

    // Filtered posts
    const filteredPosts = computed(() => {
        return filters.filterPosts(postsStore.sortedPosts, {
            searchQuery: debouncedSearch.value.value,
            language: languageFilter.value,
            sensitiveFilter: sensitiveFilter.value,
            sortBy: sortBy.value
        })
    })

    const userPosts = computed(() => {
        if (!currentUserId.value) return []
        return filters.filterPosts(postsStore.sortedUserPosts, {
            ownerId: currentUserId.value,
            sortBy: sortBy.value
        })
    })

    const hasMore = computed(() => {
        return filters.hasMorePosts(
            filteredPosts.value,
            postsStore.posts,
            postsStore.limit,
            postsStore.offset
        )
    })

    // Actions
    async function fetchPosts(options?: PostsFetchOptions): Promise<void> {
        isLoading.value = true
        error.value = null

        try {
            const documents = await api.fetchPostsFromTauri(currentNetwork.value, options)

            // Transform all documents with user info
            const profiles = new Map()
            const dpnsNames = new Map()

            const ownerIds = [...new Set(documents.map(doc => doc.ownerId || doc.$ownerId || ''))]
            await Promise.all(
                ownerIds.map(async (ownerId) => {
                    if (!ownerId) return
                    const [profileData, dpnsName] = await Promise.all([
                        api.fetchUserProfile(ownerId, currentNetwork.value),
                        api.fetchDPNSName(ownerId, currentNetwork.value)
                    ])
                    if (profileData) profiles.set(ownerId, profileData)
                    if (dpnsName) dpnsNames.set(ownerId, dpnsName)
                })
            )

            const posts = await transformers.transformPostDocuments(documents, profiles, dpnsNames)

            postsStore.posts = posts
            postsStore.lastFetched = new Date()

        } catch (err: any) {
            error.value = err.message || 'Failed to fetch posts from blockchain'
            console.error('usePosts: fetch error', err)
        } finally {
            isLoading.value = false
        }
    }

    async function fetchMorePosts(): Promise<void> {
        if (isLoading.value || !hasMore.value) return

        isLoading.value = true
        try {
            postsStore.offset = (postsStore.offset || 0) + postsStore.limit

            const documents = await api.fetchPostsFromTauri(currentNetwork.value, {
                limit: postsStore.limit,
                offset: postsStore.offset
            })

            const posts = await transformers.transformPostDocuments(documents)
            postsStore.posts = [...postsStore.posts, ...posts]

        } catch (err: any) {
            error.value = err.message || 'Failed to load more posts'
            console.error('usePosts: fetchMore error', err)
        } finally {
            isLoading.value = false
        }
    }

    async function createPost(content: string, options?: {
        isSensitive?: boolean
        language?: string
        mediaUrl?: string[]
        mentionIds?: string[]
        replyToPostId?: string[]
        hashtag?: string
        remix?: string
    }): Promise<IPost | null> {
        if (!isAuthenticated.value) {
            error.value = 'You must be connected to create a post'
            throw new Error(error.value)
        }

        isLoading.value = true
        error.value = null

        const optimisticPost: IPost = {
            id: `temp-${Date.now()}`,
            ownerId: currentUserId.value!,
            author: {
                username: `@${identityStore.username?.toLowerCase() || 'user'}`,
                displayName: identityStore.username || 'You',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.username || 'You')}&background=8b5cf6&color=fff`,
                verified: false
            },
            content,
            createdAt: new Date(),
            updatedAt: new Date(),
            likes: 0,
            remixes: 0,
            replies: 0,
            isSensitive: options?.isSensitive || false,
            language: options?.language || 'en',
            remix: options?.remix,
            hashtag: options?.hashtag,
            mediaUrls: options?.mediaUrl,
            mentionIds: options?.mentionIds,
            replyToPostId: options?.replyToPostId?.[0]
        }

        postsStore.upsertPost(optimisticPost)

        try {
            const createdPost = await api.createPost({
                content,
                isSensitive: options?.isSensitive,
                language: options?.language,
                mediaUrl: options?.mediaUrl,
                mentionIds: options?.mentionIds,
                replyToPostId: options?.replyToPostId,
                hashtag: options?.hashtag,
                remix: options?.remix
            })

            if (createdPost) {
                postsStore.upsertPost(createdPost)
                return createdPost
            }

            return optimisticPost
        } catch (err: any) {
            error.value = err.message || 'Failed to create post'
            console.error('usePosts: create error', err)
            postsStore.deletePostById(optimisticPost.id!)
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function likePost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        const wasLiked = postsStore.isPostLiked(postId)
        const currentLikes = post.likes || 0
        const updatedPost = stats.applyStatsUpdate(post, {
            postId,
            likes: wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
        })
        postsStore.upsertPost(updatedPost)
        postsStore.toggleLike(postId)

        try {
            if (wasLiked) {
                await api.unlikePost(postId)
            } else {
                await api.likePost(postId)
            }
            return true
        } catch (err) {
            console.error('usePosts: like error', err)
            postsStore.upsertPost(post)
            postsStore.toggleLike(postId)
            return false
        }
    }

    async function bookmarkPost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        const wasBookmarked = stats.isPostBookmarked(postId)
        const updatedPost = stats.applyStatsUpdate(post, {
            postId,
            bookmarks: wasBookmarked ? 0 : 1
        })
        postsStore.upsertPost(updatedPost)

        try {
            if (wasBookmarked) {
                await api.unbookmarkPost(postId)
            } else {
                await api.bookmarkPost(postId)
            }
            return true
        } catch (err) {
            console.error('usePosts: bookmark error', err)
            postsStore.upsertPost(post)
            return false
        }
    }

    async function deletePost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        if (post.ownerId !== currentUserId.value) {
            error.value = 'You can only delete your own posts'
            return false
        }

        postsStore.deletePostById(postId)

        try {
            const success = await api.deletePost(postId)
            return success
        } catch (err: any) {
            error.value = err.message || 'Failed to delete post'
            console.error('usePosts: delete error', err)
            if (post) postsStore.upsertPost(post)
            return false
        }
    }

    async function refreshPostStats(postId: string): Promise<void> {
        try {
            const postStats = await stats.getPostStats(postId)
            const post = postsStore.getPostById(postId)
            if (post) {
                postsStore.updatePost(postId, {
                    likes: postStats.likes,
                    remixes: postStats.remixes,
                    replies: postStats.replies
                })
            }
        } catch (err) {
            console.error('usePosts: refresh stats error', err)
        }
    }

    function clearFilters(): void {
        searchQuery.value = ''
        languageFilter.value = ''
        showSensitive.value = true
        sensitiveFilter.value = 'show'
        sortBy.value = 'newest'
    }

    function setTab(tab: 'posts' | 'remix'): void {
        activeTab.value = tab
    }

    // Auto-refresh
    let refreshInterval: ReturnType<typeof setInterval>

    function startAutoRefresh(intervalMs = 120000): void {
        stopAutoRefresh()
        refreshInterval = setInterval(() => {
            if (!isLoading.value) {
                fetchPosts()
            }
        }, intervalMs)
    }

    function stopAutoRefresh(): void {
        if (refreshInterval) {
            clearInterval(refreshInterval)
        }
    }

    // Initialize
    onBeforeUnmount(() => {
        stopAutoRefresh()
    })

    return {
        // State
        activeTab,
        searchQuery,
        debouncedSearch,
        languageFilter,
        showSensitive,
        sensitiveFilter,
        sortBy,
        isLoading: computed(() => isLoading.value),
        error: computed(() => error.value),

        // Computed
        posts: filteredPosts,
        userPosts,
        totalPosts: computed(() => postsStore.posts.length),
        lastFetched: computed(() => postsStore.lastFetched),
        hasMore,
        uniqueLanguages: computed(() => filters.getUniqueLanguages(postsStore.posts)),
        uniqueHashtags: computed(() => filters.getUniqueHashtags(postsStore.posts)),
        bookmarkedPosts: computed(() => postsStore.posts.filter(p => stats.isPostBookmarked(p.id!))),

        isAuthenticated,
        currentUserId,
        currentNetwork,

        // Actions
        fetchPosts,
        fetchMorePosts,
        createPost,
        likePost,
        bookmarkPost,
        deletePost,
        refreshPostStats,
        clearFilters,
        setTab,
        startAutoRefresh,
        stopAutoRefresh,

        // Store getters
        getPostById: (id: string) => postsStore.getPostById(id),
        isPostLiked: (id: string) => postsStore.isPostLiked(id),
        stats: {
            getPostStats: stats.getPostStats,
            isPostBookmarked: stats.isPostBookmarked,
            getBookmarkedPostIds: stats.getBookmarkedPostIds,
        },
        countPostsByPeriod: (period: 'day' | 'week' | 'month') =>
            filters.countPostsByPeriod(postsStore.posts, period)
    }
}

export type UsePostsReturn = ReturnType<typeof usePosts>
