// src/libs/posts/userInfo.ts

import type { IPostAuthor } from '@/types/posts'
/**
 * Generate a unique avatar URL based on ownerId
 */
function generateAvatarUrl(ownerId: string, name?: string): string {
    // Use the first 6 chars of ownerId as color
    const color = ownerId.slice(0, 6)
    const background = color.match(/[0-9A-Fa-f]{6}/) ? color : '0ea5e9'
    const userName = name || 'User'

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=${background}&color=fff`
}

/**
 * Get a username from ownerId (this would typically come from DPNS)
 */
function getUsernameFromId(ownerId: string): string {
    // In a real app, this would query DPNS
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
    const hash = Array.from(ownerId).reduce((acc, char) => acc + char.charCodeAt(0), 0)

    return names[hash % names.length]
}

/**
 * Get display name from ownerId (this would typically come from profile document)
 */
function getDisplayNameFromId(ownerId: string): string {
    return getUsernameFromId(ownerId)
}

/**
 * Get user information from ownerId
 */
export async function getUserInfo(ownerId: string): Promise<IPostAuthor> {
    // TODO: Fetch actual profile data from blockchain
    const username = getUsernameFromId(ownerId)
    const displayName = getDisplayNameFromId(ownerId)

    return {
        username: `@${username.toLowerCase()}`,
        displayName,
        avatar: generateAvatarUrl(ownerId, displayName),
        verified: Math.random() > 0.8 // 20% chance of being verified
    }
}
