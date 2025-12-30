// src/libs/keys/PrivateKeyManager.ts (updated)
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import getMnemonic from '../getMnemonic'
import getNetwork from '../getNetwork'
import type { KeyDerivationResult, EvoNextKeyDerivationResult } from '@/types'

export class PrivateKeyManager {
    private sdk: DashPlatformSDK | null = null
    private network: 'testnet' | 'mainnet' = 'testnet'
    private mnemonic: string = ''

    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            this.network = await getNetwork() as 'testnet' | 'mainnet'
            this.mnemonic = await getMnemonic()
            this.sdk = new DashPlatformSDK({ network: this.network })
            log('info', `PrivateKeyManager initialized for network: ${this.network}`)
        }, 'PRIVATE_KEY_MANAGER_INIT_FAILED')
    }

    async getPrivateKeys(
        identityIdx: number,
        queryRegistry: boolean = false
    ): Promise<KeyDerivationResult> {
        console.log('queryRegistry', queryRegistry)  // FIXME We need to implement this.
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }

            log('debug', `Getting private keys for identity index: ${identityIdx}`)
            const seed = await this.sdk!.keyPair.mnemonicToSeed(this.mnemonic, undefined)
            const walletHDKey = this.sdk!.keyPair.seedToHdKey(seed)

            const keys = [{
                 keyIndex: 0,
                purpose: 'FIXME: TBD',
                securityLevel: 'FIXME: TBD',
                privateKey: this.deriveKey(walletHDKey, identityIdx, 0),
                publicKey: 'FIXME: TBD',
                publicKeyHash: 'FIXME: TBD',
            }]

            // SDK handles network-specific derivation internally
            const pkg = {
                identityIndex: identityIdx,
                keys,
                success: true,
            }

            log('debug', `Successfully derived keys for identity index: ${identityIdx}`)
            return pkg

        }, 'GET_PRIVATE_KEYS_FAILED')
    }

    async getEvoNextPrivateKeys(
        identityIdx: number,
        queryRegistry: boolean = false
    ): Promise<EvoNextKeyDerivationResult> {
        console.log('queryRegistry', queryRegistry)  // FIXME We need to implement this.
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }

            log('debug', `Getting private keys for identity index: ${identityIdx}`)
            const seed = await this.sdk!.keyPair.mnemonicToSeed(this.mnemonic, undefined)
            const walletHDKey = this.sdk!.keyPair.seedToHdKey(seed)

            // SDK handles network-specific derivation internally
            const keys = {
                masterKey: this.deriveKey(walletHDKey, identityIdx, 0),
                authCritical: this.deriveKey(walletHDKey, identityIdx, 1),
                authHigh: this.deriveKey(walletHDKey, identityIdx, 2),
                transferKey: this.deriveKey(walletHDKey, identityIdx, 3),
                encryptionKey: this.deriveKey(walletHDKey, identityIdx, 4)
            }

            log('debug', `Successfully derived keys for identity index: ${identityIdx}`)
            return keys

        }, 'GET_PRIVATE_KEYS_FAILED')
    }

    private deriveKey(walletHDKey: any, identityIdx: number, keyIdx: number): any {
        // SDK handles network-specific derivation: testnet vs mainnet
        const hdKey = this.sdk!.keyPair.deriveIdentityPrivateKey(
            walletHDKey, identityIdx, keyIdx, this.network
        )

        return PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), this.network)
    }

    async getTransferKey(identityIdx: number): Promise<string> {
        const keys = await this.getEvoNextPrivateKeys(identityIdx)
        return keys.transferKey.WIF()
    }

    async getPublicKeyHash(identityIdx: number, keyIdx: number = 0): Promise<string> {
        const keys = await this.getEvoNextPrivateKeys(identityIdx)
        const key = [keys.masterKey, keys.authCritical, keys.authHigh, keys.transferKey, keys.encryptionKey][keyIdx]
        const publicKey = key.getPublicKey()
        return binToHex(hash160(publicKey.bytes()))
    }

    // Removed getDerivationInfo as it's not used and SDK handles derivation
}

// Singleton instance
let privateKeyManager: PrivateKeyManager | null = null

export function getPrivateKeyManager(): PrivateKeyManager {
    if (!privateKeyManager) {
        privateKeyManager = new PrivateKeyManager()
    }
    return privateKeyManager
}
