// src/composables/useRealtimeToast.ts

import { getCurrentWindow } from '@tauri-apps/api/window'
import {
    titleFor,
    bodyFor,
    showOsNotification,
    type NotifyEvent,
} from './useRealtime'
import { useNotification } from './useNotification'

/**
 * Bridge realtime events to a VISIBLE surface.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * `state.recent` was populated for the entire life of the socket while nothing
 * read it, so an event produced only an OS notification. That is wrong for the
 * common case where the user is already looking at the app: the OS banner
 * duplicates what is on screen, and on several platforms it steals focus. The
 * in-app toast host in `AppLayout.vue` was already there and simply unused by
 * the realtime path.
 *
 * THE RULE
 * --------
 * * window FOCUSED   -> in-app toast only
 * * window UNFOCUSED -> OS notification only
 *
 * Exactly one of the two, never both and never neither.
 *
 * NOTE: Imports are deliberately one-directional — `useRealtime` imports this
 *       module, and this module imports only the pure helpers and the OS-send
 *       function back from it. The cycle is resolved by ES module hoisting and
 *       is safe because nothing runs at module-evaluation time. Moving the
 *       helpers into a third module would remove the cycle entirely; that is
 *       worth doing if this file ever grows.
 */

/**
 * Resolve whether the app window currently has focus.
 *
 * PESSIMISTIC ON FAILURE: any error (no window, permission missing, running
 * outside Tauri) is treated as FOCUSED. That direction is chosen because it
 * guarantees the event reaches the user — an in-app toast in a window that is
 * actually hidden is merely invisible, whereas an OS notification suppressed on
 * a wrong guess is lost outright.
 */
async function windowIsFocused(): Promise<boolean> {
    try {
        return await getCurrentWindow().isFocused()
    } catch {
        return true
    }
}

/**
 * Show an in-app toast for an event.
 *
 * Failure is swallowed by design — see `handleRealtimeNotify`.
 */
function showToast(event: NotifyEvent): void {
    // NOTE: `useNotification` keeps its queue at MODULE scope, so this toast
    //       lands in the same host `AppLayout.vue` renders. Do NOT construct a
    //       second host here: a parallel queue would never be displayed.
    const notifier = useNotification()

    notifier.show(
        `${titleFor(event.type)}: ${bodyFor(event)}`,
        'info',
        5000,
        { isDismissible: true },
    )
}

/**
 * Surface a realtime event to whichever channel matches the window focus.
 *
 * NEVER THROWS. This runs inside a Tauri event listener, and an exception here
 * would tear the listener down and silently stop every future notification —
 * the same silent-failure mode this whole subsystem was written to eliminate.
 */
export async function handleRealtimeNotify(event: NotifyEvent): Promise<void> {
    try {
        const focused = await windowIsFocused()

        if (focused) {
            showToast(event)
            return
        }

        // NOTE: Delegated rather than sent inline, so the permission gate and
        //       the title/body formatting have exactly one implementation.
        //       `showOsNotification` swallows its own failures.
        await showOsNotification(event)
    } catch {
        // Swallowed deliberately. See the doc comment.
    }
}
