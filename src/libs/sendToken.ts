// src/libs/sendToken.ts
import { getWalletClient } from './wallet/client'
import type { ITxError, ITxSuccess } from '@/types'
export default async (
    identityId: string,
    identityIdx: number,
    tokenId: string,
    receiver: string,
    atomicUnits: bigint,
): Promise<ITxSuccess | ITxError> => {
    try {
        const wallet = getWalletClient()
        const result = await wallet.sendTokenTransfer(identityId, identityIdx, tokenId, receiver, atomicUnits)
        if (result.success && result.data) {
            return result.data
        } else {
            return result.error || {
                code: 500,
                message: 'Token transfer failed with unknown error'
            }
        }
    } catch (error: any) {
        console.error('Token transfer failed:', error)
        return {
            code: 500,
            message: error.message || 'Token transfer failed',
            suggestions: ['Check your network connection', 'Verify token contract ID is valid']
        }
    }
}
