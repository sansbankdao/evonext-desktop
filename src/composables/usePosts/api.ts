// src/composables/usePosts/api.ts

import { invoke } from '@tauri-apps/api/core'
import { useNetwork } from '@/composables/useNetwork'
import type { IPost, ICreatePostParams, IUpdatePostParams, PostsFetchResult, IPostDocument } from '@/types/posts'
import { getContractId } from './utils'
import { getUserInfo } from './transformers'

const DAPI_ENDPOINT = 'https://dashqt.org/v1/dapi'

// API Types
interface DAPIRequest {
    method: string;
    params: any[];
    network?: string;
}

interface DAPIResponse<T = any> {
    success: boolean;
    method: string;
    params: any[];
    network: string;
    result: T[];
}

interface ProfileDocument {
    ownerId: string
    avatarUrl?: string
    displayName?: string
    publicMessage?: string
    avatarHash?: string
    avatarFingerprint?: string
}

interface DPNSDocument {
    label?: string
    normalizedLabel?: string
    normalizedParentDomainName?: string
    records?: {
        dashUniqueIdentityId?: string
        dashAliasIdentityId?: string
    }
}

/**
 * Make a request to the DAPI endpoint (from libs/posts/api.ts)
 */
async function makeDAPIRequest<T>(method: string, params: any[], targetNetwork: string): Promise<T[]> {
    const requestBody: DAPIRequest = {
        method,
        params,
        network: targetNetwork
    }
    const response = await fetch(DAPI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    })
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: DAPIResponse<T> = await response.json()
    if (!data.success) {
        throw new Error('Failed to fetch data from blockchain')
    }
    return data.result
}

/**
 * Fetch profile data for a user via Tauri
 */
export async function fetchUserProfile(ownerId: string, networkOverride?: string): Promise<ProfileDocument | null> {
    try {
        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value
        const contractId = getContractId('dashpay', targetNetwork)
        const profiles = await invoke<ProfileDocument[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'profile',
            whereClause: {
                $ownerId: ownerId
            },
            orderBy: { $updatedAt: 'desc' },
            limit: 1,
            network: targetNetwork
        })
        return profiles.length > 0 ? profiles[0]! : null
    } catch (error) {
        console.warn(`Failed to fetch profile for ${ownerId}:`, error)
        return null
    }
}

/**
 * Fetch DPNS username for a user via Tauri
 */
export async function fetchDPNSName(ownerId: string, networkOverride?: string): Promise<string | null> {
    try {
        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value
        const contractId = getContractId('dpns', targetNetwork)
        const dpnsRecords = await invoke<DPNSDocument[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'domain',
            whereClause: {
                'records.dashUniqueIdentityId': ownerId
            },
            orderBy: { $updatedAt: 'desc' },
            limit: 1,
            network: targetNetwork
        })
        if (dpnsRecords.length > 0) {
            return dpnsRecords[0]?.label || dpnsRecords[0]?.normalizedLabel || null
        }
        return null
    } catch (error) {
        console.warn(`Failed to fetch DPNS name for ${ownerId}:`, error)
        return null
    }
}

/**
 * Fetch posts from blockchain using DAPI
 */
export async function fetchPostsFromDAPI(options?: {
    ownerId?: string
    language?: string
    fromDate?: number
    toDate?: number
    orderBy?: 'newest' | 'oldest'
    limit?: number
}): Promise<PostsFetchResult> {
    try {
        const { network } = useNetwork()
        const targetNetwork = network.value
        // Helper to get contract ID for current network
        const getContractIdForNetwork = (type: string) => getContractId(type as any, targetNetwork)
        console.log('Fetching posts for contract:', getContractIdForNetwork('evonext'))
        const posts = await makeDAPIRequest<IPostDocument>('get_documents', [getContractIdForNetwork('evonext'), 'post'], targetNetwork)
        const transformedPosts = await Promise.all(
            posts.map(async (doc) => {
                return {
                    ownerId: doc.ownerId,
                    author: await getUserInfo(doc.ownerId),
                    content: doc.content,
                    createdAt: Number(doc.createdAt),
                    updatedAt: Number(doc.updatedAt),
                    views: 0,
                    likes: 0,
                    remixes: 0,
                    replies: 0,
                    isSensitive: doc.isSensitive || false,
                    language: doc.language || 'en',
                    remix: doc.remix,
                    hashtag: doc.hashtag,
                    mediaUrls: doc.mediaUrl,
                    mentionIds: doc.mentionIds,
                    replyToPostId: doc.replyToPostId?.[0]
                } as IPost
            })
        )

        let filteredPosts = transformedPosts

        if (options) {
            if (options.ownerId) {
                filteredPosts = filteredPosts.filter(post => post.ownerId === options.ownerId)
            }
            if (options.language) {
                filteredPosts = filteredPosts.filter(post => post.language === options.language)
            }
            if (options.fromDate) {
                filteredPosts = filteredPosts.filter(post => post.createdAt >= options.fromDate!)
            }
            if (options.toDate) {
                filteredPosts = filteredPosts.filter(post => post.createdAt <= options.toDate!)
            }
            if (options.orderBy === 'newest') {
                filteredPosts.sort((a, b) => b.createdAt - a.createdAt)
            } else if (options.orderBy === 'oldest') {
                filteredPosts.sort((a, b) => a.createdAt - b.createdAt)
            }
            if (options.limit && filteredPosts.length > options.limit) {
                filteredPosts = filteredPosts.slice(0, options.limit)
            }
        }

        console.log(`Fetched ${filteredPosts.length} posts via DAPI`)

        return {
            posts: filteredPosts,
            hasNextPage: false
        }
    } catch (error: any) {
        console.error('Error fetching posts via DAPI:', error)
        throw error
    }
}

/**
 * Fetch posts for a specific user via DAPI
 */
export async function fetchUserPostsFromDAPI(userId: string): Promise<IPost[]> {
    const result = await fetchPostsFromDAPI({
        ownerId: userId,
        orderBy: 'newest'
    })
    return result.posts
}

/**
 * Fetch posts from blockchain using Tauri
 * network is REQUIRED here
 */
export async function fetchPostsFromTauri(network: string, options?: {
    ownerId?: string
    orderBy?: 'newest' | 'oldest'
    limit?: number
}): Promise<IPostDocument[]> {
    try {
        const contractId = getContractId('evonext', network)
        let whereClause = null
        if (options?.ownerId) {
            whereClause = { $ownerId: options.ownerId }
        }
        let orderBy = null
        if (options?.orderBy === 'newest') {
            orderBy = { $createdAt: 'desc' }
        } else if (options?.orderBy === 'oldest') {
            orderBy = { $createdAt: 'asc' }
        }
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause,
            orderBy,
            limit: options?.limit || 20,
            network
        })
        return documents
    } catch (error: any) {
        console.error('Error fetching posts via Tauri:', error)
        throw error
    }
}

/**
 * Create a new post
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    try {
        console.log('Creating post with params:', params)
        const d = new Date()
        const now = d.getTime() / 1000
        // TODO: Implement actual post creation using Dash SDK/Tauri
        const mockPost: IPost = {
            ownerId: '',
            author: await getUserInfo(''),
            content: params.content,
            createdAt: now,
            updatedAt: now,
            views: 0,
            likes: 0,
            remixes: 0,
            replies: 0,
            isSensitive: params.isSensitive || false,
            language: params.language || 'en'
        }
        return mockPost
    } catch (error: any) {
        console.error('Error creating post:', error)
        throw error
    }
}

/**
 * Update an existing post
 */
export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    try {
        console.log('Updating post:', postId, updates)
        // TODO: Implement actual post update using Dash SDK/Tauri
        return true
    } catch (error: any) {
        console.error('Error updating post:', error)
        throw error
    }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<boolean> {
    try {
        console.log('Deleting post:', postId)
        // TODO: Implement actual post deletion using Dash SDK/Tauri
        return true
    } catch (error: any) {
        console.error('Error deleting post:', error)
        throw error
    }
}
