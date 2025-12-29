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
                <div v-if="identityData" class="space-y-4 p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl">
                    <h3 class="font-bold text-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        Connected Identity: {{ identityData.identity_id }}
                    </h3>
                    <div v-if="identityData.public_keys" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">Public Keys</label>
                            <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-xl font-mono overflow-auto max-h-32">{{ JSON.stringify(identityData.public_keys, null, 2) }}</pre>
                        </div>
                        <div>
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">Public Key IDs</label>
                            <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-xl font-mono overflow-auto">{{ identityData.public_key_ids ? identityData.public_key_ids.join(', ') : 'None' }}</pre>
                        </div>
                    </div>
                    <div v-if="identityData.revision" class="text-sm text-emerald-700 dark:text-emerald-300">
                        Revision: {{ identityData.revision }}
                        <span v-if="identityData.created_at" class="ml-4">Updated: {{ identityData.created_at }}</span>
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
                <div class="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 p-6 rounded-2xl shadow-lg flex items-start gap-3">
                    <svg class="w-6 h-6 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 class="font-bold text-base mb-2">Data Wipe Confirmation</h3>
                        <p class="text-sm leading-relaxed">Wiping will permanently delete all local identity, keys, mnemonic, and assets for {{ currentNetwork }}. This cannot be undone.</p>
                    </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-6 rounded-2xl text-sm font-bold text-center shadow-lg flex items-start gap-3">
                    <svg class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {{ error }}
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import getNetwork from '@/libs/getNetwork'
import { useIdentityStore } from '@/stores/identity'
import Header from '@/components/Header.vue'

const router = useRouter()
const identityStore = useIdentityStore()

const currentNetwork = ref<'mainnet' | 'testnet'>('mainnet')
const identityData = ref<any>(null)
const error = ref('')
const isWiping = ref(false)

onMounted(async () => {
    currentNetwork.value = (await getNetwork()) as 'mainnet' | 'testnet'
    await loadIdentityData()
})

const loadIdentityData = async () => {
    try {
        const result = await identityStore.loadIdentityData(currentNetwork.value)
        identityData.value = result
    } catch (err: any) {
        error.value = err.message || 'Failed to load identity data.'
    }
}

const wipeAllData = async () => {
    if (!confirm(`Are you sure? This will delete ALL data for ${currentNetwork.value}: identity, keys, mnemonic, assets.`)) return

    isWiping.value = true
    error.value = ''

    try {
        // Wipe all network-specific data via store or direct invokes
        await Promise.all([
            identityStore.deleteIdentityData(currentNetwork.value),
            identityStore.deletePrivateKeys(currentNetwork.value),
            identityStore.deleteMnemonic(currentNetwork.value),
            identityStore.deleteAssets(currentNetwork.value),
        ])
        identityData.value = null
        alert('All data wiped successfully!')
        router.push('/connect')
    } catch (err: any) {
        error.value = err.message || 'Wipe failed.'
    } finally {
        isWiping.value = false
    }
}

const goToConnect = () => {
    router.push('/connect')
}
</script>
