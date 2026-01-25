// src/composables/useKeyManagement.ts

import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useNetwork } from './useNetwork'
import { log } from '@/utils/env'
import type { PrivateKeyEntry } from '@/types/identity'
export interface KeyPair {
    privateKey: string;
    keyId: number;
}
type ParsedPurpose = 0 | 1 | 2 | 3;
type ParsedSecurityLevel = 0 | 1 | 2 | 3 | 4;
export function useKeyManagement() {
    const { ensure } = useNetwork()
    const loading = ref(false)
    const error = ref<string | null>(null)
    /**
     * Internal: Maps Rust purpose/security types to human strings if needed
     */
    const purposeMap: Record<number, string> = {
        0: 'AUTHENTICATION', 1: 'ENCRYPTION', 2: 'DECRYPTION', 3: 'TRANSFER'
    }
    const securityMap: Record<number, string> = {
        0: 'MASTER', 1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW'
    }
    /**
     * Reads the Keystore from Rust and returns
     * all keys registered for a specific Identity ID.
     */
    const getPrivateKeys = async (identityId: string): Promise<PrivateKeyEntry[]> => {
        loading.value = true
        error.value = null
        try {
            const network = await ensure()
            const keystore: any = await invoke('load_private_keys', {
                network: network.toLowerCase()
            })
            const entries = keystore?.identities?.[identityId]
            if (!entries || !Array.isArray(entries)) {
                log('warn', `No keys found in Rust keystore for identity: ${identityId}`)
                return []
            }
            return entries
        } catch (err: any) {
            error.value = err.message || 'Failed to load keys from Rust'
            log('error', '[KeyManagement] Keystore load error:', err)
            return []
        } finally {
            loading.value = false
        }
    }
    /**
     * Generic finder for keys based on purpose and security level.
     */
    const getKeyByPurpose = async (
        identityId: string,
        purpose: ParsedPurpose,
        securityLevel?: ParsedSecurityLevel
    ): Promise<string | null> => {
        const keys = await getPrivateKeys(identityId)
        if (!keys.length) return null
        const found = keys.find(k => {
            const purposeMatch = k.purpose === purpose
            const securityMatch = securityLevel !== undefined
                ? k.securityLevel === securityLevel
                : true
            return purposeMatch && securityMatch
        })
        return found?.privateKey || null
    }
    const getAuthKey = async (identityId: string): Promise<string | null> => {
        // Find Critical or High Auth key
        return await getKeyByPurpose(identityId, 0, 1)
            || await getKeyByPurpose(identityId, 0, 2)
    }
    const getMasterKey = async (identityId: string): Promise<string | null> => {
        return await getKeyByPurpose(identityId, 0, 0)
    }
    /**
     * Specifically used by the Platform SDK for signing State Transitions.
     */
    const getTransferKey = async (identityId: string): Promise<KeyPair | null> => {
        const keys = await getPrivateKeys(identityId)
        const transferKey = keys.find(k => k.purpose === 3)
        if (!transferKey) {
            log('error', `Transfer key (purpose 3) missing for ${identityId}`)
            return null
        }
        return {
            privateKey: transferKey.privateKey,
            keyId: transferKey.keyId
        }
    }
    const getEncryptionKey = async (identityId: string): Promise<string | null> => {
        return await getKeyByPurpose(identityId, 2, 3)
    }
    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        getPrivateKeys,
        getAuthKey,
        getTransferKey,
        getEncryptionKey,
        getKeyByPurpose,
        getMasterKey,
        purposeMap,
        securityMap
    }
}
