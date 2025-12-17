// src/libs/keys/PrivateKeyManager.ts
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
import type { KeyDerivationResult, DerivationPath } from '@/types'

export class PrivateKeyManager {
    private sdk: DashPlatformSDK | null = null
    private network: 'testnet' | 'mainnet' = 'testnet'
    private mnemonic: string = ''

    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            this.network = await getNetwork()
            this.mnemonic = await getMnemonic()
            this.sdk = new DashPlatformSDK({ network: this.network })
            log('info', `PrivateKeyManager initialized for network: ${this.network}`)
        }, 'PRIVATE_KEY_MANAGER_INIT_FAILED')
    }

    private getDerivationPath(identityIdx: number, keyIdx: number): DerivationPath {
        // MAINNET -> m/9'/5'/5'/0'/0'/<IDENTITY_IDX>'/<KEY_IDX>'
        // TESTNET -> m/9'/1'/5'/0'/0'/<IDENTITY_IDX>'/<KEY_IDX>'
        const coinType = this.network === 'mainnet' ? 5 : 1

        return {
            purpose: 9,
            coinType,
            account: 5,
            change: 0,
            identityIdx,
            keyIdx
        }
    }

    async getPrivateKeys(
        identityIdx: number,
        queryRegistry: boolean = false
    ): Promise<KeyDerivationResult> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }

            log('debug', `Getting private keys for identity index: ${identityIdx}`)
            const seed = await this.sdk!.keyPair.mnemonicToSeed(this.mnemonic, undefined)
            const walletHDKey = this.sdk!.keyPair.seedToHdKey(seed)

            // Derive all keys
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
        const hdKey = this.sdk!.keyPair.deriveIdentityPrivateKey(
            walletHDKey, identityIdx, keyIdx, this.network
        )

        return PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), this.network)
    }

    async getTransferKey(identityIdx: number): Promise<string> {
        const keys = await this.getPrivateKeys(identityIdx, false)
        return keys.transferKey.WIF()
    }

    async getPublicKeyHash(identityIdx: number, keyIdx: number = 0): Promise<string> {
        const keys = await this.getPrivateKeys(identityIdx, false)
        const key = [keys.masterKey, keys.authCritical, keys.authHigh, keys.transferKey, keys.encryptionKey][keyIdx]
        const publicKey = key.getPublicKey()
        return binToHex(hash160(publicKey.bytes()))
    }

    async getDerivationInfo(identityIdx: number): Promise<DerivationPath[]> {
        return ErrorBoundary.wrap(async () => {
            const paths: DerivationPath[] = []

            for (let keyIdx = 0; keyIdx < 5; keyIdx++) {
                paths.push(this.getDerivationPath(identityIdx, keyIdx))
            }

            return paths
        }, 'GET_DERIVATION_INFO_FAILED')
    }
}

// Singleton instance
let privateKeyManager: PrivateKeyManager | null = null

export function getPrivateKeyManager(): PrivateKeyManager {
    if (!privateKeyManager) {
        privateKeyManager = new PrivateKeyManager()
    }
    return privateKeyManager
}
