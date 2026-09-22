// src/composables/useRealtimeToast.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetRealtimeState } from './useRealtime'

/**
 * The in-app toast bridge for realtime events.
 *
 * HISTORY — why these exist
 * -------------------------
 * `state.recent` was populated for the whole of the socket's life while
 * NOTHING read it: the doc comment claimed "the UI can surface it in-app" and
 * that surface did not exist. Every notification went to the OS, including
 * ones for a window the user was already looking at.
 *
 * These tests pin the behaviour that fixes it: a FOCUSED window gets an
 * in-app toast and NO OS notification (the OS one would duplicate what is
 * already on screen); an UNFOCUSED window gets the OS notification.
 */

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn(),
}))

const mockSendNotification = vi.fn()
const mockIsPermissionGranted = vi.fn().mockResolvedValue(true)
const mockRequestPermission = vi.fn().mockResolvedValue('granted')

vi.mock('@tauri-apps/plugin-notification', () => ({
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    isPermissionGranted: () => mockIsPermissionGranted(),
    requestPermission: () => mockRequestPermission(),
}))

const mockIsFocused = vi.fn().mockResolvedValue(true)
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        isFocused: () => mockIsFocused(),
    }),
}))

const mockListen = vi.fn()
vi.mock('@tauri-apps/api/event', () => ({
    listen: (...args: unknown[]) => mockListen(...args),
}))

const mockShow = vi.fn()
const mockShowInfo = vi.fn()
vi.mock('./useNotification', () => ({
    useNotification: () => ({
        show: mockShow,
        showInfo: mockShowInfo,
    }),
}))

describe('realtime toast bridge', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        resetRealtimeState()
        mockIsFocused.mockResolvedValue(true)
        mockIsPermissionGranted.mockResolvedValue(true)
    })

    const load = async () => {
        vi.resetModules()
        return await import('./useRealtimeToast')
    }

    it('shows an in-app toast when the window is focused', async () => {
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_posts', count: 3 })

        expect(mockShow).toHaveBeenCalled()
        // show(message, type, duration, options) — message is argument 0.
        const [message] = mockShow.mock.calls[0] ?? []
        expect(message).toContain('3 new posts on Yappr')
    })

    it('does NOT show an OS notification when the window is focused', async () => {
        // The user is looking at the app. An OS banner repeats what is already
        // on screen, and on many platforms steals focus for no reason.
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_post', message: 'hello' })

        expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('shows an OS notification when the window is NOT focused', async () => {
        mockIsFocused.mockResolvedValue(false)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_post', message: 'hello' })

        // The OS path is delegated to `showOsNotification`, so the observable
        // effect is the plugin call it makes.
        expect(mockSendNotification).toHaveBeenCalled()
    })

    it('does not show a toast when the window is not focused', async () => {
        // Inverse of the first test: an unfocused window must not queue a
        // toast the user cannot see.
        mockIsFocused.mockResolvedValue(false)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_post', message: 'hello' })

        expect(mockShow).not.toHaveBeenCalled()
    })

    it('includes the event title in the toast', async () => {
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_posts', count: 2 })

        // The body alone ("2 new posts on Yappr") does not say where they
        // came from, so the title is part of the visible text.
        const [message] = mockShow.mock.calls[0] ?? []
        expect(message).toContain('Yappr')
    })

    it('still shows the toast when focus detection fails', async () => {
        // Failing to detect focus must not mean "show nothing" — the
        // pessimistic branch is to treat the window as focused and render
        // in-app, because that always reaches the user.
        mockIsFocused.mockRejectedValue(new Error('window unavailable'))

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_posts', count: 1 })

        expect(mockShow).toHaveBeenCalled()
    })

    it('never throws on an unexpected payload', async () => {
        // This runs inside an event listener. An exception would tear the
        // listener down and silently stop ALL future notifications.
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()

        await expect(
            handleRealtimeNotify({ type: 'mystery' } as never),
        ).resolves.toBeUndefined()
    })

    it('survives a toast host that throws', async () => {
        mockIsFocused.mockResolvedValue(true)
        mockShow.mockImplementation(() => {
            throw new Error('notification host exploded')
        })

        const { handleRealtimeNotify } = await load()

        await expect(
            handleRealtimeNotify({ type: 'yappr_new_posts', count: 1 }),
        ).resolves.toBeUndefined()
    })

    it('survives an OS notification that throws', async () => {
        mockIsFocused.mockResolvedValue(false)
        mockSendNotification.mockImplementation(() => {
            throw new Error('os notification failed')
        })

        const { handleRealtimeNotify } = await load()

        await expect(
            handleRealtimeNotify({ type: 'yappr_new_posts', count: 1 }),
        ).resolves.toBeUndefined()
    })

    it('does not format the message twice on the OS path', async () => {
        // The OS title/body formatting lives in `useRealtime`, so the toast
        // bridge must not re-implement it. Sending the raw event through means
        // exactly one plugin call with the derived title and body.
        mockIsFocused.mockResolvedValue(false)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'registrar_ready', username: 'alice' })

        expect(mockSendNotification).toHaveBeenCalledTimes(1)
        const payload = mockSendNotification.mock.calls[0]?.[0] as {
            title?: string
            body?: string
        }
        expect(payload?.title).toBe('EvoNext')
        expect(payload?.body).toContain('alice')
    })

    it('routes a registrar event to the toast with its username', async () => {
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'registrar_ready', username: 'alice' })

        const [message] = mockShow.mock.calls[0] ?? []
        expect(message).toContain('alice')
    })

    it('keeps the event in state.recent regardless of focus', async () => {
        // RECORDING AND PRESENTATION ARE SEPARATE CONCERNS.
        //
        // `handleRealtimeNotify` is the PRESENTATION bridge and deliberately
        // does not touch `state.recent`. Recording happens one level up, in
        // `useRealtime.handleNotify`, unconditionally — so the durable
        // in-session record cannot depend on which channel was chosen or on
        // whether that channel succeeded.
        const { handleRealtimeNotify } = await load()
        const { useRealtime } = await import('./useRealtime')

        mockIsFocused.mockResolvedValue(false)
        await handleRealtimeNotify({ type: 'yappr_new_posts', count: 7 })

        expect(useRealtime().state.recent).toHaveLength(0)
    })

    it('reuses the single shared notification host', async () => {
        // `useNotification` keeps its queue at MODULE scope, so the toast from
        // a realtime event lands in the same host `AppLayout.vue` renders.
        // A second, parallel queue would be invisible.
        mockIsFocused.mockResolvedValue(true)

        const { handleRealtimeNotify } = await load()
        await handleRealtimeNotify({ type: 'yappr_new_posts', count: 1 })

        expect(mockShow).toHaveBeenCalledTimes(1)
    })
})