// src/services/posts/fallbackFeed.ts

// Fallback transport for the merged social feed. The primary path is the
// Rust DAPI HTTP proxy (`fetch_social_feed` → dapi.sansbank.dev). When
// that transport fails (proxy unreachable / 5xx), the feed is prefetched
// through the bundled DCG JS SDK — direct masternode transport — and
// rendered by the SAME Rust pipeline via `fetch_social_feed_prefetched`.
// No orchestration logic is duplicated TypeScript-side: dedupe, merge,
// profile resolution and content parsing all stay in Rust.

import { invoke } from '@/utils/tauri'
import { connectEvoSdk } from '@/services/platform'
import {
    DASHPAY_CONTRACT_ID_MAINNET,
    DASHPAY_CONTRACT_ID_TESTNET,
    DPNS_CONTRACT_ID_MAINNET,
    DPNS_CONTRACT_ID_TESTNET,
    YAPPR_PROFILE_CONTRACT_ID_MAINNET,
    YAPPR_PROFILE_CONTRACT_ID_TESTNET,
    getActivePostContracts
} from '@/constants'
import type { ISocialFeedPage } from '@/types/social'

const PROFILE_FETCH_LIMIT = 100

function rawJson(doc: any): any {
    return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc
}

async function queryRaw(
    sdk: any,
    dataContractId: string,
    documentTypeName: string,
    where: any[],
    orderBy: any[] | null,
    limit: number
): Promise<any[]> {
    const args: any = { dataContractId, documentTypeName, where, limit }
    if (orderBy) args.orderBy = orderBy
    const res = await sdk.documents.query(args)
    const docs = res instanceof Map ? Array.from(res.values()) : (Array.isArray(res) ? res : [])
    return docs.map(rawJson)
}

async function prefetchBundle(
    network: string,
    limit: number,
    ownerId?: string
): Promise<{ documents: Record<string, any[]> }> {
    const sdk = await connectEvoSdk(network)
    const documents: Record<string, any[]> = {}
    const contracts = getActivePostContracts(network)
    const where = ownerId
        ? [["$ownerId", "==", ownerId], ["$createdAt", ">", 0]]
        : [["language", "==", "en"], ["$createdAt", ">", 0]]
    const orderBy = ownerId
        ? [["$ownerId", "asc"], ["$createdAt", "desc"]]
        : [["language", "asc"], ["$createdAt", "desc"]]

    // Posts per active contract (exact shapes the Rust pipeline issues).
    for (const contract of contracts) {
        documents[`${contract}:post`] = await queryRaw(sdk, contract, 'post', where, orderBy, limit * 2)
    }

    // Parent posts (reply/quote targets) referenced by the fetched page.
    for (const contract of contracts) {
        const posts = documents[`${contract}:post`] || []
        const have = new Set(posts.map(p => p?.$id).filter(Boolean))
        const wanted = new Set<string>()
        for (const p of posts) {
            for (const key of ['replyToPostId', 'quotedPostId']) {
                const id = p?.[key]
                if (typeof id === 'string' && id && !have.has(id)) wanted.add(id)
            }
        }
        if (wanted.size) {
            try {
                const parents = await queryRaw(sdk, contract, 'post', [["$id", "in", [...wanted]]], null, wanted.size)
                documents[`${contract}:post`] = [...posts, ...parents]
            } catch {
                // Parents are optional — unresolved parents degrade to
                // flat reply/quote markers Rust-side.
            }
        }
    }

    // Author tiers (yappr profile → DPNS → DashPay), batched by owner.
    // Every tier is best-effort: a miss degrades to the anonymous-author
    // fallback Rust-side and is never cached as "answered empty".
    const ownerIds = ([...new Set(
        contracts.flatMap(c => (documents[`${c}:post`] || []).map(p => p?.$ownerId))
    )].filter(Boolean) as string[]).slice(0, PROFILE_FETCH_LIMIT)
    if (ownerIds.length) {
        const profileContract = network === 'mainnet'
            ? YAPPR_PROFILE_CONTRACT_ID_MAINNET
            : YAPPR_PROFILE_CONTRACT_ID_TESTNET
        const dpnsContract = network === 'mainnet'
            ? DPNS_CONTRACT_ID_MAINNET
            : DPNS_CONTRACT_ID_TESTNET
        const dashpayContract = network === 'mainnet'
            ? DASHPAY_CONTRACT_ID_MAINNET
            : DASHPAY_CONTRACT_ID_TESTNET
        if (profileContract) {
            try {
                documents[`${profileContract}:profile`] = await queryRaw(
                    sdk, profileContract, 'profile',
                    [["$ownerId", "in", ownerIds]], null, PROFILE_FETCH_LIMIT
                )
            } catch { /* tier unavailable → resolver degrades */ }
        }
        if (dpnsContract) {
            try {
                documents[`${dpnsContract}:domain`] = await queryRaw(
                    sdk, dpnsContract, 'domain',
                    [["records.identity", "in", ownerIds]], null, PROFILE_FETCH_LIMIT
                )
            } catch { /* tier unavailable → resolver degrades */ }
        }
        if (dashpayContract) {
            try {
                documents[`${dashpayContract}:profile`] = await queryRaw(
                    sdk, dashpayContract, 'profile',
                    [["$ownerId", "in", ownerIds]], [["$updatedAt", "desc"]], PROFILE_FETCH_LIMIT
                )
            } catch { /* tier unavailable → resolver degrades */ }
        }
    }
    return { documents }
}

/// Fallback feed fetch via the bundled DCG JS SDK (direct transport).
export async function fetchSocialFeedViaSdk(
    network: string,
    limit: number,
    ownerId?: string | null
): Promise<ISocialFeedPage> {
    const bundle = await prefetchBundle(network, limit, ownerId || undefined)
    // Same payload shape as the primary command (explicit null → None).
    return await invoke<ISocialFeedPage>('fetch_social_feed_prefetched', {
        bundle,
        network,
        limit,
        ownerId: ownerId || null
    })
}

/// Primary (Rust DAPI proxy) with automatic fallback to direct SDK
/// transport. The ORIGINAL error is rethrown if the fallback also fails,
/// so UI error states always describe the primary transport.
export async function fetchSocialFeedWithFallback(
    network: string,
    limit: number,
    ownerId?: string | null
): Promise<ISocialFeedPage> {
    const args = { network, limit, ownerId: ownerId || null }
    try {
        return await invoke<ISocialFeedPage>('fetch_social_feed', args)
    } catch (primaryError) {
        console.warn('[posts] primary feed transport failed, trying direct SDK fallback:', primaryError)
        try {
            return await fetchSocialFeedViaSdk(network, limit, ownerId)
        } catch {
            throw primaryError
        }
    }
}
