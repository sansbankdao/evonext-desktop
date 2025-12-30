<!-- src/components/Notification.vue -->
<template>
    <Transition name="notification">
        <div
            v-if="visible"
            :class="[
                'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-sm',
                type === 'success' ? 'bg-emerald-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                type === 'warning' ? 'bg-amber-500 text-white' :
                'bg-blue-500 text-white'
            ]"
        >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    v-if="type === 'success'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                />
                <path
                    v-if="type === 'error'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                />
                <path
                    v-if="type === 'warning' || type === 'info'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <span class="flex-1">{{ message }}</span>
            <button @click="dismiss" class="text-white/70 hover:text-white ml-2">
                ✕
            </button>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}>()

const emit = defineEmits<{
    dismiss: []
}>()

const visible = ref(false)

onMounted(() => {
    visible.value = true

    if (props.duration !== 0) {
        setTimeout(() => {
            dismiss()
        }, props.duration || 3000)
    }
})

const dismiss = () => {
    visible.value = false
    setTimeout(() => {
        emit('dismiss')
    }, 300)
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
    transition: all 0.3s ease;
}

.notification-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.notification-enter-to {
    opacity: 1;
    transform: translateX(0);
}

.notification-leave-from {
    opacity: 1;
    transform: translateX(0);
}

.notification-leave-to {
    opacity: 0;
    transform: translateX(100%);
}
</style>
