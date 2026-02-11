// src/stores/posts/actions/createUpdate.ts

import type { IPost, ICreatePostParams } from '@/types/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
import * as api from '@/services/posts/mutations'
import {
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET
} from '@/constants'

/**
 * Creates a new post with an optimistic UI update.
 */
export async function createNewPostAction(
    this: any,
    content: string,
    options?: {
        isSensitive?: boolean;
        language?: string;
        mediaUrl?: string[];
        mentionIds?: string[];
        replyToPostId?: string[];
        hashtag?: string;
        remix?: string;
    }
): Promise<IPost | null> {
    const identityStore = useIdentityStore()
    const settingsStore = useSettingsStore()

    if (!identityStore.isAuthenticated) {
        this.error = 'You must be connected to create a post'
        return null
    }

    this.isLoading = true
    this.error = null

    const currentUserId = identityStore.identityId as string
    const d = new Date()
    const now = d.getTime() / 1000
    const network = settingsStore.state.network

    const targetContractId = (network === 'mainnet')
        ? EVONEXT_CONTRACT_ID_MAINNET
        : EVONEXT_CONTRACT_ID_TESTNET

    // Generate temporary ID to satisfy IPost interface and Vue :key requirements
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const optimisticPost: IPost = {
        id: tempId, // RESOLVED: Required property assigned
        ownerId: currentUserId,
        author: {
            identityId: currentUserId,
            username: identityStore.identity?.username || 'User',
            displayName: identityStore.identity?.displayName || 'You',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(identityStore.identity?.username || 'You')}&background=8b5cf6&color=fff`,
            verified: !!identityStore.identity?.username,
            bio: ''
        },
        content,
        createdAt: now,
        updatedAt: now,
        likes: 0,
        remixes: 0,
        replies: 0,
        views: 0,
        isSensitive: options?.isSensitive || false,
        language: options?.language || 'en',
        remix: options?.remix,
        hashtag: options?.hashtag,
        mediaUrls: options?.mediaUrl,
        mentionIds: options?.mentionIds,
        replyToPostId: options?.replyToPostId?.[0],
        contractId: targetContractId
    }

    // Insert into local state immediately for snappy UI
    this.upsertPost(optimisticPost)

    try {
        const replyId = Array.isArray(options?.replyToPostId)
            ? options.replyToPostId[0]
            : options?.replyToPostId

        const createPostParams: ICreatePostParams = {
            content,
            isSensitive: options?.isSensitive ?? false,
            language: options?.language ?? 'en',
            ...(options?.mediaUrl && { mediaUrl: options.mediaUrl }),
            ...(options?.mentionIds && { mentionIds: options.mentionIds }),
            ...(replyId && { replyToPostId: replyId }),
            ...(options?.hashtag && { hashtag: options.hashtag }),
            ...(options?.remix && { remix: options.remix })
        }

        const createdPost = await api.createPost(createPostParams)

        if (createdPost) {
            // Remove the temporary optimistic post
            this.deletePostById(optimisticPost.id)

            // Ensure contractId is present for filtering logic
            if (!createdPost.contractId) {
                createdPost.contractId = targetContractId
            }

            // Insert the real post from the platform
            this.upsertPost(createdPost)
            this.lastFetched = new Date()
            return createdPost
        }
        return null
    } catch (error: any) {
        // Rollback optimistic update on failure
        this.deletePostById(optimisticPost.id)
        this.error = error.message || 'Failed to create post'
        return null
    } finally {
        this.isLoading = false
    }
}

/**
 * Updates an existing post with a rollback mechanism.
 */
export async function updateExistingPostAction(
    this: any,
    postId: string,
    updates: {
        documentId: string;
        content?: string;
        isSensitive?: boolean;
        language?: string;
    }
): Promise<boolean> {
    const identityStore = useIdentityStore()

    if (!identityStore.isAuthenticated) {
        this.error = 'You must be connected to update a post'
        return false
    }

    this.isLoading = true
    this.error = null

    try {
        const currentPost = this.getPostById(postId)
        if (currentPost) {
            const updatedPost = {
                ...currentPost,
                ...updates,
                updatedAt: Math.floor(Date.now() / 1000)
            }
            this.upsertPost(updatedPost)
        }

        const success = await (api as any).updatePost(postId, updates)

        if (!success && currentPost) {
            // Revert state if the API call failed
            this.upsertPost(currentPost)
        } else {
            this.lastFetched = new Date()
        }
        return success
    } catch (error: any) {
        const currentPost = this.getPostById(postId)
        if (currentPost) this.upsertPost(currentPost)
        this.error = error.message || 'Failed to update post'
        return false
    } finally {
        this.isLoading = false
    }
}

/**
 * Deletes a post with optimistic removal.
 */
export async function deletePostByIdAction(this: any, postId: string): Promise<boolean> {
    this.isLoading = true
    this.error = null

    try {
        const post = this.getPostById(postId)
        if (!post) {
            this.error = 'Post not found'
            return false
        }

        // Ownership check
        if (post.ownerId !== this.identityId) {
            this.error = 'You can only delete your own posts'
            return false
        }

        // Optimistic delete
        this.deletePostById(postId)

        const success = await (api as any).deletePost?.(postId) ?? true

        if (!success) {
            // Restore if API failed
            this.upsertPost(post)
        }
        return success
    } catch (error: any) {
        const post = this.getPostById(postId)
        if (post) this.upsertPost(post)
        this.error = error.message || 'Failed to delete post'
        return false
    } finally {
        this.isLoading = false
    }
}
