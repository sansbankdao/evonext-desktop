// src/stores/identity/actions/mnemonic.ts

import { commands } from '@/bindings'
import { normalizeResult } from './identity'

export function mnemonicActions() {
    return {
        async saveMnemonicToStore(
            this: any,
            network: string,
            seedPhrase: string
        ): Promise<{ success: boolean; error?: any }> {
            try {
                const response = await commands.saveMnemonic(network, { seedPhrase })
                const result = normalizeResult<any>(response)
                if (!result.success) {
                    return { success: false, error: result.error?.message || 'Failed to save mnemonic' }
                }
                return { success: true }
            } catch (err: any) {
                console.error('[MnemonicActions] saveMnemonicToStore failed:', err)
                return { success: false, error: err?.message || 'Failed to save mnemonic' }
            }
        },

        async loadMnemonicFromStore(
            this: any,
            network: string
        ): Promise<{ success: boolean; data?: string; error?: any }> {
            try {
                const response = await commands.loadMnemonic(network)
                const result = normalizeResult<any>(response)
                if (result.success && result.data) {
                    return { success: true, data: result.data.seedPhrase || result.data }
                }
                return { success: false, error: 'No mnemonic found' }
            } catch (err: any) {
                console.error('[MnemonicActions] loadMnemonicFromStore failed:', err)
                return { success: false, error: err?.message || 'Failed to load mnemonic' }
            }
        },

        async deleteMnemonicFromStore(
            this: any,
            network: string
        ): Promise<{ success: boolean; error?: any }> {
            try {
                const response = await commands.deleteMnemonic(network)
                const result = normalizeResult<any>(response)
                if (!result.success) {
                    return { success: false, error: result.error?.message || 'Failed to delete mnemonic' }
                }
                return { success: true }
            } catch (err: any) {
                console.error('[MnemonicActions] deleteMnemonicFromStore failed:', err)
                return { success: false, error: err?.message || 'Failed to delete mnemonic' }
            }
        }
    }
}
