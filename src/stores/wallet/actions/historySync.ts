// src/stores/wallet/actions/historySync.ts

/* Import types. */
import type { ITransaction } from '@/types'
import type { TxRecord } from '@/types/history'

/**
 * History <-> Cache synchronization helpers.
 *
 * The on-disk SQLite history (Rust-side, see src-tauri/src/history) is the
 * durable CACHE; the Explorer API is the source of truth. Mapping lives
 * here, in one place, with tests, so the store actions stay thin.
 *
 * Sign convention: TxRecord.amount is SIGNED (negative = send), while the
 * UI's ITransaction carries an absolute amount + a direction enum.
 */

/** Normalize any of the API's timestamp shapes to unix SECONDS. */
export function normalizeTimestampSeconds(
    ...candidates: Array<number | undefined | null>
): number {
    for (const c of candidates) {
        if (typeof c === 'number' && isFinite(c) && c > 0) {
            // Heuristic: anything past 1e12 is milliseconds (year 33658 in s).
            const seconds = c > 1e12 ? Math.floor(c / 1000) : Math.floor(c)
            return seconds
        }
    }
    return Math.floor(Date.now() / 1000)
}

/** Map a UI transaction (Explorer-derived) to its cache record. */
export function transactionToRecord(tx: ITransaction): TxRecord {
    const direction = tx.direction === 'INCOMING' ? 'receive' : 'send'
    const absolute = Math.abs(Number(tx.amount) || 0)
    const rawStatus = String(tx.status || '').toLowerCase()
    const status =
        rawStatus === 'confirmed' ? 'confirmed'
        : rawStatus === 'failed' ? 'failed'
        : 'pending'

    return {
        txid: tx.hash || tx.id,
        network: tx.network,
        direction,
        amount: direction === 'send' ? -absolute : absolute,
        fee: typeof tx.fee === 'number' ? tx.fee : null,
        timestamp: normalizeTimestampSeconds(tx.timestamp, tx.date, tx.createdAt),
        blockHeight: typeof tx.blockHeight === 'number' ? tx.blockHeight : null,
        counterparty:
            direction === 'receive'
                ? tx.senderId || null
                : tx.receiverId || null,
        status,
        // Full fidelity for the reverse mapping and future reinterpretation.
        rawJson: JSON.stringify(tx),
    }
}

/**
 * Rebuild a displayable transaction from a cache record (offline fallback
 * path). Prefers the embedded rawJson snapshot; degrades to a minimal but
 * honest shape when it is missing or unparsable.
 */
export function recordToTransaction(rec: TxRecord): ITransaction {
    if (rec.rawJson) {
        try {
            const parsed = JSON.parse(rec.rawJson)
            if (parsed && typeof parsed === 'object' && (parsed.hash || parsed.id)) {
                return parsed as ITransaction
            }
        } catch {
            // Corrupt rawJson: fall through to the minimal shape below.
        }
    }

    const direction = rec.direction === 'receive' ? 'INCOMING' : 'OUTGOING'
    return {
        id: rec.txid,
        hash: rec.txid,
        blockHeight: rec.blockHeight ?? undefined,
        confirmations: rec.status === 'confirmed' ? 1 : 0,
        senderId: rec.direction === 'receive' ? rec.counterparty ?? 'Unknown' : 'Me',
        receiverId: rec.direction === 'receive' ? 'Me' : rec.counterparty ?? 'Unknown',
        amount: Math.abs(rec.amount),
        assetType: 'COIN',
        assetSymbol: 'CREDITS',
        fee: rec.fee ?? undefined,
        status: rec.status.toUpperCase() as ITransaction['status'],
        type: 'IDENTITY_CREDIT_TRANSFER',
        direction,
        network: rec.network as ITransaction['network'],
        timestamp: rec.timestamp,
        date: rec.timestamp,
        createdAt: rec.timestamp,
        title: rec.direction === 'receive' ? 'Credits Received' : 'Credits Sent',
        subtitle: 'From local history (offline)',
    } as ITransaction
}
