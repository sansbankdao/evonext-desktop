<!-- src/components/home/ContactRequests.vue -->
<template>
    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                    <svg class="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                </div>
                <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Contact Requests</h2>
            </div>

            <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                1
            </span>
        </div>

        <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-3">
                    <img src="https://www.gravatar.com/avatar/1282d2113ccb7bc8bd1f902b9780c836?s=200&d=404&rating=g" alt="Bob's Avatar" class="size-10 rounded-xl ring-2 ring-slate-200 dark:ring-slate-700"/>

                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Shomari
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        class="bg-emerald-500 hover:bg-emerald-600 p-2 rounded-full transition-colors shadow-sm"
                        type="button"
                        @click="goToBootstrap"
                    >
                        <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </button>

                    <button
                        class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 p-2 rounded-full transition-colors"
                        type="button"
                        @click="goToBootstrap"
                    >
                        <svg class="h-4 w-4 text-slate-900 dark:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToBootstrap = () => {
    router.push('/bootstrap')
};
</script>
