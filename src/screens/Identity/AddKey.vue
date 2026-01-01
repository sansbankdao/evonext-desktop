<!-- src/screens/Identity/AddKey.vue -->
<template>
    <main>
        <Header title="Add Transfer Key" />
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Back Navigation -->
                    <div class="flex items-center gap-4">
                        <RouterLink to="/identity" class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span class="font-medium">Back to Identities</span>
                        </RouterLink>
                    </div>

                    <!-- Page Header -->
                    <div class="space-y-4">
                        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                            Add Transfer Key
                        </h1>
                        <p class="text-lg text-slate-600 dark:text-slate-400">
                            Select an identity and add a TRANSFER key to enable sending transactions.
                        </p>
                    </div>

                    <!-- Loading State -->
                    <div v-if="loading" class="text-center py-12">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <p class="mt-4 text-slate-600 dark:text-slate-400">
                            Loading identities...
                        </p>
                    </div>

                    <!-- No Identities -->
                    <template v-else>
                        <div v-if="identities.length === 0" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-8 text-center">
                            <div class="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                                <svg class="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 class="text-xl font-semibold text-amber-800 dark:text-amber-300 mb-2">
                                No Identities Found
                            </h3>
                            <p class="text-amber-700 dark:text-amber-400 mb-6">
                                You need to have at least one identity before adding keys.
                            </p>
                            <RouterLink to="/identity/register" class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 px-6 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                Register New Identity
                            </RouterLink>
                        </div>

                        <!-- Identity Selection & Form -->
                        <template v-else>
                            <!-- Identity Selection -->
                            <AddKeyIdentityList
                                :identities="identities"
                                :selectedIdentity="selectedIdentity"
                                @select-identity="setSelectedIdentity"
                            />

                            <!-- Selected Identity Details -->
                            <AddKeyIdentityDetail
                                v-if="selectedIdentity"
                                :identity="selectedIdentity"
                                :has-transfer-key="hasTransferKey(selectedIdentity)"
                            />

                            <!-- Add Key Form -->
                            <AddKeyKeyForm
                                v-if="selectedIdentity && !hasTransferKey(selectedIdentity)"
                                v-model:key-type="keyType"
                                v-model:security-level="securityLevel"
                                v-model:confirmed="confirmed"
                                :is-adding="isAdding"
                                @add-transfer-key="addTransferKey"
                            />
                        </template>
                    </template>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import AddKeyIdentityList from '@/components/addKey/IdentityList.vue'
import AddKeyIdentityDetail from '@/components/addKey/IdentityDetail.vue'
import AddKeyKeyForm from '@/components/addKey/KeyForm.vue'
import { useKeyUtils } from '@/composables/useKeyUtils'
import { useKeyManagement } from '@/composables/useKeyManagement'
import { mnemonicManager } from '@/composables/useMnemonic'
import { identityDiscovery } from '@/composables/useIdentityDiscovery'
import type { IdentityWithKeys } from '@/types/addKey'

const router = useRouter()
const { hasTransferKey: checkTransferKey } = useKeyUtils()
const { addTransferKey: addKeyToIdentity } = useKeyManagement()

// State
const loading = ref(true)
const identities = ref<IdentityWithKeys[]>([])
const selectedIdentity = ref<IdentityWithKeys | null>(null)
const keyType = ref<'ECDSA_SECP256K1' | 'ECDSA_HASH160'>('ECDSA_SECP256K1')
const securityLevel = ref<'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL')
const confirmed = ref(false)
const isAdding = ref(false)

// Parse security level to number
const parseSecurityLevel = (level: string): 0 | 1 | 2 | 3 | 4 => {
    switch(level) {
        case 'MASTER': return 0
        case 'CRITICAL': return 1
        case 'HIGH': return 2
        case 'MEDIUM': return 3
        case 'LOW': return 4
        default: return 1 // Default to CRITICAL
    }
}

// Load identities using mnemonicManager and identityDiscovery
const loadIdentities = async () => {
    try {
        loading.value = true

        // Get mnemonic using the new composable
        const mnemonic = await mnemonicManager.getMnemonic()

        if (!mnemonic) {
            console.warn('No mnemonic found, cannot load identities')
            identities.value = []
            showNotification('warning', 'No mnemonic found. Please connect first.')
            return
        }

        // Use identity discovery service to get identities from seed
        const result = await identityDiscovery.getIdentitiesFromSeed(mnemonic, {
            minIndexSearch: 5,
            queryRegistry: true
        })

        if (result && Array.isArray(result) && result.length > 0) {
            // Map identities with proper typing
            identities.value = result.map((identity: any): IdentityWithKeys => ({
                id: identity.id || identity.identityId || '',
                identity_idx: identity.identityIdx || identity.identity_idx || 0,
                revision: identity.revision ? BigInt(identity.revision) : BigInt(0),
                username: identity.username || identity.dpnsUsername || '',
                display_name: identity.displayName || identity.dpnsUsername || '',
                publicKeys: identity.publicKeys || []
            }))

            // Auto-select first identity missing transfer key
            const missingTransfer = identities.value.find(identity => !checkTransferKey(identity.publicKeys))
            if (missingTransfer) {
                selectedIdentity.value = missingTransfer
            } else if (identities.value.length > 0) {
                selectedIdentity.value = identities.value[0]
            }
        } else {
            identities.value = [] // Ensure it's always an array
            showNotification('info', 'No identities found for your mnemonic.')
        }
    } catch (error) {
        console.error('Failed to load identities:', error)
        showNotification('error', 'Failed to load identities')
        identities.value = [] // Ensure it's always an array
    } finally {
        loading.value = false
    }
}

// Set selected identity
const setSelectedIdentity = (identity: IdentityWithKeys) => {
    selectedIdentity.value = identity
}

// Check if identity has transfer key
const hasTransferKey = (identity: IdentityWithKeys): boolean => {
    return checkTransferKey(identity.publicKeys)
}

// Show notification
const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', {
        detail: { type, message, duration: 3000 }
    })
    window.dispatchEvent(event)
}

// Main function to add TRANSFER key
const addTransferKey = async () => {
    if (!selectedIdentity.value || !confirmed.value) {
        showNotification('error', 'Please select an identity and confirm')
        return
    }

    try {
        isAdding.value = true
        showNotification('info', 'Starting key addition process...')

        const identity = selectedIdentity.value
        const result = await addKeyToIdentity(
            identity.id,
            identity.identity_idx,
            identity.revision,
            identity.publicKeys || [],
            keyType.value,
            parseSecurityLevel(securityLevel.value)
        )

        if (result.success) {
            showNotification('success', 'TRANSFER key added successfully!')
            // Reload identities to update status
            await loadIdentities()
            // Navigate back to identity list after short delay
            setTimeout(() => {
                router.push('/identity')
            }, 1500)
        } else {
            showNotification('error', result.error || 'Failed to add transfer key')
        }
    } catch (error: any) {
        console.error('Failed to add transfer key:', error)
        showNotification('error', error.message || 'Failed to add transfer key')
    } finally {
        isAdding.value = false
    }
}

// Initialize on mount
onMounted(async () => {
    await loadIdentities()
})
</script>
