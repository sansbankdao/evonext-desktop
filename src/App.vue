<template>
    <RouterView />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { listen } from '@tauri-apps/api/event'
import type { UnlistenFn } from '@tauri-apps/api/event'

// 1. Get access to the vue-router instance
const router = useRouter()

let unlisten: UnlistenFn | undefined

// 2. Set up the listener when the component is mounted
onMounted(async () => {
    unlisten = await listen('navigate', (event) => {
        console.log('Navigating to:', event.payload)

        /* Validate event payload. */
        if (typeof event.payload !== 'undefined' && event.payload !== null) {
            /* Go to target. */
            router.push(event.payload)
        }
    })
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    if (unlisten) {
        unlisten()
    }
})
</script>

<style>
/* Use for global styles (e.g. scrollbars). */
</style>
