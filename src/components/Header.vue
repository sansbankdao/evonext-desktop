<!-- src/components/Header.vue -->
<template>
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-gray-50 dark:bg-slate-900 p-6 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
            {{ title }}
        </h1>
        <div v-if="isConnected" class="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <span class="w-[300px]">
                <span class="block text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                    {{ username || 'User' }}
                </span>
                <span class="block text-sky-600/70 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                    {{ identityId || 'Loading...' }}
                </span>
            </span>
            <button
                class="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                @click="copyIdentityId"
                type="button"
                :aria-label="`Copy ${identityId || 'identity'} to clipboard`"
            >
                <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </button>
        </div>
        <!-- Connect Button when no identity -->
        <div v-else class="flex items-center">
            <router-link
                to="/connect"
                class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 00-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Connect Wallet</span>
            </router-link>
        </div>
    </header>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIdentityStore } from '@/stores/identity'
interface Props {
    title?: string
}
const props = withDefaults(defineProps<Props>(), {
    title: 'Unknown Page'
})
const { title } = props
const Identity = useIdentityStore()
const isCopied = ref(false)
// Explicitly compute these to guarantee reactivity
// We access store.state directly or use the store's computed refs if exposed
// Since Pinia stores are reactive, this ensures template dependency tracking
const isConnected = computed(() => Identity.isAuthenticated && !!Identity.identityId)
const username = computed(() => Identity.username || 'User')
const identityId = computed(() => Identity.identity?.identityId || '')
const copyIdentityId = async () => {
    const idToCopy = identityId.value
    if (!idToCopy) return
    try {
        await navigator.clipboard.writeText(idToCopy)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy identity ID:', err)
    }
}
</script>
