// src/utils/store.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary, StoreError } from './errors'

type StoreKey = 'assets' | 'identity' | 'license' | 'mnemonic' | 'keys' | 'settings'

export class StoreManager {
  private static readonly STORE_FILES: Record<StoreKey, string> = {
    assets: 'assets.json',
    identity: 'identity.json',
    license: 'license.json',
    mnemonic: 'mnemonic.json',
    keys: 'safu.json',
    settings: 'settings.json',
  }

  static async load<T>(store: StoreKey, key: string): Promise<T | null> {
    return ErrorBoundary.wrap(async () => {
      const result = await invoke<T | null>('load_store_data', {
        file: this.STORE_FILES[store],
        key,
      })

      return result
    }, `STORE_LOAD_${store.toUpperCase()}`)
  }

  static async save<T>(store: StoreKey, key: string, data: T): Promise<void> {
    return ErrorBoundary.wrap(async () => {
      await invoke('save_store_data', {
        file: this.STORE_FILES[store],
        key,
        data,
      })
    }, `STORE_SAVE_${store.toUpperCase()}`)
  }

  static async delete(store: StoreKey, key: string): Promise<void> {
    return ErrorBoundary.wrap(async () => {
      await invoke('delete_store_data', {
        file: this.STORE_FILES[store],
        key,
      })
    }, `STORE_DELETE_${store.toUpperCase()}`)
  }
}
