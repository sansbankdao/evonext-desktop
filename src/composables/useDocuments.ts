// src/composables/useDocuments.ts

import { computed, ref } from 'vue'
import { Document, DocumentCreateTransition } from '@dashevo/evo-sdk'
import { useKeyManagement } from './useKeyManagement'
import { useNetwork } from './useNetwork'
import {
    batchStateTransition,
    connectEvoSdk,
    nextIdentityContractNonce,
    resolveSigningContext,
    signBroadcastAndHash,
} from '@/services/platform'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log } from '@/utils/env'
import type {
    ITokenPaymentInfo,
    ITxSuccess,
} from '@/types'

export function useDocuments() {
    const { network } = useNetwork()
    const keys = useKeyManagement()
    const loading = ref(false)
    const error = ref<string | null>(null)

    const createDocument = async (
        _identityId: string,
        _dataContract: string,
        _documentType: string,
        _tokenPaymentInfo: ITokenPaymentInfo,
        _atomicUnits: bigint
    ): Promise<ActionResponse<ITxSuccess>> => {
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

            const sdk = await connectEvoSdk(network.value)
            const data = {}
            // v4: documents.create takes { document, identityKey, signer,
            // tokenPaymentInfo? } — nonces and broadcast are handled internally.
            const document = new Document({
                dataContractId: _dataContract,
                documentTypeName: _documentType,
                ownerId: _identityId,
                properties: data,
            })

            const { identityKey } = await resolveSigningContext(sdk, _identityId, transferWif.keyId)
            if (!identityKey) {
                throw new Error(`Transfer public key ${transferWif.keyId} not found`)
            }

            // Raw transition path (v4 facades never return the transition
            // hash — build/sign/broadcast ourselves to surface the REAL hash).
            const identityContractNonce = await nextIdentityContractNonce(sdk, _identityId, _dataContract)
            const createTransition = new DocumentCreateTransition({
                document,
                identityContractNonce,
                tokenPaymentInfo: _tokenPaymentInfo as any,
            })
            const stateTransition = batchStateTransition([createTransition.toDocumentTransition()], _identityId)
            const hash = await signBroadcastAndHash(sdk, stateTransition, transferWif.privateKey, identityKey)

            log('info', `Document creation successful. Hash: ${hash}`)

            loading.value = false
            return {
                txid: hash
            }
        }, 'CREATE_DOCUMENT_FAILED')
    }

    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        createDocument,
    }
}
