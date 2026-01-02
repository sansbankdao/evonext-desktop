<!-- src/components/connect/ConnectPrivateKeyForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Step 1: Enter Private Keys -->
        <div class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Private Keys</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
                Enter at least one of your private keys. We'll automatically discover your identity on-chain.
            </p>
            <div class="space-y-4">
                <div>
                    <label for="authKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.413a2.7 2.7 0 001.946-.661 2.7 2.7 0 014.438 0 2.7 2.7 0 001.946.661 2.7 2.7 0 012.611 2.611v3.686a2.7 2.7 0 002.611 2.611h2.064a2.7 2.7 0 001.946.661 2.704 2.704 0 01.682 2.15 2.7 2.7 0 00.661 2.146 2.7 2.7 0 000 3.806 2.7 2.7 0 00-.661 2.146 2.7 2.7 0 01-.946 1.946 2.7 2.7 0 01-2.146.682 2.7 2.7 0 01-1.946-.661V23a2.7 2.7 0 01-2.611-2.611H4.413a2.7 2.7 0 01-2.611-2.611 2.7 2.7 0 00-.661-1.946 2.7 2.7 0 010-3.806 2.7 2.7 0 00.661-2.146 2.7 2.7 0 01.946-1.946 2.7 2.7 0 012.146-.682h3.686z" />
                        </svg>
                        Authentication Key (WIF or HEX)
                    </label>
                    <input
                        id="authKey"
                        type="password"
                        v-model="authKey"
                        placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                        class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                        @input="emitUpdate"
                    />
                </div>
                <div>
                    <label for="transferKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Transfer Key (WIF or HEX)
                    </label>
                    <input
                        id="transferKey"
                        type="password"
                        v-model="transferKey"
                        placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                        class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                        @input="emitUpdate"
                    />
                </div>
                <div>
                    <label for="encryptionKey" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                        </svg>
                        Encryption Key (WIF or HEX)
                    </label>
                    <input
                        id="encryptionKey"
                        type="password"
                        v-model="encryptionKey"
                        placeholder="e.g., cN... (WIF) or a1b2c3d4... (HEX)"
                        class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                        @input="emitUpdate"
                    />
                </div>
                <button
                    @click.prevent="$emit('discover-identity')"
                    :disabled="!hasAtLeastOneKey || isDiscovering"
                    class="w-full py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg v-if="isDiscovering" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ isDiscovering ? 'Discovering...' : 'Discover My Identity' }}</span>
                </button>
            </div>
        </div>
        <!-- Step 2: Show Discovered Identity -->
        <div v-if="discoveredIdentity" class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 class="font-bold text-emerald-800 dark:text-emerald-300">Discovered Identity</h3>
            </div>
            <div>
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Identity Details
                </label>
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Identity ID:</span>
                        <code class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded truncate flex-1">
                            {{ discoveredIdentity.identityId }}
                        </code>
                        <button @click="copyToClipboard(discoveredIdentity.identityId!)" class="ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Balance:</span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                            {{ formatBalance(discoveredIdentity.balance?.toString() || '0') }} Dash
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Revision:</span>
                        <span class="text-slate-700 dark:text-slate-300">{{ discoveredIdentity.revision }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Public Keys:</span>
                        <span class="text-slate-700 dark:text-slate-300">{{ discoveredIdentity.publicKeys?.length || 0 }} found</span>
                    </div>
                    <div v-if="discoveredIdentity.dpnsUsername" class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">DPNS Name:</span>
                        <span class="text-blue-600 dark:text-blue-400 font-medium">{{ discoveredIdentity.dpnsUsername }}</span>
                    </div>
                </div>
            </div>
            <div class="pt-2">
                <button
                    @click.prevent="$emit('use-discovered-identity')"
                    class="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Continue with this Identity
                </button>
            </div>
        </div>
        <!-- Or manually enter Identity ID -->
        <div v-if="showManualIdentity" class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Identity Manually</h3>
                </div>
                <button @click="toggleManualIdentity" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Cancel
                </button>
            </div>
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
                    placeholder="e.g., username.dash or 5DbLwAxGBzUzo81VewMUwn4b5P4bpv9FNFybi25XB5Bk"
                    class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-slate-400/30 focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                    @input="emitUpdate"
                />
            </div>
            <div class="pt-2">
                <button
                    @click.prevent="$emit('use-manual-identity')"
                    :disabled="!manualIdentityId.trim()"
                    class="w-full py-2 px-4 bg-slate-500 hover:bg-slate-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Use this Identity ID
                </button>
            </div>
        </div>
        <!-- Or manually specify identity -->
        <div v-if="!discoveredIdentity && !showManualIdentity" class="text-center">
            <button
                @click="toggleManualIdentity"
                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
                Can't discover identity? Enter Identity ID manually
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DiscoveredIdentity } from '@/types'
const props = defineProps<{
    authKey: string
    transferKey: string
    encryptionKey: string
    discoveredIdentity?: DiscoveredIdentity | null
    manualIdentityId: string
}>()
const emit = defineEmits<{
    (e: 'update:authKey', value: string): void
    (e: 'update:transferKey', value: string): void
    (e: 'update:encryptionKey', value: string): void
    (e: 'update:discoveredIdentity', value: DiscoveredIdentity | null): void
    (e: 'update:manualIdentityId', value: string): void
    (e: 'discover-identity'): void
    (e: 'use-discovered-identity'): void
    (e: 'use-manual-identity'): void
}>()
const authKey = ref(props.authKey)
const transferKey = ref(props.transferKey)
const encryptionKey = ref(props.encryptionKey)
const manualIdentityId = ref(props.manualIdentityId)
const showManualIdentity = ref(false)
const isDiscovering = ref(false)
const hasAtLeastOneKey = computed(() => {
    return authKey.value.trim() !== '' ||
           transferKey.value.trim() !== '' ||
           encryptionKey.value.trim() !== ''
})
watch(authKey, (value) => {
    emit('update:authKey', value)
})
watch(transferKey, (value) => {
    emit('update:transferKey', value)
})
watch(encryptionKey, (value) => {
    emit('update:encryptionKey', value)
})
watch(manualIdentityId, (value) => {
    emit('update:manualIdentityId', value)
})
const toggleManualIdentity = () => {
    showManualIdentity.value = !showManualIdentity.value
}
const emitUpdate = () => {
    // Trigger parent updates when any field changes
    emit('update:authKey', authKey.value)
    emit('update:transferKey', transferKey.value)
    emit('update:encryptionKey', encryptionKey.value)
    emit('update:manualIdentityId', manualIdentityId.value)
}
const formatBalance = (balance: string): string => {
    if (!balance) return '0.00000000'
    const bigIntBalance = BigInt(balance)
    const dashBalance = Number(bigIntBalance) / 100000000
    return dashBalance.toFixed(8)
}
const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
        .then(() => {
            // You could add a toast notification here
            console.log('Copied to clipboard:', text)
        })
        .catch(err => {
            console.error('Failed to copy:', err)
        })
}
</script>
