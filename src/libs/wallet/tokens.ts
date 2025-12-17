// src/libs/wallet/tokens.ts
import { WalletBase } from './base'
import type { SendTokenParams, TransactionResult } from '@/types'
export class TokenTransfer extends WalletBase {
    async send(params: SendTokenParams): Promise<TransactionResult> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }
            return await this.wrapTransaction(async () => {
                // Initialize token base transition
                const tokenBaseTransition = await this.sdk!.tokens
                    .createBaseTransition(params.tokenId, params.identityId)
                // Initialize state transition
                const stateTransition = this.sdk!.tokens
                    .createStateTransition(
                        tokenBaseTransition,
                        params.identityId,
                        'transfer',
                        {
                            identityId: params.receiver,
                            amount: params.atomicUnits,
                        },
                    )
                // Request transfer (WIF) key
                const transferWif = await this.getTransferKey(params.identityIdx)
                // Set private (transfer) key
                const privKey = PrivateKeyWASM.fromWIF(transferWif)
                // Request identity
                const identity = await this.sdk!.identities.getIdentityByIdentifier(params.identityId)
                // Set public keys
                const identityPublicKeys = identity.getPublicKeys()
                // Set public key ID (03 => Transfer Critical)
                const publicKeyId = 3
                // Set public key
                const pubKey = identityPublicKeys[publicKeyId]
                // Sign state transition
                stateTransition.sign(privKey, pubKey)
                // Broadcast state transition
                await this.sdk!.stateTransitions.broadcast(stateTransition)
                // Wait for confirmation
                await this.sdk!.stateTransitions.waitForStateTransitionResult(stateTransition)
                // Return transaction ID
                const hash = stateTransition.hash(false)
                log('info', `Token transfer successful. Hash: ${hash}, Token: ${params.tokenId}`)
                return this.createTransactionSuccess(hash)
            }, 'SEND_TOKEN_FAILED')
        }, 'TOKEN_TRANSFER_OPERATION_FAILED')
    }
    async sendToken(
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint
    ): Promise<TransactionResult> {
        const params: SendTokenParams = {
            identityId,
            identityIdx,
            tokenId,
            receiver,
            atomicUnits
        }
        return this.send(params)
    }
}
