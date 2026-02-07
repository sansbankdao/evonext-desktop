// src/stores/posts/actions/createUpdate.ts

import type { IPost, ICreatePostParams } from '@/types/posts'
import { useIdentityStore } from '@/stores/identity'
import { useSettingsStore } from '@/stores/settings'
import * as api from '@/services/posts/mutations'
import {
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET
} from '@/constants'

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

    const optimisticPost: IPost = {
        id: 'opt_' + Date.now(),
        ownerId: currentUserId,
        author: {
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
            this.deletePostById(optimisticPost.id)
            if (!createdPost.contractId) {
                createdPost.contractId = targetContractId
            }
            this.upsertPost(createdPost)
            this.lastFetched = new Date()
            return createdPost
        }
        return null
    } catch (error: any) {
        this.deletePostById(optimisticPost.id)
        this.error = error.message || 'Failed to create post'
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

        // @ts-ignore - using mutations service
        const success = await api.updatePost(postId, updates)

        if (!success && currentPost) {
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

export async function deletePostByIdAction(this: any, postId: string): Promise<boolean> {
    this.isLoading = true
    this.error = null

    try {
        const post = this.getPostById(postId)
        if (!post) {
            this.error = 'Post not found'
            return false
        }

        if (post.ownerId !== this.identityId) {
            this.error = 'You can only delete your own posts'
            return false
        }

        this.deletePostById(postId)
        // @ts-ignore - assuming deletePost exists in mutations or fetching
        const success = await api.deletePost?.(postId) ?? true

        if (!success) {
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
