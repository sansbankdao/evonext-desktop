// src/stores/system.ts

/* Import modules. */
import { defineStore } from 'pinia'

import { DASHSWAP_ENDPOINT } from '@/constants'
import { IDashPriceData, ISystemState } from '@/types'

export const useSystemStore = defineStore('system', {
    state: (): ISystemState => ({
        dashPrice: null,

        dashPriceData: null,

        isLoading: false,

        lastUpdated: null,

        error: null,

        priceUpdateInterval: null
    }),

    getters: {
        currentDashPrice: (state): number => state.dashPrice || 0, // Fallback to $0.00

        priceChange24h: (state): number => state.dashPriceData?.quote?.USD?.pctChg24h || 0,

        isPricePositive: (state): boolean => (state.dashPriceData?.quote?.USD?.pctChg24h || 0) > 0
    },

    actions: {
        async fetchDashPrice() {
            this.isLoading = true
            this.error = null

            try {
                const response = await fetch(DASHSWAP_ENDPOINT + 'ticker/dash')
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data: IDashPriceData = await response.json()

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
