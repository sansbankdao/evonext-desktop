// src/services/posts/transformers.ts

import type { IPost, IUser, IPostDocument } from '@/types'

const abbreviateId = (id: string) => {
    if (!id) return '...'
    return `${id.slice(0, 11)}...${id.slice(-4)}`
}

export function getUserInfo(
    ownerId: string,
    dpnsName?: string | null,
    displayName?: string | null,
    avatarUrl?: string | null
): IUser {
    const fallbackAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${ownerId}`
    // Hardened logic to ensure string type for TS2322
    const nameStr: string = (displayName || (dpnsName ? dpnsName.split('.')[0] : abbreviateId(ownerId))) ?? 'Unnamed User';
    return {
        identityId: ownerId,
        username: dpnsName ? `@${dpnsName}` : `@${abbreviateId(ownerId)}`,
        displayName: nameStr,
        avatarUrl: avatarUrl || fallbackAvatar,
        verified: !!dpnsName,
        bio: ''
    }
}

export function transformPostDocument(
    doc: IPostDocument | any,
    dpnsName?: string | null,
    authorProfile?: any,
    stats?: any
): IPost {
    // RESOLVED: Correctly extract id from document fallbacks
    const id = doc.id || doc.$id || ''
    const ownerId = doc.ownerId || doc.$ownerId || ''
    const createdAt = parseInt(String(doc.createdAt || doc.$createdAt || Date.now()))
    const updatedAt = doc.updatedAt || doc.$updatedAt
        ? parseInt(String(doc.updatedAt || doc.$updatedAt))
        : null

    const author = getUserInfo(
        ownerId,
        dpnsName,
        authorProfile?.displayName,
        authorProfile?.avatarUrl
    )

    return {
        id, // Correctly mapped to IPost.id
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
        replyToPostId: doc.replyToPostId
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

        if (post.replyToPostId && parentPosts.has(post.replyToPostId)) {
            post.replyTo = parentPosts.get(post.replyToPostId)
        }
        return post
    })
}
