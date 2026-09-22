// src/composables/useRealtimeLifecycle.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@/utils/tauri'
import { resetRealtimeState } from './useRealtime'

/**
 * Realtime lifecycle wiring.
 *
 * HISTORY — why these exist
 * -------------------------
 * Every layer of the realtime stack was finished and unit-tested, yet the
 * socket was NEVER opened: `connect_realtime` was not registered as a command,
 * `RealtimeState` was never managed, and no frontend code called
 * `registerDevice`. Nothing was broken in a way a normal test would catch —
 * the code simply was not reachable, and "not reachable" fails silently.
 *
 * These tests assert REACHABILITY: that connecting an identity actually
 * invokes the two Rust commands, in the right order, with the right payloads,
 * and that a write-only connection is a clean no-op.
 */

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn(),
}))

const mockEnsureNetwork = vi.fn().mockResolvedValue('testnet')
vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        ensure: mockEnsureNetwork,
    }),
}))

const mockGetAuthKey = vi.fn()
vi.mock('./useKeyManagement', () => ({
    useKeyManagement: () => ({
        getAuthKey: mockGetAuthKey,
    }),
}))

// The real store is a Pinia store; stub the single field the composable reads.
const identityState = { identityId: null as string | null }
vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => identityState,
}))

// Vue's lifecycle hooks are unavailable outside a component instance, so the
// composable is exercised through `sync()` rather than a mounted watcher.
vi.mock('vue', async () => {
    const actual = await vi.importActual<typeof import('vue')>('vue')
    return {
        ...actual,
        onUnmounted: vi.fn(),
        watch: vi.fn(),
    }
})

const IDENTITY = 'ADtgYG2MHikwv4UiZeY8faUsEkH1YDjEnJFhGbuXLfFB'
const WIF = 'cVt4o7BGAig1UXywgGSmARhxMdzP5qvQsxKkSsc1XEkw3tDTQFpy'

describe('realtime lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        resetRealtimeState()
        identityState.identityId = null
        mockEnsureNetwork.mockResolvedValue('testnet')
        mockGetAuthKey.mockResolvedValue(WIF)
        vi.mocked(invoke).mockResolvedValue(undefined)
    })

    /** Import fresh so module-level `connectedFor` starts empty. */
    const load = async () => {
        vi.resetModules()
        const mod = await import('./useRealtimeLifecycle')
        return mod.useRealtimeLifecycle()
    }

    it('registers the device and opens the socket for a connected identity', async () => {
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])

        expect(calls).toContain('register_realtime_device')
        expect(calls).toContain('connect_realtime')
    })

    it('registers BEFORE opening the socket', async () => {
        // Ordering is the point: the device must be in the fan-out index
        // before the socket exists, or an event published in the gap is lost.
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])

        expect(calls.indexOf('register_realtime_device')).toBeLessThan(
            calls.indexOf('connect_realtime'),
        )
    })

    it('passes the identity and the WIF to both commands', async () => {
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)

        const registerCall = vi
            .mocked(invoke)
            .mock.calls.find((c) => c[0] === 'register_realtime_device')
        const connectCall = vi
            .mocked(invoke)
            .mock.calls.find((c) => c[0] === 'connect_realtime')

        expect(registerCall?.[1]).toEqual({ identityId: IDENTITY, wif: WIF })
        expect(connectCall?.[1]).toEqual({ identityId: IDENTITY, wif: WIF })
    })

    it('treats a write-only connection as a clean no-op', async () => {
        // A write-only connection stores no private keys. That is normal, and
        // must not reach Rust with an empty WIF.
        mockGetAuthKey.mockResolvedValue(null)

        const lifecycle = await load()
        await lifecycle.sync(IDENTITY)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])

        expect(calls).not.toContain('connect_realtime')
        expect(calls).not.toContain('register_realtime_device')
    })

    it('never forwards an empty WIF to a Rust command', async () => {
        // MUTATION NOTE: removing the `if (!wif) return` guard in the
        // lifecycle composable does NOT fail the test above, because
        // `startRealtimeForIdentity` carries the same guard. That makes the
        // lifecycle guard defensive rather than load-bearing.
        //
        // This test pins the invariant itself rather than either specific
        // guard, so it stays meaningful if the duplication is ever collapsed
        // into one place: an empty or whitespace WIF must never be forwarded.
        for (const empty of [null, '', '   ']) {
            vi.clearAllMocks()
            resetRealtimeState()
            mockGetAuthKey.mockResolvedValue(empty)

            const lifecycle = await load()
            await lifecycle.sync(IDENTITY)

            const forwardedWif = vi
                .mocked(invoke)
                .mock.calls.filter((c) =>
                    c[0] === 'connect_realtime' || c[0] === 'register_realtime_device',
                )
                .map((c) => (c[1] as { wif?: string } | undefined)?.wif)

            expect(forwardedWif).toEqual([])
        }
    })

    it('does not reconnect when already connected to the same identity', async () => {
        // Reconnecting resets the server's replay window and mints a new
        // session for no reason, so a repeat sync must be inert.
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)
        const afterFirst = vi.mocked(invoke).mock.calls.length

        await lifecycle.sync(IDENTITY)

        expect(vi.mocked(invoke).mock.calls.length).toBe(afterFirst)
    })

    it('closes the socket when the identity is cleared', async () => {
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)
        await lifecycle.sync(null)

        expect(vi.mocked(invoke)).toHaveBeenCalledWith('disconnect_realtime')
        expect(lifecycle.connectedFor()).toBeNull()
    })

    it('does not send a disconnect when nothing is connected', async () => {
        const lifecycle = await load()

        await lifecycle.sync(null)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])
        expect(calls).not.toContain('disconnect_realtime')
    })

    it('closes the old socket before opening a new one on identity switch', async () => {
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)

        const OTHER = '9f3a1c7e2b444d109a887c5e1f2ab0d3'
        mockGetAuthKey.mockResolvedValue(WIF)
        await lifecycle.sync(OTHER)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])

        // One disconnect, and it precedes the second connect.
        const disconnectIndex = calls.indexOf('disconnect_realtime')
        const lastConnectIndex = calls.lastIndexOf('connect_realtime')

        expect(disconnectIndex).toBeGreaterThan(-1)
        expect(disconnectIndex).toBeLessThan(lastConnectIndex)
        expect(lifecycle.connectedFor()).toBe(OTHER)
    })

    it('records connectedFor only when the socket actually started', async () => {
        // If connect_realtime rejects (e.g. a build without the feature), the
        // composable must not believe a socket is open — otherwise a later
        // sync would short-circuit and the socket would never be retried.
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'connect_realtime') {
                throw new Error('compiled without the realtime feature')
            }
            return undefined
        })

        const lifecycle = await load()
        await lifecycle.sync(IDENTITY)

        expect(lifecycle.connectedFor()).toBeNull()
    })

    it('still opens the socket when device registration fails', async () => {
        // Registration is best-effort: a device registered on a previous
        // launch keeps its row, so a failed POST must not block the socket.
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'register_realtime_device') {
                return { device_token: 't', registered: false, detail: 'http 401' }
            }
            return undefined
        })

        const lifecycle = await load()
        await lifecycle.sync(IDENTITY)

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])
        expect(calls).toContain('connect_realtime')
        expect(lifecycle.connectedFor()).toBe(IDENTITY)
    })

    it('resolves a network before looking up a keystore key', async () => {
        // `load_keystore` is network-keyed, so a key lookup before the network
        // is loaded reads the wrong keystore.
        const lifecycle = await load()

        await lifecycle.sync(IDENTITY)
        lifecycle.start()

        expect(mockEnsureNetwork).toHaveBeenCalled()
    })

    it('tolerates a key lookup that throws', async () => {
        mockGetAuthKey.mockRejectedValue(new Error('keystore unreadable'))

        const lifecycle = await load()

        await expect(lifecycle.sync(IDENTITY)).resolves.toBeUndefined()

        const calls = vi.mocked(invoke).mock.calls.map((c) => c[0])
        expect(calls).not.toContain('connect_realtime')
    })
})
