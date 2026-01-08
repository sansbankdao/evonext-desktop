<!-- src/screens/Disconnect.vue -->
<template>
    <main>
        <Header title="Disconnect Identity" />

        <section class="flex items-center justify-center min-h-[calc(100vh-140px)] px-4">
            <div class="max-w-2xl w-full mx-auto space-y-8 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-8 bg-white dark:bg-slate-900">
                <!-- Page Header -->
                <div class="text-center space-y-3">
                    <p class="text-slate-600 dark:text-slate-400 text-xl leading-relaxed">
                        Current Identity details on {{ currentNetwork }}. Review and wipe data if desired. Data is stored locally.
                    </p>
                </div>

                <!-- Identity Details (if loaded) -->
                <div v-if="identityData" class="space-y-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl">
                    <h3 class="font-bold text-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        Connected Identity: {{ displayName }}
                    </h3>
                    <div class="space-y-2">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="text-sm">
                                <span class="font-medium text-slate-700 dark:text-slate-300">Identity ID:</span>
                                <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1 font-mono overflow-auto">{{ identityData.identityId || 'N/A' }}</pre>
                            </div>
                            <div class="text-sm">
                                <span class="font-medium text-slate-700 dark:text-slate-300">Balance:</span>
                                <div class="text-sm font-mono mt-1">{{ formattedBalance }}</div>
                            </div>
                        </div>
                        <div v-if="publicKeysCount > 0" class="text-sm mt-4">
                            <span class="font-medium text-slate-700 dark:text-slate-300">Public Keys:</span>
                            <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">{{ publicKeysCount }} key(s) loaded</div>
                        </div>
                        <div v-if="identityData.revision" class="text-sm text-emerald-700 dark:text-emerald-300">
                            Revision: {{ identityData.revision }}
                            <span v-if="identityData.createdAt" class="ml-4">Updated: {{ formatDate(identityData.createdAt.toString()) }}</span>
                        </div>
                    </div>
                </div>

                <!-- No Data -->
                <div v-else class="text-center py-12 space-y-4">
                    <svg class="w-16 h-16 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-6a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                    <p class="text-slate-500 dark:text-slate-400 font-medium">No identity data found for {{ currentNetwork }}.</p>
                </div>

                <!-- Security Warning -->
                <div class="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 p-4 rounded-2xl shadow-lg flex items-start gap-3">
                    <svg class="w-6 h-6 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 class="font-bold text-base mb-2">Data Wipe Confirmation</h3>
                        <p class="text-sm leading-relaxed">Wiping will permanently delete all local identity, keys, mnemonic, and assets for {{ currentNetwork }}. This cannot be undone.</p>
                    </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-4 rounded-2xl text-sm font-bold text-center shadow-lg flex items-start gap-3">
                    <svg class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div class="text-left">{{ error }}</div>
                </div>

                <!-- Actions -->
                <div class="grid grid-cols-2 gap-4 pt-6">
                    <button
                        @click="goToConnect"
                        class="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-slate-600 hover:to-slate-700 hover:shadow-3xl hover:-translate-y-1 focus:ring-4 focus:ring-slate-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Connect</span>
                    </button>
                    <button
                        @click="wipeAllData"
                        :disabled="!identityData || isWiping"
                        class="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:from-red-600 hover:to-red-700 hover:shadow-3xl hover:-translate-y-1 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-lg focus:ring-4 focus:ring-red-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                    >
                        <svg v-if="isWiping" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{{ isWiping ? 'Wiping...' : 'Wipe All Data' }}</span>
                    </button>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useIdentityStore } from '@/stores/identity'
import Header from '@/components/Header.vue'
// import type { IIdentity } from '@/types'

const router = useRouter()
const settingsStore = useSettingsStore()
const identityStore = useIdentityStore()

const error = ref('')
const isWiping = ref(false)

// ✅ REPLACED: Reactive computeds from FIXED getters (no 'state'!)
const identityData = computed(() => identityStore.identity)
const displayName = computed(() => identityStore.displayName)
const formattedBalance = computed(() => identityStore.formattedBalance)
const publicKeysCount = computed(() => identityStore.publicKeysCount)

// ✅ Existing computeds unchanged
const currentNetwork = computed(() => settingsStore.state.network as 'mainnet' | 'testnet')

onMounted(async () => {
    await loadIdentityData()
})

async function loadIdentityData() {
    try {
        error.value = ''
        // ✅ Just hydrate store → getters/computeds react automatically!
        await identityStore.initFromStorage()
        // NO assignment needed! identityData computed updates instantly
    } catch (err: any) {
        error.value = err.message || 'Failed to load identity data'
    }
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A'
    try {
        return new Date(dateString).toLocaleString()
    } catch {
        return 'Invalid date'
    }
}

async function wipeAllData() {
    if (!confirm(`Are you sure? This will delete ALL data for ${currentNetwork.value}: identity, keys, mnemonic, assets.`)) {
        return
    }

    isWiping.value = true
    error.value = ''

    try {
        await identityStore.clearStorage()
        // ✅ Store resets → computed identityData auto-nulls → UI updates!
        alert('All local data has been wiped successfully!')
        await router.push('/connect')
    } catch (err: any) {
        error.value = err.message || 'Wipe failed. Please try again.'
        console.error('Wipe error:', err)
    } finally {
        isWiping.value = false
    }
}

function goToConnect() {
    router.push('/connect')
}
</script>
