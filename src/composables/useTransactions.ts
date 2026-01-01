// src/composables/useTransactions.ts (fixed)

import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { useKeyManagement } from './useKeyManagement'
import { MIN_CREDIT_TRANSFER } from '@/types'
import type { SendCreditParams, SendTokenParams, TransactionResult, ITxSuccess, ITxError } from '@/types'

export function useTransactions() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const sendCredits = async (params: SendCreditParams): Promise<TransactionResult> => {
        loading.value = true
        error.value = null
        try {
            // Validate minimum credit transfer amount
            if (params.credits < MIN_CREDIT_TRANSFER) {
                return {
                    success: false,
                    error: {
                        code: 400,
                        message: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
                        suggestions: ['Increase transfer amount to meet minimum requirements']
                    } as ITxError
                }
            }
            const sdk = await platform.getSDK()
            const transferWif = await keys.getTransferKey(params.identityIdx)
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
            const privKey = PrivateKeyWASM.fromWIF(transferWif)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            const identityNonce = await sdk.identities.getIdentityNonce(params.identityId)
            const payload = {
                identityId: params.identityId,
                amount: params.credits,
                recipientId: params.receiver,
                identityNonce: (identityNonce + BigInt(1))
            }
            const stateTransition = sdk.identities.createStateTransition('creditTransfer', payload)
            const identityPublicKeys = identity.getPublicKeys()
            const publicKeyId = 3 // Transfer Critical
            // Find the TRANSFER key (purpose=1 or purpose=3)
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            // Fallback to key at index 3 if no TRANSFER key found
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity')
            }
            stateTransition.sign(privKey, pubKey)
            await sdk.stateTransitions.broadcast(stateTransition)
            await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
            const hash = stateTransition.hash(false)
            console.log('info', `Credit transfer successful. Hash: ${hash}`)
            return {
                success: true,
                data: { txid: hash } as ITxSuccess
            }
        } catch (err: any) {
            error.value = err.message || 'Credit transfer failed'
            console.error('Credit transfer error:', err)
            return {
                success: false,
                error: {
                    code: 500,
                    message: error.value!, // Non-null assertion since we set it above
                    suggestions: ['Check your network connection', 'Verify your identity has sufficient balance']
                } as ITxError
            }
        } finally {
            loading.value = false
        }
    }
    const sendToken = async (params: SendTokenParams): Promise<TransactionResult> => {
        loading.value = true
        error.value = null
        try {
            const sdk = await platform.getSDK()
            const transferWif = await keys.getTransferKey(params.identityIdx)
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
            const tokenBaseTransition = await sdk.tokens
                .createBaseTransition(params.tokenId, params.identityId)
            const stateTransition = sdk.tokens
                .createStateTransition(
                    tokenBaseTransition,
                    params.identityId,
                    'transfer',
                    {
                        identityId: params.receiver,
                        amount: params.atomicUnits,
                    },
                )
            const privKey = PrivateKeyWASM.fromWIF(transferWif)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            const identityPublicKeys = identity.getPublicKeys()
            // Find the TRANSFER key (purpose=1 or purpose=3)
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            // Fallback to key at index 3 if no TRANSFER key found
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity')
            }
            stateTransition.sign(privKey, pubKey)
            await sdk.stateTransitions.broadcast(stateTransition)
            await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
            const hash = stateTransition.hash(false)
            console.log('info', `Token transfer successful. Hash: ${hash}, Token: ${params.tokenId}`)
            return {
                success: true,
                data: { txid: hash } as ITxSuccess
            }
        } catch (err: any) {
            error.value = err.message || 'Token transfer failed'
            console.error('Token transfer error:', err)
            return {
                success: false,
                error: {
                    code: 500,
                    message: error.value!, // Non-null assertion
                    suggestions: ['Check your network connection', 'Verify you have sufficient token balance']
                } as ITxError
            }
        } finally {
            loading.value = false
        }
    }
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint
    ): Promise<TransactionResult> => {
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits
        }
        return await sendCredits(params)
    }
    const sendTokenTransfer = async (
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint
    ): Promise<TransactionResult> => {
        const params: SendTokenParams = {
            identityId,
            identityIdx,
            tokenId,
            receiver,
            atomicUnits
        }
        return await sendToken(params)
    }
    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        sendCredits,
        sendToken,
        sendCredit,
        sendTokenTransfer
    }
}
