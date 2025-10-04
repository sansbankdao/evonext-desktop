<template>
    <div class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <SidebarNav class="h-full overflow-y-scroll px-8 py-3" />

        <!-- ## Main Content ## -->
        <main class="flex-1 p-6 lg:p-8 overflow-y-auto">
            <!-- The current page component will be rendered here -->
            <RouterView />
        </main>
    </div>
</template>

<script setup lang="ts">
// import { ref } from 'vue'
// import { invoke } from '@tauri-apps/api/core'

/* Import components. */
import SidebarNav from '../components/SidebarNav.vue'

// const greetMsg = ref('')
// const name = ref('')

// async function greet() {
//     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//     greetMsg.value = await invoke('greet', { name: name.value })
// }
</script>
