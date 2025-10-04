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
                <RouterLink to="/" class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-700 text-white font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>

                    <span>
                        Home
                    </span>
                </RouterLink>

                <RouterLink to="/explorer" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <MagnifyingGlassIcon class="size-5" />
                    <span>
                        Explorer
                    </span>
                </RouterLink>

                <RouterLink to="/posts" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <HashtagIcon class="size-5" />
                    <span>
                        Posts | Remix
                    </span>
                </RouterLink>

                <RouterLink to="/community" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <UserGroupIcon class="size-5" />
                    <span>
                        Community
                    </span>
                </RouterLink>

                <RouterLink to="/apps" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <Squares2X2Icon class="size-5" />
                    <span>
                        Apps
                    </span>
                </RouterLink>

                <RouterLink to="/wallet" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <WalletIcon class="size-5" />
                    <span>
                        Wallet
                    </span>
                </RouterLink>

                <RouterLink to="/favorites" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <BookmarkSquareIcon class="size-5" />
                    <span>
                        Favorites
                    </span>
                </RouterLink>

                <RouterLink to="/identities" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <UserIcon class="size-5" />
                    <span>
                        Identities
                    </span>
                </RouterLink>

                <RouterLink to="/settings" class="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <AdjustmentsHorizontalIcon class="size-5" />
                    <span>
                        Settings
                    </span>
                </RouterLink>
            </nav>
        </div>

        <!-- Disconnect Identity -->
        <div class="border-t border-slate-700 pt-4">
            <button @click="handleDisconnect" class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-slate-700 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                </svg>

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
// import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

import {
    AdjustmentsHorizontalIcon,
    BookmarkSquareIcon,
    HashtagIcon,
    MagnifyingGlassIcon,
    // SparklesIcon,
    Squares2X2Icon,
    UserGroupIcon,
    UserIcon,
    WalletIcon,
} from '@heroicons/vue/24/solid'

const handleDisconnect = async () => {
    console.log('Disconnecting...')
    // Optional: Call a Rust command if you need backend logic
    await invoke('disconnect_user')
    // Logic to clear user state, redirect to login, etc.

    /* Return home. */
    // router.push('/')
}

// const greetMsg = ref('')
// const name = ref('')

// async function greet() {
//     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//     greetMsg.value = await invoke('greet', { name: name.value })
// }
</script>
