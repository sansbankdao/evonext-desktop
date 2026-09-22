// src/composables/useRealtime.ts

import { reactive, readonly } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification'
import { invoke } from '../utils/tauri'
import { handleRealtimeNotify } from './useRealtimeToast'

/**
 * Tauri event names emitted by the Rust realtime client.
 *
 * These MUST match the constants in `src-tauri/src/realtime/mod.rs`.
 */
export const EVENT_NOTIFY = 'realtime://notify'
export const EVENT_STATUS = 'realtime://status'

/** Connection states reported by the Rust client. */
export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

/**
 * A notification event pushed from the server.
 *
 * `type` is what the UI switches on. The remaining fields vary by type, which
 * is why an index signature is used rather than a discriminated union: the
 * server is the source of truth and may add event kinds without a client
 * release.
 */
export interface NotifyEvent {
    type: string
    [key: string]: unknown
}

/** Result of the device-registration call. */
export interface RegisterOutcome {
    device_token: string
    registered: boolean
    detail: string
}

/**
 * Human-readable title for an event kind.
 *
 * Falls back to the app name so an unrecognised event still produces a
 * visible notification rather than a blank one.
 */
export function titleFor(type: string): string {
    switch (type) {
        case 'yappr_new_post':
            return 'Yappr'
        case 'yappr_new_posts':
            return 'Yappr'
        case 'registrar_ready':
            return 'EvoNext'
        default:
            return 'EvoNext'
    }
}

/**
 * Build the notification body for an event.
 *
 * Deliberately defensive: an unexpected payload shape must not throw inside an
 * event handler, because that would silently kill the listener.
 */
export function bodyFor(event: NotifyEvent): string {
    switch (event.type) {
        case 'yappr_new_posts': {
            const count = typeof event.count === 'number' ? event.count : 0
            return `${count} new posts on Yappr`
        }
        case 'registrar_ready': {
            const username = typeof event.username === 'string' ? event.username : ''
            return username.length > 0
                ? `Your username ${username} is ready to register!`
                : 'Your username is ready to register!'
        }
        case 'yappr_new_post': {
            // NOTE: The manager sends a pre-truncated snippet as `message` for
            //       mobile push. When absent, fall back to a generic line
            //       rather than rendering an empty notification.
            const message = typeof event.message === 'string' ? event.message : ''
            return message.length > 0 ? message : 'New post on Yappr'
        }
        default:
            return typeof event.message === 'string' && event.message.length > 0
                ? event.message
                : 'You have a new notification'
    }
}

const state = reactive({
    /** Current connection state, as reported by the Rust client. */
    status: 'disconnected' as RealtimeStatus,
    /** Whether the OS has granted notification permission. */
    permissionGranted: false,
    /** Result of the most recent device registration attempt. */
    lastRegistration: null as RegisterOutcome | null,
    /**
     * Most recent connection error, or null.
     *
     * Populated when `connect_realtime` fails outright (e.g. a build compiled
     * without the `realtime` feature). Without this, that failure would be
     * invisible for exactly the reason it matters: no socket opens, so no
     * status event is ever emitted to contradict `disconnected`.
     */
    lastError: null as string | null,
    /**
     * Every event received this session (newest first).
     *
     * The durable in-session record. Written UNCONDITIONALLY by `handleNotify`
     * before any presentation decision, so it does not depend on window focus,
     * on the OS permission result, or on whether a toast rendered.
     *
     * NOTE: Not currently rendered by a screen. It exists so a future history
     *       view has a source, and so the count is observable in a debugger
     *       when notifications appear to be missing.
     */
    recent: [] as NotifyEvent[],
})

/** Maximum number of events retained for the UI. */
const MAX_RECENT = 50

let unlistenNotify: UnlistenFn | null = null
let unlistenStatus: UnlistenFn | null = null
let started = false

/**
 * Ensure OS notification permission is granted.
 *
 * Returns whether notifications may be shown. Never throws — a denied or
 * unavailable permission must not break the realtime connection.
 */
async function ensurePermission(): Promise<boolean> {
    try {
        if (await isPermissionGranted()) {
            state.permissionGranted = true
            return true
        }

        const result = await requestPermission()
        state.permissionGranted = result === 'granted'
        return state.permissionGranted
    } catch {
        state.permissionGranted = false
        return false
    }
}

/**
 * Show an OS notification, if permitted.
 *
 * EXPORTED so `handleRealtimeToast` can call it after deciding the window is
 * unfocused. Keeping the single OS-send path here (rather than duplicating the
 * permission check in the toast bridge) means the permission gate can only be
 * got wrong in one place.
 *
 * Never throws: this runs inside an event listener, and an exception here would
 * tear down the listener and silently stop all future notifications.
 */
export async function showOsNotification(event: NotifyEvent): Promise<void> {
    try {
        if (!state.permissionGranted && !(await ensurePermission())) {
            // NOTE: Permission denied is not an error. `handleNotify` has
            //       already prepended the event to `state.recent`, so it is
            //       retained regardless of whether the OS notification shows.
            return
        }

        sendNotification({
            title: titleFor(event.type),
            body: bodyFor(event),
        })
    } catch {
        // Swallowed deliberately. See the doc comment.
    }
}

/** Record an event and surface it.
 *
 * RECORDING HAPPENS FIRST, and unconditionally. `state.recent` is the durable
 * in-session record, so it must not depend on which presentation channel is
 * chosen or on whether that channel succeeded.
 *
 * PRESENTATION IS DELEGATED to `handleRealtimeToast`, which picks the in-app
 * toast or the OS notification based on window focus. That decision lives in
 * one place so a focused window never receives a duplicate OS banner.
 */
async function handleNotify(event: NotifyEvent): Promise<void> {
    state.recent = [event, ...state.recent].slice(0, MAX_RECENT)

    await handleRealtimeNotify(event)
}

/**
 * Register this installation with the server-side fan-out.
 *
 * Idempotent from the server's point of view: the device token is stable
 * across launches and the endpoint upserts on `(identityId, deviceToken)`.
 */
export async function registerDevice(identityId: string, wif: string): Promise<RegisterOutcome | null> {
    try {
        const outcome = await invoke<RegisterOutcome>('register_realtime_device', {
            identityId,
            wif,
        })
        state.lastRegistration = outcome
        return outcome
    } catch {
        state.lastRegistration = null
        return null
    }
}

/**
 * Open the realtime WebSocket for an identity.
 *
 * The Rust client owns reconnect/backoff, so this is a one-shot "start it"
 * call, not a keep-alive. Calling it again replaces the existing connection.
 *
 * Returns whether the client was started. Never throws: a failure to open a
 * notification socket must not break identity connection itself.
 */
export async function connectRealtime(identityId: string, wif: string): Promise<boolean> {
    try {
        await invoke('connect_realtime', { identityId, wif })
        state.lastError = null
        return true
    } catch (err) {
        state.lastError = err instanceof Error ? err.message : String(err)
        return false
    }
}

/**
 * Close the realtime WebSocket, if one is open.
 *
 * The Rust loop emits `disconnected` as it exits, so `state.status` settles
 * without the frontend having to force it.
 */
export async function disconnectRealtime(): Promise<void> {
    try {
        await invoke('disconnect_realtime')
    } catch {
        // Swallowed deliberately: disconnecting is best-effort cleanup, and a
        // failure here (e.g. app shutdown) has no useful recovery.
    }
}

/**
 * Register this device and open the realtime socket.
 *
 * ONE call site for the whole connect flow, so "register then connect"
 * cannot drift apart. Registration is best-effort: the socket is still
 * opened if the registration POST fails, because an already-registered
 * device (from a previous launch) keeps its row in `push_devices`.
 *
 * The caller supplies the WIF on demand and must not retain it — see
 * `useRealtimeLifecycle()`.
 */
export async function startRealtimeForIdentity(identityId: string, wif: string): Promise<boolean> {
    // NOTE: `trim()` is required — a whitespace-only WIF is truthy but
    //       decodes to nothing, so forwarding it would send Rust a value that
    //       fails as "invalid WIF" instead of being skipped as a write-only
    //       connection. The same applies to a blank identity.
    if (!identityId?.trim() || !wif?.trim()) {
        // NOTE: A write-only connection has no private keys, so this is a
        //       normal condition rather than an error. Leaving the status as
        //       `disconnected` is correct.
        return false
    }

    // NOTE: Registration is attempted first so the device is in the fan-out
    //       index before the socket opens. A missed registration only delays
    //       delivery until the next connect, so it is not fatal — the return
    //       value records what happened without blocking the socket.
    const registration = await registerDevice(identityId, wif)

    if (registration && !registration.registered) {
        console.warn('[Realtime] device registration failed:', registration.detail)
    }

    return await connectRealtime(identityId, wif)
}

/**
 * Start listening for realtime events.
 *
 * Safe to call more than once; only the first call attaches listeners.
 */
export async function startRealtime(): Promise<void> {
    if (started) return
    started = true

    try {
        unlistenNotify = await listen<NotifyEvent>(EVENT_NOTIFY, (e) => {
            void handleNotify(e.payload)
        })

        unlistenStatus = await listen<RealtimeStatus>(EVENT_STATUS, (e) => {
            state.status = e.payload
        })
    } catch {
        // NOTE: Listening is unavailable outside a Tauri context (e.g. the
        //       vitest environment). Reset so a later call can retry rather
        //       than being permanently marked as started.
        started = false
    }

    void ensurePermission()
}

/** Detach listeners. */
export function stopRealtime(): void {
    unlistenNotify?.()
    unlistenStatus?.()
    unlistenNotify = null
    unlistenStatus = null
    started = false
}

export function useRealtime() {
    return {
        state: readonly(state),
        startRealtime,
        stopRealtime,
        registerDevice,
        connectRealtime,
        disconnectRealtime,
        startRealtimeForIdentity,
        ensurePermission,
        // NOTE: Exported for testing and for the UI to render a preview.
        titleFor,
        bodyFor,
        // NOTE: Exported for tests to reset module-level state between cases.
        __resetRealtimeState: resetRealtimeState,
    }
}

/**
 * Reset module-level state.
 *
 * Test-only. The composable keeps singleton state on purpose (one socket per
 * app), so tests must be able to clear it without reloading the module.
 */
export function resetRealtimeState(): void {
    state.status = 'disconnected'
    state.permissionGranted = false
    state.lastRegistration = null
    state.lastError = null
    state.recent = []
}
