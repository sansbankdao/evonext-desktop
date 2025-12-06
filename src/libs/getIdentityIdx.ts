// src/libs/getIdentityIdx.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import type { IIdentity }  from '@/types'

export default async (): Promise<number> => {
    /* Request identity. */
    const identityStore = await invoke<IIdentity | null>('load_identity_data')

    /* Validate identity store. */
    if (typeof identityStore !== 'undefined' && identityStore !== null) {
        return identityStore.idx
    } else {
        return 0 // NOTE: We default to ZERO (index).
    }
}
