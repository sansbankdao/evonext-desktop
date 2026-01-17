// src/composables/usePosts/api.ts

import { invoke } from '@tauri-apps/api/core'
import { EvoSDK } from '@dashevo/evo-sdk'
// @ts-ignore
import { randomBytes } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { useNetwork } from '@/composables/useNetwork'
import { useIdentityStore } from '@/stores/identity'
import { getContractId } from './utils'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'
import type {
    IPost,
    ICreatePostParams,
    IUpdatePostParams,
    PostsFetchResult,
    IPostDocument
} from '@/types/posts'
/**
 * Normalizes documentation returned from the Rust/DAPI bridge or SDK.
 * Maps Dash Platform system fields to standard interface properties.
 */
function normalizeDocument(doc: any): IPostDocument {
    const data = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
    return {
        ...data,
        ownerId: data.$ownerId || data.ownerId,
        contractId: data.$dataContractId || data.dataContractId || data.contractId,
        dataContractId: data.$dataContractId || data.dataContractId,
        createdAt: data.$createdAt || data.createdAt,
        updatedAt: data.$updatedAt || data.updatedAt,
        documentTypeName: data.$type || data.documentTypeName || 'post',
        revision: data.$revision || data.revision,
        content: data.content || '',
        language: data.language || 'en',
        isSensitive: data.isSensitive ?? data.sensitive ?? false,
        mediaUrl: data.mediaUrl || [],
        remix: data.remix || undefined
    }
}
/**
 * Fetch posts from blockchain using Tauri
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
        const where: any[] = [["$createdAt", ">", 0]];
        if (ownerId) {
            where.push(["$ownerId", "==", ownerId]);
        }
        const order = [["$createdAt", orderBy || 'desc']];
        const whereClause = JSON.stringify(where);
        const orderByClause = JSON.stringify(order);
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause,
            orderBy: orderByClause,
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
        const whereClause = JSON.stringify([["$ownerId", "==", ownerId]]);
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
            whereClause: [["records.dashUniqueIdentityId", "==", ownerId]],
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
            whereClause: [["$id", "in", documentIds]],
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
/**
 * Creates a new post on the Dash Platform (YAPPR Contract).
 * Uses high/critical security level authentication keys from the keystore.
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    const { network } = useNetwork()
    const identityStore = useIdentityStore()
    const targetNetwork = network.value
    const identityId = identityStore.identity?.id
    if (!identityId) {
        throw new Error('Identity not found. Please connect your wallet.')
    }
    try {
        // 1. Retrieve the AUTHENTICATION key from the Tauri Keystore
        // Purpose 0 = AUTHENTICATION
        // SecurityLevel 1 = CRITICAL, 2 = HIGH
        const keyData = await invoke<any>('load_private_keys', { network: targetNetwork })
        const identityKeys = keyData?.identities?.[identityId]
        if (!identityKeys) {
            throw new Error('No private keys found for this identity in the keystore.')
        }
        const authKey = identityKeys.find((k: any) =>
            k.purpose === 0 && (k.securityLevel === 1 || k.securityLevel === 2)
        )
        if (!authKey || !authKey.privateKeyWif) {
            throw new Error('Required Authentication Key (High/Critical) not found.')
        }
        // 2. Connect via EvoSDK
        const sdk = targetNetwork === 'mainnet'
            ? EvoSDK.mainnetTrusted()
            : EvoSDK.testnetTrusted()
        await sdk.connect()
        // 3. Prepare Post Data & Entropy
        const entropyHex = binToHex(randomBytes(32))
        const postData = {
            content: params.content.trim(),
            language: params.language || 'en',
            isSensitive: params.isSensitive || false,
            mediaUrl: params.mediaUrl || [],
            remix: params.remix || undefined
        }
        // 4. Create Document Transition
        const payload = {
            contractId: YAPPR_CONTRACT_ID_TESTNET,
            type: 'post',
            ownerId: identityId,
            data: postData,
            entropyHex,
            privateKeyWif: authKey.privateKeyWif
        }
        console.log('[API] Broadcasting Post to Dash Platform:', postData)
        const result = await sdk.documents.create(payload)
        if (result && result.length > 0) {
            return normalizeDocument(result[0]) as unknown as IPost
        }
        return null
    } catch (error: any) {
        console.error('[API] createPost Error:', error)
        throw error
    }
}
export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    console.log('[API] updatePost (Stub):', postId, updates)
    // Update logic would involve a document.update call with similar Auth key logic
    return true
}
export async function deletePost(postId: string): Promise<boolean> {
    console.log('[API] deletePost (Stub):', postId)
    return true
}
