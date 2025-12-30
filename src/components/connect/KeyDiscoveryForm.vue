<!-- src/components/connect/KeyDiscoveryForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Key Input -->
        <div>
            <label for="privateKey" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Private Key or Public Key
            </label>
            <div class="relative">
                <textarea
                    id="privateKey"
                    v-model="keyInput"
                    :disabled="props.isDiscovering"
                    rows="3"
                    placeholder="Enter WIF (c..., K..., L...), HEX private key (64 chars), or public key (66+ chars)"
                    class="w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                    @blur="handleKeyInputBlur"
                ></textarea>
                <button
                    v-if="keyInput"
                    @click="clearKeyInput"
                    class="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Supports: WIF (cN..., K..., L...), HEX (64 chars), Compressed Public Key (02/03...), Uncompressed Public Key (04...)
            </p>
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
                <span>{{ props.isDiscovering ? 'Discovering...' : 'Discover Identity' }}</span>
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
                        <p class="text-sm text-emerald-600 dark:text-emerald-400">Click "Connect" to use this identity</p>
                    </div>
                </div>

                <!-- Identity Details -->
                <div class="space-y-2">
                    <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Identity ID</p>
                        <p class="font-mono text-sm break-all text-slate-800 dark:text-slate-200">
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
                <div class="grid grid-cols-1 gap-2">
                    <div v-for="(key, index) in props.discoveryDetails.associatedKeys" :key="index"
                         class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="px-2 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {{ key.purpose }}
                                    </span>
                                    <span class="px-2 py-1 text-xs font-medium rounded"
                                          :class="getSecurityLevelClass(key.securityLevel)">
                                        {{ key.securityLevel }}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
                                    {{ key.data.substring(0, 16) }}...
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    {{ key.keyType }}
                                </p>
                            </div>
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

        <!-- Manual Identity ID Input -->
        <div v-else class="space-y-4">
            <div class="p-4 border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                        <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-amber-800 dark:text-amber-300">No Identity Found</h3>
                        <p class="text-sm text-amber-600 dark:text-amber-400">Enter your Identity ID manually</p>
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
                        class="w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                        @input="handleManualIdentityIdInput"
                    />
                    <button
                        type="button"
                        @click="handleUseManualIdentityClick"
                        :disabled="!localManualIdentityId.trim()"
                        class="mt-3 w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl transition-all duration-200 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
                    >
                        Use This Identity ID
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DiscoveredIdentity } from '@/types'

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

    // Check for WIF format
    if (/^[cKL][0-9A-Za-z]{50,}$/.test(key)) return true

    // Check for HEX private key (64 chars)
    if (/^[0-9a-fA-F]{64}$/.test(key)) return true

    // Check for compressed public key (66 chars starting with 02/03)
    if (/^0[23][0-9a-fA-F]{64}$/.test(key)) return true

    // Check for uncompressed public key (130 chars starting with 04)
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
    if (hasValidKeyInput.value) {
        // Auto-discover on blur if input is valid
        setTimeout(() => {
            if (hasValidKeyInput.value) {
                handleDiscoverClick()
            }
        }, 300)
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
    const num = parseInt(balance, 10)
    if (isNaN(num)) return '0'
    return new Intl.NumberFormat().format(num)
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

// Watch for prop changes
watch(() => props.manualIdentityId, (newId) => {
    if (newId !== localManualIdentityId.value) {
        localManualIdentityId.value = newId
    }
})

// Watch for discovered identity changes to update manual ID
watch(() => props.discoveredIdentity, (identity) => {
    if (identity?.identityId && identity.identityId !== localManualIdentityId.value) {
        localManualIdentityId.value = identity.identityId
        emit('update:manualIdentityId', identity.identityId)
    }
})
</script>
