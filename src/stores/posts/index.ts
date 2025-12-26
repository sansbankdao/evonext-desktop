// src/stores/posts/index.ts

/* Import modules. */
import { defineStore } from 'pinia'
import type { IPostsState, IPost, PostsFetchOptions } from '@/types/posts'
import {
    fetchPosts,
    fetchUserPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getPostStats,
    bookmarkPost,
    unbookmarkPost
} from '@/libs/posts'
import type { IPostAuthor } from '@/types/posts'

export const usePostsStore = defineStore('posts', {
    state: (): IPostsState => ({
        posts: [],
        userPosts: [],
        likedPosts: [],
        bookmarkedPosts: [],
        isLoading: false,
        error: null,
        lastFetched: null,
        nextPage: undefined,
        hasNextPage: false
    }),
    getters: {
        /**
         * Get all posts sorted by creation date (newest first)
         */
        sortedPosts: (state): IPost[] => {
            return [...state.posts].sort((a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
            )
        },
        /**
         * Get user posts sorted by creation date (newest first)
         */
        sortedUserPosts: (state): IPost[] => {
            return [...state.userPosts].sort((a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
            )
        },
        /**
         * Get a post by its ID
         */
        getPostById: (state) => {
            return (id: string): IPost | undefined =>
                state.posts.find(post => post.id === id)
        },
        /**
         * Get posts by a specific user
         */
        getPostsByUserId: (state) => {
            return (userId: string): IPost[] =>
                state.posts.filter(post => post.ownerId === userId)
        },
        /**
         * Check if a post is liked by current user
         */
        isPostLiked: (state) => {
            return (postId: string): boolean =>
                state.likedPosts.includes(postId)
        },
        /**
         * Check if a post is bookmarked by current user
         */
        isPostBookmarked: (state) => {
            return (postId: string): boolean =>
                state.bookmarkedPosts.includes(postId)
        },
        /**
         * Get posts with media attachments
         */
        postsWithMedia: (state): IPost[] => {
            return state.posts.filter(post =>
                post.mediaUrls && post.mediaUrls.length > 0
            )
        },
        /**
         * Get recent posts (last 24 hours)
         */
        recentPosts: (state): IPost[] => {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            return state.posts.filter(post => post.createdAt > oneDayAgo)
        },
        /**
         * Get post count statistics
         */
        stats: (state) => {
            return {
                totalPosts: state.posts.length,
                userPosts: state.userPosts.length,
                likedPosts: state.likedPosts.length,
                bookmarkedPosts: state.bookmarkedPosts.length,
                postsWithMedia: state.posts.filter(p => p.mediaUrls && p.mediaUrls.length > 0).length,
                postsByLanguage: state.posts.reduce((acc, post) => {
                    acc[post.language] = (acc[post.language] || 0) + 1
                    return acc
                }, {} as Record<string, number>)
            }
        }
    },
    actions: {
        /**
         * Fetch posts from blockchain API
         */
        async fetchPosts(options?: PostsFetchOptions): Promise<void> {
            this.isLoading = true
            this.error = null
            try {
                const result = await fetchPosts(options)
                this.posts = result.posts
                this.nextPage = result.nextPage
                this.hasNextPage = result.hasNextPage
                this.lastFetched = new Date()
            } catch (error: any) {
                this.error = error.message || 'Failed to fetch posts'
                console.error('Error fetching posts:', error)
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Fetch posts for a specific user
         */
        async fetchUserPosts(userId: string): Promise<void> {
            this.isLoading = true
            this.error = null
            try {
                const options: PostsFetchOptions = {
                    ownerId: userId,
                    orderBy: 'newest',
                    limit: 50
                }
                const result = await fetchPosts(options)
                this.userPosts = result.posts
            } catch (error: any) {
                this.error = error.message || 'Failed to fetch user posts'
                console.error('Error fetching user posts:', error)
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Fetch more posts (pagination)
         */
        async fetchMorePosts(): Promise<void> {
            if (!this.hasNextPage || this.isLoading) return
            this.isLoading = true
            this.error = null
            try {
                const options: PostsFetchOptions = {
                    limit: 20
                }
                const result = await fetchPosts(options)
                this.posts = [...this.posts, ...result.posts]
                this.nextPage = result.nextPage
                this.hasNextPage = result.hasNextPage
                this.lastFetched = new Date()
            } catch (error: any) {
                this.error = error.message || 'Failed to fetch more posts'
                console.error('Error fetching more posts:', error)
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Create a new post
         */
        async createNewPost(content: string, options?: {
            isSensitive?: boolean;
            language?: string;
            mediaUrl?: string[];
            mentionIds?: string[];
            replyToPostId?: string[];
        }): Promise<IPost | null> {
            this.isLoading = true
            this.error = null
            try {
                const post = await createPost({
                    content,
                    isSensitive: options?.isSensitive || false,
                    language: options?.language || 'en',
                    mediaUrl: options?.mediaUrl,
                    mentionIds: options?.mentionIds,
                    replyToPostId: options?.replyToPostId
                })
                if (post) {
                    // Add to beginning of both arrays
                    this.posts.unshift(post)
                    this.userPosts.unshift(post)
                    this.lastFetched = new Date()
                }
                return post
            } catch (error: any) {
                this.error = error.message || 'Failed to create post'
                console.error('Error creating post:', error)
                return null
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Update an existing post
         */
        async updateExistingPost(
            postId: string,
            updates: {
                content?: string;
                isSensitive?: boolean;
                language?: string
            }
        ): Promise<boolean> {
            this.isLoading = true
            this.error = null
            try {
                const success = await updatePost(postId, updates)
                if (success) {
                    // Update in posts array
                    const postIndex = this.posts.findIndex(p => p.id === postId)
                    if (postIndex !== -1) {
                        this.posts[postIndex] = {
                            ...this.posts[postIndex],
                            ...updates,
                            updatedAt: new Date()
                        }
                    }
                    // Update in userPosts array
                    const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
                    if (userPostIndex !== -1) {
                        this.userPosts[userPostIndex] = {
                            ...this.userPosts[userPostIndex],
                            ...updates,
                            updatedAt: new Date()
                        }
                    }
                }
                return success
            } catch (error: any) {
                this.error = error.message || 'Failed to update post'
                console.error('Error updating post:', error)
                return false
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Delete a post
         */
        async deletePostById(postId: string): Promise<boolean> {
            this.isLoading = true
            this.error = null
            try {
                const success = await deletePost(postId)
                if (success) {
                    // Remove from posts array
                    this.posts = this.posts.filter(p => p.id !== postId)
                    // Remove from userPosts array
                    this.userPosts = this.userPosts.filter(p => p.id !== postId)
                    // Remove from liked posts if present
                    this.likedPosts = this.likedPosts.filter(id => id !== postId)
                    // Remove from bookmarked posts if present
                    this.bookmarkedPosts = this.bookmarkedPosts.filter(id => id !== postId)
                }
                return success
            } catch (error: any) {
                this.error = error.message || 'Failed to delete post'
                console.error('Error deleting post:', error)
                return false
            } finally {
                this.isLoading = false
            }
        },
        /**
         * Like a post
         */
        async likePostById(postId: string): Promise<boolean> {
            try {
                const success = await likePost(postId)
                if (success) {
                    // Add to liked posts if not already there
                    if (!this.likedPosts.includes(postId)) {
                        this.likedPosts.push(postId)
                    }
                    // Update like count in posts
                    const postIndex = this.posts.findIndex(p => p.id === postId)
                    if (postIndex !== -1) {
                        this.posts[postIndex].likes += 1
                        this.posts[postIndex].liked = true
                    }
                    // Update like count in userPosts
                    const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
                    if (userPostIndex !== -1) {
                        this.userPosts[userPostIndex].likes += 1
                        this.userPosts[userPostIndex].liked = true
                    }
                }
                return success
            } catch (error: any) {
                console.error('Error liking post:', error)
                return false
            }
        },
        /**
         * Unlike a post
         */
        async unlikePostById(postId: string): Promise<boolean> {
            try {
                const success = await unlikePost(postId)
                if (success) {
                    // Remove from liked posts
                    this.likedPosts = this.likedPosts.filter(id => id !== postId)
                    // Update like count in posts
                    const postIndex = this.posts.findIndex(p => p.id === postId)
                    if (postIndex !== -1) {
                        this.posts[postIndex].likes = Math.max(0, this.posts[postIndex].likes - 1)
                        this.posts[postIndex].liked = false
                    }
                    // Update like count in userPosts
                    const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
                    if (userPostIndex !== -1) {
                        this.userPosts[userPostIndex].likes = Math.max(0, this.userPosts[userPostIndex].likes - 1)
                        this.userPosts[userPostIndex].liked = false
                    }
                }
                return success
            } catch (error: any) {
                console.error('Error unliking post:', error)
                return false
            }
        },
        /**
         * Bookmark a post
         */
        async bookmarkPostById(postId: string): Promise<boolean> {
            try {
                const success = await bookmarkPost(postId)
                if (success && !this.bookmarkedPosts.includes(postId)) {
                    this.bookmarkedPosts.push(postId)
                    // Update bookmark status in posts
                    const postIndex = this.posts.findIndex(p => p.id === postId)
                    if (postIndex !== -1) {
                        this.posts[postIndex].bookmarked = true
                    }
                }
                return success
            } catch (error: any) {
                console.error('Error bookmarking post:', error)
                return false
            }
        },
        /**
         * Unbookmark a post
         */
        async unbookmarkPostById(postId: string): Promise<boolean> {
            try {
                const success = await unbookmarkPost(postId)
                if (success) {
                    this.bookmarkedPosts = this.bookmarkedPosts.filter(id => id !== postId)
                    // Update bookmark status in posts
                    const postIndex = this.posts.findIndex(p => p.id === postId)
                    if (postIndex !== -1) {
                        this.posts[postIndex].bookmarked = false
                    }
                }
                return success
            } catch (error: any) {
                console.error('Error unbookmarking post:', error)
                return false
            }
        },
        /**
         * Refresh post stats (likes, remixes, replies)
         */
        async refreshPostStats(postId: string): Promise<void> {
            try {
                const stats = await getPostStats(postId)
                // Update in posts array
                const postIndex = this.posts.findIndex(p => p.id === postId)
                if (postIndex !== -1) {
                    this.posts[postIndex] = {
                        ...this.posts[postIndex],
                        likes: stats.likes || 0,
                        remixes: stats.remixes || 0,
                        replies: stats.replies || 0,
                        bookmarks: stats.bookmarks || 0
                    }
                }
                // Update in userPosts array
                const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
                if (userPostIndex !== -1) {
                    this.userPosts[userPostIndex] = {
                        ...this.userPosts[userPostIndex],
                        likes: stats.likes || 0,
                        remixes: stats.remixes || 0,
                        replies: stats.replies || 0,
                        bookmarks: stats.bookmarks || 0
                    }
                }
            } catch (error) {
                console.error('Error refreshing post stats:', error)
            }
        },
        /**
         * Clear all posts data
         */
        clear(): void {
            this.posts = []
            this.userPosts = []
            this.likedPosts = []
            this.bookmarkedPosts = []
            this.error = null
            this.lastFetched = null
            this.nextPage = undefined
            this.hasNextPage = false
        },
        /**
         * Update a post's author information
         */
        updatePostAuthor(postId: string, author: Partial<IPostAuthor>): void {
            const postIndex = this.posts.findIndex(p => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex].author = {
                    ...this.posts[postIndex].author,
                    ...author
                }
            }
            const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
            if (userPostIndex !== -1) {
                this.userPosts[userPostIndex].author = {
                    ...this.userPosts[userPostIndex].author,
                    ...author
                }
            }
        },
        /**
         * Add or update a single post
         */
        upsertPost(post: IPost): void {
            // Check if post already exists
            const existingIndex = this.posts.findIndex(p => p.id === post.id)
            if (existingIndex !== -1) {
                this.posts[existingIndex] = post
            } else {
                this.posts.unshift(post)
            }
            // Also update in userPosts if owned by user
            if (this.userPosts.some(p => p.ownerId === post.ownerId)) {
                const userExistingIndex = this.userPosts.findIndex(p => p.id === post.id)
                if (userExistingIndex !== -1) {
                    this.userPosts[userExistingIndex] = post
                } else {
                    this.userPosts.unshift(post)
                }
            }
        },
        /**
         * Initialize liked posts from local storage or API
         */
        async initializeLikedPosts(userId?: string): Promise<void> {
            if (!userId) return
            try {
                // This would fetch the user's liked posts from blockchain
                // For now, we'll initialize from local storage
                const storedLikes = localStorage.getItem(`likedPosts_${userId}`)
                if (storedLikes) {
                    this.likedPosts = JSON.parse(storedLikes)
                }
            } catch (error) {
                console.error('Error initializing liked posts:', error)
            }
        }
    }
})
