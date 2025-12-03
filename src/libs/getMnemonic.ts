// src/libs/getMnemonic.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { IMnemonic }  from '@/types'

export default async (): Promise<string> => {
    /* Request mnemonic. */
    const mnemonicStore = await invoke<IMnemonic | null>('load_mnemonic')

    /* Validate mnemonic store. */
    if (typeof mnemonicStore !== 'undefined' && mnemonicStore !== null) {
        return mnemonicStore.seed_phrase
    } else {
        throw new Error('No mnemonic found.')
    }
}
