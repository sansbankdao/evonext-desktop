// src/composables/useRealtimeLifecycle.ts

import { watch, onUnmounted, type WatchStopHandle } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from './useNetwork'
import { useKeyManagement } from './useKeyManagement'
import { log } from '@/utils/env'
import {
    startRealtimeForIdentity,
    disconnectRealtime,
} from './useRealtime'

/**
 * Bind the realtime WebSocket lifetime to the active identity.
 *
 * WHY A SEPARATE COMPOSABLE
 * -------------------------
 * `App.vue` previously only attached the OS-notification listeners. Opening
 * the socket needs the identity id AND a private key, and the key must be
 * fetched on demand and discarded. Keeping that here means `App.vue` does not
 * gain a private-key code path, and there is exactly one place that decides
 * when the socket is open.
 *
 * LIFECYCLE
 * ---------
 * * identity appears (connect / unlock)  -> register device, open socket
 * * identity changes to a different id  -> close, then open for the new one
 * * identity disappears (disconnect)    -> close
 * * component unmounts                  -> close
 *
 * The Rust client owns reconnect and backoff afterwards, so this composable
 * never polls and never retries.
 */
export function useRealtimeLifecycle() {
    const Identity = useIdentityStore()
    const { ensure } = useNetwork()
    const keys = useKeyManagement()

    let stopWatch: WatchStopHandle | null = null
    /** The identity the socket is currently open for, if any. */
    let connectedFor: string | null = null

    /**
     * Fetch the authentication key for an identity, on demand.
     *
     * Returns null for a write-only connection (no private keys stored) and
     * for an identity whose auth key is absent. Both are normal conditions:
     * a write-only connection simply receives no notifications.
     */
    const resolveAuthWif = async (identityId: string): Promise<string | null> => {
        try {
            // NOTE: Failures here are expected for a read-only connection, so
            //       they are logged at debug level rather than surfaced.
            return await keys.getAuthKey(identityId)
        } catch (err) {
            log('debug', `[Realtime] no auth key for ${identityId}:`, err)
            return null
        }
    }

    /** Close the socket and clear the tracked identity. */
    const close = async (): Promise<void> => {
        if (connectedFor === null) return

        const previous = connectedFor
        connectedFor = null

        await disconnectRealtime()
        log('debug', `[Realtime] disconnected (${previous})`)
    }

    /**
     * Ensure the socket is open for `identityId`, or closed when it is null.
     *
     * Exported so the app can drive it explicitly (e.g. after a network
     * switch) without waiting for a store change.
     */
    const sync = async (identityId: string | null): Promise<void> => {
        /* No identity: ensure closed. */
        if (!identityId) {
            await close()
            return
        }

        /* Already open for this identity: nothing to do. A second call would
         * have the Rust side tear down and rebuild the socket for no reason,
         * resetting the server's replay window and generating a new session. */
        if (connectedFor === identityId) return

        /* Switching identities: close the old socket first, so the server's
         * fan-out index never holds two sockets for two identities from one
         * client. */
        if (connectedFor !== null) {
            await close()
        }

        /* Resolve the key. */
        const wif = await resolveAuthWif(identityId)

        if (!wif) {
            // NOTE: Write-only connection. Not an error — there is simply
            //       nothing to sign the handshake with.
            log('debug', `[Realtime] no auth key; skipping socket for ${identityId}`)
            return
        }

        /* Open the socket. */
        const started = await startRealtimeForIdentity(identityId, wif)

        if (started) {
            connectedFor = identityId
        }
    }

    /**
     * Begin tracking the active identity.
     *
     * `immediate` opens the socket for an identity that is ALREADY connected
     * when this is called, which is the common case: the app bootstraps from
     * storage and the identity is present before any watcher fires.
     */
    const start = (options: { immediate?: boolean } = {}): void => {
        const { immediate = true } = options

        /*
         * Ensure the network is loaded before any key lookup, because
         * `load_keystore` is network-keyed. Without this the first call would
         * read the wrong (or no) keystore.
         */
        void ensure()

        stopWatch = watch(
            () => Identity.identityId,
            (identityId) => {
                void sync(identityId)
            },
            { immediate },
        )
    }

    /** Stop tracking and close the socket. */
    const stop = async (): Promise<void> => {
        stopWatch?.()
        stopWatch = null
        await close()
    }

    onUnmounted(() => {
        void stop()
    })

    return {
        start,
        stop,
        sync,
        /** The identity the socket is currently open for, if any. */
        connectedFor: () => connectedFor,
    }
}
