// src/services/posts/transformers.ts

import type { IPost, IUser, IPostDocument } from '@/types'
import {
    generateAvatarUrl,
} from './utils'

interface ProfileDocument {
    ownerId: string
    avatarUrl?: string
    displayName?: string
    publicMessage?: string
    avatarHash?: string
    avatarFingerprint?: string
}

// Helper to abbreviate long Identity IDs
// Goal: Show approx 1/3 of actual length (15-18 chars)
// Format: First 11 chars + "..." + Last 4 chars
const abbreviateId = (id: string) => {
    if (!id) return '...'
    // Dash IDs are 44 chars. 11 + 3 + 4 = 18 chars
    return `${id.slice(0, 11)}...${id.slice(-4)}`
}

/**
 * PURE FUNCTION: Get user information from ownerId with DPNS/profile data.
 *
 * STRATEGY:
 * 1. Prefer DPNS Profile if available.
 * 2. Fall back to YAPPR Profile if DPNS is missing.
 * 3. Fallback to abbreviated Identity ID logic if both are missing.
 *
 * @param ownerId - The Identity ID of the user.
 * @param profileData - The profile document from the DashPay contract (DPNS profile).
 * @param yapprProfile - The profile document from the YAPPR contract.
 * @param dpnsName - The DPNS name (e.g., "alice.dash").
 */
export function getUserInfo(
    ownerId: string,
    profileData?: ProfileDocument | null,
    yapprProfile?: ProfileDocument | null,
    dpnsName?: string | null
): IUser {
    let displayName: string
    let avatar: string
    let bio: string = ''
    let verified: boolean = !!dpnsName
    let username: string = dpnsName ? `@${dpnsName}` : `@${abbreviateId(ownerId)}`

    // 1. Check DPNS Profile first (Priority)
    if (profileData?.displayName) {
        displayName = profileData.displayName
        avatar = profileData.avatarUrl || generateAvatarUrl(ownerId, displayName)
        bio = profileData.publicMessage || ''
        verified = !!dpnsName // Strictly DPNS verification
    }
    // 2. Fall back to YAPPR Profile
    else if (yapprProfile?.displayName) {
        displayName = yapprProfile.displayName
        avatar = yapprProfile.avatarUrl || generateAvatarUrl(ownerId, displayName)
        bio = yapprProfile.publicMessage || ''
        // Note: YAPPR users are not "Verified" in the traditional DPNS sense,
        // but they have a custom name. We keep verified false to distinguish from DPNS,
        // or you could set it to true if you consider YAPPR name ownership verification.
        verified = false
    }
    // 3. Fallback to abbreviated ID
    else {
        displayName = abbreviateId(ownerId)
        avatar = generateAvatarUrl(ownerId, displayName)
    }

    return {
        username,
        displayName,
        avatar,
        verified,
        bio
    }
}

/**
 * PURE FUNCTION: Transform blockchain document to IPost format
 */
export function transformPostDocument(
    doc: IPostDocument | any,
    profileData?: any | null,
    yapprProfile?: any | null,
    dpnsName?: string | null,
    parentPost?: IPost | null
): IPost {
    const ownerId = doc.ownerId || doc.$ownerId || ''
    const docId = doc.id || doc.$id || ''

    // Handle timestamps (ensure numbers)
    const createdAtTimestamp = parseInt(doc.createdAt || doc.$createdAt || Date.now().toString())
    const updatedAtTimestamp = parseInt(doc.updatedAt || doc.$updatedAt || createdAtTimestamp.toString())

    const author = getUserInfo(ownerId, profileData, yapprProfile, dpnsName)

    // 1. Build the base object with required fields
    const post: IPost = {
        id: docId,
        contractId: 'TBD', // This is populated later by the store
        ownerId,
        author,
        content: doc.content || '',
        createdAt: createdAtTimestamp,
        updatedAt: updatedAtTimestamp,
        views: 0,
        likes: 0,
        remixes: 0,
        replies: 0,
        isSensitive: !!doc.isSensitive,
        language: doc.language || 'en',
    }

    // 2. Conditionally add optional fields ONLY if they have values
    if (doc.remix) post.remix = doc.remix
    if (doc.hashtag) post.hashtag = doc.hashtag

    // Media - Use plural mediaUrls from IPost interface
    if (doc.mediaUrl && doc.mediaUrl.length > 0) {
        post.mediaUrls = doc.mediaUrl
    }

    if (doc.mentionIds && doc.mentionIds.length > 0) {
        post.mentionIds = doc.mentionIds
    }

    // Handle reply ID normalization (array to string)
    const replyId = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
    if (replyId) {
        post.replyToPostId = replyId
    }

    // Attach parent post (Quoted/Remixed post)
    if (parentPost) {
        post.quotedPost = parentPost
    }

    return post
}

/**
 * Transform multiple documents synchronously (no internal await)
 */
export function transformPostDocuments(
    documents: IPostDocument[],
    profiles: Map<string, any> = new Map(),
    yapprProfiles: Map<string, any> = new Map(),
    dpnsNames: Map<string, string> = new Map(),
    parentPostsMap: Map<string, IPost> = new Map()
): IPost[] {
    // We remove the 'await' from the map because transformPostDocument is now synchronous.
    // This makes list rendering instant.
    return documents.map((doc) => {
        const ownerId = doc.ownerId || ''

        // Look up data from the maps populated by usePosts
        const profileData = profiles.get(ownerId)
        const yapprProfile = yapprProfiles.get(ownerId)
        const dpnsName = dpnsNames.get(ownerId)

        // Check if this document is a reply and fetch parent from map
        const replyToId = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
        const parentPost = replyToId ? parentPostsMap.get(replyToId) : undefined

        return transformPostDocument(doc, profileData, yapprProfile, dpnsName, parentPost)
    })
}
