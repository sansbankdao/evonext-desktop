// src/composables/usePosts/stats.ts

import type { IPost } from '@/types/posts'

/**
 * Get post statistics (likes, remixes, replies)
 * From libs/posts/stats.ts (with localStorage integration)
 */
export async function getPostStats(postId: string): Promise<{
    likes: number
    remixes: number
    replies: number
    bookmarks?: number
}> {
    try {
        // In production, fetch actual stats from blockchain
        // For now, return mock stats
        const isBookmarked = localStorage.getItem(`bookmark_${postId}`) === 'true'

        return {
            likes: Math.floor(Math.random() * 100),
            remixes: Math.floor(Math.random() * 10),
            replies: Math.floor(Math.random() * 20),
            bookmarks: isBookmarked ? 1 : 0
        }
    } catch (error: any) {
        console.error('Error fetching post stats:', error)
        return { likes: 0, remixes: 0, replies: 0, bookmarks: 0 }
    }
}

/**
 * Like a post (from libs/posts/api.ts)
 * TODO: Implement actual blockchain like
 */
export async function likePost(postId: string): Promise<boolean> {
    try {
        console.log('Liking post:', postId)
        // TODO: Implement actual like creation using Dash SDK
        return true // Mock success
    } catch (error: any) {
        console.error('Error liking post:', error)
        throw error
    }
}

/**
 * Unlike a post (from libs/posts/api.ts)
 * TODO: Implement actual blockchain unlike
 */
export async function unlikePost(postId: string): Promise<boolean> {
    try {
        console.log('Unliking post:', postId)
        // TODO: Implement actual like deletion using Dash SDK
        return true // Mock success
    } catch (error: any) {
        console.error('Error unliking post:', error)
        throw error
    }
}

/**
 * Bookmark a post (from libs/posts/api.ts - with localStorage)
 */
export async function bookmarkPost(postId: string): Promise<boolean> {
    try {
        console.log('Bookmarking post:', postId)
        localStorage.setItem(`bookmark_${postId}`, 'true')
        return true
    } catch (error: any) {
        console.error('Error bookmarking post:', error)
        throw error
    }
}

/**
 * Unbookmark a post (from libs/posts/api.ts - with localStorage)
 */
export async function unbookmarkPost(postId: string): Promise<boolean> {
    try {
        console.log('Unbookmarking post:', postId)
        localStorage.removeItem(`bookmark_${postId}`)
        return true
    } catch (error: any) {
        console.error('Error unbookmarking post:', error)
        throw error
    }
}

/**
 * Check if a post is bookmarked
 */
export function isPostBookmarked(postId: string): boolean {
    return localStorage.getItem(`bookmark_${postId}`) === 'true'
}

/**
 * Get all bookmarked post IDs
 */
export function getBookmarkedPostIds(): string[] {
    const bookmarks: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('bookmark_')) {
            const postId = key.replace('bookmark_', '')
            if (localStorage.getItem(key) === 'true') {
                bookmarks.push(postId)
            }
        }
    }
    return bookmarks
}

/**
 * Refresh post stats with optimistic updates (from your composable)
 */
export type PostStatsUpdate = {
    postId: string
    likes?: number
    remixes?: number
    replies?: number
    bookmarks?: number
}

/**
 * Apply optimistic stats update to post
 */
export function applyStatsUpdate(post: IPost, update: PostStatsUpdate): IPost {
    return {
        ...post,
        likes: update.likes !== undefined ? update.likes : post.likes,
        remixes: update.remixes !== undefined ? update.remixes : post.remixes,
        replies: update.replies !== undefined ? update.replies : post.replies
    }
}
