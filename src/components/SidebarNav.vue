<template>
    <aside class="flex-shrink-0 bg-slate-800 p-4 flex flex-col gap-4 justify-between">
        <div>
            <!-- Logo -->
            <RouterLink to="/" class="flex items-center gap-3 mb-8">
                <img src="/icon.svg" class="size-8" />

                <span class="text-3xl font-bold text-blue-400 tracking-widest">
                    ΞvoNext
                </span>
            </RouterLink>

            <!-- Navigation -->
            <nav class="flex flex-col gap-2">
                <RouterLink
                    v-for="link in navLinks"
                    :key="link.to"
                    :to="link.to"
                    class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors font-medium
                            [&.router-link-exact-active]:bg-slate-700
                            [&.router-link-exact-active]:text-white"
                >
                    <component :is="link.icon" class="size-5" />
                    <span>{{ link.text }}</span>
                </RouterLink>
            </nav>
        </div>

        <!-- Disconnect Identity -->
        <div class="border-t border-slate-700 pt-4">
            <button @click="handleDisconnect" class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-slate-700 hover:text-white transition-colors">
                <ArrowLeftStartOnRectangleIcon class="size-5" />

                <span>
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
import { invoke } from '@tauri-apps/api/core'
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
        text: 'Identity',
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
