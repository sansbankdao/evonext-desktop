// src/composables/usePosts/api.ts
import { invoke } from '@tauri-apps/api/core'
import { useNetwork } from '@/composables/useNetwork'
import type { IPost, ICreatePostParams, IUpdatePostParams, PostsFetchResult, IPostDocument } from '@/types/posts'
import { getUserInfo } from './transformers'
import { getActivePostContracts } from '@/constants'

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
export async function fetchUserProfile(ownerId: string, networkOverride?: string): Promise<any | null> {
    try {
        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value

        // Note: Ideally use getActivePostContracts('dashpay') if you have dashpay contracts
        // Assuming 'dashpay' ID logic is handled or hardcoded elsewhere for now
        const contractId = getActivePostContracts(targetNetwork)[0] // Fallback to first active contract

        const profiles = await invoke<any[]>('get_posts', {
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
 * Fetch posts from blockchain using Tauri
 *
 * RESTORED: This function is required by the main composable to iterate
 * over the active contracts. The signature matches the error log:
 * api.fetchPostsFromTauri(network, { ..., contractId })
 */
export async function fetchPostsFromTauri(
    network: string,
    options: {
        ownerId?: string
        orderBy?: 'newest' | 'oldest'
        limit?: number
        contractId: string // Explicitly required by the caller
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
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId, // Use the specific contract ID passed by the caller
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
 * This version iterates over all active contracts defined in constants.
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

        // Get the list of ACTIVE contracts
        const activeContractIds = getActivePostContracts(targetNetwork)

        console.log(`[API] Fetching from network: ${targetNetwork}`)
        console.log(`[API] Active Contracts:`, activeContractIds)

        if (activeContractIds.length === 0) {
            console.warn('[API] No active contracts found for this network.')
            return { posts: [], hasNextPage: false }
        }

        // Fetch from ALL contracts in parallel
        const fetchPromises = activeContractIds.map(async (contractId) => {
            try {
                const docs = await makeDAPIRequest<IPostDocument>(
                    'get_documents',
                    [contractId, 'post'],
                    targetNetwork
                )
                return docs
            } catch (err) {
                console.error(`[API] Failed to fetch from contract ${contractId}:`, err)
                return []
            }
        })

        const results = await Promise.all(fetchPromises)
        let rawDocuments: IPostDocument[] = results.flat()

        console.log(`[API] Total raw documents fetched: ${rawDocuments.length}`)

        // Transform and enrich documents
        const transformedPosts = await Promise.all(
            rawDocuments.map(async (doc) => {
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

        // Apply Filters
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

        // Deduplicate
        const uniquePostsMap = new Map<string, IPost>()
        filteredPosts.forEach(post => {
            const uniqueKey = post.id || `${post.ownerId}-${post.createdAt}-${post.content.slice(0, 10)}`
            if (!uniquePostsMap.has(uniqueKey)) {
                uniquePostsMap.set(uniqueKey, post)
            }
        })
        const finalPosts = Array.from(uniquePostsMap.values())

        console.log(`[API] Final unique posts: ${finalPosts.length}`)

        return {
            posts: finalPosts,
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
        const d = new Date()
        const now = d.getTime() / 1000
        // TODO: Implement actual post creation using Dash SDK/Tauri
        const mockPost: IPost = {
            contractId: '',
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
