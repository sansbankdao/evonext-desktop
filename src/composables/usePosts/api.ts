// src/composables/usePosts/api.ts
import { useNetwork } from '@/composables/useNetwork'
import type { IPost, ICreatePostParams, IUpdatePostParams, PostsFetchResult, IPostDocument } from '@/types/posts'
import { getUserInfo } from './transformers'
// Import the critical helper that determines which contracts to hit
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
interface ProfileDocument {
    ownerId: string
    avatarUrl?: string
    displayName?: string
    publicMessage?: string
    avatarHash?: string
    avatarFingerprint?: string
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
 * Fetch posts from blockchain using DAPI
 * REFACTORED: Now iterates over ALL active contracts defined in constants.
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
        // 1. Get the list of ACTIVE contracts for this specific network
        // e.g., ['EVONEXT_ID', 'YAPPR_ID']
        const activeContractIds = getActivePostContracts(targetNetwork)
        console.log(`[API] Fetching from network: ${targetNetwork}`)
        console.log(`[API] Active Contracts:`, activeContractIds)
        if (activeContractIds.length === 0) {
            console.warn('[API] No active contracts found for this network.')
            return { posts: [], hasNextPage: false }
        }
        // 2. Fetch from ALL contracts in parallel
        // This solves the issue where only one contract was being hit.
        const fetchPromises = activeContractIds.map(async (contractId) => {
            try {
                // We query for 'post' type documents.
                // Note: Depending on your contract setup, you might need to specify a 'where' clause
                // if Remixes and Posts are in the same contract but distinguished by a property.
                // Here we assume they are separate document types 'post' vs 'remix' or handled by the UI.
                const docs = await makeDAPIRequest<IPostDocument>(
                    'get_documents',
                    [contractId, 'post'], // [ContractID, DocumentType]
                    targetNetwork
                )
                return docs
            } catch (err) {
                console.error(`[API] Failed to fetch from contract ${contractId}:`, err)
                return [] // Return empty array for failed contracts to allow partial success
            }
        })
        // 3. Aggregate results
        const results = await Promise.all(fetchPromises)
        let rawDocuments: IPostDocument[] = results.flat()
        console.log(`[API] Total raw documents fetched: ${rawDocuments.length}`)
        // 4. Transform and enrich documents (add author info)
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
        // 5. Client-side Filtering (Based on options passed in)
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
        // 6. Final Deduplication
        // Since we fetched from multiple contracts, there's a small chance of duplicates
        // if a document exists in both (rare but technically possible in some migration scenarios).
        const uniquePostsMap = new Map<string, IPost>()
        filteredPosts.forEach(post => {
            // Use ownerId + timestamp + content snippet as a unique key if ID is missing
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
 * Note: This creates a post in the FIRST available active contract.
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    try {
        const { network } = useNetwork()
        const targetNetwork = network.value
        const activeContractIds = getActivePostContracts(targetNetwork)
        if (activeContractIds.length === 0) {
            throw new Error('No active contracts available to create post.')
        }
        // Select the primary contract (first in list) for writing
        const targetContractId = activeContractIds[0]!
        console.log(`Creating post on contract: ${targetContractId}`)
        const d = new Date()
        const now = d.getTime() / 1000
        // TODO: Implement actual post creation using Dash SDK/Tauri
        // You will need to use 'targetContractId' here in the state transition.
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
