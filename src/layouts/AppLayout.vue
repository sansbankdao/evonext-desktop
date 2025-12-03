<template>
    <main class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <SidebarNav class="h-full overflow-y-scroll px-6 py-3" />

        <div class="flex-1 px-6 lg:px-8 overflow-y-auto">
            <RouterView />
        </div>
    </main>
</template>

<script setup lang="ts">
/* Import components. */
import SidebarNav from '../components/SidebarNav.vue'
</script>
