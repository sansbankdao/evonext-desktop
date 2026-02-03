// src/utils/store.ts
import { invoke } from '@/utils/tauri'
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
        assets: { commandPrefix: 'asset', keyName: 'assets' },
        identity: { commandPrefix: 'identity', keyName: 'identity' },
        license: { commandPrefix: 'license', keyName: 'license' },
        mnemonic: { commandPrefix: 'mnemonic', keyName: 'mnemonic' },
        private_keys: { commandPrefix: 'identity', keyName: 'keys' },
        settings: { commandPrefix: 'settings', keyName: 'settings' },
    }

    private static unwrap<T>(response: any): T {
        if (response?.status === 'error' || response?.success === false) {
            throw new Error(response.error || 'Store operation failed')
        }
        // Extract inner data from Specta (data) or Legacy (payload)
        return (response?.data ?? response?.payload ?? response) as T
    }

    static async load<T>(store: StoreType): Promise<T | null> {
        // Cast the whole wrap result to unknown then T | null to satisfy strict generic rules
        const result = await ErrorBoundary.wrap<any>(async () => {
            const config = this.STORE_CONFIG[store]
            const res = await invoke(`load_${config.commandPrefix}`)
            return this.unwrap<T | null>(res)
        }, `STORE_LOAD_${store.toUpperCase()}`)

        return result as T | null
    }

    static async save<T>(store: StoreType, data: T): Promise<void> {
        // Await the wrap but don't return its result value to ensure Promise<void>
        await ErrorBoundary.wrap<void>(async () => {
            const config = this.STORE_CONFIG[store]
            const res = await invoke(`save_${config.commandPrefix}`, {
                payload: data
            })
            this.unwrap<void>(res)
        }, `STORE_SAVE_${store.toUpperCase()}`)
    }

    static async delete(store: StoreType): Promise<void> {
        await ErrorBoundary.wrap<void>(async () => {
            const config = this.STORE_CONFIG[store]
            const deleteCommand = `delete_${config.commandPrefix}`
            try {
                const res = await invoke(deleteCommand)
                this.unwrap<void>(res)
            } catch (error) {
                console.warn(`Delete failed for ${store}, resetting to empty:`, error)
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
                identityId: '',
                identityIdx: 0,
                balance: '0',
                isAuthenticated: false,
                publicKeys: [],
                revision: 0
            }
            case 'license': return { success: false, identityId: '', isPremium: false }
            case 'mnemonic': return { seedPhrase: '' }
            case 'private_keys': return { identities: {} }
            case 'settings': return { theme: 'system', network: 'testnet' }
            default: return null
        }
    }

    static async remove(store: StoreType): Promise<void> {
        const res = await invoke('remove_store', { store })
        this.unwrap<void>(res)
    }
}
