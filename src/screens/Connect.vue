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

                        <!-- Seed Discovery Results -->
                        <div v-if="seedDiscoveryResults.length > 0" class="mt-4 space-y-3">
                            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Found {{ seedDiscoveryResults.length }} Identities
                            </h3>
                            <div v-for="(identity, index) in seedDiscoveryResults" :key="identity.identityId"
                                 class="p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                 @click="selectSeedIdentity(identity)">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-medium text-slate-800 dark:text-slate-200">
                                            {{ identity.identityId.substring(0, 16) }}...
                                        </p>
                                        <p class="text-xs text-slate-600 dark:text-slate-400">
                                            {{ identity.dpnsUsername || 'No DPNS name' }} • {{ formatBalance(identity.balance) }} Credits
                                        </p>
                                    </div>
                                    <div v-if="selectedSeedIdentityId === identity.identityId"
                                         class="text-cyan-500">
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
                        <div v-if="isDiscovering" class="text-center py-4">
                            <div class="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span class="text-sm">{{ discoveryStatus }}</span>
                            </div>
                        </div>

                        <!-- Identity Details -->
                        <div v-if="discoveredIdentity" class="mt-4 space-y-3">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Network:</span>
                                <span class="font-medium text-slate-800 dark:text-slate-200">Testnet</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Balance:</span>
                                <span class="font-medium text-emerald-600 dark:text-emerald-400">
                                    {{ formatBalance(discoveredIdentity.balance) }} Credits
                                </span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">Revision:</span>
                                <span class="font-medium text-slate-800 dark:text-slate-200">#{{ discoveredIdentity.revision }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Connection Error Display -->
                    <ConnectErrorDisplay
                        v-if="connectionError"
                        :error="connectionError"
                    />

                    <!-- Debug Output -->
                    <div v-if="debugOutput && debugOutput.step" class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 mr-2 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">Discovery Debug</h3>
                            </div>
                            <button @click="debugOutput = null" class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                Hide
                            </button>
                        </div>
                        <div class="text-xs font-mono space-y-1">
                            <div><span class="text-slate-600 dark:text-slate-400">Step:</span> <span class="text-blue-600 dark:text-blue-400">{{ debugOutput.step }}</span></div>
                            <div v-if="debugOutput.method"><span class="text-slate-600 dark:text-slate-400">Method:</span> <code class="text-purple-600 dark:text-purple-400">{{ debugOutput.method }}</code></div>
                            <div v-if="debugOutput.hash"><span class="text-slate-600 dark:text-slate-400">Hash:</span> <code class="text-pink-600 dark:text-pink-400">{{ debugOutput.hash.substring(0, 24) }}...</code></div>
                            <div v-if="debugOutput.keyType"><span class="text-slate-600 dark:text-slate-400">Key Type:</span> {{ debugOutput.keyType }}</div>
                            <div v-if="debugOutput.derivedHashes" class="pt-2">
                                <span class="text-slate-600 dark:text-slate-400">Derived Hashes:</span>
                                <ul class="mt-1 space-y-1">
                                    <li v-for="(hash, idx) in debugOutput.derivedHashes" :key="idx" class="text-xs">
                                        <code class="text-slate-600 dark:text-slate-400">{{ hash.substring(0, 24) }}...</code>
                                    </li>
                                </ul>
                            </div>
                            <div v-if="debugOutput.response" class="pt-2">
                                <span class="text-slate-600 dark:text-slate-400">Response:</span>
                                <pre class="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-40">{{ JSON.stringify(debugOutput.response, null, 2) }}</pre>
                            </div>
                        </div>
                    </div>

                    <!-- Connect Button -->
                    <div class="pt-6">
                        <button
                            type="submit"
                            :disabled="!isFormValid || isConnecting || isDiscovering || isSearchingSeed"
                            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-cyan-600 hover:to-cyan-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-cyan-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                        >
                            <svg v-if="isConnecting || isDiscovering || isSearchingSeed" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                                {{ isConnecting ? 'Connecting...' :
                                   isDiscovering || isSearchingSeed ? 'Searching...' :
                                   connectionMethod === 'seed' ? 'Connect with Seed' : 'Connect with Private Key' }}
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

// Import components
import Header from '@/components/Header.vue'
import ConnectMethodTabs from '@/components/connect/ConnectMethodTabs.vue'
import SecurityWarning from '@/components/connect/SecurityWarning.vue'
import ConnectSeedForm from '@/components/connect/ConnectSeedForm.vue'
import ConnectErrorDisplay from '@/components/connect/ConnectErrorDisplay.vue'
import KeyDiscoveryForm from '@/components/connect/KeyDiscoveryForm.vue'

const {
    // Formatting
    formatBalance,

    // Methods
    handleDiscoverIdentity,
    handleConnect,
    resetDiscovery,
    initialize,
    cleanup,

    // Reactive data from store via composable
    connectionMethod,
    seedWordCount,
    seedWords,
    selectedSeedIdentityId,
    seedDiscoveryResults,
    seedDiscoveryError,
    isSearchingSeed,
    debugOutput,
    discoveredIdentity,
    discoveryDetails,
    manualIdentityId,
    isDiscovering,
    isFormValid,
    discoveryStatus,
    connectionError,
    isConnecting,

    // Actions
    updateConnectionMethod,
    handlePaste,
    selectSeedIdentity,
    useManualIdentity
} = useConnect()

// Lifecycle hooks
onMounted(() => {
    initialize()
})

onUnmounted(() => {
    cleanup()
})
</script>
