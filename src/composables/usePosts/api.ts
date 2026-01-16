// src/composables/usePosts/api.ts
import { invoke } from '@tauri-apps/api/core'
import { useNetwork } from '@/composables/useNetwork'
import { getContractId } from './utils'
import type {
    IPost,
    ICreatePostParams,
    IUpdatePostParams,
    PostsFetchResult,
    IPostDocument
} from '@/types/posts'

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
    // Added system fields for normalization fallback
    $id?: string
    $ownerId?: string
}

/**
 * Normalizes documents returned from the Rust/DAPI bridge.
 * Maps Dash Platform system fields (e.g., $id, $ownerId, $createdAt)
 * to the properties expected by our UI and interfaces.
 */
function normalizeDocument(doc: any): IPostDocument {
    return {
        ...doc,
        id: doc.$id || doc.id,
        ownerId: doc.$ownerId || doc.ownerId,
        // The UI specifically looks for 'contractId' in the IPost interface
        contractId: doc.$dataContractId || doc.dataContractId || doc.contractId,
        dataContractId: doc.$dataContractId || doc.dataContractId,
        createdAt: doc.$createdAt || doc.createdAt,
        updatedAt: doc.$updatedAt || doc.updatedAt,
        documentTypeName: doc.$type || doc.documentTypeName || 'post',
        revision: doc.$revision || doc.revision,
        content: doc.content || '',
        language: doc.language || 'en',
        isSensitive: doc.isSensitive ?? doc.sensitive ?? false,
    }
}

/**
 * Make a request to the DAPI endpoint (Fallback/Alternative)
 */
export async function makeDAPIRequest<T>(method: string, params: any[], targetNetwork: string): Promise<T[]> {
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
        // Using normalized $ownerId for cross-sdk compatibility
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
        if (profiles && profiles.length > 0) {
            return normalizeDocument(profiles[0]) as unknown as ProfileDocument
        }
        return null
    } catch (error: any) {
        console.warn('[API] fetchUserProfile ERROR', error)
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
            const doc = dpnsRecords[0]
            return doc.label || doc.normalizedLabel || null
        }
        return null
    } catch (error: any) {
        console.warn('[API] fetchDPNSName ERROR', error)
        return null
    }
}

/**
 * Fetch posts from blockchain using Tauri
 * UPDATED: Uses upgraded Rust support for range queries and descending sort.
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
        // Build where clause: Range query on $createdAt is required for ordering
        const whereClause: any = {
            $createdAt: { $gt: 0 }
        }
        if (ownerId) {
            whereClause.$ownerId = ownerId
        }
        // Map UI direction to DAPI direction
        const direction = orderBy === 'oldest' ? 'asc' : 'desc'
        const orderByClause = { $createdAt: direction }
        console.log(`[API] fetchPostsFromTauri | Ordering: ${direction}`, { contractId, whereClause })
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause,
            orderBy: orderByClause,
            limit: limit || 20,
            network
        })
        return documents.map(normalizeDocument)
    } catch (error: any) {
        console.error('[API] Error fetching posts via Tauri:', error)
        throw error
    }
}

/**
 * Fetch posts via DAPI (re-routed through optimized Tauri fetch)
 */
export async function fetchPostsFromDAPI(options?: {
    ownerId?: string
    orderBy?: 'newest' | 'oldest'
    limit?: number
}): Promise<PostsFetchResult> {
    try {
        const { network } = useNetwork()
        const targetNetwork = network.value

        const documents = await fetchPostsFromTauri(targetNetwork, {
            ownerId: options?.ownerId as string,
            orderBy: options?.orderBy || 'newest',
            limit: options?.limit || 20,
            contractId: getContractId('evonext', targetNetwork)
        })

        // We cast the normalized documents to IPost[].
        // NOTE: These are "Lite" posts. The usePosts composable or
        // the posts store is responsible for fetching the Author
        // profiles and Stats (likes/replies) to fully satisfy the IPost type.
        return {
            posts: documents as unknown as IPost[],
            hasNextPage: false
        }
    } catch (error: any) {
        console.error('Error fetching posts via DAPI:', error)
        throw error
    }
}

/**
 * Fetch specific documents by their IDs (Reply Context)
 */
export async function fetchDocumentsById(
    network: string,
    contractId: string,
    documentIds: string[]
): Promise<IPostDocument[]> {
    if (documentIds.length === 0) return []

    try {
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause: {
                $id: { $in: documentIds }
            },
            limit: documentIds.length,
            network
        })
        return documents.map(normalizeDocument)
    } catch (error: any) {
        console.error('[API] Error fetching documents by ID:', error)
        return []
    }
}

/**
 * Fetch posts for a specific user via optimized logic
 */
export async function fetchUserPostsFromDAPI(userId: string): Promise<IPost[]> {
    const result = await fetchPostsFromDAPI({
        ownerId: userId,
        orderBy: 'newest'
    })
    return result.posts // Now correctly typed as IPost[]
}

/**
 * Create a new post
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    try {
        console.log('[API] createPost called:', params)
        // Implementation handled by identity_commands.rs
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
        console.log('[API] updatePost called:', postId, updates)
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
        console.log('[API] deletePost called:', postId)
        return true
    } catch (error: any) {
        console.error('Error deleting post:', error)
        throw error
    }
}
