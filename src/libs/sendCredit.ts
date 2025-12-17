// src/libs/sendCredit.ts
import { getWalletClient } from './wallet/client'
import type { ITxError, ITxSuccess } from '@/types'
export default async (
    identityId: string,
    identityIdx: number,
    receiver: string,
    credits: bigint,
): Promise<ITxSuccess | ITxError> => {
    try {
        const wallet = getWalletClient()
        const result = await wallet.sendCredit(identityId, identityIdx, receiver, credits)
        if (result.success && result.data) {
            return result.data
        } else {
            return result.error || {
                code: 500,
                message: 'Transaction failed with unknown error'
            }
        }
    } catch (error: any) {
        console.error('Credit transfer failed:', error)
        return {
            code: 500,
            message: error.message || 'Credit transfer failed',
            suggestions: ['Check your network connection', 'Verify receiver address is valid']
        }
    }
}
