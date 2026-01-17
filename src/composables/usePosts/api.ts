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

/**
 * Normalizes documents returned from the Rust/DAPI bridge.
 * Maps Dash Platform system fields (e.g., $id, $ownerId, $createdAt)
 * to the properties expected by our UI and interfaces.
 */
function normalizeDocument(doc: any): IPostDocument {
    return {
        ...doc,
        // Map DAPI $ system fields to standard interface properties
        id: doc.$id || doc.id,
        ownerId: doc.$ownerId || doc.ownerId,
        contractId: doc.$dataContractId || doc.dataContractId || doc.contractId,
        dataContractId: doc.$dataContractId || doc.dataContractId,
        createdAt: doc.$createdAt || doc.createdAt,
        updatedAt: doc.$updatedAt || doc.updatedAt,
        documentTypeName: doc.$type || doc.documentTypeName || 'post',
        revision: doc.$revision || doc.revision,
        // Ensure content properties exist
        content: doc.content || '',
        language: doc.language || 'en',
        isSensitive: doc.isSensitive ?? doc.sensitive ?? false,
    }
}

/**
 * Fetch posts from blockchain using Tauri
 * Uses the exact Array of Arrays format required by DAPI.
 */
export async function fetchPostsFromTauri(
    network: string,
    options: {
        ownerId?: string
        orderBy?: 'desc' | 'asc'
        limit?: number
        contractId: string
    }
): Promise<IPostDocument[]> {
    try {
        const { ownerId, orderBy, limit, contractId } = options

        // Build native arrays
        const where: any[] = [ ["$createdAt", ">", 0] ];
        if (ownerId) {
            where.push(["$ownerId", "==", ownerId]);
        }

        const order = [ ["$createdAt", orderBy || 'desc'] ];

        // STRINGIFY the clauses to match the proxy's expected format
        // We use a simple JSON.stringify which matches the sample requirement
        const whereClause = JSON.stringify(where);
        const orderByClause = JSON.stringify(order);

        console.log(`[API_DEBUG] Invoking get_posts`, { contractId, whereClause, orderByClause });

        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause,   // Now a String
            orderBy: orderByClause, // Now a String
            limit: limit || 20,
            network
        });

        return (documents || []).map(normalizeDocument);
    } catch (error: any) {
        console.error('[API] Error fetching posts via Tauri:', error);
        throw error;
    }
}

/**
 * Wrapper for the usePosts composable and other DAPI-oriented calls.
 */
export async function fetchPostsFromDAPI(options?: {
    ownerId?: string
    orderBy?: 'newest' | 'oldest' | 'desc' | 'asc'
    limit?: number
}): Promise<PostsFetchResult> {
    try {
        const { network } = useNetwork()
        const targetNetwork = network.value

        // Map 'newest'/'oldest' to 'desc'/'asc' if necessary
        let direction: 'desc' | 'asc' = 'desc'
        if (options?.orderBy === 'oldest' || options?.orderBy === 'asc') {
            direction = 'asc'
        }

        const documents = await fetchPostsFromTauri(targetNetwork, {
            ownerId: options?.ownerId as string,
            orderBy: direction,
            limit: options?.limit || 20,
            contractId: getContractId('evonext', targetNetwork)
        })

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
 * Fetch profile data for a user via Tauri
 */
export async function fetchUserProfile(ownerId: string, networkOverride?: string): Promise<any | null> {
    try {
        const { network } = useNetwork()
        const targetNetwork = networkOverride || network.value
        const contractId = getContractId('dashpay', targetNetwork)

        // Stringify the where clause
        const whereClause = JSON.stringify([ ["$ownerId", "==", ownerId] ]);

        const profiles = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'profile',
            whereClause,
            limit: 1,
            network: targetNetwork
        });

        if (profiles && profiles.length > 0) return normalizeDocument(profiles[0]);
        return null
    } catch (error: any) { return null }
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
            whereClause: [ ["records.dashUniqueIdentityId", "==", ownerId] ],
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
 * Fetch specific documents by their IDs
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
            whereClause: [ ["$id", "in", documentIds] ],
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
 * Fetch posts for a specific user
 */
export async function fetchUserPostsFromDAPI(userId: string): Promise<IPost[]> {
    const result = await fetchPostsFromDAPI({
        ownerId: userId,
        orderBy: 'desc'
    })
    return result.posts
}

export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    console.log('[API] createPost:', params)
    return null
}

export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    console.log('[API] updatePost:', postId, updates)
    return true
}

export async function deletePost(postId: string): Promise<boolean> {
    console.log('[API] deletePost:', postId)
    return true
}
