<!-- src/screens/Identity/ManageKeys.vue -->
<template>
    <main>
        <Header :title="`Manage Keys - ${displayName}`" />
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Back Nav & Conditional Transfer Key Button -->
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
                                {{ displayName.charAt(0).toUpperCase() }}
                            </div>
                            <div class="flex-1">
                                <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Manage Keys</h1>
                                <p class="text-lg text-slate-600 dark:text-slate-400">{{ displayName }}</p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">ID: {{ shortId }}</div>
                            </div>
                        </div>
                    </div>
                    <!-- Missing Transfer Key Alert -->
                    <div v-if="!hasTransferKey && !loading" class="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-4">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0">
                                <div class="rounded-full bg-amber-500/20 p-3">
                                    <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300">TRANSFER Key Required</h3>
                                <p class="mt-2 text-amber-700 dark:text-amber-400">This identity doesn't have a TRANSFER key. You need one to send transactions.</p>
                                <div class="mt-4 flex gap-3">
                                    <RouterLink :to="`/identity/${identityId}/keys/add`" class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                                        Add TRANSFER Key
                                    </RouterLink>
                                    <button @click="showKeyInfo = !showKeyInfo" class="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50">
                                        {{ showKeyInfo ? 'Hide Info' : 'Learn More' }}
                                    </button>
                                </div>
                                <div v-if="showKeyInfo" class="mt-4 space-y-3">
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">TRANSFER keys are used to sign credit and token transfers</span>
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
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">Registered Keys</h2>
                                <div class="text-sm text-slate-600 dark:text-slate-400">{{ keys.length }} keys</div>
                            </div>
                            <div v-if="keys.length === 0" class="text-center py-8 rounded-xl border-2 border-dashed border-slate-300">
                                <p class="text-slate-500">No keys registered</p>
                            </div>
                            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div v-for="key in keys" :key="key.id"
                                     :class="`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 p-5 flex flex-col relative
                                         ${key.disabledAt ? 'opacity-75 grayscale' : ''}
                                         ${!localKeys[key.id!] ? 'border-amber-400 bg-amber-500/5' : 'border-slate-200 dark:border-slate-700'}
                                     `">
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="space-y-3 flex-1">
                                            <div class="flex items-center gap-3">
                                                <span :class="getKeyIconClass(key.purpose)" class="size-10 rounded-lg flex items-center justify-center shadow-sm">
                                                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getKeyIcon(key.purpose)" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                                                        {{ getPurposeLabel(key.purpose) }}
                                                        <span v-if="key.disabledAt" class="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded">Disabled</span>
                                                        <span v-if="!localKeys[key.id!]" class="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-bold">Orphaned</span>
                                                    </h3>
                                                    <div class="flex flex-wrap gap-2 mt-1">
                                                        <span :class="getSecurityLevelClass(key.securityLevel)" class="px-2 py-0.5 text-xs font-semibold rounded-full border border-transparent">
                                                            {{ getSecurityLevelLabel(key.securityLevel) }}
                                                        </span>
                                                        <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-600">
                                                            {{ key.type }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="space-y-2 pl-13">
                                                <div class="flex items-center justify-between text-sm">
                                                    <span class="text-slate-500 min-w-[60px]">Key ID:</span>
                                                    <span class="font-mono text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded text-slate-700">{{ key.id ?? 'N/A' }}</span>
                                                </div>
                                                <div v-if="key.data" class="text-sm">
                                                    <div class="text-slate-500 mb-1">Public Key Data:</div>
                                                    <div class="font-mono text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg break-all text-slate-600 border border-slate-200">
                                                        {{ key.data }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Key Availability Actions -->
                                    <div class="mt-auto pt-4">
                                        <template v-if="!localKeys[key.id!]">
                                            <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
                                                <p class="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Private key missing from local storage. Signing restricted.</p>
                                            </div>
                                            <button @click="openImportModal(key.id!)" class="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 text-xs font-bold transition-all shadow-md">
                                                Import Private Key
                                            </button>
                                        </template>
                                        <button v-else @click="showUnimplemented"
                                            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 py-2.5 px-4 text-xs font-semibold transition-all"
                                        >
                                            {{ key.disabledAt ? 'Key Disabled' : 'Disable Key' }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Debug Section & Actions Grid (Omitted for brevity but kept in final code) -->
                    <!-- ... All existing Action components and footer sections ... -->
                </div>
            </div>
            <!-- IMPORT MODAL -->
            <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all duration-300 scale-100">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="size-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">Import Private Key</h3>
                    </div>
                    <p class="text-sm text-slate-500 mb-6">Enter the private key (Hex or WIF) associated with <span class="font-mono text-cyan-600">Key ID {{ targetKeyId }}</span>.</p>
                    <div class="space-y-5">
                        <textarea v-model="importKeyInput" rows="3" placeholder="Paste private key here..."
                                  class="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-4 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none transition-all"></textarea>
                        <div class="flex gap-4">
                            <button @click="showImportModal = false" class="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button @click="handleImport" :disabled="importKeyInput.length < 32"
                                    class="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50">
                                Save to Safu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- YOUR ORIGINAL DEBUG SECTION -->
            <div class="mt-8 mx-4 sm:mx-6 lg:mx-8 mb-8 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
                <div class="p-4 border-b border-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors" @click="isDebugOpen = !isDebugOpen">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3, 1.732 3z"/></svg>
                        <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest">Debug Information</h3>
                    </div>
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': isDebugOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <div v-if="isDebugOpen" class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-mono">
                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1 uppercase">Local Map Check</p>
                        <pre class="text-amber-500">{{ JSON.stringify(localKeys, null, 2) }}</pre>
                    </div>
                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1 uppercase">Live Fetch</p>
                        <div class="mb-2 text-blue-400">Status: {{ debugLiveStatus }}</div>
                        <div v-if="debugLiveData" class="max-h-40 overflow-y-auto custom-scrollbar">
                            <pre class="text-slate-300 whitespace-pre-wrap">{{ JSON.stringify(debugLiveData, null, 2) }}</pre>
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
import { invoke } from '@tauri-apps/api/core'
import Header from '@/components/Header.vue'
// import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import type { IPublicKey } from '@/types'

const route = useRoute()
// const identityStore = useIdentityStore()
const { ensure } = useNetwork()
// Existing State
const loading = ref(true)
const showKeyInfo = ref(false)
const keys = ref<IPublicKey[]>([])
const identityId = ref<string>('')
const displayName = ref<string>('')
const network = ref<'mainnet' | 'testnet'>('mainnet')
// New Local Key Detection
const localKeys = ref<Record<number, boolean>>({})
// New Modal State
const showImportModal = ref(false)
const targetKeyId = ref<number | null>(null)
const importKeyInput = ref('')
// Debug State
const isDebugOpen = ref(false)
const debugLiveStatus = ref<string>('Waiting')
const debugLiveData = ref<any>(null)
// const debugMapStatus = ref<string>('Waiting')
// const debugMapData = ref<any>(null)

const shortId = computed(() => {
    const id = identityId.value
    return id ? `${id.slice(0, 8)}...${id.slice(-8)}` : '...'
})

const hasTransferKey = computed(() => {
    return keys.value.some(key => key.purpose === 3 && !key.disabledAt)
})

// const checkLocalKeys = async () => {
//     try {
//         const activeNetwork = await ensure()
//         // 1. Load the raw keystore
//         const keystore: any = await invoke('load_private_keys', { network: activeNetwork })

//         // 2. Get keys ONLY for this specific identity
//         const identityPrivates = keystore?.identities?.[identityId.value] || []

//         // 3. Create a map of IDs that actually have a private key entry saved
//         const map: Record<number, boolean> = {}
//         identityPrivates.forEach((k: any) => {
//             // Only mark as locally present if the private_key field isn't empty
//             if (k.privateKey && k.privateKey.length > 0) {
//                 map[k.keyId] = true
//             }
//         })

//         localKeys.value = map
//         console.log(`[KeyManager] Local keys for ${identityId.value}:`, map)
//     } catch (e) {
//         console.warn('Failed to verify local keys', e)
//     }
// }

const fetchData = async () => {
    loading.value = true
    debugLiveStatus.value = 'Syncing...'

    try {
        identityId.value = String(route.params.id)

        // 1. Resolve Network
        const activeNetwork = await ensure()
        network.value = activeNetwork as 'mainnet' | 'testnet'

        // 2. Load Local Keystore (safu) and map existence strictly
        console.log(`[KeyManager] Verifying local keys for ${identityId.value} in Keystore...`)
        const keystore: any = await invoke('load_private_keys', { network: network.value })
        const identityPrivates = keystore?.identities?.[identityId.value] || []

        const map: Record<number, boolean> = {}
        identityPrivates.forEach((k: any) => {
            // Only consider a key present if the privateKey string is actually there
            if (k.privateKey && k.privateKey.trim().length > 0) {
                map[k.keyId] = true
            }
        })
        localKeys.value = map
        console.log(`[KeyManager] Verified local key mapping:`, map)

        // 3. Fetch Network Identity Details (SDK)
        debugLiveStatus.value = `Invoking get_identity_public_keys (${network.value})...`
        try {
            const sdkData = await invoke<any>('get_identity_public_keys', {
                identityId: identityId.value,
                network: network.value
            })

            debugLiveStatus.value = 'Success'
            debugLiveData.value = sdkData

            let keysList: any[] = sdkData?.publicKeys || sdkData?.keys || (Array.isArray(sdkData) ? sdkData : [])

            if (keysList.length > 0) {
                keys.value = keysList.map((k: any) => ({
                    id: k.id,
                    type: k.type || k.type_ || 'ECDSA_HASH160',
                    keyType: k.type || k.type_ || 'ECDSA_HASH160',
                    purpose: k.purpose,
                    securityLevel: k.securityLevel !== undefined ? k.securityLevel : k.security_level,
                    data: k.data,
                    readOnly: k.readOnly ?? false,
                    disabledAt: k.disabledAt ?? null,
                }))

                displayName.value = sdkData.username || sdkData.displayName || identityId.value.slice(0, 8)
                return // Exit on success
            }
            throw new Error('Empty Network Response')
        } catch (e: any) {
            console.warn('Network fetch failed, falling back to local identity map', e)
            debugLiveStatus.value = `Failed: ${e.message}. Using fallback.`

            // 4. Fallback: Load from Identity Map (Rust identities file)
            const identityMap = await invoke<Record<string, any>>('load_identities_map', { network: network.value })
            if (identityMap && identityMap[identityId.value]) {
                const rawData = identityMap[identityId.value]
                displayName.value = rawData.username || rawData.displayName || identityId.value.slice(0, 8)

                keys.value = (rawData.publicKeys || []).map((k: any) => ({
                    id: k.id,
                    type: k.type || k.type_ || 'ECDSA_HASH160',
                    keyType: k.type || k.type_ || 'ECDSA_HASH160',
                    purpose: k.purpose,
                    securityLevel: k.securityLevel ?? k.security_level,
                    data: k.data,
                    readOnly: k.readOnly ?? false,
                    disabledAt: k.disabledAt ?? null
                }))
            }
        }
    } catch (error) {
        console.error('Critical error loading keys:', error)
        showNotification('error', 'Failed to load key management data')
    } finally {
        loading.value = false
    }
}

const openImportModal = (id: number) => {
    targetKeyId.value = id
    importKeyInput.value = ''
    showImportModal.value = true
}

const handleImport = async () => {
    if (!targetKeyId.value || !importKeyInput.value) return
    try {
        const success = await invoke('save_imported_key', {
            identityId: identityId.value,
            keyId: targetKeyId.value,
            privateKeyHex: importKeyInput.value.trim(),
            network: network.value
        })
        if (success) {
            showNotification('success', 'Key imported into local storage')
            showImportModal.value = false
            await fetchData() // refresh UI
        }
    } catch (e: any) {
        showNotification('error', `Import failed: ${e}`)
    }
}

// Helpers...
const getPurposeLabel = (purpose: number) => {
    switch(purpose) {
        case 0: return 'AUTHENTICATION'; case 1: return 'ENCRYPTION'; case 2: return 'DECRYPTION'; case 3: return 'TRANSFER'; default: return `Purpose ${purpose}`
    }
}

const getSecurityLevelLabel = (level: number) => {
    switch(level) {
        case 0: return 'MASTER'; case 1: return 'CRITICAL'; case 2: return 'HIGH'; case 3: return 'MEDIUM'; case 4: return 'LOW'; default: return `Level ${level}`
    }
}

const getSecurityLevelClass = (level: number) => {
    if (level === 0) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    if (level === 1) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    if (level === 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

const getKeyIconClass = (purpose: number) => purpose === 3 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
const getKeyIcon = (purpose: number) => purpose === 3 ? 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
const showUnimplemented = () => showNotification('info', 'Unimplemented')
const showNotification = (type: any, message: string) => {
    window.dispatchEvent(new CustomEvent('notification', { detail: { type, message } }))
}

onMounted(fetchData)
</script>
