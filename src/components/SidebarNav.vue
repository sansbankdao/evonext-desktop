<!-- src/components/SidebarNav.vue -->
<template>
    <aside class="flex-shrink-0 bg-white dark:bg-slate-800 p-4 flex flex-col gap-4 justify-between border-r-2 border-slate-200 dark:border-slate-700 shadow-lg rounded-r-2xl">
        <div>
            <!-- Logo -->
            <RouterLink to="/" class="flex items-center gap-3 mb-8 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 group">
                <img src="/icon.svg" class="size-8 group-hover:scale-110 transition-transform duration-200" />

                <span class="text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-widest bg-gradient-to-r dark:from-blue-400/20 dark:to-cyan-400/20 px-2 py-1 rounded-lg">
                    ΞvoNext
                </span>
            </RouterLink>

            <!-- Navigation -->
            <nav class="flex flex-col gap-2">
                <RouterLink
                    v-for="link in navLinks"
                    :key="link.to"
                    :to="link.to"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:-translate-x-1 border-l-4 border-transparent hover:border-blue-500 dark:hover:border-blue-400
                            [&.router-link-exact-active]:bg-gradient-to-r [&.router-link-exact-active]:from-blue-500/10 [&.router-link-exact-active]:to-cyan-500/10
                            [&.router-link-exact-active]:text-blue-600 dark:[&.router-link-exact-active]:text-blue-400
                            [&.router-link-exact-active]:border-blue-500 dark:[&.router-link-exact-active]:border-blue-400
                            [&.router-link-exact-active]:shadow-blue-200/50 dark:[&.router-link-exact-active]:shadow-blue-500/20"
                >
                    <component :is="link.icon" class="size-5 transition-transform duration-200 group-hover:scale-110 [&.router-link-exact-active]:scale-110" />
                    <span>{{ link.text }}</span>
                </RouterLink>
            </nav>
        </div>

        <!-- Disconnect Identity -->
        <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
            <button @click="handleDisconnect" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-x-1 border border-red-200 dark:border-red-700 hover:border-red-400 dark:hover:border-red-500 group">
                <ArrowLeftStartOnRectangleIcon class="size-5 transition-transform duration-200 group-hover:scale-110" />

                <span class="font-medium">
                    Disconnect
                </span>
            </button>
        </div>
    </aside>
</template>

<script setup lang="ts">
/* Import modules. */
// import { invoke } from '@tauri-apps/api/tauri'
import { computed, ref } from 'vue'
// import { invoke } from '@tauri-apps/api/core'
import { useRoute, useRouter } from 'vue-router'

import {
    AdjustmentsHorizontalIcon,
    ArrowLeftStartOnRectangleIcon,
    BookmarkSquareIcon,
    HashtagIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    // SparklesIcon,
    Squares2X2Icon,
    UserGroupIcon,
    UsersIcon,
    WalletIcon,
} from '@heroicons/vue/24/solid'

/* Initialize (navigation) router. */
const router = useRouter()

// @ts-ignore
const path = computed(() => useRoute().path)

const navLinks = ref([
    {
        to: '/',
        text: 'Home',
        icon: HomeIcon,
    },
    {
        to: '/posts',
        text: 'Posts | Remix',
        icon: HashtagIcon,
    },
    {
        to: '/explorer',
        text: 'Explorer',
        icon: MagnifyingGlassIcon,
    },
    {
        to: '/community',
        text: 'Community',
        icon: UserGroupIcon,
    },
    {
        to: '/apps',
        text: 'Mini Apps',
        icon: Squares2X2Icon,
    },
    {
        to: '/wallet',
        text: 'Wallet',
        icon: WalletIcon,
    },
    {
        to: '/favorites',
        text: 'Favorites',
        icon: BookmarkSquareIcon,
    },
    {
        to: '/identity',
        text: 'Identities',
        icon: UsersIcon,
    },
    {
        to: '/settings',
        text: 'Settings',
        icon: AdjustmentsHorizontalIcon,
    },
])

const handleDisconnect = async () => {
    console.log('Disconnecting...')
    // Optional: Call a Rust command if you need backend logic
    // await invoke('disconnect_user')
    // Logic to clear user state, redirect to login, etc.

    /* Return home. */
    router.push('/connect')
}

// const greetMsg = ref('')
// const name = ref('')

// async function greet() {
//     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//     greetMsg.value = await invoke('greet', { name: name.value })
// }
</script>
