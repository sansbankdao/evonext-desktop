// src/composables/useNotification.ts

import { ref, reactive } from 'vue'

export interface Notification {
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration: number
    timeout?: NodeJS.Timeout
}

export function useNotification() {
    const notifications = reactive<Notification[]>([])

    let nextId = 1

    const show = (message: string, type: Notification['type'] = 'info', duration: number = 3000) => {
        const id = nextId++

        const notification: Notification = {
            id,
            type,
            message,
            duration
        }

        notifications.push(notification)

        if (duration > 0) {
            notification.timeout = setTimeout(() => {
                dismiss(id)
            }, duration)
        }

        return id
    }

    const showSuccess = (message: string, duration?: number) =>
        show(message, 'success', duration)

    const showError = (message: string, duration?: number) =>
        show(message, 'error', duration || 5000)

    const showWarning = (message: string, duration?: number) =>
        show(message, 'warning', duration)

    const showInfo = (message: string, duration?: number) =>
        show(message, 'info', duration)

    const dismiss = (id: number) => {
        const index = notifications.findIndex(n => n.id === id)

        if (index !== -1) {
            const notification = notifications[index]

            if (notification?.timeout) {
                clearTimeout(notification.timeout)
            }

            notifications.splice(index, 1)
        }
    }

    const dismissAll = () => {
        notifications.forEach(notification => {
            if (notification.timeout) {
                clearTimeout(notification.timeout)
            }
        })

        notifications.length = 0
    }

    return {
        notifications,
        show,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismiss,
        dismissAll
    }
}
