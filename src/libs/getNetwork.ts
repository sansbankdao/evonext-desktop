// src/libs/getNetwork.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import type { IAppSettings } from '@/types'

export default async (): Promise<'testnet' | 'mainnet'> => {
    /* Request settings. */
    const settings = await invoke<IAppSettings | null>('load_settings')

    /* Validate settings. */
    if (settings && settings.network && (settings.network === 'testnet' || settings.network === 'mainnet')) {
        return settings.network as 'testnet' | 'mainnet'
    } else {
        // NOTE: Default to Testnet.
        return 'testnet'
    }
}
