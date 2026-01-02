<!-- src/screens/Identity/ManageKeys.vue -->
<template>
    <main>
        <Header :title="`Manage Keys - ${identityName}`" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Back Navigation -->
                    <div class="flex items-center justify-between">
                        <RouterLink to="/identity" class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span class="font-medium">Back to Identities</span>
                        </RouterLink>
                        <RouterLink :to="`/identity/${identityId}/keys/add`"
                                    v-if="!hasTransferKey"
                                    class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-4 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add TRANSFER Key
                        </RouterLink>
                    </div>

                    <!-- Page Header -->
                    <div class="space-y-4">
                        <div class="flex items-center gap-4">
                            <div class="size-16 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center text-white text-xl font-bold">
                                {{ identityName.charAt(0).toUpperCase() }}
                            </div>
                            <div class="flex-1">
                                <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                    Manage Keys
                                </h1>
                                <p class="text-lg text-slate-600 dark:text-slate-400">
                                    {{ identityName }}
                                </p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                                    ID: {{ identityId.slice(0, 8) }}...{{ identityId.slice(-8) }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Missing Transfer Key Alert -->
                    <div v-if="!hasTransferKey" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-6">
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
                                    TRANSFER Key Required
                                </h3>
                                <p class="mt-2 text-amber-700 dark:text-amber-400">
                                    This identity doesn't have a TRANSFER key. You need one to send transactions.
                                </p>
                                <div class="mt-4 flex gap-3">
                                    <RouterLink :to="`/identity/${identityId}/keys/add`"
                                                class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add TRANSFER Key
                                    </RouterLink>
                                    <button @click="showKeyInfo = !showKeyInfo"
                                            class="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50">
                                        {{ showKeyInfo ? 'Hide Info' : 'Learn More' }}
                                    </button>
                                </div>
                                <div v-if="showKeyInfo" class="mt-4 space-y-3">
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">TRANSFER keys are used to sign credit and token transfers</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">You cannot send tokens without a TRANSFER key</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">Adding a key requires a small fee in credits</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="loading" class="text-center py-12">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <p class="mt-4 text-slate-600 dark:text-slate-400">Loading keys...</p>
                    </div>

                    <!-- Keys Grid -->
                    <div v-else class="space-y-6">
                        <!-- Registered Keys -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Registered Keys
                                </h2>
                                <div class="text-sm text-slate-600 dark:text-slate-400">
                                    {{ keys.length }} key{{ keys.length !== 1 ? 's' : '' }}
                                </div>
                            </div>

                            <div class="grid grid-cols-1 gap-4">
                                <div v-for="key in keys" :key="key.id"
                                     class="bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200">
                                    <div class="flex items-start justify-between">
                                        <div class="space-y-3 flex-1">
                                            <div class="flex items-center gap-3">
                                                <span :class="getKeyIconClass(key)"
                                                      class="size-10 rounded-lg flex items-center justify-center">
                                                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getKeyIcon(key)" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h3 class="font-bold text-slate-900 dark:text-slate-100">
                                                        {{ getPurposeLabel(key.purpose) }}
                                                    </h3>
                                                    <div class="flex flex-wrap gap-2 mt-1">
                                                        <span :class="getSecurityLevelClass(key.securityLevel)"
                                                              class="px-2 py-0.5 text-xs rounded-full">
                                                            {{ getSecurityLevelLabel(key.securityLevel) }}
                                                        </span>
                                                        <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                                                            {{ key.type_ || key.keyType }}
                                                        </span>
                                                        <span v-if="key.read_only"
                                                              class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                                            Read Only
                                                        </span>
                                                        <span v-if="key.disabled_at"
                                                              class="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 text-xs rounded-full">
                                                            Disabled
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="space-y-1">
                                                <div class="flex items-center justify-between text-sm">
                                                    <span class="text-slate-600 dark:text-slate-400">Key ID:</span>
                                                    <span class="font-mono text-slate-900 dark:text-slate-100">{{ key.id }}</span>
                                                </div>
                                                <div class="flex items-center justify-between text-sm">
                                                    <span class="text-slate-600 dark:text-slate-400">Security Level:</span>
                                                    <span class="font-medium">{{ getSecurityLevelText(key.securityLevel) }}</span>
                                                </div>
                                                <div v-if="key.data" class="text-sm">
                                                    <div class="text-slate-600 dark:text-slate-400 mb-1">Public Key:</div>
                                                    <div class="font-mono text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded-lg truncate">
                                                        {{ key.data.slice(0, 32) }}...{{ key.data.slice(-16) }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex-shrink-0 ml-4">
                                            <div v-if="key.purpose === 1 || key.purpose === 3"
                                                 class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium rounded-full">
                                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                                Transfer
                                            </div>
                                            <div v-else-if="key.purpose === 0"
                                                 class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
                                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Authentication
                                            </div>
                                            <div v-else-if="key.purpose === 2"
                                                 class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm font-medium rounded-full">
                                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                                Encryption
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="key.disabled_at" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div class="flex items-center gap-2 text-red-800 dark:text-red-300">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span class="font-medium">Disabled since {{ new Date(key.disabled_at).toLocaleDateString() }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Key Actions -->
                        <div v-if="keys.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RouterLink :to="`/identity/${identityId}/keys/add`"
                                        class="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-gradient-to-br hover:from-cyan-500/5 hover:to-cyan-600/5 transition-all duration-200 group">
                                <div class="size-12 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div class="text-left">
                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                                        Add New Key
                                    </h3>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Register a new public key for this identity
                                    </p>
                                </div>
                            </RouterLink>

                            <button @click="disableUnusedKeys"
                                    class="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:border-red-500 dark:hover:border-red-400 hover:bg-gradient-to-br hover:from-red-500/5 hover:to-red-600/5 transition-all duration-200 group">
                                <div class="size-12 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <div class="text-left">
                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400">
                                        Disable Unused Keys
                                    </h3>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Disable keys that are no longer needed
                                    </p>
                                </div>
                            </button>
                        </div>

                        <!-- Key Generation Info -->
                        <div class="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 p-6">
                            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                About Key Management
                            </h3>
                            <div class="space-y-3">
                                <div class="flex items-start gap-3">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="size-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <svg class="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-slate-900 dark:text-slate-100">Key Purposes</h4>
                                        <p class="text-sm text-slate-600 dark:text-slate-400">
                                            <span class="font-medium text-cyan-600 dark:text-cyan-400">AUTHENTICATION</span> keys sign identity updates,
                                            <span class="font-medium text-green-600 dark:text-green-400">TRANSFER</span> keys sign transactions,
                                            <span class="font-medium text-purple-600 dark:text-purple-400">ENCRYPTION</span> keys encrypt data.
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="size-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <svg class="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-slate-900 dark:text-slate-100">Security Levels</h4>
                                        <p class="text-sm text-slate-600 dark:text-slate-400">
                                            MASTER keys can sign any transaction. CRITICAL keys require multisig. HIGH/MEDIUM/LOW keys have limited permissions.
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="size-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <svg class="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-slate-900 dark:text-slate-100">Key Updates</h4>
                                        <p class="text-sm text-slate-600 dark:text-slate-400">
                                            Adding or disabling keys requires signing with MASTER authentication key and pays a small fee in credits.
                                        </p>
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
import { useRoute } from 'vue-router'
// import { useRoute, useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import { useIdentityStore } from '@/stores/identity'

const route = useRoute()
// const router = useRouter()
const identityStore = useIdentityStore()

// State
const loading = ref(true)
const showKeyInfo = ref(false)
const keys = ref<any[]>([])
const identityId = ref('')
const identityName = ref('')

// Computed
const hasTransferKey = computed(() => {
    return keys.value.some(key => key.purpose === 1 || key.purpose === 3)
})

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

const getSecurityLevelText = (level: number) => {
    switch(level) {
        case 0: return 'Master - Full control'
        case 1: return 'Critical - Sensitive operations'
        case 2: return 'High - Important operations'
        case 3: return 'Medium - Regular operations'
        case 4: return 'Low - Basic operations'
        default: return 'Unknown'
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

const getKeyIconClass = (key: any) => {
    const purpose = key.purpose
    if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' // TRANSFER
    if (purpose === 0) return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' // AUTHENTICATION
    if (purpose === 2) return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' // ENCRYPTION
    return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
}

const getKeyIcon = (key: any) => {
    const purpose = key.purpose
    if (purpose === 1 || purpose === 3) return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' // TRANSFER
    if (purpose === 0) return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' // AUTHENTICATION
    if (purpose === 2) return 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' // ENCRYPTION
    return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' // Default check
}

// Load identity keys
const loadKeys = async () => {
    try {
        loading.value = true
        identityId.value = route.params.id as string

        // Get identity from store or fetch
        const identity = identityStore.identity
        if (identity && identity.id === identityId.value) {
            identityName.value = identityStore.username || identity.id
            keys.value = identity.publicKeys || []
        } else {
            // TODO: Fetch identity details by ID
            console.log('Need to fetch identity:', identityId.value)
            // For now, use mock data
            identityName.value = identityId.value.slice(0, 8) + '...' + identityId.value.slice(-8)
            keys.value = []
        }
    } catch (error) {
        console.error('Failed to load keys:', error)
        showNotification('error', 'Failed to load identity keys')
    } finally {
        loading.value = false
    }
}

const disableUnusedKeys = () => {
    // TODO: Implement key disabling
    showNotification('info', 'Key disabling feature coming soon')
}

const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', {
        detail: { type, message, duration: 3000 }
    })
    window.dispatchEvent(event)
}

onMounted(async () => {
    await loadKeys()
})
</script>
