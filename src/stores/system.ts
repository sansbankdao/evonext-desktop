// src/stores/system.ts

import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { DASHSWAP_ENDPOINT } from '@/utils/env'
import type { IDashPriceData } from '@/types'

const PRICE_UPDATE_INTERVAL_MS = 30_000
const DEFAULT_DASH_PRICE = 25

export const useSystemStore = defineStore('system', () => {
    const dashPrice = ref<number | null>(null)
    const dashPriceData = ref<IDashPriceData | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const lastUpdated = ref<Date | null>(null)
    const priceUpdateInterval = ref<number | null>(null)

    const currentDashPrice = computed(() => dashPrice.value ?? DEFAULT_DASH_PRICE)
    const priceChange24h = computed(() => dashPriceData.value?.quote?.USD?.pctChg24h ?? 0)
    const isPricePositive = computed(() => priceChange24h.value > 0)

    const fetchDashPrice = async () => {
        isLoading.value = true
        error.value = null

        try {
            const response = await fetch(`${DASHSWAP_ENDPOINT}/ticker/dash`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data: IDashPriceData = await response.json()

            dashPrice.value = data.quote.USD.price
            dashPriceData.value = data
            lastUpdated.value = new Date()
        } catch (err: unknown) {
            console.error('Failed to fetch DASH price:', err)
            error.value = err instanceof Error ? err.message : 'Failed to fetch price data'

            if (!dashPrice.value) {
                dashPrice.value = DEFAULT_DASH_PRICE
            }
        } finally {
            isLoading.value = false
        }
    }

    const startPriceUpdates = () => {
        if (priceUpdateInterval.value !== null) {
            return
        }

        fetchDashPrice()

        priceUpdateInterval.value = window.setInterval(() => {
            fetchDashPrice()
        }, PRICE_UPDATE_INTERVAL_MS)
    }

    const stopPriceUpdates = () => {
        if (priceUpdateInterval.value !== null) {
            clearInterval(priceUpdateInterval.value)
            priceUpdateInterval.value = null
        }
    }

    const resetError = () => {
        error.value = null
    }

    startPriceUpdates()

    onUnmounted(() => {
        stopPriceUpdates()
    })

    return {
        dashPrice,
        dashPriceData,
        isLoading,
        error,
        lastUpdated,
        currentDashPrice,
        priceChange24h,
        isPricePositive,
        fetchDashPrice,
        startPriceUpdates,
        stopPriceUpdates,
        resetError
    }
})
