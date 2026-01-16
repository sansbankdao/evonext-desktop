// src/services/DashPlatformClient.ts

import { EvoSDK } from '@dashevo/evo-sdk'

const CONTRACT_ID = 'AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf' // YAPPR

export class DashPlatformClient {
    private static sdk: any = null

    private static async getSDK(network: string = 'testnet') {
        if (this.sdk) return this.sdk
        this.sdk = network === 'mainnet'
            ? EvoSDK.mainnetTrusted()
            : EvoSDK.testnetTrusted()
        await this.sdk.connect()
        return this.sdk
    }

    static async fetchPosts(options: { authorId?: string; limit?: number } = {}) {
        const sdk = await this.getSDK()

        // Setup base query
        // Hack: Range query on $createdAt allows us to use orderBy on it.
        const where: any[] = [['$createdAt', '>', 0]]
        if (options.authorId) {
            where.push(['$ownerId', '==', options.authorId])
        }

        try {
            const response = await sdk.documents.query({
                dataContractId: CONTRACT_ID,
                documentTypeName: 'post',
                where,
                orderBy: [['$createdAt', 'asc']],
                limit: options.limit || 20
            })

            let rawPosts: any[] = []
            if (response instanceof Map) {
                rawPosts = Array.from(response.values())
            } else if (Array.isArray(response)) {
                rawPosts = response
            }

            // Map $fields to flat fields for UI compatibility
            return rawPosts.map(doc => {
                const data = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
                return {
                    ...data,
                    id: data.$id,
                    ownerId: data.$ownerId,
                    createdAt: data.$createdAt,
                    type: data.$type
                }
            })
        } catch (err) {
            console.error('EvoSDK Query Failed:', err)
            return []
        }
    }
}
