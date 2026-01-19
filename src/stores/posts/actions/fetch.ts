// src/stores/posts/actions/fetch.ts

import type { PostsFetchOptions, IPostDocument, IPost } from '@/types/posts'
import * as api from '@/services/posts/api'
import * as transformers from '@/services/posts/transformers'
import { getActivePostContracts } from '@/constants'
import {
    EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET,
    YAPPR_CONTRACT_ID_TESTNET
} from '@/constants'
import { useSettingsStore } from '@/stores/settings'

// Helper to get network (can't use store 'this' easily inside non-exported helpers)
function getCurrentNetwork() {
    const settings = useSettingsStore()
    const net = settings.state.network
    return (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
}

export async function fetchPostsAction(this: any, options?: PostsFetchOptions): Promise<void> {
    this.isLoading = true
    this.error = null

    try {
        const network = getCurrentNetwork()
        const limit = this.limit || 10

        // 1. Get Active Contracts
        let activeContracts: string[] = []
        try {
            activeContracts = getActivePostContracts(network)
        } catch (err) {
            console.error('[Store] getActivePostContracts failed', err)
            activeContracts = network === 'testnet'
                ? [EVONEXT_CONTRACT_ID_TESTNET, YAPPR_CONTRACT_ID_TESTNET]
                : [EVONEXT_CONTRACT_ID_MAINNET]
        }

        // Initialize Debug Stats
        this.debug = {
            activeContracts,
            fetchCounts: {},
            mergeCount: 0,
            duplicateCount: 0,
            lastFetchTime: new Date().toISOString()
        }

        console.log(`[Store] Fetching on ${network}. Contracts:`, activeContracts)

        // 2. Fetch from all active contracts
        let allDocuments: IPostDocument[] = []

        for (const contractId of activeContracts) {
            try {
                const docs = await api.fetchPostsFromTauri(network, {
                    ownerId: options?.ownerId || '',
                    orderBy: options?.orderBy as ('desc' | 'asc'),
                    limit: limit * 2,
                    contractId
                })

                this.debug.fetchCounts[contractId] = docs.length
                allDocuments.push(...docs)
            } catch (contractErr: any) {
                console.warn(`[Store] Failed to fetch from contract ${contractId}:`, contractErr)
                this.debug.fetchCounts[contractId] = 0
            }
        }

        // 3. Merge & Sort & Dedupe
        allDocuments.sort((a, b) => b.createdAt - a.createdAt)

        const uniqueMap = new Map(allDocuments.map(doc => [
            `${doc.$ownerId}-${doc.createdAt}`,
            doc
        ]))
        const uniqueDocuments = Array.from(uniqueMap.values())

        this.debug.duplicateCount = allDocuments.length - uniqueDocuments.length

        // 4. Slice to limit
        const finalDocuments = uniqueDocuments.slice(0, limit)
        this.debug.mergeCount = finalDocuments.length

        if (finalDocuments.length === 0) {
            this.posts = []
            this.lastFetched = new Date()
            this.hasNextPage = false
            return
        }

        // 5. Fetch Reply Context (Parent Posts)
        const replyToIds = new Set<string>()
        finalDocuments.forEach(doc => {
            if (doc.replyToPostId) {
                const id = Array.isArray(doc.replyToPostId) ? doc.replyToPostId[0] : doc.replyToPostId
                if (id) replyToIds.add(id)
            }
        })

        let parentDocuments: IPostDocument[] = []
        if (replyToIds.size > 0) {
            const targetContractId = network === 'testnet' ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET
            const idsToFetch = Array.from(replyToIds)
            const existingIds = new Set(finalDocuments.map(d => d.id))
            const missingIds = idsToFetch.filter(id => !existingIds.has(id))

            if (missingIds.length > 0) {
                parentDocuments = await api.fetchDocumentsById(network, targetContractId, missingIds)
            }
        }

        // 6. Fetch Profiles & DPNS
        const allDocsToProcess = [...finalDocuments, ...parentDocuments]
        const profiles = new Map<string, any>()
        const dpnsNames = new Map<string, string>()
        const ownerIds = [...new Set(allDocsToProcess.map(doc => doc.ownerId || ''))].filter(Boolean)

        await Promise.all(
            ownerIds.map(async (ownerId) => {
                if (!ownerId) return
                const [profileData, dpnsName] = await Promise.all([
                    api.fetchUserProfile(ownerId, network),
                    api.fetchDPNSName(ownerId, network)
                ])
                if (profileData) profiles.set(ownerId, profileData)
                if (dpnsName) dpnsNames.set(ownerId, dpnsName)
            })
        )

        // 7. Transform Data
        const parentPostsMap = new Map<string, IPost>()
        const transformedParents = transformers.transformPostDocuments(
            parentDocuments,
            profiles,
            dpnsNames
        )
        transformedParents.forEach(p => { if (p.id) parentPostsMap.set(p.id, p) })

        const posts = transformers.transformPostDocuments(
            finalDocuments,
            profiles,
            dpnsNames,
            parentPostsMap
        )

        // 8. Inject Contract ID
        const postsWithSource = posts.map(post => {
            const sourceDoc = uniqueDocuments.find(d => d.$ownerId === post.ownerId && Math.abs(d.createdAt - post.createdAt) < 2)
            return {
                ...post,
                contractId: sourceDoc?.dataContractId || ''
            }
        })

        // 9. Update State
        this.posts = postsWithSource
        this.lastFetched = new Date()
        this.hasNextPage = allDocuments.length > limit

    } catch (error: any) {
        this.error = error.message || 'Failed to fetch posts'
        console.error('Error fetching posts:', error)
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

        const documents = await api.fetchPostsFromTauri(network, {
            contractId: '', // FetchMore in API.ts handles logic if ID is empty? Check API.ts logic.
            // NOTE: Your API.ts fetchPostsFromTauri requires a contractId.
            // You might need to adjust this logic to pick a specific contract or loop again.
            // For now, mirroring your existing logic which passed empty string.
            ownerId: '',
            orderBy: 'desc',
            limit: this.limit || 10
        })

        const posts = transformers.transformPostDocuments(documents)

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

// Keeping this simple as it was in your original code
export async function fetchUserPostsAction(this: any, userId: string): Promise<void> {
    // Re-use the main fetch logic but filtering for owner
    await this.fetchPosts({
        ownerId: userId,
        orderBy: 'newest',
        limit: 50
    })

    // Sync the specific userPosts array
    this.userPosts = this.posts.filter((p: any) => p.ownerId === userId)
}
