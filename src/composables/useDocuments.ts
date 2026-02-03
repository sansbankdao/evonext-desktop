// src/composables/useDocuments.ts
import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { useKeyManagement } from './useKeyManagement'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
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
        _identityId: string,
        _dataContract: string,
        _tokenPaymentInfo: ITokenPaymentInfo,
        _receiver: string,
        _atomicUnits: bigint
    ): Promise<ActionResponse<ITransactionResult>> => {
        // ErrorBoundary.wrap returns Promise<ActionResponse<T>>
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            try {
                const sdk = await platform.getSDK()
                const dataContract = _dataContract
                const documentType = '' // NOTE: Ensure Document Type is valid
                const data = {}
                if (!documentType) {
                    throw new Error('documentType is required')
                }
                const document = sdk.documents.create(dataContract, documentType, data, _identityId)
                const identityNonce = BigInt(1)
                const stateTransition = sdk.documents.createStateTransition(
                    document,
                    'create',
                    {
                        identityContractNonce: identityNonce,
                        tokenPaymentInfo: _tokenPaymentInfo,
                    },
                )
                const transferWif = await keys.getTransferKey(_identityId)
                if (!transferWif) {
                    throw new Error('No transfer key found')
                }
                const privKey = PrivateKeyWASM.fromWIF(transferWif.privateKey)
                const identity = await sdk.identities.getIdentityByIdentifier(_identityId)
                const identityPublicKeys = identity.getPublicKeys()
                const publicKeyId = 3
                const pubKey = identityPublicKeys[publicKeyId]
                if (!pubKey) {
                    throw new Error(`Transfer public key ${publicKeyId} not found`)
                }
                stateTransition.sign(privKey, pubKey)
                await sdk.stateTransitions.broadcast(stateTransition)
                await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
                const hash = stateTransition.hash(false)
                log('info', `Document creation successful. Hash: ${hash}`, {
                    dataContract,
                    documentType,
                    identityId: _identityId
                })
                // Returning this object satisfies ITransactionResult
                return {
                    success: true,
                    data: { txid: hash } as ITxSuccess,
                }
            } catch (err: any) {
                const errorMessage = err.message || 'Document creation failed'
                error.value = errorMessage
                log('error', 'Document creation error:', err)
                // Returning this object satisfies ITransactionResult
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
                    } as ITxError,
                }
            } finally {
                loading.value = false
            }
        }, 'CREATE_DOCUMENT_FAILED')
    }
    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        createDocument,
    }
}
