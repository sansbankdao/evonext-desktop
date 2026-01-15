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

// interface DPNSDocument {
//     label?: string
//     normalizedLabel?: string
//     normalizedParentDomainName?: string
//     records?: {
//         dashUniqueIdentityId?: string
//         dashAliasIdentityId?: string
//     }
// }

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
        // DEBUG: Log Input
        console.log('[API] fetchUserProfile START', { ownerId, networkOverride })

        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value

        // Get DashPay Contract ID
        const contractId = getContractId('dashpay', targetNetwork)
        console.log('[API] Fetching Profile from Contract:', contractId, 'for Owner:', ownerId)

        // Invoke Tauri Command
        // We use 'get_posts' which maps to client.get_documents in Rust
        // We SPECIFICALLY ask for 'documentType: 'profile''
        const profiles = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'profile', // <--- CRITICAL: Filters for Profiles only
            whereClause: {
                $ownerId: ownerId
            },
            orderBy: { $updatedAt: 'desc' },
            limit: 1,
            network: targetNetwork
        })

        if (profiles && profiles.length > 0) {
            const profile = profiles[0]
            // DEBUG: Log Success
            console.log('[API] fetchUserProfile SUCCESS', profile)
            return profile
        }

        console.log('[API] fetchUserProfile EMPTY RESULT')
        return null
    } catch (error: any) {
        // Catch specific errors to prevent hanging
        console.warn('[API] fetchUserProfile ERROR', error)
        return null
    }
}

/**
 * Fetch DPNS username for a user via Tauri
 * RESTORED: This was missing, causing the error.
 */
export async function fetchDPNSName(ownerId: string, networkOverride?: string): Promise<string | null> {
    try {
        // DEBUG: Log Input
        console.log('[API] fetchDPNSName START', { ownerId })

        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value

        const contractId = getContractId('dpns', targetNetwork)

        const dpnsRecords = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'domain',
            whereClause: {
                'records.dashUniqueIdentityId': ownerId
            },
            orderBy: { $updatedAt: 'desc' },
            limit: 1,
            network: targetNetwork
        })

        if (dpnsRecords && dpnsRecords.length > 0) {
            const name = dpnsRecords[0]?.label || dpnsRecords[0]?.normalizedLabel || null
            console.log('[API] fetchDPNSName SUCCESS', name)
            return name
        }
        return null
    } catch (error: any) {
        console.warn('[API] fetchDPNSName ERROR', error)
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
        contractId: string // This is required and must be used
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

        // Invoke the Tauri backend command
        // We MUST use the contractId passed in options
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
        console.error('[API] Error fetching posts via Tauri:', error)
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
 * Fetch specific documents by their IDs.
 * Used to fetch parent posts for reply context.
 */
export async function fetchDocumentsById(
    network: string,
    contractId: string,
    documentIds: string[]
): Promise<IPostDocument[]> {
    if (documentIds.length === 0) return []

    try {
        // Use Tauri invoke with a specific whereClause for IDs
        // Note: '$id' checks against the document's unique identifier
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause: {
                $id: { $in: documentIds }
            },
            limit: documentIds.length,
            network
        })
        return documents
    } catch (error: any) {
        console.error('[API] Error fetching documents by ID:', error)
        return []
    }
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
