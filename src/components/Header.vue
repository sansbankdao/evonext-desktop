<!-- src/components/Header.vue -->
<template>
    <header class="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
            {{ props.title }}
        </h1>

        <!-- Authenticated View -->
        <div v-if="isConnected" class="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <span class="w-[300px]">
                <span class="block text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider truncate">
                    {{ username }}
                </span>
                <span class="block truncate text-sky-600/70 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                    {{ displayIdentityId }}
                </span>
            </span>
            <button
                class="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                @click="copyIdentityId"
                type="button"
                :title="isCopied ? 'Copied!' : 'Copy to clipboard'"
            >
                <!-- Copy Icon -->
                <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <!-- Success/Check Icon -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </button>
        </div>

        <!-- Connect Button View -->
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

const Identity = useIdentityStore()
const isCopied = ref(false)

// 1. Consistency Fix:
// Use the same properties here that you used in `isConnected`.
// If `isConnected` relies on `Identity.identityId`, then that is where your data lives.
const isConnected = computed(() => Identity.isAuthenticated && !!Identity.identityId)

const username = computed(() => {
    // Check both potential locations to be safe
    return Identity.username || Identity.identity?.username || 'User'
})

const displayIdentityId = computed(() => {
    // The previous code was looking at Identity.identity.identityId (nested)
    // but the store likely has it flat at Identity.identityId
    return Identity.identityId || Identity.identity?.identityId || ''
})

// 2. Clipboard Fix:
// navigator.clipboard only works on HTTPS (secure context).
// This function adds a fallback for localhost/http.
const copyIdentityId = async () => {
    const textToCopy = displayIdentityId.value
    if (!textToCopy) return

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy)
        } else {
            // Fallback for non-secure contexts (dev environment)
            const textArea = document.createElement("textarea")
            textArea.value = textToCopy
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
        }

        // Trigger animation
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy identity ID:', err)
        alert('Could not copy ID automatically')
    }
}
</script>
