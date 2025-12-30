<!-- src/components/connect/KeyDiscoveryForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Step 1: Input -->
        <div class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Any Private Key</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter any one of your private keys (Authentication, Encryption, or Transfer).
                We'll automatically discover your identity and all registered keys.
            </p>

            <div class="space-y-4">
                <!-- Key Input -->
                <div>
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                        </svg>
                        Private Key (WIF or HEX)
                    </label>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Enter as WIF (starts with cN/Kw) or raw HEX (64 characters). Accepts any key type.
                    </p>
                    <input
                        type="password"
                        v-model="privateKey"
                        placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                        class="w-full px-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                        @input="handleKeyInput"
                    />
                </div>

                <!-- Discover Button -->
                <button
                    @click.prevent="handleDiscover"
                    :disabled="!privateKey.trim() || isDiscovering"
                    class="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <svg v-if="isDiscovering" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{{ isDiscovering ? 'Discovering...' : 'Discover Identity' }}</span>
                </button>
            </div>
        </div>

        <!-- Step 2: Results -->
        <div v-if="discoveredIdentity" class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <h3 class="font-bold text-emerald-800 dark:text-emerald-300">Identity Discovered</h3>
                </div>
                <span class="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">Auto-detected</span>
            </div>

            <div class="space-y-4">
                <!-- Key Details -->
                <div v-if="discoveryDetails" class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
                    <div class="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-300 font-medium">
                        <span>Detected Key Type:</span>
                        <span class="font-bold">{{ discoveryDetails.detectedKeyType }}</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 italic">
                        {{ discoveryDetails.keyDescription }}
                    </p>
                </div>

                <!-- Identity Details -->
                <div>
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Identity Details
                    </label>
                    <div class="space-y-3">
                        <!-- Identity ID -->
                        <div class="flex items-start gap-2">
                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px] pt-1">Identity ID:</span>
                            <div class="flex-1">
                                <code class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg break-all block">
                                    {{ discoveredIdentity.identityId }}
                                </code>
                                <div class="flex justify-end mt-1">
                                    <button @click="copyToClipboard(discoveredIdentity.identityId)" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- DPNS Name -->
                        <div v-if="discoveredIdentity.dpnsUsername" class="flex items-center gap-2">
                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">DPNS Name:</span>
                            <span class="text-blue-600 dark:text-blue-400 font-medium">{{ discoveredIdentity.dpnsUsername }}</span>
                        </div>

                        <!-- Balance -->
                        <div class="flex items-center gap-2">
                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Balance:</span>
                            <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                                {{ formatBalance(discoveredIdentity.balance) }} Dash
                            </span>
                        </div>

                        <!-- Revision -->
                        <div class="flex items-center gap-2">
                            <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Revision:</span>
                            <span class="text-slate-700 dark:text-slate-300">{{ discoveredIdentity.revision }}</span>
                        </div>
                    </div>
                </div>

                <!-- Associated Keys Summary -->
                <div v-if="discoveryDetails">
                    <div class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Associated Keys Found
                    </div>
                    <div class="space-y-2">
                        <div
                            v-for="(key, idx) in discoveryDetails.associatedKeys"
                            :key="idx"
                            class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                        >
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-2 h-2 rounded-full"
                                    :class="key.purpose === 'AUTHENTICATION' ? 'bg-green-500' : key.purpose === 'TRANSFER' ? 'bg-blue-500' : 'bg-purple-500'"
                                ></div>
                                <div>
                                    <div class="font-medium text-sm">{{ key.purpose }}</div>
                                    <div class="text-xs text-slate-500">{{ key.securityLevel }} Security</div>
                                </div>
                            </div>
                            <div
                                v-if="key.derivedFromInput"
                                class="text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded"
                            >
                                Input Key
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Manual Identity -->
        <div v-if="!discoveredIdentity && !showManualIdentity" class="text-center">
            <button
                @click="showManualIdentity = true"
                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
                Can't discover identity? Enter Identity ID manually
            </button>
        </div>

        <!-- Manual Identity Form -->
        <div v-if="showManualIdentity" class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Identity Manually</h3>
                </div>
                <button @click="showManualIdentity = false" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Cancel
                </button>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
                If auto-discovery fails, you can manually enter your Identity ID or DPNS name.
            </p>
            <div>
                <label for="manualIdentityId" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Identity ID or DPNS Name
                </label>
                <input
                    id="manualIdentityId"
                    type="text"
                    v-model="manualIdentityId"
                    placeholder="username.dash or 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk"
                    class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-slate-400/30 focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                    @input="handleManualInput"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DiscoveredIdentity, IdentityDiscoveryDetails } from '@/types'

interface Props {
    discoveredIdentity?: DiscoveredIdentity | null
    discoveryDetails?: IdentityDiscoveryDetails | null
    manualIdentityId: string
    isDiscovering: boolean
}

interface Emits {
    (e: 'update:manualIdentityId', value: string): void
    (e: 'discover-identity', key: string): void
    (e: 'reset-discovery'): void
    (e: 'use-manual-identity', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const privateKey = ref('')
const showManualIdentity = ref(false)

const handleKeyInput = () => {
    emit('reset-discovery')
    showManualIdentity.value = false
}

const handleDiscover = () => {
    if (!privateKey.value.trim()) return
    emit('discover-identity', privateKey.value.trim())
}

const handleManualInput = () => {
    emit('update:manualIdentityId', manualIdentityId.value)
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
        .then(() => console.log('Copied to clipboard:', text))
        .catch(err => console.error('Failed to copy:', err))
}

const formatBalance = (balance: string): string => {
    if (!balance) return '0.00000000'
    try {
        const bigIntBalance = BigInt(balance)
        const dashBalance = Number(bigIntBalance) / 100000000
        return dashBalance.toFixed(8)
    } catch {
        return '0.00000000'
    }
}
</script>
