<!-- src/components/home/PendingMessages.vue -->
<template>
    <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Pending Messages
            </h2>
            <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                1
            </span>
        </div>

        <div class="flex flex-col gap-4">
            <a href="#" class="block hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
                <div class="w-32 xl:w-48 flex items-center gap-3">
                    <img
                        src="https://ui-avatars.com/api/?name=Alice&background=random"
                        alt="Charlie's Avatar"
                        class="size-10 rounded-full"
                    />

                    <div class="w-full">
                        <p class="font-semibold text-slate-900 dark:text-slate-100">
                            Charlie
                        </p>

                        <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
                            Hey, saw your post about the bootstrap...
                        </p>
                    </div>
                </div>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
// No script needed - pure presentation component
</script>
