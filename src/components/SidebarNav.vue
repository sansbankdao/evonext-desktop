<!-- src/components/SidebarNav.vue -->
<template>
    <aside class="flex-shrink-0 bg-surface-card p-4 flex flex-col gap-4 justify-between border-r border-edge shadow-card">
        <div>
            <!-- Logo -->
            <RouterLink to="/" class="flex items-center gap-3 mb-8 p-3 rounded-inner hover:bg-surface-raise transition-all duration-200 group">
                <img src="/icon.svg" class="size-8 group-hover:scale-110 transition-transform duration-200" />

                <span class="text-2xl font-extrabold tracking-widest text-content px-1">
                    ΞvoNext
                </span>
            </RouterLink>

            <!-- Navigation -->
            <nav class="flex flex-col gap-2">
                <RouterLink
                    v-for="link in navLinks"
                    :key="link.to"
                    :to="link.to"
                    class="flex items-center gap-3 px-4 py-3 rounded-inner text-content-soft hover:bg-surface-raise hover:text-content transition-all duration-200 font-medium border-l-4 border-transparent hover:border-brand/40
                            [&.router-link-exact-active]:bg-brand/10
                            [&.router-link-exact-active]:text-brand-deep dark:[&.router-link-exact-active]:text-brand
                            [&.router-link-exact-active]:border-brand"
                >
                    <component :is="link.icon" class="size-5 transition-transform duration-200 group-hover:scale-110 [&.router-link-exact-active]:scale-110" />
                    <span>{{ link.text }}</span>
                </RouterLink>
            </nav>
        </div>

        <!-- Disconnect / Connect Identity -->
        <div class="border-t border-edge pt-4">
            <button
                @click="handleDisconnect"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-control transition-all duration-200 shadow-sm hover:shadow-md group border border-transparent text-white"
                :class="isConnected ? 'bg-down/90 hover:bg-down' : 'bg-brand-deep hover:bg-brand'"
            >
                <component
                    :is="isConnected ? ArrowLeftStartOnRectangleIcon : ArrowRightStartOnRectangleIcon"
                    class="size-5 transition-transform duration-200 group-hover:scale-110"
                />
                <span class="font-bold tracking-wider uppercase">
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

const isConnected = computed(() => !!identityStore.identityId)

const navLinks = ref([
    {
        to: '/',
        text: 'Home',
        icon: HomeIcon,
    },
    {
        to: '/posts',
        text: 'Post & Remix',
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
        text: 'Identity',
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
