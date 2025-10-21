/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { IMnemonic }  from './types.ts'

export default async () => {
    /* Request mnemonic. */
    const mnemonicStore = await invoke<IMnemonic | null>('load_mnemonic')
console.log('MNEMONIC (getMnemonic)', mnemonicStore)

    /* Validate mnemonic store. */
    if (typeof mnemonicStore !== 'undefined' && mnemonicStore !== null) {
        return mnemonicStore.mnemonic
    } else {
        null
    }
}
