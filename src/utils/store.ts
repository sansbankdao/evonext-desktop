// src/utils/store.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from './errors'
type StoreType =
    | 'assets'
    | 'identity'
    | 'license'
    | 'mnemonic'
    | 'private_keys'
    | 'settings'
interface StoreConfig {
    commandPrefix: string
    keyName: string
}
export class StoreManager {
    private static readonly STORE_CONFIG: Record<StoreType, StoreConfig> = {
        assets: { commandPrefix: 'assets', keyName: 'assets' },
        identity: { commandPrefix: 'identity_data', keyName: 'identity' },
        license: { commandPrefix: 'license', keyName: 'license' },
        mnemonic: { commandPrefix: 'mnemonic', keyName: 'mnemonic' },
        private_keys: { commandPrefix: 'private_keys', keyName: 'keys' },
        settings: { commandPrefix: 'settings', keyName: 'settings' },
    }
    static async load<T>(store: StoreType): Promise<T | null> {
        return ErrorBoundary.wrap(async () => {
            const config = this.STORE_CONFIG[store]
            const result = await invoke<T | null>(`load_${config.commandPrefix}`)
            return result
        }, `STORE_LOAD_${store.toUpperCase()}`)
    }
    static async save<T>(store: StoreType, data: T): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            const config = this.STORE_CONFIG[store]
            await invoke(`save_${config.commandPrefix}`, { payload: data })
        }, `STORE_SAVE_${store.toUpperCase()}`)
    }
    static async delete(store: StoreType): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            const config = this.STORE_CONFIG[store]
            const deleteCommand = `delete_${config.commandPrefix}`
            // Check if delete command exists (not all may have delete)
            try {
                await invoke(deleteCommand)
            } catch (error) {
                console.warn(`Delete command not implemented for ${store}:`, error)
                // For stores without delete, we can save empty/default data
                const emptyData = this.getEmptyData(store)
                await this.save(store, emptyData)
            }
        }, `STORE_DELETE_${store.toUpperCase()}`)
    }
    private static getEmptyData(store: StoreType): any {
        switch(store) {
            case 'assets': return null
            case 'identity': return {
                username: '',
                identity_id: '',
                identity_idx: 0,
                balance: null,
                is_authenticated: false,
                public_keys: null,
                revision: null,
                created_at: null,
                public_key_ids: null
            }
            case 'license': return { license_id: '' }
            case 'mnemonic': return { seed_phrase: '' }
            case 'private_keys': return {
                identity_id: '',
                auth_key: '',
                transfer_key: '',
                encryption_key: ''
            }
            case 'settings': return {
                theme: 'system',
                network: 'testnet',
                notifications: {
                    messages: true,
                    mentions: true,
                    contact_requests: false,
                },
                profile: {
                    display_name: '',
                    username: '',
                    bio: '',
                },
            }
            default: return null
        }
    }
}
