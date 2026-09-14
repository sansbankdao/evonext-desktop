// src/stores/posts/actions/fetch.ts

import type { PostsFetchOptions, IPost } from '@/types/posts'
import type { IUser } from '@/types/identity'
import type { ISocialAuthorProfile, ISocialPost } from '@/types/social'
import * as api from '@/services/posts/fetching'
import * as transformers from '@/services/posts/transformers'
import { avatarSrc, generateAvatarSvg } from '@/services/posts/avatar'
import { fetchSocialFeedWithFallback } from '@/services/posts/fallbackFeed'
import { getActivePostContracts } from '@/constants'
import {
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET
} from '@/constants'
import { useSettingsStore } from '@/stores/settings'

function getCurrentNetwork() {
    const settings = useSettingsStore()
    const net = settings.state.network
    return (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
}

/**
 * Map the Rust-resolved author profile onto the legacy IUser shape.
 * DiceBear avatars are generated LOCALLY (data URI) — the old
 * api.dicebear.com fallback leaked identity IDs to a third party.
 */
function socialAuthorToIUser(author: ISocialAuthorProfile): IUser {
    return {
        identityId: author.identityId,
        username: author.username,
        displayName: author.displayName,
        avatar: avatarSrc(author.avatar, author.identityId),
        // (exactOptionalPropertyTypes: omit — never assign undefined)
        ...(author.avatar.kind === 'uri' ? { avatarUrl: author.avatar.uri } : {}),
        ...(author.avatar.kind === 'dicebear'
            ? { avatarSvg: generateAvatarSvg(author.avatar.style, author.avatar.seed) }
            : {}),
        verified: author.verified,
        bio: author.bio
    }
}

function socialPostToIPost(post: ISocialPost): IPost {
    return {
        id: post.id,
        contractId: post.contractId,
        source: post.source,
        ownerId: post.ownerId,
        author: socialAuthorToIUser(post.author),
        content: post.content,
        contentParts: post.contentParts,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        views: 0,
        likes: 0,
        remixes: 0,
        replies: 0,
        isSensitive: post.sensitive,
        language: post.language,
        mediaUrls: post.mediaUrls,
        replyToPostId: post.replyToPostId ?? undefined,
        replyTo: post.replyTo ? socialPostToIPost(post.replyTo) : undefined,
        quotedPost: post.quotedPost ? socialPostToIPost(post.quotedPost) : undefined
    }
}

export async function fetchPostsAction(this: any, options?: PostsFetchOptions): Promise<void> {
    this.isLoading = true
    this.error = null

    try {
        const network = getCurrentNetwork()
        const limit = this.limit || 10

        this.debug = {
            activeContracts: getActivePostContracts(network),
            fetchCounts: {},
            mergeCount: 0,
            duplicateCount: 0,
            lastFetchTime: new Date().toISOString()
        }

        // All orchestration — multi-contract fetch, $id dedupe, author
        // resolution (Yappr profile → DPNS → DashPay), avatar field
        // parsing, Phase A content parsing — lives Rust-side behind one
        // typed command (src-tauri/src/social). Fixes the verified bugs
        // in the old TS path (see docs/HANDOFF-yappr-enablement.md):
        // profile lookups hit the Yappr PROFILE contract (not the posts
        // contract), dedupe is by $id (not ownerId+createdAt), and
        // avatars no longer leak identity IDs to api.dicebear.com.
        // Primary transport is the Rust DAPI HTTP proxy; on failure the
        // feed is prefetched via the bundled DCG JS SDK (direct
        // masternode transport) and rendered by the SAME Rust pipeline
        // (fetch_social_feed_prefetched). The original error is rethrown
        // if the fallback also fails.
        const page = await fetchSocialFeedWithFallback(network, limit, options?.ownerId || null)

        this.debug.fetchCounts = page.fetchedCounts
        this.debug.mergeCount = page.posts.length
        this.debug.duplicateCount = page.duplicateCount

        this.posts = page.posts.map(socialPostToIPost)
        this.lastFetched = new Date()

        const uniqueFetched =
            Object.values(page.fetchedCounts).reduce((sum, n) => sum + n, 0) - page.duplicateCount
        this.hasNextPage = uniqueFetched > limit

    } catch (error: any) {
        this.error = error.message || 'Failed to fetch posts'
    } finally {
        this.isLoading = false
    }
}

export async function fetchMorePostsAction(this: any): Promise<void> {
    if (!this.hasNextPage || this.isLoading) return

    this.isLoading = true
    this.error = null

    try {
        const network = getCurrentNetwork()
        const newOffset = (this.offset || 0) + this.limit

        const primaryContractId = network === 'testnet' ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET

        const documents = await api.fetchPostsFromTauri(network, {
            contractId: primaryContractId,
            ownerId: '',
            orderBy: 'desc',
            limit: this.limit || 10
        })

        const posts = transformers.transformPostDocuments(
            documents,
            new Map(),
            new Map(),
            new Map()
        )

        this.posts = [...this.posts, ...posts]
        this.offset = newOffset
        this.hasNextPage = documents.length === this.limit
        this.lastFetched = new Date()

    } catch (error: any) {
        this.error = error.message || 'Failed to load more posts'
    } finally {
        this.isLoading = false
    }
}

export async function fetchUserPostsAction(this: any, userId: string): Promise<void> {
    await this.fetchPosts({
        ownerId: userId,
        orderBy: 'newest',
        limit: 50
    })

    this.userPosts = this.posts.filter((p: any) => p.ownerId === userId)
}
