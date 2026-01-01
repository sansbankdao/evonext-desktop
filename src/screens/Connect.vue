<!-- src/screens/Connect.vue -->
<template>
    <main>
        <Header title="Connect to Platform" />
        <section class="flex items-center justify-center min-h-[calc(100vh-140px)] px-4">
            <div class="max-w-2xl w-full mx-auto space-y-8 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-8 bg-white dark:bg-slate-900">
                <!-- Page Header -->
                <div class="text-center space-y-3">
                    <p class="text-slate-600 dark:text-slate-400 text-xl leading-relaxed">
                        Securely access your identity using one of the methods below. Your data stays local.
                    </p>
                </div>

                <!-- Connection Method Tabs -->
                <ConnectMethodTabs
                    :model-value="connectionMethod"
                    @update-connection-method="updateConnectionMethod"
                />

                <!-- Security Warning -->
                <SecurityWarning />

                <!-- Form Container -->
                <form @submit.prevent="handleConnect" class="space-y-6">
                    <!-- Seed Phrase Form -->
                    <div v-if="connectionMethod === 'seed'">
                        <ConnectSeedForm
                            v-model:wordCount="seedWordCount"
                            v-model:seedWords="seedWords"
                            @paste="handlePaste"
                        />

                        <!-- Seed Discovery Status (Loading) -->
                        <div v-if="isSearchingSeed" class="text-center py-4">
                            <div class="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span class="text-sm">{{ discoveryStatus }}</span>
                            </div>
                        </div>

                        <!-- PROGRESS DISPLAY -->
                        <div v-if="discoveryProgress" class="mt-6 p-4 bg-gradient-to-r from-slate-50 to-cyan-50 dark:from-slate-800 dark:to-cyan-900/10 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center space-x-3">
                                    <div class="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                                    <div>
                                        <h4 class="font-bold text-slate-800 dark:text-slate-200">
                                            Scanning Progress
                                        </h4>
                                        <p class="text-sm text-slate-500 dark:text-slate-400">
                                            {{ progressMessage }}
                                        </p>
                                    </div>
                                </div>
                                <span class="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                                    {{ progressPercentage }}%
                                </span>
                            </div>

                            <!-- Progress bar -->
                            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                                <div
                                    class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-full rounded-full transition-all duration-500 ease-out"
                                    :style="{ width: `${progressPercentage}%` }"
                                ></div>
                            </div>

                            <!-- Status grid -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Identity</p>
                                    <div class="flex items-center space-x-2">
                                        <span class="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {{ discoveryProgress.currentIdentityIndex + 1 }}
                                        </span>
                                        <span class="text-sm text-slate-400 dark:text-slate-500">/</span>
                                        <span class="text-lg text-slate-600 dark:text-slate-400">
                                            {{ discoveryProgress.totalIdentities }}
                                        </span>
                                    </div>
                                </div>

                                <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Key</p>
                                    <div class="flex items-center space-x-2">
                                        <span class="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {{ discoveryProgress.currentKeyIndex + 1 }}
                                        </span>
                                        <span class="text-sm text-slate-400 dark:text-slate-500">/</span>
                                        <span class="text-lg text-slate-600 dark:text-slate-400">
                                            {{ discoveryProgress.totalKeysPerIdentity }}
                                        </span>
                                    </div>
                                </div>

                                <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Scanned</p>
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span class="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {{ discoveryProgress.scannedCount }}
                                        </span>
                                    </div>
                                </div>

                                <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Found</p>
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                        </svg>
                                        <span class="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {{ discoveryProgress.foundCount }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Current hash -->
                            <div v-if="discoveryProgress.currentPublicKeyHash" class="mt-4">
                                <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Current Key Hash
                                </p>
                                <div class="flex items-center space-x-2">
                                    <div class="flex-shrink-0 w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
                                    <code class="text-sm text-slate-800 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg truncate">
                                        {{ discoveryProgress.currentPublicKeyHash }}
                                    </code>
                                </div>
                            </div>

                            <!-- Path info -->
                            <div v-if="discoveryProgress.currentPath" class="mt-3">
                                <p class="text-xs text-slate-500 dark:text-slate-400">
                                    Path: <code class="font-mono">{{ discoveryProgress.currentPath }}</code>
                                </p>
                            </div>
                        </div>

                        <!-- Seed Discovery Results -->
                        <div v-if="seedDiscoveryResults.length > 0" class="mt-4 space-y-3">
                            <!-- Header with Count and Close Button -->
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Found {{ seedDiscoveryResults.length }} Identit{{ seedDiscoveryResults.length === 1 ? 'y' : 'ies' }}
                                </h3>
                                <button
                                    type="button"
                                    @click="closeResults"
                                    class="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                    title="Clear results"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div v-for="identity in seedDiscoveryResults" :key="identity.identityId"
                                 class="p-3 border rounded-lg cursor-pointer transition-colors"
                                 :class="selectedSeedIdentityId === identity.identityId
                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'"
                                 @click="selectSeedIdentity(identity)">
                                <div class="flex items-center justify-between">
                                    <div class="min-w-0 flex-1">
                                        <!-- Full Identity ID displayed in monospace -->
                                        <p class="font-mono text-sm font-medium text-slate-800 dark:text-slate-200 break-all mb-1">
                                            {{ identity.identityId }}
                                        </p>
                                        <p class="text-xs text-slate-600 dark:text-slate-400">
                                            {{ identity.dpnsUsername || 'No DPNS name' }} • {{ formatBalance(identity.balance) }} Credits
                                        </p>
                                    </div>
                                    <div v-if="selectedSeedIdentityId === identity.identityId"
                                         class="text-cyan-500 flex-shrink-0 ml-3">
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Seed Discovery Error -->
                        <div v-if="seedDiscoveryError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p class="text-sm text-red-600 dark:text-red-400">{{ seedDiscoveryError }}</p>
                        </div>
                    </div>

                    <!-- Private Key Form -->
                    <div v-else>
                        <KeyDiscoveryForm
                            :debug-output="debugOutput"
                            :discovered-identity="discoveredIdentity"
                            :discovery-details="discoveryDetails"
                            :manual-identity-id="manualIdentityId"
                            :is-discovering="isDiscovering"
                            @update:manual-identity-id="manualIdentityId = $event"
                            @discover-identity="handleDiscoverIdentity"
                            @reset-discovery="resetDiscovery"
                            @use-manual-identity="useManualIdentity"
                        />

                        <!-- Discovery Status -->
                        <div v-if="isDiscovering && !isSearchingSeed" class="text-center py-4">
                            <div class="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span class="text-sm">{{ discoveryStatus }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Connection Error Display -->
                    <ConnectErrorDisplay
                        v-if="connectionError"
                        :error="connectionError"
                    />

                    <!-- Debug Output (Optional) -->
                    <div v-if="debugOutput" class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-2">
                             <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">Discovery Info</h3>
                             <button @click="debugOutput = null" type="button" class="text-xs text-blue-500">Hide</button>
                        </div>
                        <div class="text-xs font-mono max-h-32 overflow-y-auto">
                            <pre>{{ JSON.stringify(debugOutput, null, 2) }}</pre>
                        </div>
                    </div>

                    <!-- Connect Button -->
                    <div class="pt-6">
                        <button
                            type="submit"
                            :disabled="!isFormValid || isConnecting || isDiscovering"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-cyan-600 hover:to-cyan-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-cyan-400/40"
                        >
                            <svg v-if="isConnecting" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                                {{ isConnecting ? 'Connecting...' :
                                   isDiscovering ? 'Searching...' :
                                   'Connect' }}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useConnect } from '@/composables/useConnect'

// Components
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'
import KeyDiscoveryForm from '@/components/connect/KeyDiscoveryForm.vue'

const {
    // State
    connectionMethod,
    seedWordCount,
    seedWords,
    seedDiscoveryResults,
    selectedSeedIdentityId,
    seedDiscoveryError,

    manualIdentityId,
    discoveredIdentity,
    discoveryDetails,
    debugOutput,

    // Status
    isSearchingSeed,
    isDiscovering,
    isConnecting,
    discoveryStatus,
    connectionError,
    isFormValid,

    // Progress
    discoveryProgress,
    progressPercentage,
    progressMessage,

    // Actions
    formatBalance,
    updateConnectionMethod,
    handlePaste,
    selectSeedIdentity,
    handleDiscoverIdentity,
    resetDiscovery,
    closeResults,
    useManualIdentity,
    handleConnect,
    initialize,
    cleanup
} = useConnect()

onMounted(() => {
    initialize()
})

onUnmounted(() => {
    cleanup()
})
</script>
