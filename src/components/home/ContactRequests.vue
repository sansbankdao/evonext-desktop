<!-- src/components/home/ContactRequests.vue -->
<template>
    <UiCard>
        <UiSectionHeader title="Contact Requests" class="mb-3">
            <template #icon>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
            </template>
            <template #actions>
                <UiBadge tone="down" size="sm">1</UiBadge>
            </template>
        </UiSectionHeader>

        <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between p-2 rounded-inner bg-surface-raise/60 border border-edge">
                <div class="flex items-center gap-2.5">
                    <img src="https://www.gravatar.com/avatar/1282d2113ccb7bc8bd1f902b9780c836?s=200&d=404&rating=g" alt="Bob's Avatar" class="size-10 rounded-inner ring-2 ring-edge"/>

                    <p class="text-body font-bold text-content">
                        Shomari
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        class="bg-up hover:bg-up/80 p-2 rounded-full transition-colors shadow-sm"
                        type="button"
                        @click="goToBootstrap"
                    >
                        <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </button>

                    <button
                        class="bg-surface-raise hover:bg-edge p-2 rounded-full transition-colors"
                        type="button"
                        @click="goToBootstrap"
                    >
                        <svg class="h-4 w-4 text-content" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
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
};
</script>
