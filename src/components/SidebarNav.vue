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

        <!-- Disconnect / Connect Identity -->
        <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
            <button @click="handleDisconnect" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-x-1 group border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600">
                <component :is="isConnected ? ArrowLeftStartOnRectangleIcon : ArrowRightStartOnRectangleIcon" class="size-5 transition-transform duration-200 group-hover:scale-110" />
                <span class="font-medium">
                    {{ isConnected ? 'Disconnect' : 'Connect' }}
                </span>
            </button>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'

import {
    AdjustmentsHorizontalIcon,
    ArrowLeftStartOnRectangleIcon,
    ArrowRightStartOnRectangleIcon,
    // BookmarkSquareIcon,
    HashtagIcon,
    HomeIcon,
    // MagnifyingGlassIcon,
    // Squares2X2Icon,
    // UserGroupIcon,
    UsersIcon,
    WalletIcon,
} from '@heroicons/vue/24/solid'

/* Initialize router and store. */
const router = useRouter()
const identityStore = useIdentityStore()

const isConnected = computed(() => !!identityStore.identity?.id)

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
    // {
    //     to: '/explorer',
    //     text: 'Explorer',
    //     icon: MagnifyingGlassIcon,
    // },
    // {
    //     to: '/community',
    //     text: 'Community',
    //     icon: UserGroupIcon,
    // },
    // {
    //     to: '/apps',
    //     text: 'Mini Apps',
    //     icon: Squares2X2Icon,
    // },
    {
        to: '/wallet',
        text: 'Wallet',
        icon: WalletIcon,
    },
    // {
    //     to: '/favorites',
    //     text: 'Favorites',
    //     icon: BookmarkSquareIcon,
    // },
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

const handleDisconnect = () => {
    const targetPath = isConnected.value ? '/disconnect' : '/connect'
    router.push(targetPath)
}
</script>
