// src/stores/posts/actions/interactions.ts

import * as stats from '@/services/posts/stats'

export async function likePostByIdAction(this: any, postId: string): Promise<boolean> {
    const post = this.getPostById(postId)
    if (!post) return false

    // Optimistic
    const updatedPost = stats.applyStatsUpdate(post, {
        postId,
        likes: (post.likes || 0) + 1
    })
    this.upsertPost(updatedPost)
    this.likedPosts.push(postId)

    try {
        await stats.likePost(postId)
        return true
    } catch (err) {
        // Revert
        this.upsertPost(post)
        this.likedPosts = this.likedPosts.filter((id: string) => id !== postId)
        return false
    }
}

export async function unlikePostByIdAction(this: any, postId: string): Promise<boolean> {
    const post = this.getPostById(postId)
    if (!post) return false

    // Optimistic
    const updatedPost = stats.applyStatsUpdate(post, {
        postId,
        likes: Math.max(0, (post.likes || 0) - 1)
    })
    this.upsertPost(updatedPost)
    this.likedPosts = this.likedPosts.filter((id: string) => id !== postId)

    try {
        await stats.unlikePost(postId)
        return true
    } catch (err) {
        // Revert
        this.upsertPost(post)
        this.likedPosts.push(postId)
        return false
    }
}

export async function bookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    this.bookmarkedPosts.push(postId)
    try {
        await stats.bookmarkPost(postId)
        return true
    } catch {
        this.bookmarkedPosts = this.bookmarkedPosts.filter((id: string) => id !== postId)
        return false
    }
}

export async function unbookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    this.bookmarkedPosts = this.bookmarkedPosts.filter((id: string) => id !== postId)
    try {
        await stats.unbookmarkPost(postId)
        return true
    } catch {
        this.bookmarkedPosts.push(postId)
        return false
    }
}
