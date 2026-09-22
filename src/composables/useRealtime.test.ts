// src/composables/useRealtime.test.ts

import { describe, expect, it } from 'vitest'

import { EVENT_NOTIFY, EVENT_STATUS, useRealtime } from './useRealtime'

/**
 * These tests cover the pure presentation helpers only.
 *
 * The listener wiring needs a real Tauri event bus and is covered by the
 * manual checklist in docs/HANDOFF-realtime-websocket.md.
 */
describe('useRealtime event name constants', () => {
    it('matches the Rust client exactly', () => {
        // These strings are duplicated across the language boundary with no
        // compiler checking them. If the Rust constant is renamed and these
        // are not, the socket connects and every notification is silently
        // dropped — no error anywhere.
        expect(EVENT_NOTIFY).toBe('realtime://notify')
        expect(EVENT_STATUS).toBe('realtime://status')
    })
})

describe('useRealtime.titleFor', () => {
    const { titleFor } = useRealtime()

    it('labels Yappr post events as Yappr', () => {
        expect(titleFor('yappr_new_post')).toBe('Yappr')
        expect(titleFor('yappr_new_posts')).toBe('Yappr')
    })

    it('labels registrar events as EvoNext', () => {
        expect(titleFor('registrar_ready')).toBe('EvoNext')
    })

    it('falls back to the app name for an unknown event', () => {
        // Forward compatibility: the server may add event kinds before the
        // client knows about them. An unknown type must still notify.
        expect(titleFor('something_from_the_future')).toBe('EvoNext')
    })
})

describe('useRealtime.bodyFor', () => {
    const { bodyFor } = useRealtime()

    it('uses the post snippet when present', () => {
        expect(bodyFor({ type: 'yappr_new_post', message: 'hello world' })).toBe('hello world')
    })

    it('falls back when the post snippet is missing', () => {
        expect(bodyFor({ type: 'yappr_new_post' })).toBe('New post on Yappr')
    })

    it('falls back when the post snippet is an empty string', () => {
        // An empty body renders as a blank OS notification, which looks broken.
        expect(bodyFor({ type: 'yappr_new_post', message: '' })).toBe('New post on Yappr')
    })

    it('summarises a multi-post event', () => {
        expect(bodyFor({ type: 'yappr_new_posts', count: 3 })).toBe('3 new posts on Yappr')
    })

    it('handles a missing count without throwing', () => {
        expect(bodyFor({ type: 'yappr_new_posts' })).toBe('0 new posts on Yappr')
    })

    it('handles a non-numeric count without throwing', () => {
        // The payload crosses a JSON boundary; a string here must not produce
        // "NaN new posts".
        expect(bodyFor({ type: 'yappr_new_posts', count: 'lots' })).toBe(
            '0 new posts on Yappr',
        )
    })

    it('names the username for a registrar event', () => {
        expect(bodyFor({ type: 'registrar_ready', username: 'alice' })).toBe(
            'Your username alice is ready to register!',
        )
    })

    it('handles a missing username without printing undefined', () => {
        // A literal "undefined" in an OS notification is a visible bug.
        expect(bodyFor({ type: 'registrar_ready' })).toBe(
            'Your username is ready to register!',
        )
    })

    it('ignores a non-string username', () => {
        expect(bodyFor({ type: 'registrar_ready', username: 42 })).toBe(
            'Your username is ready to register!',
        )
    })

    it('uses a generic message for an unknown event with no message', () => {
        expect(bodyFor({ type: 'mystery' })).toBe('You have a new notification')
    })

    it('uses the message for an unknown event that has one', () => {
        expect(bodyFor({ type: 'mystery', message: 'something happened' })).toBe(
            'something happened',
        )
    })
})

describe('useRealtime initial state', () => {
    it('starts disconnected and unregistered', () => {
        const { state } = useRealtime()

        // NOTE: Module-scoped state, so this asserts the initial value rather
        //       than a fresh one. It documents the intended starting point.
        expect(state.status).toBe('disconnected')
        expect(state.lastRegistration).toBeNull()
        expect(state.recent).toEqual([])
    })
})
