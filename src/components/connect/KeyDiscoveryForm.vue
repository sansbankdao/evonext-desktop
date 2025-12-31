<!-- src/components/connect/KeyDiscoveryForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Key Input -->
        <div>
            <label for="privateKey" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Private Key
            </label>
            <div class="relative">
                <input
                    id="privateKey"
                    v-model="keyInput"
                    :disabled="props.isDiscovering"
                    type="text"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Enter WIF (X..., 7..., c...) or HEX private key"
                    class="w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 font-mono text-sm"
                    @blur="handleKeyInputBlur"
                />
                <button
                    v-if="keyInput"
                    @click="clearKeyInput"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p class="font-medium">Supported Key Types:</p>
                <ul class="list-disc list-inside space-y-0.5 pl-2 text-slate-500">
                    <li>Authentication (ECDSA/Hash160)</li>
                    <li>Transfer (ECDSA/Secp256k1)</li>
                    <li>Encryption (ECDSA/Secp256k1)</li>
                </ul>
            </div>
        </div>
        <!-- Discover Button -->
        <div>
            <button
                type="button"
                @click="handleDiscoverClick"
                :disabled="!hasValidKeyInput || props.isDiscovering"
                class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
            >
                <svg v-if="props.isDiscovering" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ props.isDiscovering ? 'Searching Network...' : 'Discover Identity' }}</span>
            </button>
        </div>
        <!-- Discovery Results -->
        <div v-if="props.discoveredIdentity" class="space-y-4">
            <div class="p-4 border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
                        <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-emerald-800 dark:text-emerald-300">Identity Found!</h3>
                        <p class="text-sm text-emerald-600 dark:text-emerald-400">Ready to connect</p>
                    </div>
                </div>
                <!-- Identity Details -->
                <div class="space-y-2">
                    <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Identity ID</p>
                        <p class="font-mono text-sm break-all text-slate-800 dark:text-slate-200 select-all">
                            {{ props.discoveredIdentity.identityId }}
                        </p>
                    </div>
                    <div v-if="props.discoveredIdentity.dpnsUsername" class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {{ props.discoveredIdentity.dpnsUsername }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {{ formatBalance(props.discoveredIdentity.balance) }} Credits
                        </span>
                    </div>
                </div>
            </div>
            <!-- Associated Keys -->
            <div v-if="props.discoveryDetails?.associatedKeys?.length" class="space-y-3">
                <h4 class="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Associated Keys ({{ props.discoveryDetails.associatedKeys.length }})
                </h4>
                <div class="max-h-48 overflow-y-auto space-y-2 pr-1">
                    <div v-for="(key, index) in props.discoveryDetails.associatedKeys" :key="index"
                         class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {{ key.purpose }}
                                </span>
                                <span class="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded"
                                      :class="getSecurityLevelClass(key.securityLevel)">
                                    {{ key.securityLevel }}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-500 font-mono truncate">
                                {{ key.keyType }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Reset Button -->
            <button
                type="button"
                @click="handleReset"
                class="w-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
                Use Different Key
            </button>
        </div>
        <!-- Manual Identity ID Input (Fallback) -->
        <div v-else class="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <!-- Only show "No Identity Found" warning if we actually have an error passed in debug/error props -->
            <div v-if="props.debugOutput?.error || (props.debugOutput?.step?.includes('failed') && !props.isDiscovering)"
                 class="p-4 border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                        <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-amber-800 dark:text-amber-300">No Identity Found</h3>
                        <p class="text-sm text-amber-600 dark:text-amber-400">
                             {{ props.debugOutput?.error || "We couldn't find an identity for this key." }}
                        </p>
                    </div>
                </div>
            </div>
            <div class="relative">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                    <div class="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div class="relative flex justify-center">
                    <span class="bg-white dark:bg-slate-900 px-2 text-sm text-slate-500">Or enter Identity ID manually</span>
                </div>
            </div>
            <div>
                <label for="manualIdentityId" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Identity ID
                </label>
                <input
                    id="manualIdentityId"
                    v-model="localManualIdentityId"
                    type="text"
                    placeholder="e.g., v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5"
                    class="w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 font-mono text-sm"
                    @input="handleManualIdentityIdInput"
                />
                <button
                    type="button"
                    @click="handleUseManualIdentityClick"
                    :disabled="!localManualIdentityId.trim()"
                    class="mt-3 w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Use This Identity ID
                </button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DiscoveredIdentity } from '@/services/identity/types'
const props = defineProps<{
    debugOutput?: any
    discoveredIdentity?: DiscoveredIdentity | null
    discoveryDetails?: any
    manualIdentityId: string
    isDiscovering: boolean
}>()
const emit = defineEmits<{
    'update:manualIdentityId': [value: string]
    'discover-identity': [key: string]
    'reset-discovery': []
    'use-manual-identity': []
}>()
// Local state
const keyInput = ref('')
const localManualIdentityId = ref(props.manualIdentityId)
// Computed
const hasValidKeyInput = computed(() => {
    const key = keyInput.value.trim()
    if (!key) return false
    // Standard Dash WIFs (Testnet: c, 9 | Mainnet: X, 7) + BTC/Legacy (K, L, 5)
    // Supports 51 or 52 characters typically.
    if (/^[XxcLK9758y][0-9A-Za-z]{50,52}$/.test(key)) return true
    // HEX Private Key (64 chars)
    if (/^[0-9a-fA-F]{64}$/.test(key)) return true
    // Compressed PubKey (66 chars)
    if (/^0[23][0-9a-fA-F]{64}$/.test(key)) return true
    // Uncompressed PubKey (130 chars)
    if (/^04[0-9a-fA-F]{128}$/.test(key)) return true
    return false
})
// Methods
const handleDiscoverClick = () => {
    if (hasValidKeyInput.value) {
        emit('discover-identity', keyInput.value.trim())
    }
}
const handleKeyInputBlur = () => {
    // Only auto-trigger if we aren't already successful
    if (hasValidKeyInput.value && !props.discoveredIdentity && !props.isDiscovering && !props.debugOutput) {
       // Optional: Auto-discover logic removed to let user click button explicitly
       // or uncomment: emit('discover-identity', keyInput.value.trim())
    }
}
const clearKeyInput = () => {
    keyInput.value = ''
    emit('reset-discovery')
}
const handleReset = () => {
    keyInput.value = ''
    emit('reset-discovery')
}
const handleManualIdentityIdInput = () => {
    emit('update:manualIdentityId', localManualIdentityId.value)
}
const handleUseManualIdentityClick = () => {
    if (localManualIdentityId.value.trim()) {
        emit('use-manual-identity')
    }
}
const formatBalance = (balance: string | undefined) => {
    if (!balance) return '0'
    const num = parseFloat(balance)
    if (isNaN(num)) return '0'
    return (num / 100000000).toFixed(2)
}
const getSecurityLevelClass = (level: string) => {
    const classes = {
        'MASTER': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300',
        'CRITICAL': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300',
        'HIGH': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300',
        'MEDIUM': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
        'LOW': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
    }
    return classes[level as keyof typeof classes] || 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
}
// Watchers
watch(() => props.manualIdentityId, (newId) => {
    if (newId !== localManualIdentityId.value) {
        localManualIdentityId.value = newId
    }
})
watch(() => props.discoveredIdentity, (identity) => {
    if (identity?.identityId && identity.identityId !== localManualIdentityId.value) {
        localManualIdentityId.value = identity.identityId
        emit('update:manualIdentityId', identity.identityId)
    }
})
</script>
