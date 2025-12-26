// src/stores/posts/actions/utilities.ts

import type { IPost, IPostAuthor } from '@/types/posts'
import { getPostStats } from '@/libs/posts'

export async function refreshPostStatsAction(this: any, postId: string): Promise<void> {
    try {
        const stats = await getPostStats(postId)
        // Update in posts array
        const postIndex = this.posts.findIndex((p: IPost) => p.id === postId)
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
        const userPostIndex = this.userPosts.findIndex((p: IPost) => p.id === postId)
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
}

export function clearAction(this: any): void {
    this.posts = []
    this.userPosts = []
    this.likedPosts = []
    this.bookmarkedPosts = []
    this.error = null
    this.lastFetched = null
    this.nextPage = undefined
    this.hasNextPage = false
}

export function updatePostAuthorAction(this: any, postId: string, author: Partial<IPostAuthor>): void {
    const postIndex = this.posts.findIndex((p: IPost) => p.id === postId)
    if (postIndex !== -1) {
        this.posts[postIndex].author = {
            ...this.posts[postIndex].author,
            ...author
        }
    }
    const userPostIndex = this.userPosts.findIndex((p: IPost) => p.id === postId)
    if (userPostIndex !== -1) {
        this.userPosts[userPostIndex].author = {
            ...this.userPosts[userPostIndex].author,
            ...author
        }
    }
}

export function upsertPostAction(this: any, post: IPost): void {
    // Check if post already exists
    const existingIndex = this.posts.findIndex((p: IPost) => p.id === post.id)
    if (existingIndex !== -1) {
        this.posts[existingIndex] = post
    } else {
        this.posts.unshift(post)
    }
    // Also update in userPosts if owned by user
    if (this.userPosts.some((p: IPost) => p.ownerId === post.ownerId)) {
        const userExistingIndex = this.userPosts.findIndex((p: IPost) => p.id === post.id)
        if (userExistingIndex !== -1) {
            this.userPosts[userExistingIndex] = post
        } else {
            this.userPosts.unshift(post)
        }
    }
}

export async function initializeLikedPostsAction(this: any, userId?: string): Promise<void> {
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
