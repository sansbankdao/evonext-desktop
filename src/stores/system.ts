// src/stores/system.ts
import { defineStore } from 'pinia'

interface DashPriceData {
    name: string
    symbol: string
    slug: string
    quote: {
        USD: {
            price: number
            pctChg24h: number
            vol24: number
            marketCap: number
        }
    }
    maxSupply: number
    cmcRank: number
    updatedAt: string
}

interface SystemState {
    dashPrice: number | null
    dashPriceData: DashPriceData | null
    isLoading: boolean
    lastUpdated: Date | null
    error: string | null
    priceUpdateInterval: number | null
}

export const useSystemStore = defineStore('system', {
    state: (): SystemState => ({
        dashPrice: null,
        dashPriceData: null,
        isLoading: false,
        lastUpdated: null,
        error: null,
        priceUpdateInterval: null
    }),

    getters: {
        currentDashPrice: (state): number => state.dashPrice || 25, // Fallback to $25
        priceChange24h: (state): number => state.dashPriceData?.quote?.USD?.pctChg24h || 0,
        isPricePositive: (state): boolean => (state.dashPriceData?.quote?.USD?.pctChg24h || 0) > 0
    },

    actions: {
        async fetchDashPrice() {
            this.isLoading = true
            this.error = null

            try {
                const response = await fetch('https://dashswap.xyz/v1/ticker/dash')
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data: DashPriceData = await response.json()
                this.dashPrice = data.quote.USD.price
                this.dashPriceData = data
                this.lastUpdated = new Date()

                console.log('DASH price updated:', this.dashPrice)
            } catch (err) {
                console.error('Failed to fetch DASH price:', err)
                this.error = err instanceof Error ? err.message : 'Failed to fetch price data'
                // Keep previous price if available, otherwise use fallback
                if (!this.dashPrice) {
                    this.dashPrice = 25
                }
            } finally {
                this.isLoading = false
            }
        },

        startPriceUpdates() {
            // Only start if not already running
            if (this.priceUpdateInterval !== null) {
                console.log('Price updates already running')
                return
            }

            // Initial fetch
            this.fetchDashPrice()

            // Set up interval for updates every 30 seconds
            this.priceUpdateInterval = setInterval(() => {
                this.fetchDashPrice()
            }, 30000) as unknown as number

            console.log('Started price updates')
        },

        stopPriceUpdates() {
            if (this.priceUpdateInterval !== null) {
                clearInterval(this.priceUpdateInterval)
                this.priceUpdateInterval = null
                console.log('Stopped price updates')
            }
        }
    }
})
