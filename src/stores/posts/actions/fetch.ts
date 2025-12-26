// src/stores/posts/actions/fetch.ts

import type { PostsFetchOptions } from '@/types/posts'
import { fetchPosts } from '@/libs/posts'

export async function fetchPostsAction(this: any, options?: PostsFetchOptions): Promise<void> {
    this.isLoading = true
    this.error = null
    try {
        const result = await fetchPosts(options)
        this.posts = result.posts
        this.nextPage = result.nextPage
        this.hasNextPage = result.hasNextPage
        this.lastFetched = new Date()
    } catch (error: any) {
        this.error = error.message || 'Failed to fetch posts'
        console.error('Error fetching posts:', error)
    } finally {
        this.isLoading = false
    }
}

export async function fetchUserPostsAction(this: any, userId: string): Promise<void> {
    this.isLoading = true
    this.error = null
    try {
        const options: PostsFetchOptions = {
            ownerId: userId,
            orderBy: 'newest',
            limit: 50
        }
        const result = await fetchPosts(options)
        this.userPosts = result.posts
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
        const options: PostsFetchOptions = {
            limit: 20
        }
        const result = await fetchPosts(options)
        this.posts = [...this.posts, ...result.posts]
        this.nextPage = result.nextPage
        this.hasNextPage = result.hasNextPage
        this.lastFetched = new Date()
    } catch (error: any) {
        this.error = error.message || 'Failed to fetch more posts'
        console.error('Error fetching more posts:', error)
    } finally {
        this.isLoading = false
    }
}
