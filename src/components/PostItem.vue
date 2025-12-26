<!-- src/components/PostItem.vue -->
<template>
    <article
        :class="[
            'bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group',
            isSensitive ? 'border-orange-500' : ''
        ]"
    >
        <!-- Author Info -->
        <div class="flex items-start gap-4">
            <img
                :src="post.author.avatar"
                :alt="`${post.author.displayName}'s Avatar`"
                class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md group-hover:scale-105 transition-transform duration-200"
            />

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <p class="font-bold text-slate-900 dark:text-slate-100">
                        {{ post.author.displayName }}
                    </p>
                    <span v-if="post.author.verified" class="inline-flex items-center">
                        <svg class="h-4 w-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                    </span>
                </div>

                <p class="text-sm text-slate-500 dark:text-slate-400">
                    {{ post.author.username }} · {{ timeAgo }}
                </p>

                <!-- Sensitive Content Warning -->
                <div v-if="post.isSensitive || isSensitive" class="mt-2 flex items-center gap-2">
                    <svg class="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-xs text-orange-600 dark:text-orange-400">Sensitive Content</span>
                </div>
            </div>
        </div>

        <!-- Post Content -->
        <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
            {{ post.content }}
        </p>

        <!-- Media Attachments -->
        <div v-if="post.mediaUrls && post.mediaUrls.length > 0" class="grid grid-cols-1 gap-4 mt-2">
            <div
                v-for="(mediaUrl, index) in post.mediaUrls.slice(0, 3)"
                :key="index"
                class="relative rounded-2xl overflow-hidden"
            >
                <img
                    :src="getMediaUrl(mediaUrl)"
                    :alt="`Media ${index + 1}`"
                    class="w-full h-64 object-cover rounded-2xl shadow-2xl ring-2 ring-slate-200 dark:ring-slate-700"
                    @error="handleImageError"
                />
                <div
                    v-if="post.mediaUrls && post.mediaUrls.length > 3 && index === 2"
                    class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl"
                >
                    <span class="text-white text-lg font-bold">
                        +{{ post.mediaUrls.length - 3 }} more
                    </span>
                </div>
            </div>
        </div>

        <!-- Hashtags -->
        <div v-if="post.hashtag" class="flex flex-wrap gap-2 mt-2">
            <span class="px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full text-sm font-medium">
                #{{ post.hashtag }}
            </span>
        </div>

        <!-- Reply To Indicator -->
        <div v-if="post.replyToPostId" class="text-sm text-slate-500 dark:text-slate-400 italic mt-2">
            In reply to post {{ post.replyToPostId.slice(0, 8) }}...
        </div>

        <!-- Post Actions -->
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
            <!-- Comment Button -->
            <button
                @click="handleComment"
                class="flex items-center gap-2 p-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-all duration-200 group-hover:scale-105"
                :title="`${post.replies} replies`"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
                <span>{{ post.replies || 0 }}</span>
            </button>

            <!-- Repost/Remix Button -->
            <button
                @click="handleRepost"
                class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200 group-hover:scale-105"
                :title="`${post.remixes} remixes`"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L20 4" />
                </svg>
                <span>{{ post.remixes || 0 }}</span>
            </button>

            <!-- Like Button -->
            <button
                @click="toggleLike"
                :class="[
                    'flex items-center gap-2 p-2 rounded-xl font-medium transition-all duration-200 group-hover:scale-105',
                    post.liked ? 'text-red-500 bg-red-500/10' : 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                ]"
                :title="`${post.likes} likes`"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
                <span>{{ post.likes || 0 }}</span>
            </button>

            <!-- Bookmark Button -->
            <button
                @click="toggleBookmark"
                :class="[
                    'flex items-center gap-2 p-2 rounded-xl font-medium transition-all duration-200 group-hover:scale-105',
                    post.bookmarked ? 'text-amber-500 bg-amber-500/10' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                ]"
                :title="post.bookmarked ? 'Remove bookmark' : 'Bookmark post'"
            >
                <svg v-if="post.bookmarked" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            </button>

            <!-- Share Button -->
            <button
                @click="handleShare"
                class="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-all duration-200 group-hover:scale-105"
                title="Share post"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </button>
        </div>

        <!-- Remix Content (if this is a remix) -->
        <div v-if="post.remix" class="mt-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6 bg-slate-50 dark:bg-slate-700/50 shadow-inner">
            <div class="flex items-start gap-3 mb-3">
                <img :src="post.author.avatar" :alt="`${post.author.displayName}'s Avatar`" class="size-10 rounded-full ring-2 ring-slate-200 dark:ring-slate-600" />
                <div>
                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {{ post.author.displayName }}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        {{ post.author.username }}
                    </p>
                </div>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">
                {{ post.remix }}
            </p>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IPost } from '@/types/posts'

interface Props {
    post: IPost
}

const props = defineProps<Props>()

const emit = defineEmits<{
    like: [postId: string, isLiked: boolean]
    repost: [postId: string]
    bookmark: [postId: string, isBookmarked: boolean]
    share: [postId: string]
    comment: [postId: string]
}>()

const isSensitive = computed(() => props.post.isSensitive)

const timeAgo = computed(() => {
    const now = new Date()
    const postDate = props.post.createdAt
    const diffMs = now.getTime() - postDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const getMediaUrl = (mediaUrl: string): string => {
    // In a real app, you would convert the identifier to a URL
    // For now, return placeholder or the identifier as-is
    return mediaUrl.startsWith('http') ? mediaUrl : `https://placeholder.com/400x300?text=Media+${mediaUrl.slice(0, 8)}`
}

const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    target.src = 'https://images.unsplash.com/photo-1639322537228-f710d846310a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
}

const toggleLike = () => {
    emit('like', props.post.id || `${props.post.ownerId}-${props.post.createdAt.getTime()}`, !!props.post.liked)
}

const handleRepost = () => {
    emit('repost', props.post.id || `${props.post.ownerId}-${props.post.createdAt.getTime()}`)
}

const toggleBookmark = () => {
    emit('bookmark', props.post.id || `${props.post.ownerId}-${props.post.createdAt.getTime()}`, !!props.post.bookmarked)
}

const handleShare = () => {
    emit('share', props.post.id || `${props.post.ownerId}-${props.post.createdAt.getTime()}`)
}

const handleComment = () => {
    emit('comment', props.post.id || `${props.post.ownerId}-${props.post.createdAt.getTime()}`)
}
</script>
