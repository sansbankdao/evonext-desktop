// src/utils/notification.ts
export class IdentityNotification {
    static missingTransferKey(identityId: string, missingKeyInfo?: any) {
        const event = new CustomEvent('identity:missing-transfer-key', {
            detail: {
                identityId,
                missingKeyInfo,
                timestamp: new Date().toISOString()
            }
        })
        window.dispatchEvent(event)
        console.warn('[NOTIFICATION] Missing TRANSFER key for identity:', identityId, missingKeyInfo)
        // Can also show toast/alert here
        // Or trigger redirect to key management page
    }
}
