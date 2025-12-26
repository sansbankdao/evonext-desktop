// src/libs/posts/index.ts

/* Import modules. */
import { EVONEXT_CONTRACT_ID_TESTNET, EVONEXT_CONTRACT_ID_MAINNET } from '@/constants'
import { isTestnet } from '@/utils/env'
import type {
    IPostDocument,
    IPost,
    IPostAuthor,
    ICreatePostParams,
    IUpdatePostParams,
    PostsFetchResult,
    PostsFetchOptions
} from '@/types/posts'
import { useIdentityStore } from '@/stores/identity'

const DAPI_ENDPOINT = 'https://dashqt.org/v1/dapi'

// Types for API requests
interface DAPIRequest {
    method: string;
    params: any[];
    network?: string;
}

interface DAPIResponse<T = any> {
    success: boolean;
    method: string;
    params: any[];
    network: string;
    result: T[];
}

/**
 * Get the current data contract ID based on network
 */
function getContractId(): string {
    return isTestnet() ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET
}

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
    // For now, generate a name from the first part of the ID
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
    const hash = Array.from(ownerId).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return names[hash % names.length]
}

/**
 * Get display name from ownerId (this would typically come from profile document)
 */
function getDisplayNameFromId(ownerId: string): string {
    // In a real app, this would fetch the profile document
    // For now, return a display name based on the ID
    return getUsernameFromId(ownerId)
}

/**
 * Get user information from ownerId
 */
async function getUserInfo(ownerId: string): Promise<IPostAuthor> {
    // TODO: Fetch actual profile data from blockchain
    // For now, generate mock data based on ID
    const username = getUsernameFromId(ownerId)
    const displayName = getDisplayNameFromId(ownerId)
    return {
        username: `@${username.toLowerCase()}`,
        displayName,
        avatar: generateAvatarUrl(ownerId, displayName),
        verified: Math.random() > 0.8 // 20% chance of being verified
    }
}

/**
 * Transform blockchain document to IPost format
 */
async function transformPostDocument(doc: IPostDocument): Promise<IPost> {
    const author = await getUserInfo(doc.ownerId)
    return {
        id: doc.id,
        ownerId: doc.ownerId,
        author,
        content: doc.content,
        createdAt: new Date(parseInt(doc.createdAt)),
        updatedAt: new Date(parseInt(doc.updatedAt)),
        likes: 0, // Will need to fetch from like documents
        remixes: 0, // Will need to fetch from remix documents
        replies: 0, // Will need to fetch from reply documents
        isSensitive: doc.isSensitive || false,
        language: doc.language || 'en',
        remix: doc.remix,
        hashtag: doc.hashtag,
        mediaUrls: doc.mediaUrl,
        mentionIds: doc.mentionIds,
        replyToPostId: doc.replyToPostId?.[0]
    }
}

/**
 * Fetch posts from the blockchain
 */
export async function fetchPosts(options?: PostsFetchOptions): Promise<PostsFetchResult> {
    try {
        const contractId = getContractId()
        const network = isTestnet() ? 'testnet' : 'mainnet'
        console.log('Fetching posts for contract:', contractId, 'network:', network)
        const requestBody: DAPIRequest = {
            method: 'get_documents',
            params: [contractId, 'post'],
            network
        }
        console.log('Fetching posts from DAPI:', DAPI_ENDPOINT, requestBody)
        const response = await fetch(DAPI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        })
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: DAPIResponse<IPostDocument> = await response.json()
        console.log('Posts API response:', data)
        if (!data.success) {
            throw new Error('Failed to fetch posts from blockchain')
        }
        // Transform documents
        const posts = await Promise.all(
            data.result.map(doc => transformPostDocument(doc))
        )
        // Apply filters if provided
        let filteredPosts = posts
        if (options) {
            if (options.ownerId) {
                filteredPosts = filteredPosts.filter(post => post.ownerId === options.ownerId)
            }
            if (options.language) {
                filteredPosts = filteredPosts.filter(post => post.language === options.language)
            }
            if (options.fromDate) {
                filteredPosts = filteredPosts.filter(post => post.createdAt >= options.fromDate!)
            }
            if (options.toDate) {
                filteredPosts = filteredPosts.filter(post => post.createdAt <= options.toDate!)
            }
            // Sort
            if (options.orderBy === 'newest') {
                filteredPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            } else if (options.orderBy === 'oldest') {
                filteredPosts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            }
            // Limit
            if (options.limit && filteredPosts.length > options.limit) {
                filteredPosts = filteredPosts.slice(0, options.limit)
            }
        }
        // Fetch stats for each post (likes, remixes, replies)
        // Note: In a production app, you'd want to batch these requests
        const postsWithStats = await Promise.all(
            filteredPosts.map(async (post) => {
                try {
                    const stats = await getPostStats(post.id)
                    return {
                        ...post,
                        likes: stats.likes || 0,
                        remixes: stats.remixes || 0,
                        replies: stats.replies || 0
                    }
                } catch (error) {
                    console.error(`Error fetching stats for post ${post.id}:`, error)
                    return post
                }
            })
        )
        console.log(`Fetched ${postsWithStats.length} posts`)
        return {
            posts: postsWithStats,
            hasNextPage: false // Simple pagination for now
        }
    } catch (error: any) {
        console.error('Error fetching posts:', error)
        throw error
    }
}

/**
 * Fetch posts for a specific user
 */
export async function fetchUserPosts(userId: string): Promise<IPost[]> {
    const result = await fetchPosts({
        ownerId: userId,
        orderBy: 'newest'
    })
    return result.posts
}

/**
 * Create a new post
 */
export async function createPost(params: ICreatePostParams): Promise<IPost | null> {
    try {
        const identityStore = useIdentityStore()
        if (!identityStore.identity) {
            throw new Error('No identity found. Please connect your wallet.')
        }
        // TODO: Implement actual post creation using Dash SDK
        // This would involve creating a document and submitting a state transition
        console.log('Creating post with params:', params)
        // For now, return a mock post
        const mockPost: IPost = {
            id: 'e5f53b5a-d9e3-425a-bb49-c6ef9b93b067',
            ownerId: identityStore.identity.id || '',
            author: {
                username: `@${identityStore.username?.toLowerCase() || 'user'}`,
                displayName: identityStore.username || 'User',
                avatar: generateAvatarUrl(identityStore.identity.id || 'user', identityStore.username || 'User'),
                verified: false
            },
            content: params.content,
            createdAt: new Date(),
            updatedAt: new Date(),
            likes: 0,
            remixes: 0,
            replies: 0,
            isSensitive: params.isSensitive || false,
            language: params.language || 'en'
        }
        return mockPost
    } catch (error: any) {
        console.error('Error creating post:', error)
        throw error
    }
}

/**
 * Update an existing post
 */
export async function updatePost(postId: string, updates: IUpdatePostParams): Promise<boolean> {
    try {
        console.log('Updating post:', postId, updates)
        // TODO: Implement actual post update using Dash SDK
        // This would involve fetching the document, updating it, and submitting a state transition
        return true // Mock success
    } catch (error: any) {
        console.error('Error updating post:', error)
        throw error
    }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<boolean> {
    try {
        console.log('Deleting post:', postId)
        // TODO: Implement actual post deletion using Dash SDK
        // This would involve submitting a document delete state transition
        return true // Mock success
    } catch (error: any) {
        console.error('Error deleting post:', error)
        throw error
    }
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<boolean> {
    try {
        console.log('Liking post:', postId)
        // TODO: Implement actual like creation using Dash SDK
        // This would involve creating a like document
        return true // Mock success
    } catch (error: any) {
        console.error('Error liking post:', error)
        throw error
    }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<boolean> {
    try {
        console.log('Unliking post:', postId)
        // TODO: Implement actual like deletion using Dash SDK
        // This would involve deleting a like document
        return true // Mock success
    } catch (error: any) {
        console.error('Error unliking post:', error)
        throw error
    }
}

/**
 * Bookmark a post
 */
export async function bookmarkPost(postId: string): Promise<boolean> {
    try {
        console.log('Bookmarking post:', postId)
        // TODO: Implement bookmark functionality
        // This might be stored locally or in a separate document
        return true // Mock success
    } catch (error: any) {
        console.error('Error bookmarking post:', error)
        throw error
    }
}

/**
 * Unbookmark a post
 */
export async function unbookmarkPost(postId: string): Promise<boolean> {
    try {
        console.log('Unbookmarking post:', postId)
        // TODO: Implement bookmark removal
        return true // Mock success
    } catch (error: any) {
        console.error('Error unbookmarking post:', error)
        throw error
    }
}

/**
 * Get post statistics (likes, remixes, replies)
 */
export async function getPostStats(
    postId: string
): Promise<{
    likes: number;
    remixes: number;
    replies: number;
    bookmarks?: number;
}> {
    try {
        // TODO: Fetch actual stats from blockchain
        // For now, return mock stats
        return {
            likes: Math.floor(Math.random() * 100),
            remixes: Math.floor(Math.random() * 10),
            replies: Math.floor(Math.random() * 20),
            bookmarks: Math.floor(Math.random() * 10)
        }
    } catch (error: any) {
        console.error('Error fetching post stats:', error)
        return { likes: 0, remixes: 0, replies: 0, bookmarks: 0 }
    }
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: string): Promise<IPost | null> {
    try {
        // For now, fetch all posts and find the one we need
        const result = await fetchPosts({})
        return result.posts.find(post => post.id === postId) || null
    } catch (error: any) {
        console.error('Error fetching post by ID:', error)
        return null
    }
}

// Export API utilities
export default {
    fetchPosts,
    fetchUserPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
    getPostStats,
    getPostById
}
