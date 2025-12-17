// src/libs/wallet/base.ts
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { ErrorBoundary, NetworkError } from '@/utils/errors'
import { log } from '@/utils/env'
import getNetwork from '../getNetwork'
import getTransferKey from '../getTransferKey'
import type { NetworkConfig, TransactionResult, ITxSuccess, ITxError } from '@/types'
export class WalletBase {
    protected sdk: DashPlatformSDK | null = null
    protected network: 'testnet' | 'mainnet' = 'testnet'
    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            this.network = await getNetwork() as 'testnet' | 'mainnet'
            this.sdk = new DashPlatformSDK({ network: this.network })
            log('info', `WalletBase initialized for network: ${this.network}`)
        }, 'WALLET_BASE_INIT_FAILED')
    }
    protected getNetworkConfig(): NetworkConfig {
        const isTestnet = this.network === 'testnet'
        const platformEndpoint = isTestnet
            ? import.meta.env.VITE_PLATFORM_HTTP_API_TESTNET
            : import.meta.env.VITE_PLATFORM_HTTP_API_MAINNET
        const dapiEndpoint = import.meta.env.VITE_DAPI_WEB_API_ENDPOINT
        return { isTestnet, platformEndpoint, dapiEndpoint }
    }
    protected async getTransferKey(identityIdx: number): Promise<string> {
        return ErrorBoundary.wrap(async () => {
            return await getTransferKey(identityIdx)
        }, 'GET_TRANSFER_KEY_FAILED')
    }
    protected createTransactionSuccess(hash: string): ITxSuccess {
        return { txid: hash }
    }
    protected createTransactionError(code: number, message: string): ITxError {
        return { code, message }
    }
    protected async wrapTransaction<T>(
        operation: () => Promise<T>,
        errorCode: string
    ): Promise<TransactionResult> {
        try {
            const result = await operation()
            return {
                success: true,
                data: result as ITxSuccess
            }
        } catch (error: any) {
            log('error', `${errorCode}:`, error)
            return {
                success: false,
                error: {
                    code: 500,
                    message: error.message || 'Transaction failed',
                    suggestions: ['Check your network connection', 'Verify your identity has sufficient balance']
                }
            }
        }
    }
}
