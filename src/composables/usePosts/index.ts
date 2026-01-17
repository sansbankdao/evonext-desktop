// src/composables/usePosts/index.ts

import { ref, computed, onBeforeUnmount } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
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
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET,
    YAPPR_CONTRACT_ID_TESTNET
} from '@/constants'
import { getActivePostContracts } from '@/constants'

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

    // --- DEBUG STATE ---
    const debugStats = ref({
        activeContracts: [] as string[],
        fetchCounts: {} as Record<string, number>,
        rawData: {} as Record<string, any[]>,
        mergeCount: 0,
        duplicateCount: 0,
        lastFetchTime: null as string | null
    })

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 500)

    // Computed values
    const isAuthenticated = computed(() => identityStore.isAuthenticated)
    const currentUserId = computed(() => identityStore.identity?.id || '')

    const currentNetwork = computed(() => {
        const net = settingsStore.state.network
        if (net === 'mainnet' || net === 'testnet') {
            return net
        }
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
            const network = currentNetwork.value

            // 1. Get Active Contracts (Using centralized helper)
            // If this fails, we fallback to ensure we don't get stuck
            let activeContracts: string[] = []
            try {
                activeContracts = getActivePostContracts(network)
            } catch (err) {
                console.error('[usePosts] getActivePostContracts failed', err)
                // Fallback
                if (network === 'testnet') {
                    activeContracts = [EVONEXT_CONTRACT_ID_TESTNET, YAPPR_CONTRACT_ID_TESTNET]
                } else {
                    activeContracts = [EVONEXT_CONTRACT_ID_MAINNET]
                }
            }

            if (activeContracts.length === 0) {
                throw new Error('No active contracts found')
            }

            console.log(`[usePosts] Fetching on ${network}. Contracts:`, activeContracts)

            // Initialize Debug Stats & Data Storage
            debugStats.value = {
                activeContracts,
                fetchCounts: {},
                rawData: {},
                mergeCount: 0,
                duplicateCount: 0,
                lastFetchTime: new Date().toISOString()
            }

            let allDocuments: IPostDocument[] = []
            const limit = postsStore.limit || 10

            // 2. Fetch from all active contracts in loop
            for (const contractId of activeContracts) {
                try {
                    const docs = await api.fetchPostsFromTauri(network, {
                        ownerId: options?.ownerId || '',
                        orderBy: options?.orderBy as ('desc' | 'asc'),
                        limit: limit * 2, // Fetch extra to account for deduping
                        contractId
                    })

                    // CRITICAL: Update Debug Stats immediately upon receipt
                    debugStats.value.fetchCounts[contractId] = docs.length
                    debugStats.value.rawData[contractId] = JSON.parse(JSON.stringify(docs))

                    allDocuments.push(...docs)
                } catch (contractErr: any) {
                    console.warn(`[usePosts] Failed to fetch from contract ${contractId}:`, contractErr)
                    debugStats.value.fetchCounts[contractId] = 0
                    debugStats.value.rawData[contractId] = [{ error: contractErr.message }]
                }
            }

            // 3. Merge & Sort & Dedupe
            allDocuments.sort((a, b) => b.createdAt - a.createdAt)

            const uniqueMap = new Map(allDocuments.map(doc => [
                `${doc.$ownerId}-${doc.createdAt}`,
                doc
            ]))
            const uniqueDocuments = Array.from(uniqueMap.values())

            debugStats.value.duplicateCount = allDocuments.length - uniqueDocuments.length

            // 4. Slice to limit
            const finalDocuments = uniqueDocuments.slice(0, limit)
            debugStats.value.mergeCount = finalDocuments.length

            // 5. Handle "No Results" scenario
            if (finalDocuments.length === 0) {
                console.warn('[usePosts] No documents found from any contract.')
                postsStore.$patch({
                    posts: [],
                    lastFetched: new Date(),
                    hasNextPage: false
                })
                return
            }

            // 6. Fetch Reply Context (Parent Posts)
            const replyToIds = new Set<string>()
            finalDocuments.forEach(doc => {
                if (doc.replyToPostId) {
                    const id = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
                    if (id) replyToIds.add(id)
                }
            })

            let parentDocuments: IPostDocument[] = []
            if (replyToIds.size > 0) {
                // Assuming parents live in the same primary contract
                // You can refine this to iterate contracts if parents can be in different ones
                const targetContractId = network === 'testnet' ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET

                const idsToFetch = Array.from(replyToIds)

                // Filter out IDs we might already have in finalDocuments
                const existingIds = new Set(finalDocuments.map(d => d.id))
                const missingIds = idsToFetch.filter(id => !existingIds.has(id))

                if (missingIds.length > 0) {
                    parentDocuments = await api.fetchDocumentsById(network, targetContractId, missingIds)
                }
            }

            // Combine documents for Identity fetching
            // We need profiles for both the displayed posts AND the parent posts (context)
            const allDocsToProcess = [...finalDocuments, ...parentDocuments]

            // 7. Fetch Profiles & DPNS for ALL owners involved
            const profiles = new Map<string, any>()
            const dpnsNames = new Map<string, string>()

            const ownerIds = [...new Set(allDocsToProcess.map(doc => doc.ownerId || ''))].filter(Boolean)

            await Promise.all(
                ownerIds.map(async (ownerId) => {
                    if (!ownerId) return
                    const [profileData, dpnsName] = await Promise.all([
                        api.fetchUserProfile(ownerId, network),
                        api.fetchDPNSName(ownerId, network)
                    ])
                    if (profileData) profiles.set(ownerId, profileData)
                    if (dpnsName) dpnsNames.set(ownerId, dpnsName)
                })
            )

            // 8. Transform Parent Posts first (build the map)
            const parentPostsMap = new Map<string, IPost>()
            const transformedParents = await transformers.transformPostDocuments(
                parentDocuments,
                profiles,
                dpnsNames
            )
            transformedParents.forEach(p => {
                if (p.id) parentPostsMap.set(p.id, p)
            })

            // 9. Transform Main Documents (passing parent map)
            const posts = await transformers.transformPostDocuments(
                finalDocuments as IPostDocument[],
                profiles,
                dpnsNames,
                parentPostsMap // Pass the context map
            )

            // 10. Inject contractId and Update Store
            const postsWithSource = posts.map(post => {
                // Find source doc to get contract ID if missing
                const sourceDoc = uniqueDocuments.find(d => d.$ownerId === post.ownerId && Math.abs(d.createdAt - post.createdAt) < 2)
                return {
                    ...post,
                    contractId: sourceDoc?.dataContractId || ''
                }
            })

            postsStore.$patch({
                posts: postsWithSource,
                lastFetched: new Date(),
                hasNextPage: allDocuments.length > limit
            })

            console.log(`[usePosts] Fetch complete. Raw: ${allDocuments.length}, Unique: ${uniqueDocuments.length}, Final: ${finalDocuments.length}`)

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
                contractId: '',
                ownerId: '',
                orderBy: 'desc',
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
        remix?: string | undefined
    }): Promise<IPost | null> {
        if (!isAuthenticated.value) {
            error.value = 'You must be connected to create a post'
            throw new Error(error.value)
        }

        isLoading.value = true
        error.value = null

        const d = new Date()
        const now = d.getTime() / 1000

        // Default to Primary Contract
        const targetContractId = currentNetwork.value === 'testnet'
            ? EVONEXT_CONTRACT_ID_TESTNET
            : EVONEXT_CONTRACT_ID_MAINNET

        const optimisticPost: IPost = {
            id: '',
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
            remix: options?.remix as string,
            hashtag: options?.hashtag as string,
            mediaUrls: options?.mediaUrl as string[],
            mentionIds: options?.mentionIds as string[],
            replyToPostId: options?.replyToPostId?.[0] as string,
            contractId: targetContractId
        }

        // Optimistic update
        postsStore.upsertPost(optimisticPost)

        try {
            // 1. Extract the single ID if the input is an array
            const replyId = Array.isArray(options?.replyToPostId)
                ? options.replyToPostId[0]
                : options?.replyToPostId;

            // 2. Build the object using the Spread Pattern to satisfy exactOptionalPropertyTypes
            const createPostParams: ICreatePostParams = {
                content,
                isSensitive: options?.isSensitive ?? false,
                language: options?.language ?? 'en',

                // Only include optional keys if they actually have a value
                ...(options?.mediaUrl && { mediaUrl: options.mediaUrl }),
                ...(options?.mentionIds && { mentionIds: options.mentionIds }),
                ...(replyId && { replyToPostId: replyId }),
                ...(options?.hashtag && { hashtag: options.hashtag }),
                ...(options?.remix && { remix: options.remix })
            };

            const createdPost = await api.createPost(createPostParams)

            if (createdPost) {
                // Replace optimistic post with real post
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

        // DEBUG EXPOSE
        debugStats: computed(() => debugStats.value),

        isAuthenticated,
        currentUserId,
        currentNetwork,

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
