// src/composables/usePosts/transformers.ts

import type { IPost, IUser, IPostDocument } from '@/types'
import {
    generateAvatarUrl,
    // generatePostId,
    getDisplayNameFromId
} from './utils'

interface ProfileDocument {
    ownerId: string
    avatarUrl?: string
    displayName?: string
    publicMessage?: string
    avatarHash?: string
    avatarFingerprint?: string
}

// interface DPNSDocument {
//     label?: string
//     normalizedLabel?: string
//     normalizedParentDomainName?: string
//     records?: {
//         dashUniqueIdentityId?: string
//         dashAliasIdentityId?: string
//     }
// }

/**
 * Get user information from ownerId with DPNS/profile data
 * Enhanced version combining libs/userInfo.ts with store-based approach
 */
export async function getUserInfo(
    ownerId: string,
    profileData?: ProfileDocument | null,
    dpnsName?: string | null
): Promise<IUser> {
    // Use fetched data if available, otherwise fallback to generated names
    const username = dpnsName ? `@${dpnsName}` : `@user_${ownerId.slice(0, 4)}`
    const displayName = profileData?.displayName || getDisplayNameFromId(ownerId)

    return {
        username,
        displayName,
        avatar: profileData?.avatarUrl || generateAvatarUrl(ownerId, displayName),
        verified: dpnsName !== null,
        bio: profileData?.publicMessage || ''
    }
}

/**
 * Get avatar URL with fallback (your original function from usePosts.ts)
 */
export function getAvatarUrl(
    ownerId: string,
    profileData?: ProfileDocument | null
): string {
    if (profileData?.avatarUrl) {
        return profileData.avatarUrl
    }

    // Use ownerId for deterministic color
    const color = ownerId.slice(0, 6).replace(/[^0-9A-Fa-f]/g, '0')
    const background = color.match(/[0-9A-Fa-f]{6}/) ? color : '0ea5e9'

    // Try to get display name for initials
    const displayName = profileData?.displayName ||
                       ownerId.slice(0, 8).replace(/[^A-Za-z0-9]/g, 'X')

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${background}&color=fff`
}

/**
 * Transform blockchain document to IPost format
 */
export async function transformPostDocument(
    doc: IPostDocument | any,
    profileData?: any | null,
    dpnsName?: string | null,
    parentPost?: IPost | null // NEW: Accept parent post
): Promise<IPost> {
    const ownerId = doc.ownerId || doc.$ownerId || ''
    const docId = doc.id || doc.$id || '' // Ensure we capture the ID if present
    const createdAtTimestamp = parseInt(doc.createdAt || doc.$createdAt || Date.now().toString())
    const updatedAtTimestamp = parseInt(doc.updatedAt || doc.$updatedAt || createdAtTimestamp.toString())

    // Use provided data or fallback
    const author = await getUserInfo(ownerId, profileData, dpnsName)

    return {
        id: docId,
        contractId: 'TBD',
        ownerId,
        author,
        content: doc.content || '',
        createdAt: createdAtTimestamp,
        updatedAt: updatedAtTimestamp,
        views: 0,
        likes: 0,
        remixes: 0,
        replies: 0,
        isSensitive: doc.isSensitive || false,
        language: doc.language || 'en',
        remix: doc.remix,
        hashtag: doc.hashtag,
        mediaUrls: doc.mediaUrl || [],
        mentionIds: doc.mentionIds || [],
        replyToPostId: Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId,
        quotedPost: parentPost || undefined // NEW: Attach the parent post here
    }
}

/**
 * Transform multiple documents in parallel
 * UPDATED: Accepts parentPostsMap
 */
export async function transformPostDocuments(
    documents: IPostDocument[],
    profiles: Map<string, any> = new Map(),
    dpnsNames: Map<string, string> = new Map(),
    parentPostsMap: Map<string, IPost> = new Map() // NEW
): Promise<IPost[]> {
    const transformed = await Promise.all(
        documents.map(async (doc) => {
            const ownerId = doc.ownerId || ''
            const profileData = profiles.get(ownerId)
            const dpnsName = dpnsNames.get(ownerId)

            // Check if this document is a reply and fetch the parent from the map
            const replyToId = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
            const parentPost = replyToId ? parentPostsMap.get(replyToId) : undefined

            return transformPostDocument(doc, profileData, dpnsName, parentPost)
        })
    )
    return transformed
}
