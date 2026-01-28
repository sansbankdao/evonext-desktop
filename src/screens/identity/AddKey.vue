<!-- src/screens/identity/AddKey.vue -->
<template>
    <main>
        <Header title="Add Identity Key" />
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Back Navigation -->
                    <div class="flex items-center gap-4">
                        <RouterLink :to="`/identity/${route.params.id}/keys`" class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span class="font-medium">Back to Manage Keys</span>
                        </RouterLink>
                    </div>
                    <!-- Page Header -->
                    <div class="space-y-4">
                        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                            Add New Key
                        </h1>
                        <p class="text-lg text-slate-600 dark:text-slate-400">
                            Add a new public key to your identity for specific purposes or security levels.
                        </p>
                    </div>
                    <!-- Loading State -->
                    <div v-if="loading" class="text-center py-12">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <p class="mt-4 text-slate-600 dark:text-slate-400">
                            Loading identity details...
                        </p>
                    </div>
                    <!-- No Identities Fallback -->
                    <div v-else-if="!currentIdentity" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-8 text-center">
                        <h3 class="text-xl font-semibold text-amber-800 dark:text-amber-300 mb-2">
                            Identity Not Found
                        </h3>
                        <RouterLink to="/identity" class="text-cyan-600 dark:text-cyan-400 underline">
                            Return to Identity List
                        </RouterLink>
                    </div>
                    <!-- Identity & Key Configuration -->
                    <template v-else>
                        <!-- Selected Identity Details -->
                        <div class="bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <div class="size-16 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center text-white text-xl font-bold">
                                        {{ (currentIdentity.username || currentIdentity.identityId).charAt(0).toUpperCase() }}
                                    </div>
                                    <div>
                                        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                                            {{ currentIdentity.username || 'Unnamed Identity' }}
                                        </h2>
                                        <p class="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                            {{ currentIdentity.identityId.slice(0, 8) }}...{{ currentIdentity.identityId.slice(-8) }}
                                        </p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Revision</div>
                                    <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ currentIdentity.revision }}</div>
                                </div>
                            </div>
                        </div>
                        <!-- Key Configuration Form -->
                        <div class="bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-8 shadow-lg">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                                Key Configuration
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <!-- Purpose Selection -->
                                <div class="space-y-2">
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Purpose
                                    </label>
                                    <select
                                        v-model="selectedPurpose"
                                        class="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                    >
                                        <option v-for="p in PURPOSES" :key="p.value" :value="p.value">
                                            {{ p.label }}
                                        </option>
                                    </select>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">
                                        {{ getPurposeDescription(selectedPurpose) }}
                                    </p>
                                </div>
                                <!-- Security Level Selection -->
                                <div class="space-y-2">
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Security Level
                                    </label>
                                    <select
                                        v-model="selectedSecurityLevel"
                                        class="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                    >
                                        <option v-for="l in SECURITY_LEVELS" :key="l.value" :value="l.value">
                                            {{ l.label }}
                                        </option>
                                    </select>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">
                                        {{ getSecurityLevelDescription(selectedSecurityLevel) }}
                                    </p>
                                </div>
                            </div>
                            <!-- Key Type Selection -->
                            <div class="mb-8 space-y-2">
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Key Type
                                </label>
                                <div class="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        @click="keyType = 'ECDSA_HASH160'"
                                        :class="[
                                            'p-4 rounded-xl border-2 text-left transition-all',
                                            keyType === 'ECDSA_HASH160'
                                                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 ring-1 ring-cyan-500'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        ]"
                                    >
                                        <div class="font-bold text-slate-900 dark:text-slate-100">ECDSA HASH160</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Standard for Dash identities</div>
                                    </button>
                                    <button
                                        type="button"
                                        @click="keyType = 'ECDSA_SECP256K1'"
                                        :class="[
                                            'p-4 rounded-xl border-2 text-left transition-all',
                                            keyType === 'ECDSA_SECP256K1'
                                                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 ring-1 ring-cyan-500'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        ]"
                                    >
                                        <div class="font-bold text-slate-900 dark:text-slate-100">ECDSA SECP256K1</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Used for Encryption</div>
                                    </button>
                                </div>
                            </div>
                            <!-- Validation Status -->
                            <div v-if="keyExists" class="mb-6 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 flex items-start gap-3">
                                <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h4 class="font-bold text-red-800 dark:text-red-300">Key Already Exists</h4>
                                    <p class="text-sm text-red-700 dark:text-red-400 mt-1">
                                        This identity already has a <span class="font-semibold">{{ getPurposeLabel(selectedPurpose) }}</span> key with <span class="font-semibold">{{ getSecurityLevelLabel(selectedSecurityLevel) }}</span> security level.
                                    </p>
                                </div>
                            </div>
                            <!-- Action -->
                            <div class="flex items-center gap-4">
                                <button
                                    @click="addKey"
                                    :disabled="isAdding || keyExists || !isValidSelection"
                                    class="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-6 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg v-if="isAdding" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span v-if="!isAdding">Add {{ getPurposeLabel(selectedPurpose) }} Key</span>
                                    <span v-else>Adding Key...</span>
                                </button>
                            </div>
                        </div>
                        <!-- Info Section -->
                        <div class="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider">
                                About Adding Keys
                            </h3>
                            <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">
                                <li>Adding a key requires a small fee in credits.</li>
                                <li>You cannot add a MASTER key if one already exists.</li>
                                <li>Keys must be signed by the new key itself (to prove ownership) and an existing MASTER or high-security AUTHENTICATION key.</li>
                                <li><strong>Supported Keys:</strong> We currently support adding standard HD-derived keys (Indices 0-5).</li>
                            </ul>
                        </div>
                    </template>
                </div>
            </div>
        </section>
    </main>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { EvoSDK } from '@dashevo/evo-sdk'
// import { PrivateKeyWASM } from 'pshenmic-dpp'
import { hash160 } from '@/services/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import Header from '@/components/Header.vue'
import { useIdentityStore } from '@/stores/identity'
import { useKeyManagement } from '@/composables/useKeyManagement'
import { useNetwork } from '@/composables/useNetwork'
import type { IIdentity } from '@/types'
import type { PurposeType, SecurityLevelType } from '@/types'

const route = useRoute()
const router = useRouter()
const identityStore = useIdentityStore()
const { ensure } = useNetwork()
const { deriveKey } = useKeyManagement()

// State
const loading = ref(true)
const isAdding = ref(false)
const currentIdentity = ref<IIdentity | null>(null)

// Form State
const selectedPurpose = ref<PurposeType>(3) // Default to Transfer
const selectedSecurityLevel = ref<SecurityLevelType>(1) // Default to Critical
const keyType = ref<'ECDSA_HASH160' | 'ECDSA_SECP256K1'>('ECDSA_HASH160')

// Constants for Dropdowns
const PURPOSES = [
    { value: 0 as PurposeType, label: 'AUTHENTICATION (0)' },
    { value: 1 as PurposeType, label: 'ENCRYPTION (1)' },
    { value: 2 as PurposeType, label: 'DECRYPTION (2)' },
    { value: 3 as PurposeType, label: 'TRANSFER (3)' }
]

const SECURITY_LEVELS = [
    { value: 0 as SecurityLevelType, label: 'MASTER (0)' },
    { value: 1 as SecurityLevelType, label: 'CRITICAL (1)' },
    { value: 2 as SecurityLevelType, label: 'HIGH (2)' },
    { value: 3 as SecurityLevelType, label: 'MEDIUM (3)' },
    { value: 4 as SecurityLevelType, label: 'LOW (4)' }
]

// --- Logic ---

// Helper to map Purpose+SecurityLevel to Key Index
const getKeyIndex = (purpose: PurposeType, level: SecurityLevelType): number => {
    if (purpose === 0 && level === 0) return 0
    if (purpose === 0 && level === 1) return 1
    if (purpose === 0 && level === 2) return 2
    if (purpose === 3 && level === 1) return 3
    if (purpose === 1 && level === 3) return 4
    if (purpose === 2 && level === 3) return 5
    return -1
}

// Check if selected key config already exists
const keyExists = computed(() => {
    if (!currentIdentity.value) return false
    return currentIdentity.value.publicKeys.some(pk =>
        pk.purpose === selectedPurpose.value &&
        pk.securityLevel === selectedSecurityLevel.value
    )
})

// Check if combination is valid/derivable
const isValidSelection = computed(() => {
    return getKeyIndex(selectedPurpose.value, selectedSecurityLevel.value) !== -1
})

// Fetch Identity from Route Param
const fetchIdentity = async () => {
    try {
        loading.value = true
        const identityId = String(route.params.id)
        // Try loading from local map first for speed/details
        const settings = await invoke<any>('load_settings').catch(() => null)
        const network = settings?.network === 'testnet' ? 'testnet' : 'mainnet'
        const identityMap = await invoke<Record<string, any>>('load_identities_map', { network })
        if (identityMap && identityMap[identityId]) {
            const data = identityMap[identityId]
            // Normalize to IIdentity
            currentIdentity.value = {
                identityId: data.identityId,
                identityIdx: data.identityIdx,
                revision: data.revision,
                username: data.username,
                publicKeys: data.publicKeys || [],
                balance: data.balance
            }
        } else {
            // Fallback to store
            if (identityStore.identity?.identityId === identityId) {
                currentIdentity.value = identityStore.identity
            }
        }
    } catch (e) {
        console.error('Failed to load identity', e)
    } finally {
        loading.value = false
    }
}

const addKey = async () => {
    if (!currentIdentity.value || !isValidSelection.value) return
    const identity = currentIdentity.value
    const idx = getKeyIndex(selectedPurpose.value, selectedSecurityLevel.value)

    try {
        isAdding.value = true
        const network = await ensure()
        const networkName = network === 'mainnet' ? 'mainnet' : 'testnet'

        // 1. Derive NEW Private Key to register
        const newPrivateKey = await deriveKey(identity.identityIdx, idx)
        const privateKeyHex = binToHex(newPrivateKey.bytes)

        // 2. Prepare Payload (Match your reference snippet)
        const keysToRegister = [{
            keyType: keyType.value,
            purpose: selectedPurpose.value, // numeric is fine for EvoSDK facade
            securityLevel: selectedSecurityLevel.value,
            privateKeyHex: privateKeyHex
        }]

        // 3. Find Master Key for signing the update
        const authKey = identity.publicKeys.find(k => k.purpose === 0 && k.securityLevel === 0)
        if (!authKey) throw new Error("Master key required to add new keys.")

        const authKeyIndex = getKeyIndex(0, 0)
        const authPrivateKey = await deriveKey(identity.identityIdx, authKeyIndex)
        const authWif = authPrivateKey.WIF()

        // 4. Update Identity (signs and broadcasts)
        const result = await updateIdentity(
            identity.identityId,
            authWif,
            keysToRegister,
            [],
            networkName,
            undefined
        )

        if (result.success) {
            showNotification('success', 'Key registered on network!')
            // Redirect back - user will see this key as "Missing Local Private Key" and can Import it
            setTimeout(() => router.push(`/identity/${identity.identityId}/keys`), 1500)
        } else {
            throw new Error(result.error)
        }
    } catch (error: any) {
        showNotification('error', error.message)
    } finally {
        isAdding.value = false
    }
}

// The integrated updateIdentity function
const updateIdentity = async (
    identityId: string,
    privateKeyWif: string,
    addPublicKeys: any[],
    disablePublicKeyIds: number[],
    network: 'testnet' | 'mainnet',
    _retryOptions: any,
) => {
    // Initialize SDK for the target network
    // Using 'any' for SDK instance to bypass strict facade type definition mismatches
    const sdk: any = network === 'mainnet'
        ? EvoSDK.mainnetTrusted()
        : EvoSDK.testnetTrusted();
    console.log(`[UpdateIdentity] Connecting to ${network}...`);
    await sdk.connect()
    console.log('[UpdateIdentity] Connected to Platform');

    try {
        console.log('[UpdateIdentity] Updating identity:', identityId);
        console.log('[UpdateIdentity] Adding', addPublicKeys.length, 'keys, disabling', disablePublicKeyIds.length, 'keys');

        // Format keys for SDK
        const formattedAddKeys = addPublicKeys.map(key => {
            const isHash160Type = key.keyType === 'ECDSA_HASH160'
            if (isHash160Type && key.publicKeyHex) {
                // For HASH160 type, compute hash160 and pass as 'data' (Base64)
                const pubKeyBytes = new Uint8Array(key.publicKeyHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
                const hash160Bytes = hash160(pubKeyBytes);
                const dataBase64 = btoa(String.fromCharCode(...hash160Bytes));
                return {
                    keyId: key.keyId,
                    keyType: key.keyType,
                    purpose: key.purpose,
                    securityLevel: key.securityLevel,dataBase64,
                };
            } else {
                // For SECP256K1 and other types, pass publicKeyHex directly
                return {
                    keyId: key.keyId,
                    keyType: key.keyType,
                    purpose: key.purpose,
                    securityLevel: key.securityLevel,
                    publicKeyHex: key.publicKeyHex
                };
            }
        });

        console.log('[UpdateIdentity] Formatted keys to add:', JSON.stringify(formattedAddKeys, null, 2));

        // Call update on the EvoSDK
        // Pass stringified JSON as expected by the snippet
        await sdk.identities.update({
            identityId,
            privateKeyWif,
            addPublicKeys: JSON.stringify(formattedAddKeys),
            disablePublicKeyIds: disablePublicKeyIds.length > 0
                ? disablePublicKeyIds
                : undefined,
        })

        console.log('[UpdateIdentity] Update successful');
        return { success: true };
    } catch (error: any) {
        console.error('[UpdateIdentity] Identity update error:', error);
        const errorMessage = (error && typeof error === 'object' && 'message' in error)
            ? String((error).message)
            : (error instanceof Error ? error.message : String(error));
        return {
            success: false,
            error: errorMessage,
        };
    }
}

// Helpers
const getPurposeLabel = (p: number) => PURPOSES.find(x => x.value === p)?.label || `Purpose ${p}`
const getSecurityLevelLabel = (l: number) => SECURITY_LEVELS.find(x => x.value === l)?.label || `Level ${l}`

const getPurposeDescription = (p: number) => {
    switch(p) {
        case 0: return 'Used to sign identity updates and profile changes.'
        case 1: return 'Used to encrypt data sent to you.'
        case 2: return 'Used to decrypt data sent to you.'
        case 3: return 'Used to sign credit and token transfers.'
        default: return ''
    }
}

const getSecurityLevelDescription = (l: number) => {
    switch(l) {
        case 0: return 'Full control over the identity. Only one allowed.'
        case 1: return 'High security. Can perform sensitive operations.'
        case 2: return 'Standard security for important operations.'
        case 3: return 'Regular operations.'
        case 4: return 'Basic operations with limited permissions.'
        default: return ''
    }
}

const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', {
        detail: { type, message, duration: 3000 }
    })
    window.dispatchEvent(event)
}

onMounted(fetchIdentity)
</script>
