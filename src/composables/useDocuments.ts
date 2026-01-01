// src/composables/useDocuments.ts

import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { useKeyManagement } from './useKeyManagement'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type {
    ITokenPaymentInfo,
    ITransactionResult,
    ITxSuccess,
    ITxError,
} from '@/types'

export function useDocuments() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const createDocument = async (
        _identityIdx: number,
        _identityId: string,
        _dataContract: string,
        _tokenPaymentInfo: ITokenPaymentInfo,
        _receiver: string,
        _atomicUnits: bigint
    ): Promise<ITransactionResult> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            try {
                const sdk = await platform.getSDK()

                /* Set data contract. */
                // TODO ADD FINAL DATA CONTRACT VALIDATION
                const dataContract = _dataContract

                /* Set document type. */
                // TODO ADD FINAL DOCUMENT TYPE VALIDATION
                const documentType = '' // NOTE: MUST BE SET

                /* Set (document) data. */
                const data = {} // NOTE: MUST BE SET

                if (!documentType) {
                    throw new Error('documentType is required')
                }

                /* Create document. */
                const document = sdk.documents
                    .create(dataContract, documentType, data, _identityId)

                /* Set identity contract nonce. */
                // FIXME IS THIS STILL NECESSARY??
                const identityContractNonce = BigInt(1)

                /* Create state transition. */
                const stateTransition = sdk.documents.createStateTransition(
                    document,
                    'create',
                    {
                        identityContractNonce,
                        tokenPaymentInfo: _tokenPaymentInfo,
                    },
                )

                /* Request transfer (WIF) key. */
                const transferWif = await keys.getTransferKey(_identityIdx)
                if (!transferWif) {
                    throw new Error('No transfer key found')
                }

                /* Set private (transfer) key. */
                const privKey = PrivateKeyWASM.fromWIF(transferWif)

                /* Set identity. */
                const identity = await sdk.identities.getIdentityByIdentifier(_identityId)

                /* Set public keys. */
                const identityPublicKeys = identity.getPublicKeys()
                console.log('PUBLIC KEYS', identityPublicKeys)

                /* Set public key ID. */
                const publicKeyId = 3 // 03 => Transfer (Critical)

                /* Set public key. */
                const pubKey = identityPublicKeys[publicKeyId]
                if (!pubKey) {
                    throw new Error(`Transfer public key ${publicKeyId} not found`)
                }

                /* Sign state transition. */
                stateTransition.sign(privKey, pubKey)

                /* Broadcast state transition. */
                await sdk.stateTransitions.broadcast(stateTransition)
                await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

                const hash = stateTransition.hash(false)
                log('info', `Document creation successful. Hash: ${hash}`, {
                    dataContract,
                    documentType,
                    identityId: _identityId
                })

                return {
                    success: true,
                    data: { txid: hash } as ITxSuccess
                }
            } catch (err: any) {
                const errorMessage = err.message || 'Document creation failed'
                error.value = errorMessage
                log('error', 'Document creation error:', err)

                return {
                    success: false,
                    error: {
                        code: 500,
                        message: errorMessage,
                        suggestions: [
                            'Verify data contract and document type',
                            'Check your identity balance',
                            'Confirm data complies with data contract schema'
                        ]
                    } as ITxError
                }
            } finally {
                loading.value = false
            }
        }, 'CREATE_DOCUMENT_FAILED')
    }

    return {
        // State
        loading: computed(() => loading.value),
        error: computed(() => error.value),

        // Actions
        createDocument,
    }
}
