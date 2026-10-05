// src/services/posts/fetching.ts

import { invoke } from '@/utils/tauri'
import { useNetwork } from '@/composables/useNetwork'
import { nativeDapiRequest } from '@/services/nativeDapi'
import { normalizeDocument, ensureBase58, getContractId } from './utils'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'
import type { IPostDocument, IPost, PostsFetchResult } from '@/types/posts'
const MAX_DPNS_NAMES_LIMIT = 100

/**
 * Tier-1 is the Rust DAPI client behind `get_posts` (the Sansbank DAPI
 * proxy). If that transport is unreachable, re-run the SAME document
 * query against the native DAPI network directly (tier-2, bundled SDK)
 * so reads keep working through proxy outages.
 */
async function invokeGetPostsWithFallback(payload: Record<string, unknown>): Promise<any[]> {
    try {
        return await invoke<any[]>('get_posts', payload)
    } catch (err) {
        const res = await nativeDapiRequest('get_documents', [
            payload.dataContractId,
            payload.documentType,
            payload.whereClause ?? null,
            payload.orderBy ?? null,
            typeof payload.limit === 'number' ? payload.limit : null
        ], String(payload.network))
        return res.success ? (res.result as any[]) : []
    }
}
export async function fetchPostsFromTauri(
    network: string,
    options: { ownerId?: string; orderBy?: 'desc' | 'asc'; limit?: number; contractId: string }
): Promise<IPostDocument[]> {
    const { ownerId, orderBy, limit, contractId } = options
    const where: any[] = [["$createdAt", ">", 0]]
    if (ownerId) where.push(["$ownerId", "==", ensureBase58(ownerId)])
    const documents = await invokeGetPostsWithFallback({
        dataContractId: contractId,
        documentType: 'post',
        whereClause: JSON.stringify(where),
        orderBy: JSON.stringify([["$createdAt", orderBy || 'desc']]),
        limit: limit || 20,
        network
    })
    return (documents || []).map(normalizeDocument)
}
export async function fetchPostsFromDAPI(options?: { ownerId?: string; orderBy?: string; limit?: number }): Promise<PostsFetchResult> {
    const { network } = useNetwork()
    const direction = (options?.orderBy === 'oldest' || options?.orderBy === 'asc') ? 'asc' : 'desc'

    // Build options object to respect exactOptionalPropertyTypes
    const tauriOptions: { ownerId?: string; orderBy?: 'desc' | 'asc'; limit?: number; contractId: string } = {
        contractId: YAPPR_CONTRACT_ID_TESTNET,
        orderBy: direction as 'desc' | 'asc'
    }
    if (options?.ownerId) tauriOptions.ownerId = options.ownerId
    if (options?.limit) tauriOptions.limit = options.limit

    const documents = await fetchPostsFromTauri(network.value, tauriOptions)
    return { posts: documents as unknown as IPost[], hasNextPage: false }
}
export async function fetchDocumentsById(network: string, contractId: string, ids: string[]): Promise<IPostDocument[]> {
    if (!ids.length) return []
    const documents = await invokeGetPostsWithFallback({
        dataContractId: contractId,
        documentType: 'post',
        whereClause: JSON.stringify([["$id", "in", ids.map(ensureBase58)]]),
        limit: ids.length,
        network
    })
    return documents.map(normalizeDocument)
}
export async function fetchUserProfile(ownerId: string, networkOverride?: string): Promise<any | null> {
    const { network } = useNetwork()
    const targetNetwork = networkOverride || network.value
    const contractId = getContractId('dashpay', targetNetwork)
    const profiles = await invokeGetPostsWithFallback({
        dataContractId: contractId,
        documentType: 'profile',
        whereClause: [["$ownerId", "==", ensureBase58(ownerId)]],
        limit: 1,
        network: targetNetwork
    })
    return profiles?.length ? normalizeDocument(profiles[0]) : null
}
export async function fetchDPNSName(ownerId: string, networkOverride?: string): Promise<string | null> {
    const { network } = useNetwork()
    const targetNetwork = networkOverride || network.value
    const contractId = getContractId('dpns', targetNetwork)
    const records = await invokeGetPostsWithFallback({
        dataContractId: contractId,
        documentType: 'domain',
        whereClause: [["records.identity", "==", ensureBase58(ownerId)]],
        limit: MAX_DPNS_NAMES_LIMIT,
        network: targetNetwork
    })
    return records?.length ? (records[0].label || records[0].normalizedLabel || null) : null
}
