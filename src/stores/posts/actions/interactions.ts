// src/stores/posts/actions/interactions.ts

import { usePosts } from '@/composables/usePosts'

export async function likePostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const composable = usePosts()

        // Delegate to composable
        // The composable handles:
        // 1. Optimistically updating the post's like count and liked state (via upsertPost)
        // 2. Updating the Store's 'likedPosts' array state
        const success = await composable.likePost(postId)

        // Note: Since the composable updates the store directly (which 'this' refers to),
        // we don't need to manually splice arrays or update counts here.

        return success
    } catch (error: any) {
        console.error('Error liking post:', error)
        return false
    }
}

export async function unlikePostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const composable = usePosts()

        // Delegate to composable
        // The composable handles re-optimistic updates if the API fails.
        const success = await composable.likePost(postId)

        return success
    } catch (error: any) {
        console.error('Error unliking post:', error)
        return false
    }
}

export async function bookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const composable = usePosts()

        // Delegate to composable
        // The composable handles:
        // 1. Updating the Store's 'bookmarkedPosts' array state
        // 2. Updating the post's 'bookmarked' status
        const success = await composable.bookmarkPost(postId)

        return success
    } catch (error: any) {
        console.error('Error bookmarking post:', error)
        return false
    }
}

export async function unbookmarkPostByIdAction(this: any, postId: string): Promise<boolean> {
    try {
        const composable = usePosts()

        // Delegate to composable
        const success = await composable.bookmarkPost(postId)

        return success
    } catch (error: any) {
        console.error('Error unbookmarking post:', error)
        return false
    }
}
