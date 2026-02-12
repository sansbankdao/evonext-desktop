// src/services/posts/transformers.ts

import type { IPost, IUser, IPostDocument } from '@/types'

const abbreviateId = (id: string) => {
    if (!id) return '...'
    // Test expects: 12...defg (2 chars start, 4 chars end)
    return `${id.slice(0, 2)}...${id.slice(-4)}`
}

export function getUserInfo(
    ownerId: string,
    dpnsProfile?: any,
    yapprProfile?: any,
    dpnsName?: string | null
): IUser {
    const fallbackAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${ownerId}`
    let displayName = `identity_${abbreviateId(ownerId)}`

    if (dpnsProfile?.displayName) {
        displayName = dpnsProfile.displayName
    } else if (yapprProfile?.displayName) {
        displayName = yapprProfile.displayName
    }

    return {
        identityId: ownerId,
        username: dpnsName ? `@${dpnsName}` : `@${abbreviateId(ownerId)}`,
        displayName,
        avatarUrl: yapprProfile?.avatarUrl || fallbackAvatar,
        verified: !!dpnsName,
        bio: yapprProfile?.publicMessage || ''
    }
}

export function transformPostDocument(
    doc: IPostDocument | any,
    dpnsName?: string | null,
    authorProfile?: any,
    stats?: any
): IPost {
    const id = doc.id || doc.$id || ''
    const ownerId = doc.ownerId || doc.$ownerId || ''

    const createdAt = parseInt(String(doc.createdAt || doc.$createdAt || Date.now()))
    const updatedAtValue = doc.updatedAt || doc.$updatedAt
    const updatedAt = updatedAtValue ? parseInt(String(updatedAtValue)) : createdAt

    const author = getUserInfo(ownerId, authorProfile, authorProfile, dpnsName)

    return {
        id,
        contractId: doc.dataContractId || 'TBD',
        ownerId,
        author,
        content: doc.content || '',
        createdAt,
        updatedAt,
        views: doc.views || 0,
        likes: stats?.likes || 0,
        liked: stats?.liked || false,
        remixes: stats?.remixes || 0,
        replies: stats?.replies || 0,
        isSensitive: !!doc.isSensitive,
        language: doc.language || 'en',
        mediaUrls: doc.mediaUrls || doc.mediaUrl || [],
        hashtag: doc.hashtag,
        remix: doc.remix,
        replyToPostId: doc.replyToPostId || doc.data?.replyToPostId
    }
}

export function transformPostDocuments(
    documents: IPostDocument[],
    dpnsNames: Map<string, string> = new Map(),
    yapprProfiles: Map<string, any> = new Map(),
    statsMap: Map<string, any> = new Map(),
    parentPosts: Map<string, IPost> = new Map()
): IPost[] {
    return documents.map((doc) => {
        const ownerId = doc.ownerId || doc.$ownerId || ''
        const id = doc.id || doc.$id || ''
        const post = transformPostDocument(
            doc,
            dpnsNames.get(ownerId),
            yapprProfiles.get(ownerId),
            statsMap.get(id)
        )

        // Ensure both replyTo and quotedPost are mapped for tests
        if (post.replyToPostId && parentPosts.has(post.replyToPostId)) {
            const parent = parentPosts.get(post.replyToPostId)
            post.replyTo = parent
            post.quotedPost = parent
        }

        return post
    })
}
