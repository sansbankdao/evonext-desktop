// src/composables/usePosts.ts
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'
import { useDebounce } from './useDebounce'
import type { IPost, PostsFetchOptions, ICreatePostParams } from '@/types/posts'

export function usePosts() {
    const postsStore = usePostsStore()
    const identityStore = useIdentityStore()

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

    const filteredPosts = computed(() => {
        let filtered = postsStore.sortedPosts

        // Apply search filter
        if (debouncedSearch.value.value) {
            const query = debouncedSearch.value.value.toLowerCase()
            filtered = filtered.filter(post =>
                post.content.toLowerCase().includes(query) ||
                post.author.displayName.toLowerCase().includes(query) ||
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

    // Actions with optimistic updates
    async function fetchPosts(options?: PostsFetchOptions): Promise<void> {
        isLoading.value = true
        error.value = null

        try {
            await postsStore.fetchPosts(options)
        } catch (err: any) {
            error.value = err.message || 'Failed to fetch posts'
            console.error('usePosts: fetch error', err)
        } finally {
            isLoading.value = false
        }
    }

    async function fetchMorePosts(): Promise<void> {
        // Debounce rapid fetch requests
        if (isLoading.value || !postsStore.hasNextPage) return

        isLoading.value = true
        try {
            await postsStore.fetchMorePosts()
        } catch (err: any) {
            error.value = err.message || 'Failed to load more posts'
            console.error('usePosts: fetchMore error', err)
        } finally {
            isLoading.value = false
        }
    }

    async function createPost(content: string, options?: Partial<ICreatePostParams>) {
        if (!isAuthenticated.value) {
            error.value = 'You must be connected to create a post'
            throw new Error(error.value)
        }

        isLoading.value = true
        error.value = null

        // Optimistic update
        const optimisticPost: IPost = {
            id: 'FIXME-this-is-a-fake-ID',
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
            language: options?.language || 'en'
        }

        // Add optimistically
        postsStore.upsertPost(optimisticPost)

        try {
            const created = await postsStore.createNewPost(content, options)
            if (created) {
                // Replace optimistic post with real one
                postsStore.upsertPost(created)
                return created
            }
            return null
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
        const wasLiked = post.liked || false
        const currentLikes = post.likes || 0

        // postsStore.updatePostAuthor(postId, {
        //     ...post.author,
        //     likes: currentLikes + 1
        // })

        try {
            if (wasLiked) {
                await postsStore.unlikePostById(postId)
            } else {
                await postsStore.likePostById(postId)
            }
            return true
        } catch (err: any) {
            console.error('usePosts: like error', err)
            // Revert optimistic update
            // postsStore.updatePostAuthor(postId, {
            //     ...post.author,
            //     likes: currentLikes
            // })
            return false
        }
    }

    async function bookmarkPost(postId: string): Promise<boolean> {
        const post = postsStore.getPostById(postId)
        if (!post) return false

        // Optimistic update
        const wasBookmarked = !!post.bookmarked

        try {
            if (wasBookmarked) {
                await postsStore.unbookmarkPostById(postId)
            } else {
                await postsStore.bookmarkPostById(postId)
            }
            return true
        } catch (err: any) {
            console.error('usePosts: bookmark error', err)
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
            await postsStore.deletePostById(postId)
            return true
        } catch (err: any) {
            error.value = err.message || 'Failed to delete post'
            console.error('usePosts: delete error', err)
            // Re-add post if deletion failed
            if (post) {
                postsStore.upsertPost(post)
            }
            return false
        }
    }

    async function refreshPost(postId: string): Promise<void> {
        try {
            await postsStore.refreshPostStats(postId)
        } catch (err: any) {
            console.error('usePosts: refresh error', err)
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

        // Actions
        fetchPosts,
        fetchMorePosts,
        createPost,
        likePost,
        bookmarkPost,
        deletePost,
        refreshPost,
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

// Usage in components would be:
// const {
//   posts,
//   isLoading,
//   createPost,
//   likePost,
//   fetchPosts
// } = usePosts()
