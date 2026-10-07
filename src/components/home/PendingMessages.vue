<!-- src/components/home/PendingMessages.vue -->
<template>
    <UiCard>
        <UiSectionHeader title="Pending Messages" class="mb-4">
            <template #icon>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.875 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C4.762 16.995 4 14.985 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
            </template>
            <template #actions>
                <UiBadge tone="down" size="sm">1</UiBadge>
            </template>
        </UiSectionHeader>

        <div class="flex flex-col gap-2">
            <a
                href="#"
                class="flex items-center gap-3 p-3 rounded-inner bg-surface-raise/60 border border-edge hover:border-brand/40 hover:bg-surface-raise transition-colors"
                @click.prevent="goToBootstrap"
            >
                <img
                    src="https://ui-avatars.com/api/?name=Admin&background=random"
                    alt="Admin's Avatar"
                    class="size-10 rounded-inner ring-2 ring-edge"
                />

                <div class="min-w-0">
                    <p class="text-body font-bold text-content">
                        Admin
                    </p>

                    <p class="text-caption text-content-soft truncate">
                        Hey! Thanks for supporting our Bootstrap campaign..
                    </p>
                </div>

                <svg class="w-4 h-4 ml-auto shrink-0 text-content-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>
        </div>
    </UiCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiCard from '@/components/ui/UiCard.vue'
import UiSectionHeader from '@/components/ui/UiSectionHeader.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

const router = useRouter()

const goToBootstrap = () => {
    router.push('/bootstrap')
}
</script>
