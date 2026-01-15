import { reactive } from 'vue'

export interface Notification {
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration: number
    timeout?: ReturnType<typeof setTimeout>
    isDismissible?: boolean
    action?: {
        label: string
        callback: () => void
    }
}

// Singleton notifications list so all useNotification() calls share the same state
const notifications = reactive<Notification[]>([])
let nextId = 1

export function useNotification() {
    const show = (
        message: string,
        type: Notification['type'] = 'info',
        duration: number = 3000,
        options?: {
            action?: { label: string; callback: () => void }
            isDismissible?: boolean
        }
    ) => {
        const id = nextId++
        const notification: Notification = {
            id,
            type,
            message,
            duration,
            isDismissible: options?.isDismissible ?? true,
            action: options?.action
        }

        notifications.push(notification)

        if (duration > 0) {
            notification.timeout = setTimeout(() => dismiss(id), duration)
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
