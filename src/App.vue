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
import { useUpdater } from '@/composables/useUpdater'
import { useNotification } from '@/composables/useNotification'

import { useStorageStore } from '@/stores/storage'
import { useSystemStore } from '@/stores/system'
import { useIdentityStore } from '@/stores/identity'
import { useWalletStore } from '@/stores/wallet'
import { useSettingsStore } from '@/stores/settings'

import { BootstrapService } from '@/services/BootstrapService'

const System = useSystemStore()
const Storage = useStorageStore()
const Identity = useIdentityStore()
const Wallet = useWalletStore()
const Settings = useSettingsStore()
const updater = useUpdater()
const notifier = useNotification()

const rootClass = computed(() => {
    if (Settings.state.theme === 'light') {
        return 'light'
    }
    if (Settings.state.theme === 'dark') {
        return 'dark'
    }
    return ''
})

/*
 * Check the manifest endpoint for a newer release on startup.
 *
 * If an update is available, surface an in-app toast (NOT a silent
 * download+relaunch) with an "Update now" action so the user stays in
 * control of when the app restarts. The Tauri updater plugin already
 * verifies the release signature against the pinned minisign pubkey
 * before returning an Update object, so a tampered manifest can never
 * reach this point — we only need to handle the user-visible UX.
 */
const manageUpdater = async () => {
    const available = await updater.checkForUpdate()

    if (!available) return

    notifier.show(
        `A new version (${updater.state.latestVersion}) is available.`,
        'info',
        0, // persistent until dismissed
        {
            isDismissible: true,
            action: {
                label: 'Update now',
                callback: async () => {
                    try {
                        await updater.downloadAndInstallUpdate()
                        // downloadAndInstallUpdate() relaunches on success.
                    } catch (err) {
                        notifier.showError(
                            `Update failed: ${err instanceof Error ? err.message : String(err)}`,
                        )
                    }
                },
            },
        },
    )
}

/* Initialize (navigation) router. */
const router = useRouter()

let unlisten: UnlistenFn | undefined

// Set up the listener when the component is mounted
onMounted(async () => {
    /* Add navigation listeners. */
    unlisten = await listen('navigate', (event) => {
        console.log('Navigating to:', event.payload)

        /* Validate event payload. */
        if (typeof event.payload !== 'undefined' && event.payload !== null) {
            /* Go to target. */
            router.push(event.payload)
        }
    })

    // Initialize system store first
    System.startPriceUpdates()

    // Run the centralized bootstrap sequence
    await BootstrapService.init()

    // Initialize identity from storage
    await Storage.initFromStorage()

    // Initialize wallet (sets user identity for balance fetching)
    // if (Wallet.assets.length === 0) {
    //     Wallet.initializeMockData()
    // }

    // Load LIVE wallet balances (CREDITS, DUSD, SANS)
    await Wallet.refreshBalances()

    console.log('App initialization complete. isAuthenticated:', Identity.isAuthenticated, 'DASH price:', System.currentDashPrice)

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
