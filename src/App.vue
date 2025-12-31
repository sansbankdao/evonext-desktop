<!-- src/App.vue -->
<template>
    <div :class="rootClass">
        <RouterView />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

import { useSystemStore } from '@/stores/system'
import { useIdentityStore } from '@/stores/identity'
import { useWalletStore } from '@/stores/wallet'
import { useSettingsStore } from '@/stores/settings'

const System = useSystemStore()
const Identity = useIdentityStore()
const Wallet = useWalletStore()
const Settings = useSettingsStore()

const rootClass = computed(() => {
    if (Settings.theme === 'light') {
        return 'light'
    }
    if (Settings.theme === 'dark') {
        return 'dark'
    }
    return ''
})

const manageUpdater = async () => {
    /* Request check. */
    const update = await check()
    console.log('AUTO UPDATER', update)

    /* Handle update. */
    if (update) {
        console.log(
            `Found update ${update.version} from ${update.date} with notes ${update.body}.`
        )

        let downloaded = 0
        let contentLength = 0

        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall((event) => {
            switch (event.event) {
            case 'Started':
                contentLength = Number(event.data.contentLength)
                console.log(`started downloading ${event.data.contentLength} bytes`)
                break
            case 'Progress':
                downloaded += event.data.chunkLength
                console.log(`downloaded ${downloaded} from ${contentLength}`)
                break
            case 'Finished':
                console.log('download finished')
                break
            }
        })

        console.log('Update installed successfully!')
        await relaunch()
    } else {
        console.log('NO updates found.')
    }
}

/* Initialize (navigation) router. */
const router = useRouter()

let unlisten: UnlistenFn | undefined

// Set up the listener when the component is mounted
onMounted(async () => {
    // Initialize system store first
    System.startPriceUpdates()

    // Initialize identity from storage
    await Identity.initFromStorage()

    // Initialize wallet (sets user identity for balance fetching)
    // if (Wallet.assets.length === 0) {
    //     Wallet.initializeMockData()
    // }

    // Load LIVE wallet balances (CREDITS, DUSD, SANS)
    await Wallet.refreshBalances()

    console.log('App initialization complete. isAuthenticated:', Identity.isAuthenticated, 'DASH price:', System.currentDashPrice)

    unlisten = await listen('navigate', (event) => {
        console.log('Navigating to:', event.payload)

        /* Validate event payload. */
        if (typeof event.payload !== 'undefined' && event.payload !== null) {
            /* Go to target. */
            router.push(event.payload)
        }
    })

    manageUpdater()
})

// Clean up the listener when the component is unmounted
onUnmounted(() => {
    System.stopPriceUpdates()

    if (unlisten) {
        unlisten()
    }
})
</script>

<style>
/* Use for global styles (e.g. scrollbars). */

/* Smooth theme transitions */
html {
    transition: color-scheme 0.2s ease-in-out;
}
</style>
