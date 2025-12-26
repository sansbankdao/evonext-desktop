// src/stores/posts/getters.ts

import type { IPost, IPostsState } from '@/types/posts'

export default {
    /**
     * Get all posts sorted by creation date (newest first)
     */
    sortedPosts(state: IPostsState): IPost[] {
        return [...state.posts].sort((a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime()
        )
    },

    /**
     * Get user posts sorted by creation date (newest first)
     */
    sortedUserPosts(state: IPostsState): IPost[] {
        return [...state.userPosts].sort((a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime()
        )
    },

    /**
     * Get a post by its ID
     */
    getPostById(state: IPostsState) {
        return (id: string): IPost | undefined =>
            state.posts.find(post => post.id === id)
    },

    /**
     * Get posts by a specific user
     */
    getPostsByUserId(state: IPostsState) {
        return (userId: string): IPost[] =>
            state.posts.filter(post => post.ownerId === userId)
    },

    /**
     * Check if a post is liked by current user
     */
    isPostLiked(state: IPostsState) {
        return (postId: string): boolean =>
            state.likedPosts.includes(postId)
    },

    /**
     * Check if a post is bookmarked by current user
     */
    isPostBookmarked(state: IPostsState) {
        return (postId: string): boolean =>
            state.bookmarkedPosts.includes(postId)
    },

    /**
     * Get posts with media attachments
     */
    postsWithMedia(state: IPostsState): IPost[] {
        return state.posts.filter(post =>
            post.mediaUrls && post.mediaUrls.length > 0
        )
    },

    /**
     * Get recent posts (last 24 hours)
     */
    recentPosts(state: IPostsState): IPost[] {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return state.posts.filter(post => post.createdAt > oneDayAgo)
    },

    /**
     * Get post count statistics
     */
    stats(state: IPostsState) {
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
}
