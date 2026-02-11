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
} from '@/types'

export function useDocuments() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const createDocument = async (
        _identityId: string,
        _dataContract: string,
        _documentType: string,
        _tokenPaymentInfo: ITokenPaymentInfo,
        _atomicUnits: bigint
    ): Promise<ActionResponse<ITransactionResult>> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            if (!_documentType) {
                throw new Error('documentType is required')
            }
            const transferWif = await keys.getTransferKey(_identityId)
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
            const sdk = await platform.getSDK()
            const data = {}
            const document = sdk.documents.create(
                _dataContract,
                _documentType,
                data,
                _identityId
            )
            const identityNonce = BigInt(1)
            const stateTransition = sdk.documents.createStateTransition(
                document,
                'create',
                {
                    identityContractNonce: identityNonce,
                    tokenPaymentInfo: _tokenPaymentInfo,
                },
            )
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
            log('info', `Document creation successful. Hash: ${hash}`)
            loading.value = false
            return {
                success: true,
                txid: hash
            } as ITransactionResult
        }, 'CREATE_DOCUMENT_FAILED')
    }
    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        createDocument,
    }
}
