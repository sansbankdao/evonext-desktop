// src/stores/posts/actions/createUpdate.ts

import type { IPost } from '@/types/posts'
import { createPost, updatePost, deletePost } from '@/libs/posts'

export async function createNewPostAction(
    this: any,
    content: string,
    options?: {
        isSensitive?: boolean;
        language?: string;
        mediaUrl?: string[];
        mentionIds?: string[];
        replyToPostId?: string[];
    }
): Promise<IPost | null> {
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
}

export async function updateExistingPostAction(
    this: any,
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
        const success = await updatePost(postId, { documentId: postId, ...updates })
        if (success) {
            // Update in posts array
            const postIndex = this.posts.findIndex((p: IPost) => p.id === postId)
            if (postIndex !== -1) {
                this.posts[postIndex] = {
                    ...this.posts[postIndex],
                    ...updates,
                    updatedAt: new Date()
                }
            }
            // Update in userPosts array
            const userPostIndex = this.userPosts.findIndex((p: IPost) => p.id === postId)
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
}

export async function deletePostByIdAction(this: any, postId: string): Promise<boolean> {
    this.isLoading = true
    this.error = null
    try {
        const success = await deletePost(postId)
        if (success) {
            // Remove from posts array
            this.posts = this.posts.filter((p: IPost) => p.id !== postId)
            // Remove from userPosts array
            this.userPosts = this.userPosts.filter((p: IPost) => p.id !== postId)
            // Remove from liked posts if present
            this.likedPosts = this.likedPosts.filter((id: string) => id !== postId)
            // Remove from bookmarked posts if present
            this.bookmarkedPosts = this.bookmarkedPosts.filter((id: string) => id !== postId)
        }
        return success
    } catch (error: any) {
        this.error = error.message || 'Failed to delete post'
        console.error('Error deleting post:', error)
        return false
    } finally {
        this.isLoading = false
    }
}
