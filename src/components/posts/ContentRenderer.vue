// src/components/posts/ContentRenderer.vue

<template>
    <span>
        <template v-for="(part, i) in parts" :key="`${part.type}-${i}`">
            <strong v-if="part.type === 'bold'" class="font-bold">
                <ContentRenderer v-if="part.children?.length" :parts="part.children" />
                <template v-else>{{ part.value }}</template>
            </strong>

            <em v-else-if="part.type === 'italic'" class="italic">
                <ContentRenderer v-if="part.children?.length" :parts="part.children" />
                <template v-else>{{ part.value }}</template>
            </em>

            <code
                v-else-if="part.type === 'code'"
                class="font-mono text-sm bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400 rounded px-1"
            >{{ part.value }}</code>

            <a
                v-else-if="part.type === 'url'"
                :href="hrefFor(part.value)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 dark:text-blue-400 hover:underline break-all"
                @click.stop
            >{{ part.value }}</a>

            <a
                v-else-if="part.type === 'hashtag'"
                href="#"
                class="text-blue-500 dark:text-blue-400 hover:underline"
                @click.prevent.stop="emit('hashtag', part.value.slice(1))"
            >{{ part.value }}</a>

            <a
                v-else-if="part.type === 'mention'"
                href="#"
                class="text-blue-500 dark:text-blue-400 hover:underline"
                @click.prevent.stop="emit('mention', part.value.slice(1))"
            >{{ part.value }}</a>

            <span
                v-else-if="part.type === 'cashtag'"
                class="text-green-600 dark:text-green-400 font-medium"
            >{{ part.value }}</span>

            <template v-else>{{ part.value }}</template>
        </template>
    </span>
</template>

<script setup lang="ts">
/**
 * Phase A rich-text renderer — styling mirrors the official Yappr
 * PostContent component (via evonext-mobile). The `parts` come pre-parsed
 * from Rust (src-tauri/src/social/content.rs) via the feed command;
 * legacy posts without contentParts fall back to plain text in Item.vue.
 */
import type { ISocialContentPart } from '@/types/social'

defineOptions({ name: 'ContentRenderer' })

defineProps<{
    parts: ISocialContentPart[]
}>()

const emit = defineEmits<{
    (e: 'hashtag', tag: string): void
    (e: 'mention', username: string): void
}>()

function hrefFor(url: string): string {
    return url.startsWith('www.') ? `https://${url}` : url
}
</script>
