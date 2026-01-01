<!-- src/screens/Identity.vue -->
<template>
    <main>
        <Header title="Identity Manager" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">

                    <!-- Page Header and Create Action -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div class="space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                Choose An Identity
                            </h1>

                            <p class="text-lg text-slate-600 dark:text-slate-400">
                                Easily switch between your Identities or register a new one.
                            </p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3">
                            <RouterLink to="/identity/register" class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-8 text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>Register New Identity</span>
                            </RouterLink>
                        </div>
                    </div>

                    <!-- Alert for missing transfer keys -->
                    <div v-if="missingTransferKeys.length > 0" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-6">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0">
                                <div class="rounded-full bg-amber-500/20 p-3">
                                    <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>

                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300">
                                    Missing TRANSFER Keys
                                </h3>

                                <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
                                    {{ missingTransferKeys.length }} identit{{ missingTransferKeys.length === 1 ? 'y' : 'ies' }} cannot send transactions. Add TRANSFER keys to enable transfers.
                                </p>

                                <div class="mt-4 flex gap-3">
                                    <RouterLink to="/identity/keys/add" class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                        Add Transfer Keys
                                    </RouterLink>

                                    <button @click="showMissingKeys = !showMissingKeys" class="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50">
                                        {{ showMissingKeys ? 'Hide Details' : 'Show Details' }}
                                    </button>
                                </div>

                                <div v-if="showMissingKeys" class="mt-4 space-y-2">
                                    <div v-for="identity in missingTransferKeys" :key="identity.id" class="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium text-amber-900 dark:text-amber-200">{{ identity.displayName || identity.username || identity.id?.slice(0, 8) + '...' }}</span>
                                            <span v-if="identity.id" class="text-xs font-mono text-amber-700 dark:text-amber-400 truncate ml-2">{{ identity.id.slice(0, 8) }}...{{ identity.id.slice(-8) }}</span>
                                        </div>

                                        <div class="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                            {{ identity.publicKeys?.length || 0 }} key{{ identity.publicKeys?.length !== 1 ? 's' : '' }} registered, no TRANSFER key found
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Grid of Identity Cards -->
                    <div v-if="loading" class="text-center py-12">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>

                        <p class="mt-4 text-slate-600 dark:text-slate-400">
                            Loading identities...
                        </p>
                    </div>

                    <div v-else-if="identities.length === 0" class="text-center py-12">
                        <div class="mx-auto w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <svg class="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>

                        <h3 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                            No Identities Found
                        </h3>

                        <p class="mt-2 text-slate-600 dark:text-slate-400">
                            No identities were found for your wallet. You can register a new identity to get started.
                        </p>
                    </div>

                    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div v-for="identity in identities" :key="identity.id || identity.identityId"
                            class="bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1
                                   border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600
                                   group"
                            :class="(identity.id || identity.identityId) === activeIdentityId ? 'ring-4 ring-cyan-400/20 shadow-cyan-500/20 border-cyan-400 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5' : ''">

                            <!-- Card Header -->
                            <div class="p-6 flex items-start gap-4">
                                <img :src="getAvatar(identity)" :alt="identity.displayName" class="size-16 rounded-full flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 shadow-lg group-hover:scale-105 transition-transform duration-200" />

                                <div class="flex-1 min-w-0">
                                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {{ identity.displayName || identity.dpnsUsername || (identity.identityId ? identity.identityId.slice(0, 8) + '...' : 'Unnamed Identity') }}
                                    </h2>

                                    <p v-if="identity.dpnsUsername" class="text-slate-600 dark:text-slate-400 text-sm truncate">
                                        {{ identity.dpnsUsername }}
                                    </p>
                                    <p v-else class="text-slate-500 dark:text-slate-500 text-sm italic">
                                        No DPNS name
                                    </p>
                                </div>

                                <span v-if="(identity.id || identity.identityId) === activeIdentityId" class="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold px-3 py-1 rounded-full border border-cyan-400/50 shadow-sm">
                                    Active
                                </span>
                            </div>

                            <!-- Card Body -->
                            <div class="px-6 pb-6 space-y-4 flex-1">
                                <div>
                                    <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                                        Key Status
                                    </label>

                                    <div class="space-y-2">
                                        <div v-for="key in identity.publicKeys" :key="key.id"
                                             class="flex items-center justify-between text-sm">
                                            <span class="font-medium truncate">
                                                {{ getPurposeLabel(key.purpose) }}
                                            </span>

                                            <span :class="getSecurityLevelClass(key.securityLevel)"
                                                  class="px-2 py-1 text-xs rounded-full whitespace-nowrap">
                                                {{ getSecurityLevelLabel(key.securityLevel) }}
                                            </span>
                                        </div>

                                        <div v-if="!hasTransferKeyForIdentity(identity)" class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                </svg>

                                                <span class="font-semibold text-sm">
                                                    Missing TRANSFER
                                                </span>
                                            </div>

                                            <p class="text-amber-700 dark:text-amber-400 text-xs mt-1">
                                                Cannot send transactions
                                            </p>

                                            <RouterLink :to="`/identity/${identity.id || identity.identityId}/keys/add`"
                                                        class="mt-2 block w-full text-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 text-xs font-semibold">
                                                Add Key
                                            </RouterLink>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                                        Identifier
                                    </label>

                                    <div class="relative">
                                        <input type="text" readonly :value="identity.id || identity.identityId" class="w-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-mono text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 pr-12 shadow-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 hover:shadow-md group-hover:shadow-lg" />

                                        <button @click="copyToClipboard(identity.id || identity.identityId || '')" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200" title="Copy Identifier">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Card Footer / Action -->
                            <div class="mt-auto p-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
                                <RouterLink :to="`/identity/${identity.id || identity.identityId}/keys`"
                                            class="block w-full text-center rounded-xl bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600 hover:from-slate-300 hover:to-slate-400 dark:hover:from-slate-400 dark:hover:to-slate-500 text-white py-3 px-6 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                    Manage Keys
                                </RouterLink>

                                <button v-if="(identity.id || identity.identityId) !== activeIdentityId" @click="switchToIdentity(identity.id || identity.identityId || '')"
                                        class="w-full rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700 hover:from-slate-400 hover:to-slate-500 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white py-3 px-6 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                    Switch Identity
                                </button>

                                <div v-else class="text-center text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-500/20 px-6 py-4 rounded-xl border-2 border-cyan-400/30 shadow-sm">
                                    Active Identity
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
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Header from '@/components/Header.vue'
// import { useRouter } from 'vue-router'
import { useIdentity } from '@/composables/useIdentity'
// import { identityDiscovery } from '@/composables/useIdentityDiscovery'
// import { useConnect } from '@/composables/useConnect'
import { getIdentityManager } from '@/services/identity'
import { invoke } from '@tauri-apps/api/core'
import type { DiscoveredIdentity } from '@/types/identity'

// const router = useRouter()
const { identityId } = useIdentity()
// const { identityId, hasTransferKey } = useIdentity()
const identityManager = getIdentityManager()

// interface Identity extends DiscoveredIdentity {
//     // Extend with UI-specific properties if needed
//     displayName?: string
//     username?: string
//     avatarUrl?: string
//     bio?: string
// }

// Refs
const loading = ref(true)
const showMissingKeys = ref(false)
const identities = ref<DiscoveredIdentity[]>([])
const activeIdentityId = ref<string>('')

// Computed
const missingTransferKeys = computed(() => {
    return identities.value.filter(identity => !hasTransferKeyForIdentity(identity))
})

// Helper functions
const getAvatar = (identity: DiscoveredIdentity): string => {
    if (identity.avatarUrl) return identity.avatarUrl
    const name = identity.displayName || identity.dpnsUsername || identity.identityId || 'Unknown'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=fff`
}

const getPurposeLabel = (purpose: number | string) => {
    const purposeNum = typeof purpose === 'string' ? parseInt(purpose) : purpose
    switch(purposeNum) {
        case 0: return 'AUTHENTICATION'
        case 1: return 'TRANSFER'
        case 2: return 'ENCRYPTION'
        case 3: return 'TRANSFER'
        default: return `Purpose ${purposeNum}`
    }
}

const getSecurityLevelLabel = (securityLevel: number | string) => {
    const level = typeof securityLevel === 'string' ? parseInt(securityLevel) : (securityLevel || 0)
    switch(level) {
        case 0: return 'MASTER'
        case 1: return 'CRITICAL'
        case 2: return 'HIGH'
        case 3: return 'MEDIUM'
        case 4: return 'LOW'
        default: return `Level ${level}`
    }
}

const getSecurityLevelClass = (securityLevel: number | string) => {
    const level = typeof securityLevel === 'string' ? parseInt(securityLevel) : (securityLevel || 0)
    switch(level) {
        case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
        case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
}

const hasTransferKeyForIdentity = (identity: DiscoveredIdentity): boolean => {
    return identity.publicKeys?.some((key: any) => key.purpose === 1 || key.purpose === 3) || false
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
        .then(() => {
            const event = new CustomEvent('notification', {
                detail: {
                    type: 'success',
                    message: 'Identifier copied to clipboard',
                    duration: 2000
                }
            })
            window.dispatchEvent(event)
            console.log(`Copied to clipboard: ${text}`)
        })
        .catch(err => {
            console.error('Failed to copy:', err)
            const event = new CustomEvent('notification', {
                detail: {
                    type: 'error',
                    message: 'Failed to copy to clipboard',
                    duration: 3000
                }
            })
            window.dispatchEvent(event)
        })
}

// Get mnemonic from Tauri backend (replaces getMnemonic)
const getMnemonic = async (): Promise<string | null> => {
    try {
        // Call your Tauri command to get mnemonic
        const mnemonic = await invoke<string>('get_mnemonic')
        return mnemonic || null
    } catch (error) {
        console.error('Failed to get mnemonic:', error)
        return null
    }
}

// Get identities using IdentityDiscovery service (replaces getIdentities)
const getIdentities = async (): Promise<DiscoveredIdentity[]> => {
    try {
        const mnemonic = await getMnemonic()
        if (!mnemonic) {
            console.error('No mnemonic found')
            return []
        }

        // Use identity discovery service to get identities from seed
        const result = await identityManager.discoverFromSeed(mnemonic, {
            network: 'testnet', // You might want to get dynamic network
            maxIdentityIndex: 5 // Or some reasonable limit
        })

        if (result.success && result.identities) {
            return result.identities.map((identity, index) => ({
                ...identity,
                identityIdx: index // Ensure each has an idx
            }))
        }
        return []
    } catch (error) {
        console.error('Failed to get identities:', error)
        return []
    }
}

// Function to handle switching identities
const switchToIdentity = async (id: string) => {
    try {
        console.log(`Switching active identity to: ${id}`)
        // TODO: Implement identity switching logic
        // This would involve:
        // 1. Setting the active identity in the store
        // 2. Updating local storage
        // 3. Refreshing the app state

        activeIdentityId.value = id

        // Trigger notification
        const event = new CustomEvent('notification', {
            detail: {
                type: 'success',
                message: `Switched to identity ${id.slice(0, 8)}...${id.slice(-8)}`,
                duration: 3000
            }
        })
        window.dispatchEvent(event)
    } catch (error) {
        console.error('Failed to switch identity:', error)
        const event = new CustomEvent('notification', {
            detail: {
                type: 'error',
                message: 'Failed to switch identity',
                duration: 5000
            }
        })
        window.dispatchEvent(event)
    }
}

const init = async () => {
    try {
        loading.value = true

        /* Set active identity from store */
        if (identityId.value) {
            activeIdentityId.value = identityId.value
        }

        /* Get mnemonic and find identities */
        const mnemonic = await getMnemonic()
        console.log('MNEMONIC FOUND:', mnemonic ? 'Yes' : 'No')

        if (!mnemonic) {
            // Show empty state for no mnemonic
            identities.value = []
            return
        }

        /* Get identities from network */
        const foundIdentities = await getIdentities()
        console.log('IDENTITIES FOUND:', foundIdentities)

        if (foundIdentities && foundIdentities.length > 0) {
            identities.value = foundIdentities

            // If no active identity is set, use the first one
            if (!activeIdentityId.value && foundIdentities.length > 0) {
                activeIdentityId.value = foundIdentities[0]!.identityId || ''
            }
        } else {
            // No identities found, show empty state
            identities.value = []
        }

    } catch (error) {
        console.error('Failed to get credentials:', error)
        const event = new CustomEvent('notification', {
            detail: {
                type: 'error',
                message: 'Failed to load identities',
                duration: 5000
            }
        })
        window.dispatchEvent(event)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await init()
    // Listen for identity changes
    window.addEventListener('identity:updated', init)
})

onUnmounted(() => {
    window.removeEventListener('identity:updated', init)
})
</script>
