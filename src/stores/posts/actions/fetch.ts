// src/stores/posts/actions/fetch.ts

import type { PostsFetchOptions } from '@/types/posts'
import { usePosts } from '@/composables/usePosts'

export async function fetchPostsAction(
    this: any,
    options?: PostsFetchOptions
): Promise<void> {
    this.isLoading = true
    this.error = null

    try {
        const composable = usePosts()

        // Delegate to composable
        // Note: The composable fetchPosts currently resets the offset and replaces posts.
        await composable.fetchPosts(options)

        // The composable updates the store directly (postsStore.posts),
        // but this action is bound to a store instance 'this'.
        // If 'this' is the postsStore, the composable has already updated it.
        // We just need to update local state properties if they are distinct from the store's core data.
        // Assuming 'this' IS the postsStore instance:
        this.lastFetched = new Date()

        // If 'this' has specific state like 'nextPage' that differs from the store implementation,
        // we would map it here. Otherwise, we rely on the store update.
    } catch (error: any) {
        this.error = error.message || 'Failed to fetch posts'
        console.error('Error fetching posts:', error)
    } finally {
        this.isLoading = false
    }
}

export async function fetchUserPostsAction(
    this: any,
    userId: string
): Promise<void> {
    this.isLoading = true
    this.error = null

    try {
        const composable = usePosts()

        // Use the composable's fetchPosts with ownerId
        // Note: The composable updates the main 'posts' array.
        // The original action updated 'this.userPosts'.
        // We should sync the userPosts array here to match original behavior.
        await composable.fetchPosts({
            ownerId: userId,
            orderBy: 'newest',
            limit: 50
        })

        // Sync userPosts from the updated store data
        this.userPosts = this.posts.filter((p: any) => p.ownerId === userId)

    } catch (error: any) {
        this.error = error.message || 'Failed to fetch user posts'
        console.error('Error fetching user posts:', error)
    } finally {
        this.isLoading = false
    }
}

export async function fetchMorePostsAction(this: any): Promise<void> {
    if (!this.hasNextPage || this.isLoading) return

    this.isLoading = true
    this.error = null

    try {
        const composable = usePosts()

        // Delegate to composable
        await composable.fetchMorePosts()

        // The composable appends to postsStore.posts.
        // 'this' refers to the store, so it's already updated.
        this.lastFetched = new Date()

    } catch (error: any) {
        this.error = error.message || 'Failed to fetch more posts'
        console.error('Error fetching more posts:', error)
    } finally {
        this.isLoading = false
    }
}
