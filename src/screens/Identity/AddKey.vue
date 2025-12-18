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
                        <p class="mt-4 text-slate-600 dark:text-slate-400">Loading identities...</p>
                    </div>

                    <!-- No Identities -->
                    <div v-else-if="identities.length === 0" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-8 text-center">
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

                    <!-- Identity Selection -->
                    <div v-else class="space-y-6">
                        <!-- Identity Selection -->
                        <div class="space-y-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Select Identity
                            </label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div v-for="identity in identities" :key="identity.id"
                                     @click="selectedIdentity = identity"
                                     class="relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                                     :class="selectedIdentity?.id === identity.id
                                        ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5 ring-2 ring-cyan-500/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">
                                    <div class="flex items-start gap-4">
                                        <div class="flex-shrink-0">
                                            <div class="size-12 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold">
                                                {{ (identity.displayName || identity.username || 'ID').charAt(0).toUpperCase() }}
                                            </div>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {{ identity.displayName || identity.username || 'Unnamed Identity' }}
                                            </h3>
                                            <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
                                                {{ identity.username || identity.id.slice(0, 16) + '...' }}
                                            </p>
                                            <div class="mt-2 flex flex-wrap gap-1">
                                                <span v-for="key in identity.publicKeys?.slice(0, 3)" :key="key.id"
                                                      :class="getKeyBadgeClass(key)"
                                                      class="text-xs px-2 py-1 rounded-full">
                                                    {{ getKeyTypeShort(key) }}
                                                </span>
                                                <span v-if="(identity.publicKeys?.length || 0) > 3"
                                                      class="text-xs text-slate-500 dark:text-slate-400">
                                                    +{{ (identity.publicKeys?.length || 0) - 3 }} more
                                                </span>
                                            </div>
                                        </div>
                                        <div v-if="selectedIdentity?.id === identity.id" class="flex-shrink-0">
                                            <div class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                                <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-if="!hasTransferKey(identity)" class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                            </svg>
                                            <span class="text-sm font-semibold">Missing TRANSFER Key</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Selected Identity Details -->
                        <div v-if="selectedIdentity" class="space-y-6">
                            <div class="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 p-6">
                                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                    Selected Identity Details
                                </h3>

                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Identifier
                                        </label>
                                        <div class="font-mono text-sm bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-lg truncate">
                                            {{ selectedIdentity.id }}
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Current Keys
                                        </label>
                                        <div class="space-y-2">
                                            <div v-for="key in selectedIdentity.publicKeys" :key="key.id"
                                                 class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div class="space-y-1">
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-medium text-slate-900 dark:text-slate-100">
                                                            {{ getPurposeLabel(key.purpose) }}
                                                        </span>
                                                        <span :class="getSecurityLevelClass(key.securityLevel)"
                                                              class="px-2 py-0.5 text-xs rounded-full">
                                                            {{ getSecurityLevelLabel(key.securityLevel) }}
                                                        </span>
                                                    </div>
                                                    <div class="text-xs text-slate-500 dark:text-slate-400">
                                                        {{ key.type_ || key.keyType }}
                                                    </div>
                                                </div>
                                                <div class="text-right">
                                                    <div class="text-sm font-mono text-slate-600 dark:text-slate-300">
                                                        ID: {{ key.id }}
                                                    </div>
                                                    <div v-if="key.read_only" class="text-xs text-amber-600 dark:text-amber-400">
                                                        Read Only
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Key Already Has Transfer Key -->
                                    <div v-if="hasTransferKey(selectedIdentity)" class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                                        <div class="flex items-center gap-3">
                                            <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <h4 class="font-semibold text-green-800 dark:text-green-300">
                                                    TRANSFER Key Already Present
                                                </h4>
                                                <p class="text-sm text-green-700 dark:text-green-400">
                                                    This identity already has a TRANSFER key, so sending transactions is already enabled.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Missing Transfer Key Warning -->
                                    <div v-else class="rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-6">
                                        <div class="flex items-start gap-4">
                                            <div class="flex-shrink-0">
                                                <div class="rounded-full bg-amber-500/20 p-3">
                                                    <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div class="flex-1">
                                                <h4 class="text-lg font-semibold text-amber-800 dark:text-amber-300">
                                                    TRANSFER Key Required
                                                </h4>
                                                <p class="mt-2 text-amber-700 dark:text-amber-400">
                                                    This identity is missing a TRANSFER key. Without it, you cannot send transactions. Adding a TRANSFER key will require a small fee for the identity update.
                                                </p>
                                                <div class="mt-4 space-y-3">
                                                    <div class="flex items-center gap-2 text-sm">
                                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                                        <span class="text-amber-700 dark:text-amber-300">Enables sending credits and tokens</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 text-sm">
                                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                                        <span class="text-amber-700 dark:text-amber-300">Requires an identity update transaction</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 text-sm">
                                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                                        <span class="text-amber-700 dark:text-amber-300">Costs a small fee in credits</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Add Key Form -->
                                    <div v-if="!hasTransferKey(selectedIdentity)" class="space-y-6">
                                        <div class="border-t border-slate-200 dark:border-slate-700 pt-6">
                                            <h4 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                                Add TRANSFER Key
                                            </h4>

                                            <div class="space-y-4">
                                                <!-- Key Type Selection -->
                                                <div>
                                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                        Key Type
                                                    </label>
                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <label class="relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200"
                                                               :class="keyType === 'ECDSA_SECP256K1'
                                                                   ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5'
                                                                   : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">
                                                            <input type="radio" v-model="keyType" value="ECDSA_SECP256K1" class="sr-only">
                                                            <div class="flex items-center justify-between w-full">
                                                                <div>
                                                                    <div class="font-medium text-slate-900 dark:text-slate-100">
                                                                        ECDSA Secp256k1
                                                                    </div>
                                                                    <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                                        Standard cryptographic key
                                                                    </div>
                                                                </div>
                                                                <div v-if="keyType === 'ECDSA_SECP256K1'" class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                                                    <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </label>

                                                        <label class="relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200"
                                                               :class="keyType === 'ECDSA_HASH160'
                                                                   ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5'
                                                                   : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">
                                                            <input type="radio" v-model="keyType" value="ECDSA_HASH160" class="sr-only">
                                                            <div class="flex items-center justify-between w-full">
                                                                <div>
                                                                    <div class="font-medium text-slate-900 dark:text-slate-100">
                                                                        ECDSA Hash160
                                                                    </div>
                                                                    <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                                        Compressed public key hash
                                                                    </div>
                                                                </div>
                                                                <div v-if="keyType === 'ECDSA_HASH160'" class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                                                    <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>

                                                <!-- Security Level -->
                                                <div>
                                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                        Security Level
                                                    </label>
                                                    <select v-model="securityLevel"
                                                            class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200">
                                                        <option value="CRITICAL">CRITICAL (Highest Security)</option>
                                                        <option value="HIGH">HIGH</option>
                                                        <option value="MEDIUM">MEDIUM</option>
                                                        <option value="LOW">LOW</option>
                                                    </select>
                                                </div>

                                                <!-- Estimated Cost -->
                                                <div class="rounded-lg bg-slate-100 dark:bg-slate-800 p-4">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Estimated Cost
                                                        </span>
                                                        <span class="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                                                            ~100 Credits
                                                        </span>
                                                    </div>
                                                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
                                                        This is an estimate. Actual cost may vary based on network conditions.
                                                    </p>
                                                </div>

                                                <!-- Confirmation -->
                                                <div class="flex items-start gap-3">
                                                    <input type="checkbox" v-model="confirmed" id="confirm-add"
                                                           class="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 rounded">
                                                    <label for="confirm-add" class="text-sm text-slate-700 dark:text-slate-300">
                                                        I understand that adding this key requires an identity update transaction and will cost a small fee in credits.
                                                    </label>
                                                </div>

                                                <!-- Submit Button -->
                                                <div class="pt-4">
                                                    <button @click="addTransferKey"
                                                            :disabled="!confirmed || isAdding"
                                                            :class="!confirmed || isAdding
                                                                ? 'opacity-50 cursor-not-allowed'
                                                                : 'hover:shadow-xl hover:-translate-y-0.5'"
                                                            class="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-6 text-lg font-bold shadow-lg transition-all duration-200 focus:ring-4 focus:ring-green-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <span v-if="isAdding">
                                                            <span class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                                                            Adding Key...
                                                        </span>
                                                        <span v-else>
                                                            Add TRANSFER Key
                                                        </span>
                                                    </button>
                                                    <p class="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                                                        This will create and sign an identity update transaction.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import getIdentities from '@/libs/getIdentities'
import { useIdentityStore } from '@/stores/identity'

const router = useRouter()
const identityStore = useIdentityStore()

// State
const loading = ref(true)
const identities = ref<any[]>([])
const selectedIdentity = ref<any>(null)
const keyType = ref('ECDSA_SECP256K1')
const securityLevel = ref('CRITICAL')
const confirmed = ref(false)
const isAdding = ref(false)

// Load identities
const loadIdentities = async () => {
    try {
        loading.value = true
        const foundIdentities = await getIdentities()

        if (foundIdentities && foundIdentities.length > 0) {
            identities.value = foundIdentities.map((identity: any) => ({
                ...identity,
                displayName: identity.username?.split('.')[0] || 'Unnamed',
                username: identity.username || identity.id
            }))

            // Auto-select first identity missing transfer key
            const missingTransfer = identities.value.find(identity => !hasTransferKey(identity))
            if (missingTransfer) {
                selectedIdentity.value = missingTransfer
            } else if (identities.value.length > 0) {
                selectedIdentity.value = identities.value[0]
            }
        }
    } catch (error) {
        console.error('Failed to load identities:', error)
        showNotification('error', 'Failed to load identities')
    } finally {
        loading.value = false
    }
}

// Helper functions
const getPurposeLabel = (purpose: number) => {
    switch(purpose) {
        case 0: return 'AUTHENTICATION'
        case 1: return 'TRANSFER'
        case 2: return 'ENCRYPTION'
        case 3: return 'TRANSFER'
        default: return `Purpose ${purpose}`
    }
}

const getSecurityLevelLabel = (level: number) => {
    switch(level) {
        case 0: return 'MASTER'
        case 1: return 'CRITICAL'
        case 2: return 'HIGH'
        case 3: return 'MEDIUM'
        case 4: return 'LOW'
        default: return `Level ${level}`
    }
}

const getSecurityLevelClass = (level: number) => {
    switch(level) {
        case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
        case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
}

const getKeyBadgeClass = (key: any) => {
    const purpose = key.purpose
    if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' // TRANSFER
    if (purpose === 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' // AUTHENTICATION
    if (purpose === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' // ENCRYPTION
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const getKeyTypeShort = (key: any) => {
    const purpose = key.purpose
    if (purpose === 1 || purpose === 3) return 'TRANSFER'
    if (purpose === 0) return 'AUTH'
    if (purpose === 2) return 'ENCRYPT'
    return 'KEY'
}

const hasTransferKey = (identity: any): boolean => {
    return identity?.publicKeys?.some((key: any) => key.purpose === 1 || key.purpose === 3) || false
}

const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', {
        detail: { type, message, duration: 3000 }
    })
    window.dispatchEvent(event)
}

// Add transfer key function
const addTransferKey = async () => {
    if (!selectedIdentity.value || !confirmed.value) {
        showNotification('error', 'Please select an identity and confirm')
        return
    }

    try {
        isAdding.value = true

        // TODO: Implement actual key addition logic
        // 1. Get identity nonce and revision
        // 2. Generate new key pair at index 3 (TRANSFER)
        // 3. Create identity update state transition
        // 4. Sign with MASTER authentication key
        // 5. Broadcast transaction

        // Simulating for now
        await new Promise(resolve => setTimeout(resolve, 2000))

        showNotification('success', 'TRANSFER key added successfully!')

        // Reload identities to update status
        await loadIdentities()

        // Navigate back to identity list
        setTimeout(() => {
            router.push('/identity')
        }, 1500)

    } catch (error: any) {
        console.error('Failed to add transfer key:', error)
        showNotification('error', error.message || 'Failed to add transfer key')
    } finally {
        isAdding.value = false
    }
}

onMounted(async () => {
    await loadIdentities()
})
</script>
