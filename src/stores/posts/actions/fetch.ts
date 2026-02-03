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
import { invoke } from '@/utils/tauri'

// Helper to get network
function getCurrentNetwork() {
    const settings = useSettingsStore()
    const net = settings.state.network
    return (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
}

/**
 * PURE JS BASE58 IMPLEMENTATION
 */
const Base58 = {
    ALPHABET: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
    ALPHABET_MAP: {} as Record<string, number>,

    init() {
        if (Object.keys(this.ALPHABET_MAP).length === 0) {
            for (let i = 0; i < this.ALPHABET.length; i++) {
                this.ALPHABET_MAP[this.ALPHABET.charAt(i)] = i
            }
        }
    },

    encode(buffer: Uint8Array): string {
        this.init()
        const digits: number[] = [0]

        for (let i = 0; i < buffer.length; i++) {
            let carry = buffer[i] as number
            for (let j = 0; j < digits.length; ++j) {
                carry += (digits[j] as number) << 8
                digits[j] = carry % 58
                carry = ((carry as number) / 58) | 0
            }
            while (carry > 0) {
                digits.push((carry as number) % 58)
                carry = ((carry as number) / 58) | 0
            }
        }

        let result = ''
        for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
            result += '1'
        }
        for (let i = digits.length - 1; i >= 0; i--) {
            const index = digits[i] as number
            result += this.ALPHABET[index]
        }
        return result
    }
}

/**
 * Helper to ensure IDs are in Base58 format.
 */
function ensureBase58(id: string): string {
    if (!id) return id
    if (id.length === 44 && id.endsWith('=') || id.includes('+') || id.includes('/')) {
        try {
            const binaryString = atob(id)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            return Base58.encode(bytes)
        } catch (e) {
            return id
        }
    }
    return id
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
        const profiles = new Map<string, any>() // DPNS
        const yapprProfiles = new Map<string, any>() // YAPPR
        const dpnsNames = new Map<string, string>()
        const ownerIds = [...new Set(allDocsToProcess.map(doc => doc.ownerId || ''))].filter(Boolean)

        await Promise.all(
            ownerIds.map(async (ownerId) => {
                if (!ownerId) return

                // 6a. Fetch DPNS Profile
                const dpnsProfile = await api.fetchUserProfile(ownerId, network)
                if (dpnsProfile) {
                    profiles.set(ownerId, dpnsProfile)
                }

                // 6b. Fetch YAPPR Profile
                // CRITICAL FIX: YAPPR index is 'owner', NOT '$ownerId'
                const yapprContractId = network === 'testnet'
                    ? YAPPR_CONTRACT_ID_TESTNET
                    : YAPPR_CONTRACT_ID_TESTNET

                let yapprDocs: any[] = []
                try {
                    yapprDocs = await invoke<any[]>('get_posts', {
                        dataContractId: yapprContractId,
                        documentType: 'profile',
                        // FIX: Use 'ownerId' without the dollar sign for YAPPR query
                        whereClause: JSON.stringify([["$ownerId", "==", ensureBase58(ownerId)]]),
                        limit: 1,
                        orderBy: JSON.stringify([["$ownerId", "desc"]]),
                        // orderBy: JSON.stringify([]),
                        network
                    })
                } catch (err) {
                    // Suppress error
                }

                if (yapprDocs && yapprDocs.length > 0) {
                    yapprProfiles.set(ownerId, yapprDocs[0])
                }

                const dpnsName = await api.fetchDPNSName(ownerId, network)
                if (dpnsName) {
                    dpnsNames.set(ownerId, dpnsName)
                }
            })
        )

        // 7. Transform Data
        const parentPostsMap = new Map<string, IPost>()
        const transformedParents = transformers.transformPostDocuments(
            parentDocuments,
            profiles,
            yapprProfiles,
            dpnsNames
        )
        transformedParents.forEach(p => { if (p.id) parentPostsMap.set(p.id, p) })

        const posts = transformers.transformPostDocuments(
            finalDocuments,
            profiles,
            yapprProfiles,
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

        const primaryContractId = network === 'testnet' ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET

        const documents = await api.fetchPostsFromTauri(network, {
            contractId: primaryContractId,
            ownerId: '',
            orderBy: 'desc',
            limit: this.limit || 10
        })

        const posts = transformers.transformPostDocuments(
            documents,
            new Map(),
            new Map(),
            new Map()
        )

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

export async function fetchUserPostsAction(this: any, userId: string): Promise<void> {
    await this.fetchPosts({
        ownerId: userId,
        orderBy: 'newest',
        limit: 50
    })

    this.userPosts = this.posts.filter((p: any) => p.ownerId === userId)
}
