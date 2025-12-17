// src/libs/wallet/credits.ts
import { WalletBase } from './base'
import { MIN_CREDIT_TRANSFER } from '@/types'
import type { SendCreditParams, TransactionResult } from '@/types'
export class CreditTransfer extends WalletBase {
    async send(params: SendCreditParams): Promise<TransactionResult> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }
            // Validate minimum credit transfer amount
            if (params.credits < MIN_CREDIT_TRANSFER) {
                return {
                    success: false,
                    error: {
                        code: 400,
                        message: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
                        suggestions: ['Increase transfer amount to meet minimum requirements']
                    }
                }
            }
            return await this.wrapTransaction(async () => {
                // Request transfer (WIF) key
                const transferWif = await this.getTransferKey(params.identityIdx)
                // Set private (transfer) key
                const privKey = PrivateKeyWASM.fromWIF(transferWif)
                // Request identity
                const identity = await this.sdk!.identities.getIdentityByIdentifier(params.identityId)
                // Request identity nonce
                const identityNonce = await this.sdk!.identities.getIdentityNonce(params.identityId)
                const payload = {
                    identityId: params.identityId,
                    amount: params.credits,
                    recipientId: params.receiver,
                    identityNonce: (identityNonce + BigInt(1)) // FIXME: Maybe increment manually??
                }
                // Create unsigned identity credit transfer state transition
                const stateTransition = this.sdk!.identities
                    .createStateTransition('creditTransfer', payload)
                // Set public keys
                const identityPublicKeys = identity.getPublicKeys()
                // Set public key ID (03 => Transfer Critical)
                const publicKeyId = 3
                // Set public key
                const pubKey = identityPublicKeys[publicKeyId]
                // Sign state transition
                stateTransition.sign(privKey, pubKey)
                // Execute state transition
                await this.sdk!.stateTransitions.broadcast(stateTransition)
                // Wait for confirmation
                await this.sdk!.stateTransitions.waitForStateTransitionResult(stateTransition)
                // Return transaction ID
                const hash = stateTransition.hash(false)
                log('info', `Credit transfer successful. Hash: ${hash}`)
                return this.createTransactionSuccess(hash)
            }, 'SEND_CREDITS_FAILED')
        }, 'CREDIT_TRANSFER_OPERATION_FAILED')
    }
    async sendCredit(
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint
    ): Promise<TransactionResult> {
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits
        }
        return this.send(params)
    }
}
