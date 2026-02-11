// src/services/identity/discovery/IdentityManager.ts

import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery, type ProgressCallback } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import {
    type IDiscoveredIdentity
} from '@/bindings'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    IIdentityActions,
} from '@/types'

export class IdentityManager {
    private keyDiscovery: KeyDiscovery
    private seedDiscovery: SeedDiscovery
    constructor(private store: IIdentityActions) {
        this.keyDiscovery = new KeyDiscovery(this.store)
        this.seedDiscovery = new SeedDiscovery(this.store)
    }
    setProgressCallback(callback: ProgressCallback) {
        this.seedDiscovery.setProgressCallback(callback)
    }
    cancelSeedDiscovery() {
        this.seedDiscovery.cancel()
    }
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        return await this.keyDiscovery.discover(keyInput, options)
    }
    async discoverFromSeed(
        seedPhrase: string,
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        return await this.seedDiscovery.discover(seedPhrase, options)
    }
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        if (!input?.trim()) return { success: false, error: 'Invalid input.' }
        const words = input.trim().split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            return this.discoverFromSeed(input, options)
        }
        return this.discoverFromKey(input, options)
    }
    async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<DiscoveryResult> {
        try {
            const result = await DAPIService.getIdentityById(identityId.trim(), network)
            if (result.success && result.data) {
                const id = result.data.identityId
                const dpnsUsername = await DAPIService.getDPNSUsername(id, network)
                const identity: IDiscoveredIdentity = {
                    identityId: id,
                    balance: result.data.balance?.toString() || '0',
                    identityIdx: 0,
                    dpnsUsername: dpnsUsername || null,
                    keyType: 'identity_id',
                    discoveredAt: new Date().toISOString()
                }
                return {
                    success: true,
                    identity: identity as any,
                    identities: null
                }
            }
            return { success: false, error: 'No identity found' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }
    cleanup() {
        this.cancelSeedDiscovery()
        KeyDerivationService.cleanup()
    }
}
let instance: IdentityManager | null = null
export function getIdentityManager(store: IIdentityActions): IdentityManager {
    if (!instance) {
        instance = new IdentityManager(store)
    }
    return instance
}
