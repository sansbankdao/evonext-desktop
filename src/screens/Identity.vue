<!-- src/screens/Identity.vue -->
<template>
    <main>
        <Header title="Identity Manager" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div class="space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                Choose An Identity
                            </h1>
                            <p class="text-lg text-slate-600 dark:text-slate-400">
                                Easily switch between your Identities or register a new one.
                            </p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3">
                             <RouterLink to="/identity/register" class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-8 text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>Register New Identity</span>
                            </RouterLink>
                        </div>
                    </div>

                    <div v-if="loading" class="text-center py-12">
                         <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                         <p class="mt-4 text-slate-600 dark:text-slate-400">Loading identities...</p>
                    </div>

                    <div v-else-if="identities.length === 0" class="text-center py-12">
                         <h3 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No Identities Found</h3>
                         <p class="mt-2 text-slate-600 dark:text-slate-400">No identities were found. Register or Restore one.</p>
                    </div>

                    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div v-for="identity in identities" :key="identity.identityId"
                            class="bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 border-slate-200 dark:border-slate-700"
                            :class="identity.identityId === activeIdentityId ? 'ring-4 ring-cyan-400/20 shadow-cyan-500/20 border-cyan-400 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5' : ''">
                            <div class="p-4 flex items-start gap-4">
                                <img :src="getAvatar(identity)" class="size-16 rounded-full flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 shadow-lg" />

                                <div class="flex-1 min-w-0">
                                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {{ identity.dpnsUsername || identity.identityId.slice(0, 8) + '...' }}
                                    </h2>
                                    <p class="text-slate-600 dark:text-slate-400 text-sm truncate">
                                        {{ identity.identityId }}
                                    </p>
                                </div>

                                <span v-if="identity.identityId === activeIdentityId" class="bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1 rounded-full">
                                    Active
                                </span>
                            </div>

                            <div class="mt-auto p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                                <div v-if="identity.identityId === activeIdentityId" class="grid grid-cols-2 gap-3">
                                    <RouterLink :to="`/identity/${identity.identityId}/keys`"
                                        class="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-400 text-cyan-700 dark:text-cyan-300 py-2.5 px-4 text-sm font-bold shadow-sm hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all">
                                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                        </svg>
                                        <span>Manage Keys</span>
                                    </RouterLink>

                                    <div class="text-center text-sm font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 px-6 py-3 rounded-xl border-2 border-cyan-400/30 col-span-2">
                                        Active Identity
                                    </div>
                                </div>

                                <template v-else>
                                    <button @click="handleSwitch(identity.identityId)"
                                            class="w-full rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 text-white py-3 px-6 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                        Switch Identity
                                    </button>
                                </template>
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
import { invoke } from '@/utils/tauri'
import { useConnect } from '@/composables/useConnect'
import { useIdentityStore } from '@/stores/identity'
import type { DiscoveredIdentity } from '@/types'
import Header from '@/components/Header.vue'

const store = useIdentityStore()
const { switchIdentity } = useConnect()

const activeIdentityId = computed(() => store.identityId || '')

const loading = ref(true)
const identities = ref<DiscoveredIdentity[]>([])
// src/screens/Identity.vue

const init = async () => {
    loading.value = true
    try {
        const settings = await invoke<any>('load_settings').catch(() => null)
        const network = settings?.network || 'mainnet'

        // THE DIRECT QUERY
        const rawData = await invoke<any>('load_identities_map', { network })

        // PROOF: This will now show your JSON content in the Browser Console
        console.log("[Source of Truth] Data from Rust:", rawData)

        if (rawData && typeof rawData === 'object') {
            const list: DiscoveredIdentity[] = []

            // Map the entries
            Object.entries(rawData).forEach(([key, value]: [string, any]) => {
                // Rust command above filters __, but we double-check here
                if (key.startsWith('__')) return

                list.push({
                    identityId: value.identityId || value.identity_id || key,
                    identityIdx: value.identityIdx ?? 0,
                    dpnsUsername: value.dpnsUsername ?? null,
                    balance: value.balance ? String(value.balance) : '0',
                    revision: value.revision ?? null,
                    publicKeys: value.publicKeys ?? []
                })
            })

            identities.value = list
        }
    } catch (e) {
        console.error("Failed to load:", e)
    } finally {
        loading.value = false
    }
}

const handleSwitch = async (targetId: string) => {
    if (loading.value) return
    loading.value = true
    try {
        const result = await switchIdentity(targetId)
        if (result.success) {
            // No manual reload needed. The computed 'activeIdentityId' will catch the store change.
            console.log(`Switched to ${targetId}`)
        } else {
            alert("Failed to switch: " + result.error)
        }
    } catch (e) {
        console.error(e)
        alert("An error occurred while switching identities.")
    } finally {
        loading.value = false
    }
}

const getAvatar = (identity: DiscoveredIdentity) => {
    if ((identity as any).avatarUrl) return (identity as any).avatarUrl
    const name = identity.dpnsUsername || identity.identityId
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
}

onMounted(init)
</script>
