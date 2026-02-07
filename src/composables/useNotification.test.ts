// src/composables/useNotification.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotification } from './useNotification'

describe('useNotification', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        const { dismissAll } = useNotification()
        dismissAll()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should add a notification to the queue', () => {
        const { show, notifications } = useNotification()
        show('Test Message', 'success')

        expect(notifications.length).toBe(1)
        expect(notifications[0]!.message).toBe('Test Message')
        expect(notifications[0]!.type).toBe('success')
    })

    it('should automatically dismiss after duration', () => {
        const { show, notifications } = useNotification()
        show('Temp', 'info', 1000)

        expect(notifications.length).toBe(1)
        vi.advanceTimersByTime(1100)
        expect(notifications.length).toBe(0)
    })

    it('should clear existing timeout when dismissed manually', () => {
        const { show, dismiss, notifications } = useNotification()
        const spy = vi.spyOn(global, 'clearTimeout')
        const id = show('Manual', 'info', 5000)

        dismiss(id)
        expect(notifications.length).toBe(0)
        expect(spy).toHaveBeenCalled()
    })

    it('should handle notification actions', () => {
        const callback = vi.fn()
        const { show, notifications } = useNotification()
        show('Action', 'info', 0, {
            action: { label: 'Undo', callback }
        })

        expect(notifications[0]!.action!.label).toBe('Undo')
        notifications[0]!.action!.callback()
        expect(callback).toHaveBeenCalled()
    })

    it('should dismiss all notifications at once', () => {
        const { show, dismissAll, notifications } = useNotification()
        show('1')
        show('2')
        dismissAll()
        expect(notifications.length).toBe(0)
    })
})
