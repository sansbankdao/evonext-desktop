<!-- src/components/home/ContactRequests.vue -->
<template>
    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Contact Requests
            </h2>

            <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                1
            </span>
        </div>

        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="https://www.gravatar.com/avatar/1282d2113ccb7bc8bd1f902b9780c836?s=200&d=404&rating=g" alt="Bob's Avatar" class="size-8 rounded-full"/>

                    <p class="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Shomari
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <button class="bg-emerald-500 hover:bg-emerald-600 p-2 rounded-full transition-colors" type="button">
                        <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </button>

                    <button class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 p-2 rounded-full transition-colors" type="button">
                        <svg class="h-5 w-5 text-slate-900 dark:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// No script needed - pure presentation component
</script>
