<!-- src/components/Header.vue -->
<template>
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-gray-50 dark:bg-slate-900 p-6 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
            {{ title }}
        </h1>

        <div v-if="Identity.isConnected && Identity.identity" class="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <span class="w-[300px]">
                <span class="block text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                    {{ Identity.username || 'User' }}
                </span>

                <span class="block text-sky-600/70 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                    {{ Identity.identity?.id || 'Loading...' }}
                </span>
            </span>

            <button
                class="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                @click="copyIdentityId"
                type="button"
                :aria-label="`Copy ${Identity.identity?.id || 'identity'} to clipboard`"
            >
                <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
/* Import modules. */
import { ref } from 'vue'
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

const copyIdentityId = async () => {
    if (!Identity.identity?.id) return

    try {
        await navigator.clipboard.writeText(Identity.identity.id)
        isCopied.value = true

        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy identity ID:', err)
    }
}
</script>
