// src/composables/usePosts/index.ts

import { ref, computed, onBeforeUnmount } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings' // Revert to SettingsStore
import { useDebounce } from '../useDebounce'
import * as api from './api'
import * as transformers from './transformers'
import * as stats from './stats'
import * as filters from './filters'
import type {
    IPost,
    PostsFetchOptions,
    ICreatePostParams,
    IPostDocument
} from '@/types/posts'
import type { FilterOptions } from './filters'
import {
    getActivePostContracts,
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET
} from '@/constants'

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
    const currentUserId = computed(() => identityStore.identity?.id || '')

    // SAFEGUARD: Explicitly validate the network from settings before using it.
    // This prevents the use of invalid values or accidental 'testnet' defaults if the store logic fails.
    const currentNetwork = computed(() => {
        const net = settingsStore.state.network

        // Strict validation: Only allow 'mainnet' or 'testnet'.
        // If the store somehow holds 'undefined', 'null', or '', we default to 'testnet' safely.
        if (net === 'mainnet' || net === 'testnet') {
            return net
        }

        // This log is crucial for debugging if the store returns garbage.
        // If you see this in console, check src/stores/settings.ts
        console.warn(`[usePosts] Network state is invalid ("${net}"). Defaulting to testnet.`)
        return 'testnet'
    })

    // Filtered posts
    const filteredPosts = computed(() => {
        const filterOptions: FilterOptions = {
            searchQuery: debouncedSearch.value,
            language: languageFilter.value,
            sensitiveFilter: sensitiveFilter.value,
            sortBy: sortBy.value
        }
        return filters.filterPosts(postsStore.sortedPosts, filterOptions)
    })

    const userPosts = computed(() => {
        if (!currentUserId.value) return []
        const filterOptions: FilterOptions = {
            ownerId: currentUserId.value,
            sortBy: sortBy.value
        }
        return filters.filterPosts(postsStore.sortedUserPosts, filterOptions)
    })

    const hasMore = computed(() => {
        return postsStore.hasNextPage
    })

    // Actions
    async function fetchPosts(options?: PostsFetchOptions): Promise<void> {
        isLoading.value = true
        error.value = null

        try {
            console.log(`[usePosts] Fetching posts on network: ${currentNetwork.value}`)

            // Get the list of contracts to query (e.g., [EvoNext, YAPPR] for testnet)
            const activeContracts = getActivePostContracts(currentNetwork.value)

            let allDocuments: IPostDocument[] = []

            // 1. Fetch documents from ALL active contracts
            // We assume api.fetchPostsFromTauri can accept a contractId in options,
            // or we loop to fetch distinct sets.
            // (Note: If fetchPostsFromTauri doesn't accept contractId, it might fetch everything and we filter,
            // but passing it is more efficient if supported).
            const limit = postsStore.limit || 10

            for (const contractId of activeContracts) {
                try {
                    // Fetch a larger set from each to allow for proper sorting/merging
                    const docs = await api.fetchPostsFromTauri(currentNetwork.value, {
                        ownerId: options?.ownerId || '',
                        orderBy: options?.orderBy as ('newest' | 'oldest'),
                        limit: limit,
                        // Pass contractId to backend if supported (optional optimization)
                        contractId
                    } as any)

                    allDocuments.push(...docs)
                } catch (contractErr) {
                    console.warn(`[usePosts] Failed to fetch from contract ${contractId}:`, contractErr)
                    // Continue fetching from other contracts even if one fails
                }
            }

            // 2. Merge and Sort
            // We assume you want a global feed sorted by newest, regardless of source
            allDocuments.sort((a, b) => {
                // Sort by createdAt descending (newest first)
                return b.createdAt - a.createdAt
            })

            // 3. Slice to the requested limit
            // If we fetched 10 from EvoNext and 10 from YAPPR, we have 20.
            // We take the top 10 newest overall.
            const finalDocuments = allDocuments.slice(0, limit)

            // Reset offset for new fetch
            postsStore.$patch({ offset: 0 })

            // Transform all documents with user info
            const profiles = new Map<string, any>()
            const dpnsNames = new Map<string, string>()

            const ownerIds = [...new Set(finalDocuments.map(doc => doc.ownerId || ''))].filter(Boolean)
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

            const posts = await transformers.transformPostDocuments(finalDocuments as IPostDocument[], profiles, dpnsNames)

            // 4. Inject contractId into Post objects for the UI
            // (Ensure contractId is present on IPost interface)
            const postsWithSource = posts.map(post => ({
                ...post,
                contractId: finalDocuments.find(doc => doc.$ownerId === post.ownerId && doc.createdAt === post.createdAt)?.dataContractId || ''
            }))

            postsStore.$patch({
                posts: postsWithSource,
                lastFetched: new Date(),
                hasNextPage: allDocuments.length > limit // If we have leftovers, there might be more
            })

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
            const newOffset = (postsStore.offset || 0) + postsStore.limit

            const documents = await api.fetchPostsFromTauri(currentNetwork.value, {
                ownerId: '',
                orderBy: 'newest',
                limit: postsStore.limit || 10
            })

            const posts = await transformers.transformPostDocuments(documents as IPostDocument[])

            postsStore.$patch({
                posts: [...postsStore.posts, ...posts],
                offset: newOffset,
                hasNextPage: documents.length === postsStore.limit
            })

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

        const d = new Date()
        const now = d.getTime() / 1000

        // Determine the contract ID for the new post (Default to Primary)
        const targetContractId = currentNetwork.value === 'testnet'
            ? EVONEXT_CONTRACT_ID_TESTNET
            : EVONEXT_CONTRACT_ID_MAINNET

        const optimisticPost: IPost = {
            contractId: targetContractId,
            ownerId: currentUserId.value!,
            author: {
                username: identityStore.identity?.username || 'User',
                displayName: identityStore.identity?.displayName || identityStore.identity?.username || 'You',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.identity?.username || 'You')}&background=8b5cf6&color=fff`,
                verified: false,
                bio: ''
            },
            content,
            createdAt: now,
            updatedAt: now,
            likes: 0,
            remixes: 0,
            replies: 0,
            views: 0,
            isSensitive: options?.isSensitive || false,
            language: options?.language || 'en',
            remix: options?.remix as string | undefined,
            hashtag: options?.hashtag,
            mediaUrls: options?.mediaUrl,
            mentionIds: options?.mentionIds,
            replyToPostId: options?.replyToPostId?.[0],
        }

        // Optimistic update
        postsStore.upsertPost(optimisticPost)

        try {
            const createPostParams: ICreatePostParams = {
                content,
                isSensitive: options?.isSensitive || false,
                language: options?.language || 'en',
                mediaUrl: options?.mediaUrl,
                mentionIds: options?.mentionIds,
                replyToPostId: options?.replyToPostId,
                hashtag: options?.hashtag,
                remix: options?.remix || undefined
            }

            const createdPost = await api.createPost(createPostParams)

            if (createdPost) {
                // Replace optimistic post with real post
                // Ensure the API returned post has the contractId or inherit it
                if (!createdPost.contractId) {
                    createdPost.contractId = targetContractId
                }
                postsStore.upsertPost(createdPost)
                return createdPost
            }

            return null
        } catch (err: any) {
            // Remove optimistic post on error
            if (optimisticPost.id) {
                postsStore.deletePostById(optimisticPost.id)
            }
            error.value = err.message || 'Failed to create post'
            console.error('usePosts: createPost error', err)
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

        // Optimistic update
        const updatedPost = stats.applyStatsUpdate(post, {
            postId,
            likes: wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
        })
        postsStore.upsertPost(updatedPost)

        // Update liked state
        if (wasLiked) {
            postsStore.$patch((state) => {
                state.likedPosts = state.likedPosts.filter(id => id !== postId)
            })
        } else {
            postsStore.$patch((state) => {
                state.likedPosts.push(postId)
            })
        }

        try {
            if (wasLiked) {
                await stats.unlikePost(postId)
            } else {
                await stats.likePost(postId)
            }
            return true
        } catch (err) {
            console.error('usePosts: like error', err)
            // Revert optimistic update
            postsStore.upsertPost(post)
            postsStore.$patch((state) => {
                if (wasLiked) {
                    state.likedPosts.push(postId)
                } else {
                    state.likedPosts = state.likedPosts.filter(id => id !== postId)
                }
            })
            return false
        }
    }

    async function bookmarkPost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        const wasBookmarked = stats.isPostBookmarked(postId)

        // Update bookmarked posts in store
        postsStore.$patch((state) => {
            if (wasBookmarked) {
                state.bookmarkedPosts = state.bookmarkedPosts.filter(id => id !== postId)
            } else {
                state.bookmarkedPosts.push(postId)
            }
        })

        try {
            if (wasBookmarked) {
                await stats.unbookmarkPost(postId)
            } else {
                await stats.bookmarkPost(postId)
            }
            return true
        } catch (err) {
            console.error('usePosts: bookmark error', err)
            // Revert
            postsStore.$patch((state) => {
                if (wasBookmarked) {
                    state.bookmarkedPosts.push(postId)
                } else {
                    state.bookmarkedPosts = state.bookmarkedPosts.filter(id => id !== postId)
                }
            })
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
            // Revert
            if (post) postsStore.upsertPost(post)
            return false
        }
    }

    async function refreshPostStats(postId: string): Promise<void> {
        try {
            const postStats = await stats.getPostStats(postId)
            const post = postsStore.getPostById(postId)
            if (post) {
                const updatedPost = { ...post }
                if (postStats.likes !== undefined) updatedPost.likes = postStats.likes
                if (postStats.remixes !== undefined) updatedPost.remixes = postStats.remixes
                if (postStats.replies !== undefined) updatedPost.replies = postStats.replies
                postsStore.upsertPost(updatedPost)
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

    async function updatePost(
        postId: string,
        updates: {
            documentId: string;
            content?: string;
            isSensitive?: boolean;
            language?: string;
        }
    ): Promise<boolean> {
        if (!isAuthenticated.value) {
            error.value = 'You must be connected to update a post'
            return false
        }

        isLoading.value = true
        error.value = null

        try {
            const success = await api.updatePost(postId, updates)
            if (success) {
                // Optimistic Update: Find the post in store and update it
                const currentPost = postsStore.getPostById(postId)
                if (currentPost) {
                    const updatedPost = {
                        ...currentPost,
                        ...updates,
                        updatedAt: Math.floor(Date.now() / 1000) // Update timestamp (number)
                    }
                    postsStore.upsertPost(updatedPost)
                }
            }
            return success
        } catch (err: any) {
            error.value = err.message || 'Failed to update post'
            console.error('usePosts: updatePost error', err)
            return false
        } finally {
            isLoading.value = false
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
        currentNetwork, // This now relies on the validated computed property

        // Actions
        fetchPosts,
        fetchMorePosts,
        createPost,
        updatePost,
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
