// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { usePlatform } from '@/composables/usePlatform'
import type {
    ConnectionResult,
    IIdentityState,
    DiscoveredIdentity,
    IIdentity,
    RustDiscoveredIdentitiesStore
} from '@/types'

interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

interface StoredMnemonic {
    seedPhrase: string;
}

const loadStorageData = async <T>(
    command: string,
    network: 'mainnet' | 'testnet',
    params?: any
): Promise<T | null> => {
    try {
        let args = { network, ...params };
        return await invoke<T | null>(command, args)
    } catch (err) {
        console.error(`[DEBUG Frontend Storage] Failed ${command}:`, err)
        return null
    }
}

export const connectionActions = () => ({
    async saveDiscoveredIdentities(
        this: IIdentityState,
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> {
        return ErrorBoundary.wrap(async () => {
            try {
                const mappedIdentities = identities.map(id => ({
                    identityId: id.identityId,
                    identityIdx: id.identityIdx || 0,
                    dpnsUsername: id.dpnsUsername || null,
                    balance: typeof id.balance === 'string' ? id.balance : id.balance?.toString(),
                    keyType: keyType,
                    discoveredKey: null,
                    discoveredAt: new Date().toISOString()
                }))
                const count = await invoke<number>('save_discovered_identities', {
                    network,
                    discoveredIdentities: mappedIdentities
                })
                return { success: true, savedCount: count }
            } catch (err: any) {
                log('error', 'Failed to save discovered identities:', err)
                return { success: false, savedCount: 0, error: err.toString() }
            }
        }, 'SAVE_DISCOVERED_IDENTITIES_FAILED')
    },
    async initFromStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            try {
                const settings = await invoke<Settings>('load_settings')
                const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
                const identityData = await loadStorageData<any>('load_identity_data', network)
                if (identityData?.identityId && identityData.isAuthenticated) {
                    this.username = identityData.identityId
                    this.identityId = identityData.identityId
                    this.isAuthenticated = true
                    const { initialize } = usePlatform()
                    const mnemonicData = await loadStorageData<StoredMnemonic>('load_mnemonic', network);
                    if(mnemonicData?.seedPhrase) {
                        await initialize({ network, wallet: { mnemonic: mnemonicData.seedPhrase }})
                    } else {
                        await initialize({ network })
                    }
                    const restoredIdentity: IIdentity = {
                        identityId: identityData.identityId,
                        identityIdx: identityData.identityIdx || 0,
                        balance: identityData.balance || '0',
                        revision: identityData.revision,
                        publicKeys: identityData.publicKeys || []
                    }
                    this.identity = restoredIdentity
                    this.publicKeys = identityData.publicKeys || []
                    return
                }
            } catch (err) {
                log('error', 'Failed to initialize identity from storage:', err)
            }
        }, 'INIT_FROM_STORAGE_FAILED')
    },
    async switchIdentity(
        this: IIdentityState,
        targetIdentityId: string
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true;
            try {
                const settings = await invoke<Settings>('load_settings');
                const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet');
                const mnemonicData = await loadStorageData<StoredMnemonic>('load_mnemonic', network);
                if (!mnemonicData?.seedPhrase) throw new Error('No seed phrase found.');
                const discovered = await loadStorageData<RustDiscoveredIdentitiesStore>('load_discovered_identities', network);
                let targetIdx = 0;
                if (discovered && discovered.identities && discovered.identities[targetIdentityId]) {
                    targetIdx = discovered.identities[targetIdentityId].identityIdx;
                }
                return await this.connectWithSeed(mnemonicData.seedPhrase, network, targetIdentityId, targetIdx);
            } catch(e: any) {
                this.connectionError = e.message;
                return { success: false, error: e.message };
            } finally {
                this.isConnecting = false;
            }
        }, 'SWITCH_IDENTITY_FAILED');
    },
    async connectWithSeed(
        this: IIdentityState,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
        targetId: string,
        identityIndex: number = 0
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                const { initialize, reset } = usePlatform()
                reset()
                await initialize({
                    network,
                    wallet: {
                        mnemonic: seedPhrase,
                        unsafeOptions: { skipSynchronizationBeforeHeight: 950000 }
                    }
                })
                await invoke('save_mnemonic', { network, payload: { seedPhrase: seedPhrase } })
                const existingKeys = await loadStorageData<any[]>('get_identity_private_keys', network, { identityId: targetId })
                if (!existingKeys || existingKeys.length === 0) {
                    const now = new Date().toISOString()
                    const privateKeyEntries: any[] = []
                    for (let i = 0; i < 5; i++) {
                        try {
                            const res = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, i)
                            privateKeyEntries.push({
                                identityId: targetId,
                                keyId: i,
                                purpose: i === 0 ? 0 : 3,
                                securityLevel: 0,
                                keyType: 'ecdsa',
                                privateKey: res.privateKey.WIF(),
                                publicKey: '',
                                derivedFromMnemonic: true,
                                createdAt: now,
                                lastUsed: now
                            })
                        } catch (e) { /* ignore */ }
                    }
                    if (privateKeyEntries.length > 0) {
                        await invoke('save_private_keys', {
                            network,
                            identityId: targetId,
                            privateKeys: privateKeyEntries
                        })
                    }
                }
                const fetchResult = await DAPIService.getIdentityById(targetId, network);
                if (!fetchResult.success || !fetchResult.data) {
                    throw new Error(fetchResult.error || `Failed to fetch identity ${targetId}`);
                }
                const identityData = fetchResult.data;
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId
                const activeIdentity: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance ? identityData.balance.toString() : '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: identityData.publicKeys || []
                }
                this.identity = activeIdentity
                this.publicKeys = identityData.publicKeys || []
                this.balance = activeIdentity.balance
                if (typeof this.saveToStorage === 'function') await this.saveToStorage(network)
                return { success: true, identityId: targetId, identity: activeIdentity }
            } catch (err: any) {
                this.connectionError = err.message || 'Failed to connect'
                return { success: false, error: this.connectionError! }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SEED_FAILED')
    },
    async connectWithSingleKey(
        this: IIdentityState,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                const trimmedId = identityId.trim()
                if (!trimmedId) throw new Error('Identity ID is required')
                const { initialize, reset } = usePlatform()
                reset()
                await initialize({
                    network,
                    wallet: {
                        privateKey: privateKey,
                        unsafeOptions: { skipSynchronizationBeforeHeight: 950000 }
                    }
                })
                const fetchResult = await DAPIService.getIdentityById(trimmedId, network);
                if (!fetchResult.success || !fetchResult.data) {
                    throw new Error(fetchResult.error || 'Failed to fetch identity details.');
                }
                const identityData = fetchResult.data;
                const publicKeys = identityData.publicKeys || []
                const now = new Date().toISOString()
                const firstAuthKey = publicKeys.find((pk: any) => pk.purpose === 0)
                const privateKeyEntry = {
                    identityId: trimmedId,
                    keyId: firstAuthKey?.id || 0,
                    purpose: 0,
                    securityLevel: firstAuthKey?.securityLevel || 0,
                    keyType: firstAuthKey?.keyType || 'ecdsa',
                    privateKey: privateKey,
                    publicKey: firstAuthKey?.data || '',
                    derivedFromMnemonic: false,
                    createdAt: now,
                    lastUsed: now
                }
                await invoke('save_private_keys', {
                    network,
                    identityId: trimmedId,
                    privateKeys: [privateKeyEntry]
                })
                this.isAuthenticated = true
                this.username = trimmedId
                this.identityId = trimmedId
                const activeIdentity: IIdentity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: identityData.balance ? identityData.balance.toString() : '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: publicKeys
                }
                this.identity = activeIdentity
                if (typeof this.saveToStorage === 'function') await this.saveToStorage(network)
                return { success: true, identityId: trimmedId, identity: activeIdentity }
            } catch (err: any) {
                this.connectionError = err.message || 'Failed to connect'
                return { success: false, error: this.connectionError! }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },
    async searchUserIdentities(this: IIdentityState, network: 'mainnet' | 'testnet'): Promise<DiscoveredIdentity[]> {
        return ErrorBoundary.wrap(async () => {
            const result = await DAPIService.getIdentityById(this.username || this.identityId || '', network)
            if (result.success && result.data) {
                return [{
                    identityId: result.data.id,
                    identityIdx: this.identity?.identityIdx || 0,
                    balance: result.data.balance,
                    publicKeys: result.data.publicKeys || []
                }]
            }
            return []
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        const storage = this as any
        if (typeof storage.saveToStorage === 'function') await storage.saveToStorage(networkOverride)
    },
    async clearStorage(this: IIdentityState) {
        try {
            const settings = await invoke<Settings>('load_settings')
            const network = settings?.network === 'testnet' ? 'testnet' : 'mainnet'
            await Promise.all([
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network }),
                invoke('clear_discovered_identities', { network })
            ])
        } catch (e) { console.error(e) }
    },
    async logout(this: IIdentityState) {
        if (typeof this.clearStorage === 'function') await this.clearStorage()
        const { reset } = usePlatform()
        reset()
        this.username = null
        this.identityId = null
        this.isAuthenticated = false
    },
    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    }
})
