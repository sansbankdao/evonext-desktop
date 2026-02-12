// src/stores/posts/actions/utilities.ts

import type { IPost, IUser } from '@/types'
import { usePosts } from '@/composables/usePosts'

export async function refreshPostStatsAction(this: any, postId: string): Promise<void> {
    try {
        const composable = usePosts()
        await composable.refreshPostStats(postId)
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

export function updatePostAuthorAction(this: any, postId: string, author: Partial<IUser>): void {
    const composable = usePosts()
    const currentPost = composable.getPostById(postId)

    if (currentPost) {
        const updatedPost = {
            ...currentPost,
            author: {
                ...currentPost.author,
                ...author
            }
        }
        this.upsertPost(updatedPost)
    }
}

export function upsertPostAction(this: any, post: IPost): void {
    // RESOLVED: Property 'id' is guaranteed on IPost
    const existingIndex = this.posts.findIndex((p: IPost) => p.id === post.id)

    if (existingIndex !== -1) {
        this.posts[existingIndex] = post
    } else {
        this.posts.unshift(post)
    }

    if (this.userPosts.some((p: IPost) => p.ownerId === post.ownerId) || post.ownerId === this.identityId) {
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
        const storedLikes = localStorage.getItem(`likedPosts_${userId}`)
        if (storedLikes) {
            this.likedPosts = JSON.parse(storedLikes)
        }
    } catch (error) {
        console.error('Error initializing liked posts:', error)
    }
}
