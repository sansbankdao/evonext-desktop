// src/composables/useDeepLink.ts

import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { log } from '@/utils/env'

/** A parsed `dash:` payment URI. */
export interface DashPaymentRequest {
    /** The Dash address from the URI path (or host for `dash://addr`). */
    address: string
    /** The `amount` query parameter, when present and numeric. */
    amount: number | null
}

/**
 * Parse a `dash:` payment URI into an address and optional amount.
 *
 * WHY BOTH path AND hostname ARE CHECKED
 * --------------------------------------
 * `dash:ADDR` and `dash://ADDR` are both valid and both reach us, but the
 * WHATWG URL parser splits them differently. Verified with node:
 *
 *   dash:ADDR?amount=0.1   -> protocol="dash:", host="",     pathname="ADDR"
 *   dash://ADDR?amount=0.1 -> protocol="dash:", host="ADDR",  pathname=""
 *
 * So the address lives in `pathname` for the opaque form and in `hostname`
 * for the authority form. Checking only one silently yields an empty address
 * for half the links.
 *
 * Returns null for anything that is not a `dash:` URI or carries no address.
 */
export function parseDashUri(raw: string): DashPaymentRequest | null {
    if (!raw) return null

    let url: URL
    try {
        url = new URL(raw)
    } catch {
        log('debug', `[DeepLink] not a URL: ${raw}`)
        return null
    }

    if (url.protocol !== 'dash:') return null

    const address = (url.hostname || url.pathname || '').replace(/^\/+/, '')
    if (!address) {
        log('debug', `[DeepLink] dash URI carries no address: ${raw}`)
        return null
    }

    const rawAmount = url.searchParams.get('amount')
    let amount: number | null = null

    if (rawAmount !== null && rawAmount !== '') {
        const parsed = Number(rawAmount)
        // NOTE: Guard against NaN AND non-positive values. A `dash:` link with
        //       amount=0 or amount=-1 would otherwise prefill a nonsense
        //       amount field; leaving it null lets the user type it.
        if (Number.isFinite(parsed) && parsed > 0) {
            amount = parsed
        } else {
            log('debug', `[DeepLink] ignoring non-positive amount: ${rawAmount}`)
        }
    }

    return { address, amount }
}

/**
 * Route a `dash:` payment URI into the wallet send screen.
 *
 * The address and amount are passed as query parameters; `Send.vue` reads
 * them on mount. Using the router (rather than calling the store directly)
 * keeps this composable free of wallet state and means a deep link is
 * reviewable as an ordinary navigation.
 */
export function useDeepLink() {
    let unlisten: UnlistenFn | null = null
    /** Router injected lazily so this module stays testable without a router. */
    type PushFn = (to: { path: string; query: Record<string, string> }) => unknown
    let push: PushFn | null = null

    /** Navigate to the send screen for a parsed request. */
    const openPayment = (request: DashPaymentRequest): void => {
        const query: Record<string, string> = { recipient: request.address }
        if (request.amount !== null) {
            query.amount = String(request.amount)
        }

        if (!push) {
            log('warn', '[DeepLink] no router bound; dropping payment request')
            return
        }

        log('debug', `[DeepLink] opening payment to ${request.address}`)
        void push({ path: '/wallet/send', query })
    }

    /** Parse and act on a list of URLs delivered by the plugin. */
    const handleUrls = (urls: string[] | null | undefined): void => {
        if (!urls || urls.length === 0) return

        for (const raw of urls) {
            const request = parseDashUri(raw)
            if (request) {
                openPayment(request)
                // NOTE: Only the first payment URI is navigated to. Multiple
                //       URLs in one event is possible on macOS; opening two
                //       send screens in sequence would discard the first.
                return
            }
        }
    }

    /**
     * Attach the deep-link listeners and drain the launch URL.
     *
     * Called from `App.vue` alongside the other startup wiring. The
     * `getCurrent()` call is what handles Linux/Windows, where the URL
     * arrives as a CLI argument to a freshly spawned process and is NOT
     * delivered to any listener.
     */
    const start = async (routerPush: PushFn): Promise<void> => {
        // NOTE: Idempotent. Calling start() twice would otherwise overwrite
        //       `unlisten` and leak the first listener — the OS would then
        //       deliver every URL twice and open two send screens. `App.vue`
        //       calls this once, but nothing here should depend on that.
        stop()

        push = routerPush

        unlisten = await onOpenUrl((urls) => {
            handleUrls(urls)
        })

        try {
            const current = await getCurrent()
            handleUrls(current)
        } catch (err) {
            // Expected on Linux/Windows when the app was started normally
            // (no deep link in argv) — the plugin returns nothing usable.
            log('debug', '[DeepLink] no launch URL:', err)
        }
    }

    /**
     * Detach the listener and unbind the router.
     *
     * Safe to call repeatedly and before `start()`: every field is cleared
     * unconditionally, so `start()` can use it as a reset.
     */
    const stop = (): void => {
        if (unlisten) {
            unlisten()
        }
        unlisten = null
        push = null
    }

    // NOTE: No onMounted/onUnmounted hooks here on purpose. `App.vue` owns
    //       the application lifecycle (same pattern as startRealtime/
    //       stopRealtime), so this composable performs no hook registration
    //       and stays usable outside of component setup — which matters for
    //       the unit tests, where there is no active component instance.
    return { start, stop, handleUrls, openPayment }
}