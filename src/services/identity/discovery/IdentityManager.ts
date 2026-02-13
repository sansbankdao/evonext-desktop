// src/services/identity/discovery/IdentityManager.ts

import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery, type ProgressCallback } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type { DiscoveryResult, DiscoveryOptions, IIdentityActions, DiscoveredIdentity, } from '@/types/identity'

export class IdentityManager {
  private keyDiscovery: KeyDiscovery
  private seedDiscovery: SeedDiscovery

  constructor(private store: IIdentityActions) {
    this.keyDiscovery = new KeyDiscovery(this.store)
    this.seedDiscovery = new SeedDiscovery()
  }

  async discover(input: string, options: DiscoveryOptions = { network: 'testnet' }): Promise<DiscoveryResult> {
    const isSeed = input.trim().split(/\s+/).length >= 12
    if (isSeed) {
      return this.discoverFromSeed(input, options)
    }
    return this.discoverFromKey(input, options)
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

  async getIdentityById(
    identityId: string,
    network: 'mainnet' | 'testnet' = 'testnet'
  ): Promise<DiscoveryResult> {
    try {
      const result = await DAPIService.getIdentityById(identityId.trim(), network)
      if (result.success && result.data && result.data.identityId) {
        const identityId: string = result.data.identityId
        const dpnsResult = await DAPIService.getDPNSUsername(identityId, network)
        const identity: DiscoveredIdentity = {
          identityId: identityId,
          identityIdx: 0,
          balance: result.data.balance?.toString() || '0',
          revision: Number(result.data.revision || 0),
          dpnsUsername: dpnsResult.data || null,
          publicKeys: (result.data.publicKeys || []).map((pk: any, idx: number) => ({
            idx,
            keyType: pk.keyType,
            purpose: pk.purpose,
            securityLevel: pk.securityLevel,
            data: pk.data,
            readOnly: pk.readOnly
          }))
        }
        return { success: true, identities: [identity] }
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
