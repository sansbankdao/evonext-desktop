<!-- layouts/AppLayout.vue -->
<template>
    <main class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <SidebarNav class="h-full overflow-y-scroll px-6 py-3" />

        <div ref="mainContent" class="flex-1 px-6 lg:px-8 overflow-y-auto">
            <RouterView />
        </div>

        <!-- Global notifications host -->
        <Notification
            v-for="n in notifications"
            :key="n.id"
            :type="n.type"
            :message="n.message"
            :duration="n.duration"
            @dismiss="() => dismiss(n.id)"
        />
    </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from '../components/SidebarNav.vue'
import Notification from '../components/Notification.vue'
import { useNotification } from '@/composables/useNotification'

const { notifications, dismiss } = useNotification()

// 2. Define the ref
const mainContent = ref<HTMLElement | null>(null)
const route = useRoute()

// 3. Watch for route changes
watch(
    () => route.path,
    () => {
        // Wait for the DOM to update (render the new component), then scroll
        // We use setTimeout/requestAnimationFrame or nextTick to ensure the browser
        // has registered the new content height.
        if (mainContent.value) {
            mainContent.value.scrollTop = 0
        }
    }
)
</script>
