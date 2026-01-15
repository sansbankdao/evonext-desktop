<!-- src/screens/Identity/ManageKeys.vue -->
<template>
    <main>
        <Header :title="`Manage Keys - ${displayName}`" />
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
                                {{ displayName.charAt(0).toUpperCase() }}
                            </div>
                            <div class="flex-1">
                                <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                    Manage Keys
                                </h1>
                                <p class="text-lg text-slate-600 dark:text-slate-400">
                                    {{ displayName }}
                                </p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                                    ID: {{ shortId }}
                                </div>
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
                            <div v-if="keys.length === 0" class="text-center py-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                                <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <h3 class="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No keys registered</h3>
                                <p class="mt-1 text-sm text-slate-500">Get started by registering keys or adding a transfer key.</p>
                            </div>
                            <!-- FIX: md:grid-cols-2 for large screens -->
                            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div v-for="key in keys" :key="key.id"
                                     class="bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 p-5 hover:border-slate-300 dark:hover:border-slate-600 flex flex-col"
                                     :class="key.disabledAt ? 'opacity-75 grayscale' : ''">
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="space-y-3 flex-1">
                                            <div class="flex items-center gap-3">
                                                <span :class="getKeyIconClass(key.purpose)"
                                                      class="size-10 rounded-lg flex items-center justify-center shadow-sm">
                                                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getKeyIcon(key.purpose)" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                        {{ getPurposeLabel(key.purpose) }}
                                                        <span v-if="key.disabledAt" class="text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded">Disabled</span>
                                                    </h3>
                                                    <div class="flex flex-wrap gap-2 mt-1">
                                                        <span :class="getSecurityLevelClass(key.securityLevel)"
                                                              class="px-2 py-0.5 text-xs font-semibold rounded-full border border-transparent">
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
                                                    <span class="text-slate-500 dark:text-slate-400 min-w-[60px]">Key ID:</span>
                                                    <!-- FIX: key.id should now appear -->
                                                    <span class="font-mono text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded text-slate-700 dark:text-slate-300">{{ key.id ?? 'N/A' }}</span>
                                                </div>
                                                <div v-if="key.data" class="text-sm">
                                                    <div class="text-slate-500 dark:text-slate-400 mb-1">Public Key Data:</div>
                                                    <div class="font-mono text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg break-all text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                        {{ key.data }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="key.disabledAt" class="mt-auto p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 mb-3">
                                        <div class="flex items-center gap-2 text-red-800 dark:text-red-300 text-sm">
                                            <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Disabled on {{ new Date(key.disabledAt).toLocaleDateString() }}</span>
                                        </div>
                                    </div>

                                    <!-- Disable Key Button -->
                                    <button
                                        @click="showUnimplemented"
                                        class="mt-auto w-full rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-900 dark:hover:text-red-400 py-2 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                                        :disabled="!!key.disabledAt"
                                        :class="key.disabledAt ? 'opacity-50 cursor-not-allowed' : ''"
                                    >
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        {{ key.disabledAt ? 'Key Disabled' : 'Disable Key' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <!-- Actions Grid -->
                        <div v-if="keys.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RouterLink :to="`/identity/${identityId}/keys/add`"
                                        class="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-gradient-to-br hover:from-cyan-500/5 hover:to-cyan-600/5 transition-all duration-200 group">
                                <div class="size-12 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div class="text-left">
                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                                        Add New Key
                                    </h3>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Register a new public key
                                    </p>
                                </div>
                            </RouterLink>

                            <!-- Hide Disabled Keys -->
                            <button @click="showUnimplemented"
                                    class="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center hover:border-slate-500 dark:hover:border-slate-400 hover:bg-gradient-to-br hover:from-slate-500/5 hover:to-slate-600/5 transition-all duration-200 group">
                                <div class="size-12 rounded-full bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </div>
                                <div class="text-left">
                                    <h3 class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                                        Hide Disabled Keys
                                    </h3>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Clean up your view
                                    </p>
                                </div>
                            </button>
                        </div>
                        <!-- Info Section -->
                        <div class="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 p-6">
                            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                About Key Management
                            </h3>
                            <ul class="space-y-4">
                                <li class="flex items-start gap-3">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="size-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <svg class="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-slate-900 dark:text-slate-100">Key Purposes</h4>
                                        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            <span class="font-semibold text-blue-600 dark:text-blue-400">AUTHENTICATION (0)</span> for profile updates,
                                            <span class="font-semibold text-green-600 dark:text-green-400">TRANSFER (3)</span> for credits/tokens,
                                            <span class="font-semibold text-purple-600 dark:text-purple-400">ENCRYPTION (2)</span> for private messages.
                                        </p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="size-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <svg class="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-slate-900 dark:text-slate-100">Security Levels</h4>
                                        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            Keys range from MASTER (0) to LOW (4). Higher security allows more sensitive operations.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <!-- DEBUG SECTION -->
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
                    <!-- Context Info -->
                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Context</p>
                        <ul class="space-y-1 text-slate-400">
                            <li class="flex justify-between"><span class="opacity-70">Route ID:</span> <span class="text-white truncate ml-2">{{ identityId }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Network:</span> <span class="text-white">{{ network }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Loading:</span> <span class="text-amber-400">{{ loading }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Final Keys Count:</span> <span :class="keys.length > 0 ? 'text-emerald-400' : 'text-red-400'">{{ keys.length }}</span></li>
                        </ul>
                    </div>
                    <!-- SDK / Live Fetch -->
                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Live Fetch (SDK)</p>
                        <div class="mb-2" :class="debugLiveStatus.includes('Error') || debugLiveStatus.includes('Failed') ? 'text-red-400' : 'text-blue-400'">
                            Status: {{ debugLiveStatus }}
                        </div>
                        <div v-if="debugLiveData" class="bg-black p-2 rounded border border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                            <pre class="text-slate-300 whitespace-pre-wrap break-all">{{ JSON.stringify(debugLiveData, null, 2) }}</pre>
                        </div>
                    </div>
                    <!-- Local Map Fetch -->
                    <div class="bg-black/50 p-4 rounded border border-slate-700 lg:col-span-2">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Local Map (Rust)</p>
                        <div class="mb-2" :class="debugMapStatus.includes('Error') || debugMapStatus.includes('Failed') ? 'text-red-400' : 'text-blue-400'">
                            Status: {{ debugMapStatus }}
                        </div>
                        <div v-if="debugMapData" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-black p-2 rounded border border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                                <p class="text-slate-500 mb-1">Raw Identity Object:</p>
                                <pre class="text-slate-300 whitespace-pre-wrap break-all text-[10px]">{{ JSON.stringify(debugMapData, null, 2) }}</pre>
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
import { invoke } from '@tauri-apps/api/core'
import Header from '@/components/Header.vue'
import { useIdentityStore } from '@/stores/identity'
import type { IPublicKey } from '@/types'
const route = useRoute()
const identityStore = useIdentityStore()
// State
const loading = ref(true)
const showKeyInfo = ref(false)
const keys = ref<IPublicKey[]>([])
const identityId = ref<string>('')
const displayName = ref<string>('')
const network = ref<'mainnet' | 'testnet'>('mainnet')
// Debug State
const isDebugOpen = ref(false) // Closed by default since we fixed the issue
const debugLiveStatus = ref<string>('Waiting')
const debugLiveData = ref<any>(null)
const debugMapStatus = ref<string>('Waiting')
const debugMapData = ref<any>(null)
// Computed
const shortId = computed(() => {
    const id = identityId.value
    return `${id.slice(0, 8)}...${id.slice(-8)}`
})
const hasTransferKey = computed(() => {
    return keys.value.some(key => key.purpose === 3)
})
// --- Fetch Logic ---
const fetchData = async () => {
    loading.value = true
    debugLiveStatus.value = 'Waiting...'
    debugLiveData.value = null
    debugMapStatus.value = 'Waiting...'
    debugMapData.value = null
    try {
        identityId.value = String(route.params.id)
        // 1. Load Settings to get network
        const settings = await invoke<any>('load_settings').catch(() => null)
        network.value = settings?.network === 'testnet' ? 'testnet' : 'mainnet'

        // 2. Attempt to fetch fresh Identity Details from the network (DSL/SDK)
        debugLiveStatus.value = `Invoking get_identity_public_keys (${network.value})...`
        try {
            console.log(`Fetching live keys for ${identityId.value} on ${network.value}...`)
            const sdkData = await invoke<any>('get_identity_public_keys', {
                identityId: identityId.value,
                network: network.value
            })

            debugLiveStatus.value = 'Success'
            debugLiveData.value = sdkData

            let keysList: any[] = []
            // Handle response shape: It might be { keys: [...] } or just [...]
            if (sdkData) {
                if (Array.isArray(sdkData)) {
                    keysList = sdkData
                } else if (sdkData.publicKeys && Array.isArray(sdkData.publicKeys)) {
                    keysList = sdkData.publicKeys
                } else if (sdkData.keys && Array.isArray(sdkData.keys)) {
                    keysList = sdkData.keys
                }
            }

            if (keysList.length > 0) {
                // Map backend keys to frontend type
                // FIX: Explicitly mapping 'id'
                keys.value = keysList.map((k: any) => ({
                    id: k.id,
                    type: k.type || k.type_ || 'ECDSA_HASH160',
                    keyType: k.type || k.type_ || 'ECDSA_HASH160',
                    purpose: k.purpose,
                    securityLevel: k.securityLevel !== undefined ? k.securityLevel : k.security_level,
                    data: k.data,
                    readOnly: k.readOnly !== undefined ? k.readOnly : k.read_only,
                    disabledAt: k.disabledAt !== undefined ? k.disabledAt : k.disabled_at,
                }))
                // Resolve Display Name from SDK response or fallback
                displayName.value = sdkData.username || sdkData.displayName || identityId.value.slice(0, 8)
                console.log(`Successfully loaded ${keys.value.length} keys from network/DAPIClient.`)
                return // Success, exit here
            } else {
                console.warn('SDK returned empty key list. Checking local storage.')
                debugLiveStatus.value = 'Success (Empty)'
                throw new Error('Fallback to local')
            }
        } catch (e: any) {
            debugLiveStatus.value = `Failed: ${e.message || e}`
            console.warn('Network fetch failed, falling back to local identity map:', e)

            // 3. Fallback: Load Identity Map from Rust (Local Storage)
            debugMapStatus.value = 'Invoking load_identities_map...'
            try {
                const identityMap = await invoke<Record<string, any>>('load_identities_map', {
                    network: network.value
                })
                debugMapData.value = identityMap
                if (identityMap && identityMap[identityId.value]) {
                    debugMapStatus.value = 'Found Identity in Map'
                    const rawData = identityMap[identityId.value]
                    // FIX: Ensure we use the correct keys observed in debug:
                    displayName.value = rawData.username || rawData.displayName || rawData.identityId?.slice(0, 8) || identityId.value.slice(0, 8)
                    // FIX: Access 'publicKeys' (camelCase) not 'public_keys'
                    const rawKeys = rawData.publicKeys || []
                    // FIX: Map 'type' (camelCase) to 'type_', 'securityLevel', 'readOnly', 'disabledAt'
                    // FIX: Explicitly mapping 'id'
                    keys.value = rawKeys.map((k: any) => ({
                        id: k.id,
                        type_: k.type || 'ECDSA_HASH160',
                        keyType: k.type || 'ECDSA_HASH160',
                        purpose: k.purpose,
                        securityLevel: k.securityLevel,
                        data: k.data,
                        readOnly: k.readOnly,
                        disabledAt: k.disabledAt
                    }))
                    console.log(`Loaded ${keys.value.length} keys from local map.`)
                } else {
                    debugMapStatus.value = 'Identity Not Found in Map'
                    throw new Error('Identity not in map')
                }
            } catch (mapError: any) {
                debugMapStatus.value = `Failed: ${mapError.message || mapError}`
                console.warn('Local map fetch failed, using store fallback.', mapError)
                // 4. Final Fallback: Store (Active Identity)
                const active = identityStore.identity
                if (active && active.identityId === identityId.value) {
                    displayName.value = active.username || active.displayName || active.identityId.slice(0, 8)
                    keys.value = active.publicKeys || []
                    console.log(`Loaded keys from Pinia store (fallback).`)
                } else {
                    displayName.value = identityId.value.slice(0, 8)
                    keys.value = []
                }
            }
        }
    } catch (error) {
        console.error('Critical error loading keys:', error)
        showNotification('error', 'Failed to load identity keys')
    } finally {
        loading.value = false
    }
}
// --- Helpers ---
const getPurposeLabel = (purpose: number) => {
    switch(purpose) {
        case 0: return 'AUTHENTICATION'
        case 1: return 'ENCRYPTION'
        case 2: return 'DECRYPTION'
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
const getKeyIconClass = (purpose: number) => {
    if (purpose === 3) return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
    if (purpose === 0) return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
    if (purpose === 1 || purpose === 2) return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
}
const getKeyIcon = (purpose: number) => {
    if (purpose === 3) return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    if (purpose === 0) return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    if (purpose === 1 || purpose === 2) return 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
    return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
}
const showUnimplemented = () => {
    showNotification('info', 'Unimplemented')
}
const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', {
        detail: { type, message, duration: 3000 }
    })
    window.dispatchEvent(event)
}
onMounted(fetchData)
</script>
