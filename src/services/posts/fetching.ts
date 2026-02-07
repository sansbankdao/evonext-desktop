// src/services/posts/fetching.ts
import { invoke } from '@/utils/tauri'
import { useNetwork } from '@/composables/useNetwork'
import { normalizeDocument, ensureBase58, getContractId } from './utils'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'
import type { IPostDocument, IPost, PostsFetchResult } from '@/types/posts'
const MAX_DPNS_NAMES_LIMIT = 100
export async function fetchPostsFromTauri(
    network: string,
    options: { ownerId?: string; orderBy?: 'desc' | 'asc'; limit?: number; contractId: string }
): Promise<IPostDocument[]> {
    const { ownerId, orderBy, limit, contractId } = options
    const where: any[] = [["$createdAt", ">", 0]]
    if (ownerId) where.push(["$ownerId", "==", ensureBase58(ownerId)])
    const documents = await invoke<any[]>('get_posts', {
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
    const documents = await fetchPostsFromTauri(network.value, {
        ownerId: options?.ownerId,
        orderBy: direction as 'desc' | 'asc',
        limit: options?.limit,
        contractId: YAPPR_CONTRACT_ID_TESTNET
    })
    return { posts: documents as unknown as IPost[], hasNextPage: false }
}
export async function fetchDocumentsById(network: string, contractId: string, ids: string[]): Promise<IPostDocument[]> {
    if (!ids.length) return []
    const documents = await invoke<any[]>('get_posts', {
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
    const profiles = await invoke<any[]>('get_posts', {
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
    const records = await invoke<any[]>('get_posts', {
        dataContractId: contractId,
        documentType: 'domain',
        whereClause: [["records.identity", "==", ensureBase58(ownerId)]],
        limit: MAX_DPNS_NAMES_LIMIT,
        network: targetNetwork
    })
    return records?.length ? (records[0].label || records[0].normalizedLabel || null) : null
}
