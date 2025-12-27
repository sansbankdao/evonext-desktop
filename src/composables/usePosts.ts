// src/composables/usePosts.ts
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
import { useDebounce } from './useDebounce'
import {
  EVONEXT_CONTRACT_ID_TESTNET,
  EVONEXT_CONTRACT_ID_MAINNET,
  DASHPAY_CONTRACT_ID_MAINNET,
  DASHPAY_CONTRACT_ID_TESTNET,
  DPNS_CONTRACT_ID_MAINNET,
  DPNS_CONTRACT_ID_TESTNET
} from '@/constants'
import { isTestnet } from '@/utils/env'
import type { IPost, PostsFetchOptions, IPostAuthor } from '@/types/posts'

interface ProfileDocument {
  ownerId: string
  avatarUrl?: string
  displayName?: string
  publicMessage?: string
  avatarHash?: string
  avatarFingerprint?: string
}

interface DPNSDocument {
  label?: string
  normalizedLabel?: string
  normalizedParentDomainName?: string
  records?: {
    dashUniqueIdentityId?: string
    dashAliasIdentityId?: string
  }
}

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

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 500)

    // Computed values
    const isAuthenticated = computed(() => identityStore.isAuthenticated)
    const currentUserId = computed(() => identityStore.identity?.id)
    const currentNetwork = computed(() => settingsStore.network || (isTestnet() ? 'testnet' : 'mainnet'))

    // Helper functions
    const getContractId = (type: 'evonext' | 'dashpay' | 'dpns'): string => {
        const isTest = currentNetwork.value === 'testnet'
        switch (type) {
            case 'evonext':
                return isTest ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET
            case 'dashpay':
                return isTest ? DASHPAY_CONTRACT_ID_TESTNET : DASHPAY_CONTRACT_ID_MAINNET
            case 'dpns':
                return isTest ? DPNS_CONTRACT_ID_TESTNET : DPNS_CONTRACT_ID_MAINNET
            default:
                return EVONEXT_CONTRACT_ID_MAINNET
        }
    }

    const filteredPosts = computed(() => {
        let filtered = postsStore.sortedPosts

        // Apply search filter
        if (debouncedSearch.value.value) {
            const query = debouncedSearch.value.value.toLowerCase()
            filtered = filtered.filter(post =>
                post.content.toLowerCase().includes(query) ||
                post.author.displayName?.toLowerCase().includes(query) ||
                post.author.username?.toLowerCase().includes(query) ||
                (post.hashtag && post.hashtag.toLowerCase().includes(query))
            )
        }

        // Apply language filter
        if (languageFilter.value) {
            filtered = filtered.filter(post => post.language === languageFilter.value)
        }

        // Apply sensitive content filter
        if (!showSensitive.value) {
            filtered = filtered.filter(post => !post.isSensitive)
        }

        return filtered
    })

    const userPosts = computed(() => {
        if (!currentUserId.value) return []
        return postsStore.sortedUserPosts.filter(post => post.ownerId === currentUserId.value)
    })

    // Fetch profile data for a user
    const fetchUserProfile = async (ownerId: string): Promise<ProfileDocument | null> => {
        try {
            const contractId = getContractId('dashpay')
            const network = currentNetwork.value

            const profiles = await invoke<ProfileDocument[]>('get_documents', {
                dataContractId: contractId,
                documentType: 'profile',
                whereClause: {
                    $ownerId: ownerId
                },
                orderBy: { $updatedAt: 'desc' },
                limit: 1,
                network
            })

            return profiles.length > 0 ? profiles[0] : null
        } catch (error) {
            console.warn(`Failed to fetch profile for ${ownerId}:`, error)
            return null
        }
    }

    // Fetch DPNS username for a user
    const fetchDPNSName = async (ownerId: string): Promise<string | null> => {
        try {
            const contractId = getContractId('dpns')
            const network = currentNetwork.value

            const dpnsRecords = await invoke<DPNSDocument[]>('get_documents', {
                dataContractId: contractId,
                documentType: 'domain',
                whereClause: {
                    'records.dashUniqueIdentityId': ownerId
                },
                orderBy: { $updatedAt: 'desc' },
                limit: 1,
                network
            })

            if (dpnsRecords.length > 0) {
                return dpnsRecords[0].label || dpnsRecords[0].normalizedLabel || null
            }
            return null
        } catch (error) {
            console.warn(`Failed to fetch DPNS name for ${ownerId}:`, error)
            return null
        }
    }

    // Generate avatar URL with fallback
    const getAvatarUrl = (ownerId: string, profileData?: ProfileDocument | null): string => {
        if (profileData?.avatarUrl) {
            return profileData.avatarUrl
        }

        // Use ownerId for deterministic color
        const color = ownerId.slice(0, 6).replace(/[^0-9A-Fa-f]/g, '0')
        const background = color.match(/[0-9A-Fa-f]{6}/) ? color : '0ea5e9'

        // Try to get display name for initials
        const displayName = profileData?.displayName ||
                           ownerId.slice(0, 8).replace(/[^A-Za-z0-9]/g, 'X')

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${background}&color=fff`
    }

    // Transform blockchain document to IPost format with user info
    const transformPostDocument = async (doc: any): Promise<IPost> => {
        const ownerId = doc.ownerId || doc.$ownerId || ''

        // Fetch user profile and DPNS name in parallel
        const [profileData, dpnsName] = await Promise.all([
            fetchUserProfile(ownerId),
            fetchDPNSName(ownerId)
        ])

        const displayName = profileData?.displayName ||
                          ownerId.slice(0, 8) + '...' + ownerId.slice(-4)

        const username = dpnsName ? `@${dpnsName}` : `@user_${ownerId.slice(0, 4)}`

        return {
            id: `${ownerId}-${doc.$createdAt || doc.createdAt}`,
            ownerId,
            author: {
                displayName,
                username,
                avatar: getAvatarUrl(ownerId, profileData),
                bio: profileData?.publicMessage,
                verified: dpnsName !== null // Verified if they have a DPNS name
            },
            content: doc.content || '',
            createdAt: new Date(parseInt(doc.createdAt || doc.$createdAt || Date.now().toString())),
            updatedAt: new Date(parseInt(doc.updatedAt || doc.$updatedAt || Date.now().toString())),
            likes: 0, // Will be fetched separately
            remixes: 0,
            replies: 0,
            isSensitive: doc.isSensitive || false,
            language: doc.language || 'en',
            remix: doc.remix,
            hashtag: doc.hashtag,
            mediaUrls: doc.mediaUrl || [],
            mentionIds: doc.mentionIds || [],
            replyToPostId: doc.replyToPostId
        }
    }

    // Actions with optimistic updates
    async function fetchPosts(options?: PostsFetchOptions): Promise<void> {
        isLoading.value = true
        error.value = null

        try {
            const contractId = getContractId('evonext')
            const network = currentNetwork.value

            // Build where clause
            let whereClause = null
            if (options?.ownerId) {
                whereClause = { $ownerId: options.ownerId }
            }

            // Build orderBy
            let orderBy = null
            if (options?.orderBy === 'newest') {
                orderBy = { $createdAt: 'desc' }
            } else if (options?.orderBy === 'oldest') {
                orderBy = { $createdAt: 'asc' }
            }

            // Fetch posts from blockchain
            const documents = await invoke<any[]>('get_documents', {
                dataContractId: contractId,
                documentType: 'post',
                whereClause,
                orderBy,
                limit: options?.limit || 20,
                network
            })

            // Transform all documents with user info
            const posts = await Promise.all(
                documents.map(doc => transformPostDocument(doc))
            )

            // Update store
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
        if (postsStore.isLoading || !postsStore.hasNextPage) return

        isLoading.value = true
        try {
            // Implementation for pagination
            // const nextPage = postsStore.nextPage
            // You'll need to implement pagination logic based on your API
            // This is a placeholder
            const newPosts: IPost[] = [] // Fetch new posts
            postsStore.posts = [...postsStore.posts, ...newPosts]
        } catch (err: any) {
            error.value = err.message || 'Failed to load more posts'
            console.error('usePosts: fetchMore error', err)
        } finally {
            isLoading.value = false
        }
    }

    async function createPost(content: string, options?: {
        isSensitive?: boolean;
        language?: string;
        mediaUrl?: string[];
        mentionIds?: string[];
        replyToPostId?: string[];
        hashtag?: string;
        remix?: string;
    }): Promise<IPost | null> {
        if (!isAuthenticated.value) {
            error.value = 'You must be connected to create a post'
            throw new Error(error.value)
        }

        isLoading.value = true
        error.value = null

        // Optimistic post
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

        // Add optimistically
        postsStore.upsertPost(optimisticPost)

        try {
            // TODO: Implement actual blockchain post creation
            // This would use Tauri command to create a post document
            console.log('Creating post with options:', options)

            // For now, return the optimistic post
            return optimisticPost
        } catch (err: any) {
            error.value = err.message || 'Failed to create post'
            console.error('usePosts: create error', err)
            // Remove optimistic post on error
            postsStore.deletePostById(optimisticPost.id!)
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function likePost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        // Optimistic update
        // const wasLiked = !!post.liked
        // const currentLikes = post.likes || 0
        postsStore.updatePostAuthor(postId, {
            ...post.author,
            // likes: wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
        })

        try {
            // TODO: Implement blockchain like
            await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
            return true
        } catch (err) {
            console.error('usePosts: like error', err)
            // Revert optimistic update
            postsStore.updatePostAuthor(postId, {
                ...post.author,
                // likes: currentLikes
            })
            return false
        }
    }

    async function bookmarkPost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        // Optimistic update
        // const wasBookmarked = !!post.bookmarked
        // postsStore.updatePostAuthor(postId, {
        //     ...post.author,
        //     bookmarked: !wasBookmarked
        // })

        try {
            // TODO: Implement blockchain bookmark
            await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
            return true
        } catch (err) {
            console.error('usePosts: bookmark error', err)
            // Revert optimistic update
            postsStore.updatePostAuthor(postId, {
                ...post.author,
                // bookmarked: wasBookmarked
            })
            return false
        }
    }

    async function deletePost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        // Check ownership
        if (post.ownerId !== currentUserId.value) {
            error.value = 'You can only delete your own posts'
            return false
        }

        // Optimistic removal
        postsStore.deletePostById(postId)

        try {
            // TODO: Implement blockchain post deletion
            await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
            return true
        } catch (err: any) {
            error.value = err.message || 'Failed to delete post'
            console.error('usePosts: delete error', err)
            // Re-add post if deletion failed
            if (post) postsStore.upsertPost(post)
            return false
        }
    }

    async function refreshPostStats(postId: string): Promise<void> {
        try {
            // TODO: Fetch updated stats from blockchain
            const newStats = {
                likes: Math.floor(Math.random() * 100),
                remixes: Math.floor(Math.random() * 10),
                replies: Math.floor(Math.random() * 20)
            }

            const post = postsStore.getPostById(postId)
            if (post) {
                postsStore.upsertPost({
                    ...post,
                    ...newStats
                })
            }
        } catch (err) {
            console.error('usePosts: refresh stats error', err)
        }
    }

    // Auto-refresh posts every 2 minutes
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

        // Computed
        isLoading: computed(() => isLoading.value || postsStore.isLoading),
        error: computed(() => error.value || postsStore.error),
        posts: filteredPosts,
        userPosts,
        totalPosts: computed(() => postsStore.posts.length),
        lastFetched: computed(() => postsStore.lastFetched),
        hasMorePosts: computed(() => postsStore.hasNextPage),
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
        clearFilters() {
            searchQuery.value = ''
            languageFilter.value = ''
            showSensitive.value = true
        },
        setTab(tab: 'posts' | 'remix') {
            activeTab.value = tab
        },

        // Lifecycle
        startAutoRefresh,
        stopAutoRefresh,

        // Store getters
        getPostById: (id: string) => postsStore.getPostById(id),
        isPostLiked: (id: string) => postsStore.isPostLiked(id),
        isPostBookmarked: (id: string) => postsStore.isPostBookmarked(id)
    }
}

// Type for the composable return
export type UsePostsReturn = ReturnType<typeof usePosts>
