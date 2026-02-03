// src/stores/identity/actions/keys.ts

import { invoke } from '@/utils/tauri'
import { ErrorBoundary } from '@/utils/errors'
import { getTransferKey } from './get_key'

export { getTransferKey }

export const keyActions = {
    async importPrivateKey(
        this: any,
        identityId: string,
        keyId: number,
        privateKey: string,
        network: string
    ): Promise<boolean> {
        const result = await ErrorBoundary.wrap(async () => {
            console.log(`[Store] Importing Key ID ${keyId} for ${identityId} on ${network}`)

            const success = await invoke<boolean>('save_imported_key', {
                identityId,
                keyId,
                privateKeyHex: privateKey,
                network
            })

            return success
        }, 'IMPORT_PRIVATE_KEY_FAILED')

        // FIX: Access .data directly and provide a boolean fallback
        return !!result.data
    }
}
