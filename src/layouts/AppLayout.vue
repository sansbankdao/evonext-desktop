<!-- layouts/AppLayout.vue -->
<template>
    <main class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <SidebarNav class="h-full overflow-y-scroll px-6 py-3" />

        <div class="flex-1 px-6 lg:px-8 overflow-y-auto">
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
import SidebarNav from '../components/SidebarNav.vue'
import Notification from '../components/Notification.vue'
import { useNotification } from '@/composables/useNotification'

const { notifications, dismiss } = useNotification()
</script>
