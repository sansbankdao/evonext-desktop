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
        _identityId: string, // Fixed: String (was _identityIdx: number)
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
                // NOTE: Ensure Data Contract ID is valid
                const dataContract = _dataContract
                // NOTE: Ensure Document Type is valid (e.g., 'dpnsDomain', 'dpnsPreorder')
                const documentType = ''
                // NOTE: Ensure Data Object is valid
                const data = {}
                if (!documentType) {
                    throw new Error('documentType is required')
                }
                // Create document
                const document = sdk.documents
                    .create(dataContract, documentType, data, _identityId)
                // Set identity contract nonce
                // NOTE: Determine if this is necessary for your specific document type
                const identityNonce = BigInt(1)
                // Create state transition
                const stateTransition = sdk.documents.createStateTransition(
                    document,
                    'create',
                    {
                        identityContractNonce: identityNonce,
                        tokenPaymentInfo: _tokenPaymentInfo,
                    },
                )
                // Request transfer key using Identity String
                const transferWif = await keys.getTransferKey(_identityId)
                if (!transferWif) {
                    throw new Error('No transfer key found')
                }
                const privKey = PrivateKeyWASM.fromWIF(transferWif.privateKey)
                // Get identity details
                const identity = await sdk.identities.getIdentityByIdentifier(_identityId)
                const identityPublicKeys = identity.getPublicKeys()
                console.log('PUBLIC KEYS', identityPublicKeys)
                // Set public key ID
                // NOTE: Ensure this matches your wallet's key index (usually 3 for Transfer)
                const publicKeyId = 3
                // Set public key
                const pubKey = identityPublicKeys[publicKeyId]
                if (!pubKey) {
                    throw new Error(`Transfer public key ${publicKeyId} not found`)
                }
                // Sign state transition
                stateTransition.sign(privKey, pubKey)
                // Broadcast state transition
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
                    data: { txid: hash } as ITxSuccess,
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
