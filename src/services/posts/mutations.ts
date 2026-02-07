// src/services/posts/mutations.ts
import { invoke } from '@/utils/tauri'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { EvoSDK } from '@dashevo/evo-sdk'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { randomBytes } from '@/services/crypto'
import { useNetwork } from '@/composables/useNetwork'
import { useIdentityStore } from '@/stores/identity'
import { ensureBase58 } from './utils'
import { fetchDocumentsById } from './fetching'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'
import type { ICreatePostParams, IUpdatePostParams, IPost } from '@/types/posts'
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    const { network } = useNetwork()
    const identityStore = useIdentityStore()
    const identityId = identityStore.identityId
    if (!identityId) throw new Error('Identity not found.')
    const sdk = network.value === 'mainnet' ? EvoSDK.mainnetTrusted() : EvoSDK.testnetTrusted()
    await sdk.connect()
    const keyData = await invoke<any>('load_private_keys', { network: network.value })
    const authKey = keyData?.identities?.[identityId]?.find((k: any) => k.purpose === 0 && k.securityLevel <= 2)
    if (!authKey?.privateKey) throw new Error('Auth Key not found.')
    const postData = {
        content: params.content.trim(),
        language: (params.language || 'en').substring(0, 2),
        ...(params.isSensitive && { sensitive: true }),
        ...(params.mediaUrl?.[0] && { mediaUrl: params.mediaUrl[0] }),
        ...(params.remix && { remix: params.remix })
    }
    await sdk.documents.create({
        contractId: YAPPR_CONTRACT_ID_TESTNET,
        type: 'post',
        ownerId: identityId,
        data: postData,
        entropyHex: binToHex(randomBytes(32)),
        privateKeyWif: authKey.privateKey,
    })
    return {
        ...postData,
        ownerId: identityId,
        createdAt: Math.floor(Date.now() / 1000),
        contractId: YAPPR_CONTRACT_ID_TESTNET,
        author: identityStore.identity as any,
        likes: 0, remixes: 0, replies: 0, views: 0
    } as unknown as IPost
}
export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    const { network } = useNetwork()
    const identityStore = useIdentityStore()
    const identityId = identityStore.identityId
    if (!identityId) return false
    try {
        const keyData = await invoke<any>('load_private_keys', { network: network.value })
        const authKey = keyData?.identities?.[identityId]?.find((k: any) => k.purpose === 0 && k.securityLevel <= 2)
        const wif = authKey?.privateKeyWif || authKey?.privateKey
        if (!wif) return false
        const docs = await fetchDocumentsById(network.value, YAPPR_CONTRACT_ID_TESTNET, [postId])
        if (!docs.length) return false
        const sdk = new DashPlatformSDK({ network: network.value as any })
        const document = await sdk.documents.create(
            YAPPR_CONTRACT_ID_TESTNET,
            'post',
            { content: updates.content?.trim() },
            identityId,
            BigInt((docs[0].revision || 1) + 1)
        )
        document.id = ensureBase58(postId)
        const identity = await sdk.identities.getIdentityByIdentifier(identityId)
        const pubKey = identity?.getPublicKeys().find((pk: any) => pk.id === authKey.id) || identity?.getPublicKeys()[1]
        const st = await sdk.documents.createStateTransition(document, 'replace', {
            identityContractNonce: (await sdk.identities.getIdentityContractNonce(identityId, YAPPR_CONTRACT_ID_TESTNET)) + 1n
        })
        st.sign(PrivateKeyWASM.fromWIF(wif), pubKey)
        await sdk.stateTransitions.broadcast(st)
        return true
    } catch (e) {
        return false
    }
}
