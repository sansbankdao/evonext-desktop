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
import { startRealtime, stopRealtime } from '@/composables/useRealtime'
import { useRealtimeLifecycle } from '@/composables/useRealtimeLifecycle'
import { useDeepLink } from '@/composables/useDeepLink'

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

/*
 * Realtime socket lifetime.
 *
 * NOTE: Instantiated here at setup scope, not inside onMounted. The composable
 *       registers an onUnmounted hook, and hooks can only be registered while
 *       a component instance is active — calling it from inside an async
 *       onMounted callback would log a Vue warning and leak the socket.
 */
const realtime = useRealtimeLifecycle()

/*
 * `dash:` deep-link handling.
 *
 * NOTE: Instantiated at setup scope for the same reason as `realtime` — this
 *       composable registers no lifecycle hooks itself, and `App.vue` owns
 *       when listening starts and stops.
 */
const deepLink = useDeepLink()

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

    /* Start listening for realtime notifications. */
    // NOTE: Two steps, and the order matters. `startRealtime` attaches the
    //       OS-notification listeners first, so an event arriving immediately
    //       after the socket opens cannot be missed. `realtime.start()` then
    //       tracks the identity and opens the socket for it — including the
    //       common case where an identity is already connected from storage
    //       before this runs, which is why the watcher is `immediate`.
    await startRealtime()
    realtime.start()

    /* Start handling `dash:` deep links.
     * NOTE: On Linux/Windows a deep link starts a NEW process with the URL as
     *       its only argument, so this is also what reads the launch URL —
     *       there is no long-lived listener for that path.
     */
    // NOTE: `router.isReady()` is awaited before pushing. This is the ROOT
    //       component, so the initial navigation may not have resolved yet;
    //       a push issued before readiness can be dropped, which would make a
    //       cold-start `dash:` click silently do nothing.
    await deepLink.start(async (to) => {
        await router.isReady()
        return router.push(to)
    })

    manageUpdater()
})

// Clean up the listener when the component is unmounted
onUnmounted(() => {
    System.stopPriceUpdates()

    // NOTE: `realtime.stop()` closes the socket and detaches its watcher.
    //       The lifecycle composable also registers its own onUnmounted hook,
    //       so this is belt-and-braces: whichever runs first wins, and the
    //       second is a no-op because `connectedFor` is already cleared.
    void realtime.stop()

    stopRealtime()

    deepLink.stop()

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
