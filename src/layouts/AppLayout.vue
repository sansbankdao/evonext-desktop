<template>
    <main class="w-screen h-screen overflow-x-hidden overflow-y-hidden flex bg-slate-900 text-slate-300 font-sans">
        <SidebarNav class="h-full overflow-y-scroll px-6 py-3" />

        <div class="flex-1 p-6 lg:p-8 overflow-y-auto">
            <RouterView />
        </div>
    </main>
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
