// src/services/posts/mutations.ts

import { invoke } from '@/utils/tauri'
import { Document } from '@dashevo/evo-sdk'
import { randomBytes } from '@/services/crypto'
import { connectEvoSdk, resolveSigningContext, signerFromWif } from '@/services/platform'
import { useNetwork } from '@/composables/useNetwork'
import { useIdentityStore } from '@/stores/identity'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'
import type { ICreatePostParams, IUpdatePostParams, IPost } from '@/types/posts'

/** Yappr post contract `content` field limit (§8 conformance). */
export const MAX_POST_CONTENT_LENGTH = 500

export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    const { network } = useNetwork()
    const identityStore = useIdentityStore()
    const identityId = identityStore.identityId
    if (!identityId) throw new Error('Identity not found.')
    try {
        const sdk = await connectEvoSdk(network.value)
        const keyData = await invoke<any>('load_keystore', { network: network.value })
        const authKey = keyData?.identities?.[identityId]?.find((k: any) => k.purpose === 0 && k.securityLevel <= 2)
        if (!authKey?.privateKey) throw new Error('Auth Key not found.')
        const trimmed = params.content.trim()
        if (trimmed.length > MAX_POST_CONTENT_LENGTH) {
            throw new Error(`Post content exceeds the ${MAX_POST_CONTENT_LENGTH}-character contract limit.`)
        }
        const postData = {
            content: trimmed,
            language: (params.language || 'en').substring(0, 2),
            ...(params.isSensitive && { sensitive: true }),
            ...(params.mediaUrl?.[0] && { mediaUrl: params.mediaUrl[0] }),
            ...(params.remix && { remix: params.remix })
        }
        const entropy = await randomBytes(32)
        const { identityKey } = await resolveSigningContext(sdk, identityId, authKey.keyId)
        const document = new Document({
            dataContractId: YAPPR_CONTRACT_ID_TESTNET,
            ownerId: identityId,
            documentTypeName: 'post',
            properties: postData,
            entropy,
        })
        const signer = signerFromWif(authKey.privateKey)
        await sdk.documents.create({ document, identityKey, signer })
        return {
            ...postData,
            ownerId: identityId,
            createdAt: Math.floor(Date.now() / 1000),
            contractId: YAPPR_CONTRACT_ID_TESTNET,
            author: identityStore.identity as any,
            likes: 0, remixes: 0, replies: 0, views: 0
        } as unknown as IPost
    } catch (error: any) {
        console.error('[API] createPost Internal Error:', error)
        throw error
    }
}
export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    const { network } = useNetwork()
    const identityStore = useIdentityStore()
    const identityId = identityStore.identityId
    if (!identityId) throw new Error('updatePost failed: No identityId in store')
    try {
        const keyData = await invoke<any>('load_keystore', { network: network.value })
        const authKey = keyData?.identities?.[identityId]?.find((k: any) => k.purpose === 0 && k.securityLevel <= 2)
        const wif = authKey?.privateKeyWif || authKey?.privateKey
        if (!wif) throw new Error('updatePost failed: No suitable WIF found for identity')
        const sdk = await connectEvoSdk(network.value)
        const document = await sdk.documents.get(YAPPR_CONTRACT_ID_TESTNET, 'post', postId)
        if (!document) throw new Error(`updatePost failed: Post ${postId} not found on chain`)
        const { identityKey } = await resolveSigningContext(sdk, identityId, authKey.keyId)
        const signer = signerFromWif(wif)
        document.properties = { content: updates.content?.trim() }
        document.revision = (document.revision ?? 1n) + 1n
        await sdk.documents.replace({ document, identityKey, signer })
        return true
    } catch (e: any) {
        throw new Error(`[CRITICAL] updatePost Logic Error: ${e.message}`)
    }
}
