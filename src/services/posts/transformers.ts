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
    return {
        identityId: ownerId,
        username: dpnsName ? `@${dpnsName}` : `@${abbreviateId(ownerId)}`,
        displayName: displayName || abbreviateId(ownerId),
        avatarUrl: avatarUrl || `https://avatar.evonext.app/${ownerId}`,
        verified: !!dpnsName,
        bio: ''
    }
}
export function transformPostDocument(
    doc: IPostDocument | any,
    dpnsName?: string | null
): IPost {
    const ownerId = doc.ownerId || doc.$ownerId || ''
    // Crucial: Restoring the 'id' (Document Hash) to the hydrated post
    const id = doc.id || doc.$id || ''
    const createdAt = parseInt(String(doc.createdAt || doc.$createdAt || Date.now()))
    const updatedAt = doc.updatedAt || doc.$updatedAt
        ? parseInt(String(doc.updatedAt || doc.$updatedAt))
        : createdAt
    const author = getUserInfo(ownerId, dpnsName)
    return {
        id, // Refactored: Ensured document id is present
        contractId: doc.dataContractId || 'TBD',
        ownerId,
        author,
        content: doc.content || '',
        createdAt,
        updatedAt,
        views: 0,
        likes: 0,
        remixes: 0,
        replies: 0,
        isSensitive: !!doc.isSensitive,
        language: doc.language || 'en',
        mediaUrls: doc.mediaUrls || doc.mediaUrl || []
    }
}
export function transformPostDocuments(
    documents: IPostDocument[],
    dpnsNames: Map<string, string> = new Map()
): IPost[] {
    return documents.map((doc) => {
        const ownerId = doc.ownerId || doc.$ownerId || ''
        return transformPostDocument(doc, dpnsNames.get(ownerId))
    })
}
