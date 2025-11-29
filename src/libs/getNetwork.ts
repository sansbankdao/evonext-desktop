// src/libs/getNetwork.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { INetwork }  from './types.ts'

export default async () => {
    /* Request mnemonic. */
    const networkStore = await invoke<INetwork | null>('load_settings')

    /* Validate mnemonic store. */
    if (typeof networkStore !== 'undefined' && networkStore !== null) {
        return networkStore.network
    } else {
        // NOTE: Default to Testnet.
        return 'testnet' as const
    }
}
