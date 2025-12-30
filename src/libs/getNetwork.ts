// src/libs/getNetwork.ts
import { invoke } from '@tauri-apps/api/core'
import type { IAppSettings } from '@/types'

export default async (): Promise<'testnet' | 'mainnet'> => {
    try {
        /* Request settings. */
        const settings = await invoke<{ network: string } | null>('load_settings')

        /* Validate settings. */
        if (settings && settings.network && (settings.network === 'testnet' || settings.network === 'mainnet')) {
            console.log(`[getNetwork] Returning: ${settings.network}`)
            return settings.network as 'testnet' | 'mainnet'
        }

        // Fallback if network missing or invalid
        console.warn('[getNetwork] No valid network in settings, defaulting to testnet')
        return 'testnet'
    } catch (error) {
        console.error('[getNetwork] Failed to load settings:', error)
        // Default to testnet if there's any issue
        return 'testnet'
    }
}
