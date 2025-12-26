// src/libs/posts/api.ts

/* Import modules. */
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
import { getUserInfo } from './userInfo'
import { transformPostDocument } from './transformers'
import { getPostStats } from './stats'

/* Import constants. */
import {
    EVONEXT_CONTRACT_ID_TESTNET,
    EVONEXT_CONTRACT_ID_MAINNET,
} from '@/constants'

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
 * Make a request to the DAPI endpoint
 */
async function makeDAPIRequest<T>(method: string, params: any[]): Promise<T[]> {
    const contractId = getContractId()

    const network = isTestnet() ? 'testnet' : 'mainnet'

    const requestBody: DAPIRequest = {
        method,
        params,
        network
    }

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

    const data: DAPIResponse<T> = await response.json()

    if (!data.success) {
        throw new Error('Failed to fetch data from blockchain')
    }
    return data.result
}

/**
 * Fetch posts from the blockchain
 */
export async function fetchPosts(options?: PostsFetchOptions): Promise<PostsFetchResult> {
    try {
        console.log('Fetching posts for contract:', getContractId())
        const posts = await makeDAPIRequest<IPostDocument>('get_documents', [getContractId(), 'post'])

        // Transform documents
        const transformedPosts = await Promise.all(
            posts.map(doc => transformPostDocument(doc))
        )

        // Apply filters if provided
        let filteredPosts = transformedPosts

        if (options) {
            filteredPosts = applyFilters(filteredPosts, options)
        }

        // Fetch stats for each post
        const postsWithStats = await Promise.all(
            filteredPosts.map(async (post) => {
                try {
                    const stats = await getPostStats(post.id!)

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
 * Apply filters to posts
 */
function applyFilters(posts: IPost[], options: PostsFetchOptions): IPost[] {
    let filtered = [...posts]

    if (options.ownerId) {
        filtered = filtered.filter(post => post.ownerId === options.ownerId)
    }

    if (options.language) {
        filtered = filtered.filter(post => post.language === options.language)
    }

    if (options.fromDate) {
        filtered = filtered.filter(post => post.createdAt >= options.fromDate!)
    }

    if (options.toDate) {
        filtered = filtered.filter(post => post.createdAt <= options.toDate!)
    }

    // Sort
    if (options.orderBy === 'newest') {
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } else if (options.orderBy === 'oldest') {
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }

    // Limit
    if (options.limit && filtered.length > options.limit) {
        filtered = filtered.slice(0, options.limit)
    }

    return filtered
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
        console.log('Creating post with params:', params)

        // TODO: Implement actual post creation using Dash SDK
        // This would involve creating a document and submitting a state transition
        const author = await getUserInfo(identityStore.identity.id || '')

        const mockPost: IPost = {
            id: 'FIXME-this-is-a-fake-ID',
            ownerId: identityStore.identity.id || '',
            author,
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
        // This might be stored locally
        localStorage.setItem(`bookmark_${postId}`, 'true')
        return true
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
        localStorage.removeItem(`bookmark_${postId}`)
        return true
    } catch (error: any) {
        console.error('Error unbookmarking post:', error)
        throw error
    }
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: string): Promise<IPost | null> {
    try {
        const result = await fetchPosts({})
        return result.posts.find(post => post.id === postId) || null
    } catch (error: any) {
        console.error('Error fetching post by ID:', error)
        return null
    }
}

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
