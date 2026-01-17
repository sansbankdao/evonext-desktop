// src/composables/usePosts/transformers.ts

import { invoke } from '@tauri-apps/api/core' // Required for fetching missing data
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
 * Get user information from ownerId with DPNS/profile data
 *
 * STRATEGY:
 * 1. Use passed data if available (Optimal path).
 * 2. If DPNS name is missing -> QUERY RUST BACKEND (`get_dpns_username`) to find real username.
 * 3. If Profile data is missing -> Fallback to abbreviated Identity ID logic.
 */
export async function getUserInfo(
    ownerId: string,
    profileData?: ProfileDocument | null,
    dpnsName?: string | null
): Promise<IUser> {
    let finalDpnsName = dpnsName
    let finalProfileData = profileData

    // =========================================================================
    // AGGRESSIVE DATA FETCHING (Fallback to ensure UI has real data)
    // =========================================================================

    // A. Try to fetch DPNS name from Rust if we don't have one
    if (!finalDpnsName) {
        try {
            // Calls: commands::dapi_commands::get_dpns_username
            const name = await invoke<string>('get_dpns_username', { identityId: ownerId })
            if (name) {
                finalDpnsName = name
            }
        } catch (error) {
            // Silent fail, fallback to abbreviated ID logic below
            console.debug(`[Transformer] No DPNS found for ${ownerId}`)
        }
    }

    // B. NOTE: We cannot easily fetch the full Profile Document here without a heavy generic fetch.
    // If profileData is missing, we fallback to ID-based display below.

    // =========================================================================
    // CONSTRUCT USER OBJECT
    // =========================================================================

    // Use DPNS name, or abbreviated Identity ID
    const username = finalDpnsName ? `@${finalDpnsName}` : `@${abbreviateId(ownerId)}`

    // Use Profile Display Name, or abbreviated Identity ID
    // This prevents "Alice", "Charlie", etc. from showing
    const displayName = finalProfileData?.displayName || abbreviateId(ownerId)

    return {
        username,
        displayName,
        avatar: finalProfileData?.avatarUrl || generateAvatarUrl(ownerId, displayName),
        verified: finalDpnsName !== null,
        bio: finalProfileData?.publicMessage || ''
    }
}

/**
 * Get avatar URL with fallback
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

    // Use abbreviated Identity ID for initials if no display name
    const displayName = profileData?.displayName || abbreviateId(ownerId)

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${background}&color=fff`
}

/**
 * Transform blockchain document to IPost format
 */
export async function transformPostDocument(
    doc: IPostDocument | any,
    profileData?: any | null,
    dpnsName?: string | null,
    parentPost?: IPost | null
): Promise<IPost> {
    const ownerId = doc.ownerId || doc.$ownerId || ''
    const docId = doc.id || doc.$id || ''
    const createdAtTimestamp = parseInt(doc.createdAt || doc.$createdAt || Date.now().toString())
    const updatedAtTimestamp = parseInt(doc.updatedAt || doc.$updatedAt || createdAtTimestamp.toString())

    const author = await getUserInfo(ownerId, profileData, dpnsName)

    // 1. Build the base object with required fields
    const post: IPost = {
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
        isSensitive: !!doc.isSensitive,
        language: doc.language || 'en',
    }

    // 2. Conditionally add optional fields ONLY if they have values
    // This satisfies exactOptionalPropertyTypes
    if (doc.remix) post.remix = doc.remix
    if (doc.hashtag) post.hashtag = doc.hashtag

    // Media - Use plural mediaUrls from IPost interface
    if (doc.mediaUrl && doc.mediaUrl.length > 0) {
        post.mediaUrls = doc.mediaUrl
    }

    if (doc.mentionIds && doc.mentionIds.length > 0) {
        post.mentionIds = doc.mentionIds
    }

    // Handle reply ID normalization
    const replyId = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
    if (replyId) {
        post.replyToPostId = replyId
    }

    // Attach parent post
    if (parentPost) {
        post.quotedPost = parentPost
    }

    return post
}

/**
 * Transform multiple documents in parallel
 */
export async function transformPostDocuments(
    documents: IPostDocument[],
    profiles: Map<string, any> = new Map(),
    dpnsNames: Map<string, string> = new Map(),
    parentPostsMap: Map<string, IPost> = new Map()
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
