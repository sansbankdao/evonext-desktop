// src/composables/usePosts/api.ts

import { invoke } from '@tauri-apps/api/core'
import { useNetwork } from '@/composables/useNetwork'
import { getContractId } from './utils' // Assuming utils.ts exists for ID mapping
import type { IPost, ICreatePostParams, IUpdatePostParams, PostsFetchResult, IPostDocument } from '@/types/posts'
// import { getUserInfo } from './transformers' // Removed if not used or causing circular deps

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
 * Make a request to the DAPI endpoint
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

        // Use getContractId helper if available, otherwise fallback
        // Assuming 'dashpay' is a valid key for your constants
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
 * RESTORED: This was missing, causing the error.
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
 * Fetch posts from blockchain using Tauri
 *
 * This function is required by src/composables/usePosts/index.ts
 * to iterate over active contracts.
 */
export async function fetchPostsFromTauri(
    network: string,
    options: {
        ownerId?: string
        orderBy?: 'newest' | 'oldest'
        limit?: number
        contractId: string
    }
): Promise<IPostDocument[]> {
    try {
        const { ownerId, orderBy, limit, contractId } = options

        let whereClause = null
        if (ownerId) {
            whereClause = { $ownerId: ownerId }
        }

        let orderByClause = null
        if (orderBy === 'newest') {
            orderByClause = { $createdAt: 'desc' }
        } else if (orderBy === 'oldest') {
            orderByClause = { $createdAt: 'asc' }
        }

        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause,
            orderBy: orderByClause,
            limit: limit || 20,
            network
        })

        return documents
    } catch (error: any) {
        console.error('Error fetching posts via Tauri:', error)
        throw error
    }
}

/**
 * Fetch posts from blockchain using DAPI
 * Used as a fallback or alternative method.
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

        // Helper to get contract ID
        const getContractIdForNetwork = (type: string) => getContractId(type as any, targetNetwork)

        const posts = await makeDAPIRequest<IPostDocument>('get_documents', [getContractIdForNetwork('evonext'), 'post'], targetNetwork)

        let filteredPosts = posts as any[] // Cast to any for filtering safety

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
 * Create a new post
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    try {
        console.log('Creating post with params:', params)
        // const d = new Date()
        // const now = d.getTime() / 1000

        // TODO: Implement actual post creation
        return null
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
        // TODO: Implement actual post update
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
        // TODO: Implement actual post deletion
        return true
    } catch (error: any) {
        console.error('Error deleting post:', error)
        throw error
    }
}
