// src/stores/identity/actions/get_key.ts

import { invoke } from '@tauri-apps/api/core'

import type { PrivateKeyEntry } from '@/types/identity'

/**
 * Directly retrieves the Transfer Private Key (Purpose 3) from the keystore file.
 *
 * Logic:
 * 1. Accepts `network` explicitly (Testnet/Mainnet).
 * 2. Reads the keystore file via Rust (`load_private_keys`).
 * 3. Finds the identity entry.
 * 4. Filters for 'purpose: 3' (TRANSFER).
 * 5. Selects the key with highest security level.
 */
export async function getTransferKey(identityId: string, network: string): Promise<string | null> {
    try {
        // 1. Use the provided network explicitly
        // This function is now pure and requires the caller to determine the network.
        if (!network || (network !== 'testnet' && network !== 'mainnet')) {
            throw new Error(`[getTransferKey] Invalid network provided: ${network}`)
        }
        // 2. Load the raw keystore JSON file using the derived network
        const keystoreData: any = await invoke('load_private_keys', {
            network
        })

        if (!keystoreData || !keystoreData.identities) {
            console.warn(`[getTransferKey] No keystore found for network ${network}`)
            return null
        }

        // 3. Access the identities map
        const identitiesMap = keystoreData.identities

        if (!identitiesMap || !identitiesMap[identityId]) {
            console.warn(`[getTransferKey] Identity ${identityId} not found in file`)
            return null
        }

        // 4. Get keys for the specific identity
        const identityKeys: PrivateKeyEntry[] = identitiesMap[identityId]

        if (!identityKeys || identityKeys.length === 0) {
            console.warn(`[getTransferKey] No keys found for ${identityId}`)
            return null
        }

        // 5. Filter for TRANSFER keys (Purpose 3)
        const transferKeys = identityKeys.filter((k: PrivateKeyEntry) => k.purpose === 3)

        if (transferKeys.length === 0) {
            console.error(`[getTransferKey] No Transfer keys (purpose: 3) found for identity ${identityId}`)
            return null
        }

        // 6. Select the best Transfer key
        // Priority: Highest Security Level > Higher Key ID
        const bestKey = transferKeys.sort((a, b) => {
            if (b.securityLevel !== a.securityLevel) {
                return b.securityLevel - a.securityLevel // Sort Descending
            }
            return a.keyId - b.keyId // Tie-breaker: Prefer higher ID
        })[0]

        console.log(`[getTransferKey] Found Transfer Key for ${identityId} (${network}): ID ${bestKey?.keyId}, Level ${bestKey?.securityLevel}`)

        // 7. Return the Private Key
        return bestKey?.privateKey || null
    } catch (err) {
        console.error('[getTransferKey] Failed to retrieve transfer key:', err)
        return null
    }
}
