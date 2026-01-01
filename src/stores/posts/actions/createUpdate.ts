// src/stores/posts/actions/createUpdate.ts

import type { IPost } from '@/types/posts'
import { usePosts } from '@/composables/usePosts'

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
        const composable = usePosts()
        const post = await composable.createPost(content, options)

        if (post) {
            // The composable handles upserting into the store via postsStore.upsertPost
            // However, the original action also updated userPosts explicitly.
            // upsertPost in the store likely handles the main list.
            // If userPosts is a separate list maintained in state, we ensure sync:
            this.userPosts = this.posts.filter((p: IPost) => p.ownerId === composable.currentUserId.value)
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
        documentId: string;
        content?: string;
        isSensitive?: boolean;
        language?: string
    }
): Promise<boolean> {
    this.isLoading = true
    this.error = null

    try {
        const composable = usePosts()
        const success = await composable.updatePost(postId, updates)

        // The composable handles the optimistic update in the main store.
        // We just need to ensure the userPosts array is kept in sync if it's separate.
        if (success) {
            this.userPosts = this.posts.filter((p: IPost) => p.ownerId === composable.currentUserId.value)
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
        const composable = usePosts()
        const success = await composable.deletePost(postId)

        // The composable handles deletion from the main store.
        // We sync the userPosts array.
        if (success) {
            this.userPosts = this.posts.filter((p: IPost) => p.ownerId === composable.currentUserId.value)
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
