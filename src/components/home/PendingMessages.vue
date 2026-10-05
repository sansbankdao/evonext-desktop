<!-- src/components/home/PendingMessages.vue -->
<template>
    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.875 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C4.762 16.995 4 14.985 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                </div>
                <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Pending Messages</h2>
            </div>

            <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                1
            </span>
        </div>

        <div class="flex flex-col gap-3">
            <a
                href="#"
                class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click.prevent="goToBootstrap"
            >
                <img
                    src="https://ui-avatars.com/api/?name=Admin&background=random"
                    alt="Admin's Avatar"
                    class="size-10 rounded-xl ring-2 ring-slate-200 dark:ring-slate-700"
                />

                <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Admin
                    </p>

                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Hey! Thanks for supporting our Bootstrap campaign..
                    </p>
                </div>

                <svg class="w-4 h-4 ml-auto shrink-0 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToBootstrap = () => {
    router.push('/bootstrap')
}
</script>
