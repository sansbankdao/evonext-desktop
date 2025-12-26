// src/stores/posts/actions/interactions.ts

import {
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
    getPostStats
} from '@/libs/posts'

export async function likePostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const success = await likePost(postId)
        if (success) {
            // Add to liked posts if not already there
            if (!this.likedPosts.includes(postId)) {
                this.likedPosts.push(postId)
            }
            // Update like count in posts
            const postIndex = this.posts.findIndex((p: any) => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex].likes += 1
                this.posts[postIndex].liked = true
            }
            // Update like count in userPosts
            const userPostIndex = this.userPosts.findIndex((p: any) => p.id === postId)
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
}

export async function unlikePostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const success = await unlikePost(postId)
        if (success) {
            // Remove from liked posts
            this.likedPosts = this.likedPosts.filter((id: string) => id !== postId)
            // Update like count in posts
            const postIndex = this.posts.findIndex((p: any) => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex].likes = Math.max(0, this.posts[postIndex].likes - 1)
                this.posts[postIndex].liked = false
            }
            // Update like count in userPosts
            const userPostIndex = this.userPosts.findIndex((p: any) => p.id === postId)
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
}

export async function bookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const success = await bookmarkPost(postId)
        if (success && !this.bookmarkedPosts.includes(postId)) {
            this.bookmarkedPosts.push(postId)
            // Update bookmark status in posts
            const postIndex = this.posts.findIndex((p: any) => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex].bookmarked = true
            }
        }
        return success
    } catch (error: any) {
        console.error('Error bookmarking post:', error)
        return false
    }
}

export async function unbookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const success = await unbookmarkPost(postId)
        if (success) {
            this.bookmarkedPosts = this.bookmarkedPosts.filter((id: string) => id !== postId)
            // Update bookmark status in posts
            const postIndex = this.posts.findIndex((p: any) => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex].bookmarked = false
            }
        }
        return success
    } catch (error: any) {
        console.error('Error unbookmarking post:', error)
        return false
    }
}
