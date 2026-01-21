// src/services/posts/api.ts

import { invoke } from '@tauri-apps/api/core'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
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

const MAX_DPNS_NAMES_LIMIT = 100

/**
 * PURE JS BASE58 IMPLEMENTATION
 */
const Base58 = {
    ALPHABET: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
    ALPHABET_MAP: {} as Record<string, number>,
    init() {
        if (Object.keys(this.ALPHABET_MAP).length === 0) {
            for (let i = 0; i < this.ALPHABET.length; i++) {
                this.ALPHABET_MAP[this.ALPHABET.charAt(i)] = i
            }
        }
    },
    encode(buffer: Uint8Array): string {
        this.init()
        const digits: number[] = [0]
        for (let i = 0; i < buffer.length; i++) {
            let carry = buffer[i] as number
            for (let j = 0; j < digits.length; ++j) {
                carry += (digits[j] as number) << 8
                digits[j] = carry % 58
                carry = (carry / 58) | 0
            }
            while (carry > 0) {
                digits.push(carry % 58)
                carry = (carry / 58) | 0
            }
        }
        let result = ''
        for (let i = 0; i < buffer.length && buffer[i] === 0; i++) result += '1'
        for (let i = digits.length - 1; i >= 0; i--) {
            const digit = digits[i]
            if (digit !== undefined) result += this.ALPHABET[digit]
        }
        return result
    }
}

function ensureBase58(id: string): string {
    if (!id) return id
    if (id.length === 44 && id.endsWith('=') || id.includes('+') || id.includes('/')) {
        try {
            const binaryString = atob(id)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
            return Base58.encode(bytes)
        } catch (e) {
            return id
        }
    }
    return id
}

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
        isSensitive: data.sensitive ?? data.isSensitive ?? false,
        mediaUrl: data.mediaUrl || null,
        remix: data.remix || undefined
    }
}

// --- Fetching Logic ---

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
        const where: any[] = [["$createdAt", ">", 0]]
        if (ownerId) where.push(["$ownerId", "==", ensureBase58(ownerId)])
        const order = [["$createdAt", orderBy || 'desc']]
        const documents = await invoke<any[]>('get_posts', {
            dataContractId: contractId,
            documentType: 'post',
            whereClause: JSON.stringify(where),
            orderBy: JSON.stringify(order),
            limit: limit || 20,
            network
        })
        return (documents || []).map(normalizeDocument)
    } catch (error: any) {
        throw error
    }
}

export async function fetchPostsFromDAPI(options?: {
    ownerId?: string
    orderBy?: 'newest' | 'oldest' | 'desc' | 'asc'
    limit?: number
}): Promise<PostsFetchResult> {
    const { network } = useNetwork()
    const targetNetwork = network.value
    let direction: 'desc' | 'asc' = (options?.orderBy === 'oldest' || options?.orderBy === 'asc') ? 'asc' : 'desc'
    const documents = await fetchPostsFromTauri(targetNetwork, {
        ownerId: options?.ownerId as string,
        orderBy: direction,
        limit: options?.limit || 20,
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

// --- DPNS & Profile Logic ---

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
    const dpnsRecords = await invoke<any[]>('get_posts', {
        dataContractId: contractId,
        documentType: 'domain',
        whereClause: [["records.identity", "==", ensureBase58(ownerId)]],
        limit: MAX_DPNS_NAMES_LIMIT,
        network: targetNetwork
    })
    if (dpnsRecords?.length) {
        const doc = dpnsRecords[0]
        return doc.label || doc.normalizedLabel || null
    }
    return null
}

export async function fetchDPNSNames(ownerId: string, networkOverride?: string): Promise<string[] | null> {
    const { network } = useNetwork()
    const targetNetwork = networkOverride || network.value
    const contractId = getContractId('dpns', targetNetwork)
    const dpnsRecords = await invoke<any[]>('get_posts', {
        dataContractId: contractId,
        documentType: 'domain',
        whereClause: [["records.identity", "==", ensureBase58(ownerId)]],
        limit: MAX_DPNS_NAMES_LIMIT,
        network: targetNetwork
    })
    return dpnsRecords?.map((d: any) => d.label || d.normalizedLabel || null) || null
}

// --- Mutation Logic ---

export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    const { network: currentNetwork } = useNetwork()
    const identityStore = useIdentityStore()
    const targetNetwork = currentNetwork.value as 'testnet' | 'mainnet'
    const identityId = identityStore.identity?.id
    if (!identityId) throw new Error('Identity not found.')

    try {
        const sdk = new DashPlatformSDK({ network: targetNetwork })
        const keyData = await invoke<any>('load_private_keys', { network: targetNetwork })
        const authKeyData = keyData?.identities?.[identityId]?.find((k: any) =>
            k.purpose === 0 && (k.securityLevel === 1 || k.securityLevel === 2)
        )
        if (!authKeyData?.privateKeyWif) throw new Error('Auth Key not found.')

        const data = {
            content: params.content.trim(),
            language: (params.language || 'en').substring(0, 2),
            ...(params.isSensitive && { sensitive: true }),
            ...(params.mediaUrl?.[0] && { mediaUrl: params.mediaUrl[0] }),
            ...(params.remix && { remix: params.remix })
        }

        const document = await sdk.documents.create(YAPPR_CONTRACT_ID_TESTNET, 'post', data, identityId, BigInt(1))
        const identityContractNonce = (await sdk.identities.getIdentityContractNonce(identityId, YAPPR_CONTRACT_ID_TESTNET)) + 1n
        const stateTransition = await sdk.documents.createStateTransition(document, 'create', { identityContractNonce })

        const privKey = PrivateKeyWASM.fromWIF(authKeyData.privateKeyWif)
        const identity = await sdk.identities.getIdentityByIdentifier(identityId)
        if (!identity) throw new Error('Identity fetch failed.')

        const publicKeyId = 1
        const pubKey = identity.getPublicKeys()[publicKeyId]
        if (!pubKey) throw new Error('Public key index 1 not found')

        stateTransition.sign(privKey, pubKey)
        stateTransition.signaturePublicKeyId = publicKeyId

        await sdk.stateTransitions.broadcast(stateTransition)
        await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

        return {
            ...data,
            id: stateTransition.hash(true), // skip_signature: true
            ownerId: identityId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: null,
            contractId: YAPPR_CONTRACT_ID_TESTNET,
            author: identityStore.identity as any,
            likes: 0, remixes: 0, replies: 0, views: 0
        } as unknown as IPost
    } catch (error: any) {
        console.error('[API] createPost Error:', error)
        throw error
    }
}

export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    const { network: currentNetwork } = useNetwork()
    const identityStore = useIdentityStore()
    const targetNetwork = currentNetwork.value as 'testnet' | 'mainnet'
    const identityId = identityStore.identity?.id
    if (!identityId) throw new Error('Identity not found.')

    try {
        const sdk = new DashPlatformSDK({ network: targetNetwork })
        const keyData = await invoke<any>('load_private_keys', { network: targetNetwork })
        const authKeyData = keyData?.identities?.[identityId]?.find((k: any) =>
            k.purpose === 0 && (k.securityLevel === 1 || k.securityLevel === 2)
        )
        if (!authKeyData?.privateKeyWif) throw new Error('Auth Key not found.')

        const docs = await fetchDocumentsById(targetNetwork, YAPPR_CONTRACT_ID_TESTNET, [postId])
        if (!docs.length || !docs[0]) throw new Error('Post not found.')

        const nextRevision = BigInt((docs[0].revision || 1) + 1)
        const data = {
            content: updates.content?.trim(),
            language: (updates.language || 'en').substring(0, 2),
            ...(updates.isSensitive !== undefined && { sensitive: updates.isSensitive }),
            ...(updates.mediaUrl?.[0] && { mediaUrl: updates.mediaUrl[0] })
        }

        const document = await sdk.documents.create(YAPPR_CONTRACT_ID_TESTNET, 'post', data, identityId, nextRevision)
        document.id = ensureBase58(postId)

        const identityContractNonce = (await sdk.identities.getIdentityContractNonce(identityId, YAPPR_CONTRACT_ID_TESTNET)) + 1n
        const stateTransition = await sdk.documents.createStateTransition(document, 'replace', { identityContractNonce })

        const privKey = PrivateKeyWASM.fromWIF(authKeyData.privateKeyWif)
        const identity = await sdk.identities.getIdentityByIdentifier(identityId)
        const publicKeyId = 1
        const pubKey = identity?.getPublicKeys()[publicKeyId]
        if (!pubKey) throw new Error('Public key index 1 not found')

        stateTransition.sign(privKey, pubKey)
        stateTransition.signaturePublicKeyId = publicKeyId

        await sdk.stateTransitions.broadcast(stateTransition)
        return true
    } catch (error: any) {
        console.error('[API] updatePost Error:', error)
        return false
    }
}

export async function deletePost(postId: string): Promise<boolean> {
    console.log('[API] deletePost (Transition not implemented):', postId)
    return true
}
