<!-- src/components/posts/Item.vue -->
<template>
    <article
        :class="[
            'bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group relative',
            isSensitive ? 'border-orange-500' : ''
        ]"
    >
        <!-- REPLY CONTEXT (Parent Post) -->
        <div v-if="post.quotedPost" class="mb-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2 mb-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span class="text-slate-400">Replying to</span>
                <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <img
                        :src="post.quotedPost.author.avatar"
                        class="w-4 h-4 rounded-full ring-1 ring-slate-300 dark:ring-slate-600"
                        alt="Avatar"
                    />
                    <span class="font-semibold">
                        {{ post.quotedPost.author.displayName || post.quotedPost.author.username }}
                    </span>
                </div>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-snug">
                {{ post.quotedPost.content }}
            </p>
        </div>

        <!-- Author Info -->
        <div class="flex items-start gap-4">
            <div class="relative group cursor-pointer">
                <img
                    :src="post.author.avatar"
                    :alt="`${post.author.displayName}'s Avatar`"
                    class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <!-- Verification Badge (Absolute) -->
                <div v-if="post.author.verified" class="absolute -bottom-0.5 -right-0.5 bg-cyan-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800 shadow-sm">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <!-- Display Name -->
                    <p class="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {{ post.author.displayName }}
                    </p>

                    <!-- YAPPR Badge -->
                    <span v-if="isYAPPR" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20">
                        YAPPR
                    </span>
                </div>

                <div class="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <!-- CLICKABLE USERNAME -->
                    <a
                        :href="getExplorerUrl(post.ownerId)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate hover:underline hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        title="View on Explorer"
                    >
                        {{ post.author.username }}
                    </a>
                    <span>·</span>
                    <span>{{ timeAgo }}</span>
                </div>
            </div>
        </div>

        <!-- Post Content -->
        <p class="text-slate-800 dark:text-slate-200 leading-relaxed text-[15px] whitespace-pre-wrap break-words">
            {{ post.content }}
        </p>

        <!-- Media Attachments -->
        <div v-if="post.mediaUrls && post.mediaUrls.length > 0" class="grid grid-cols-1 gap-3 mt-1">
            <div
                v-for="(mediaUrl, index) in post.mediaUrls.slice(0, 3)"
                :key="index"
                class="relative rounded-2xl overflow-hidden group/media cursor-pointer"
            >
                <img
                    :src="getMediaUrl(mediaUrl)"
                    :alt="`Media ${index + 1}`"
                    class="w-full h-64 object-cover rounded-2xl shadow-md ring-1 ring-slate-200 dark:ring-slate-700 transition-transform duration-500 group-hover/media:scale-105"
                    @error="handleImageError"
                />
                <div
                    v-if="post.mediaUrls && post.mediaUrls.length > 3 && index === 2"
                    class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                >
                    <span class="text-white text-lg font-bold drop-shadow-md">
                        +{{ post.mediaUrls.length - 3 }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Hashtags -->
        <div v-if="post.hashtag" class="flex flex-wrap gap-2 mt-1">
            <span class="px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer">
                #{{ post.hashtag }}
            </span>
        </div>

        <!-- Sensitive Content Warning (Inline) -->
        <div v-if="isSensitive" class="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-900/30">
            <svg class="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-xs font-medium">Sensitive Content</span>
        </div>

        <!-- Post Actions -->
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <!-- Comment Button -->
            <button
                @click="handleComment"
                class="flex items-center gap-2 p-2 -ml-2 rounded-full hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20 dark:hover:text-cyan-400 transition-all duration-200 group-hover:scale-110"
                title="Reply"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
                <span class="text-xs font-bold">{{ post.replies || 0 }}</span>
            </button>

            <!-- Repost/Remix Button -->
            <button
                @click="handleRepost"
                class="flex items-center gap-2 p-2 rounded-full hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all duration-200 group-hover:scale-110"
                title="Remix"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 16m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-xs font-bold">{{ post.remixes || 0 }}</span>
            </button>

            <!-- Like Button -->
            <button
                @click="toggleLike"
                :class="[
                    'flex items-center gap-2 p-2 rounded-full transition-all duration-200 group-hover:scale-110',
                    post.liked
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                ]"
                title="Like"
            >
                <svg class="h-5 w-5" :fill="post.liked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
                <span class="text-xs font-bold">{{ post.likes || 0 }}</span>
            </button>

            <!-- Bookmark Button -->
            <button
                @click="toggleBookmark"
                :class="[
                    'flex items-center gap-2 p-2 rounded-full transition-all duration-200 group-hover:scale-110',
                    post.bookmarked
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100'
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
                class="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 group-hover:scale-110"
                title="Share post"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </button>
        </div>

        <!-- Remix Content (if this is a remix and different from reply context) -->
        <!-- We usually don't show this if it's a standard reply, but if there's specific 'remix' text -->
        <div v-if="post.remix && !post.quotedPost" class="mt-3 border-l-4 border-slate-300 dark:border-slate-600 pl-3 py-1 bg-slate-50 dark:bg-slate-700/30 italic text-slate-600 dark:text-slate-400 text-sm">
            <span class="font-bold not-italic">Remixing:</span> "{{ post.remix }}"
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IPost } from '@/types/posts'
import { YAPPR_CONTRACT_ID_TESTNET } from '@/constants'

interface Props {
    post: IPost
}

const props = defineProps<Props>()

const emit = defineEmits<{
    like: [postId: string]
    repost: [postId: string]
    bookmark: [postId: string]
    share: [postId: string]
    comment: [postId: string]
}>()

const isSensitive = computed(() => props.post.isSensitive)

const isYAPPR = computed(() => {
    return props.post.contractId === YAPPR_CONTRACT_ID_TESTNET
})

const timeAgo = computed(() => {
    const now = new Date()
    // Handle both number (timestamp) and Date object
    const postDateRaw = props.post.createdAt
    const postDate = typeof postDateRaw === 'number' ? new Date(postDateRaw) : new Date(postDateRaw)

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
    // If it's already a URL, return it
    if (mediaUrl.startsWith('http')) return mediaUrl

    // If it's an IPFS hash or identifier, you might need a gateway here.
    // For now, return a placeholder if it's not a URL
    return `https://placeholder.com/600x400?text=Media+Preview`
}

const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    // Generic fallback placeholder
    target.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
}

const getExplorerUrl = (ownerId: string): string => {
    // Uses the Identity ID (ownerId) to construct the link
    return `https://platform-explorer.com/identity/${ownerId}`
}

// Actions
const toggleLike = () => emit('like', props.post.id || '')
const handleRepost = () => emit('repost', props.post.id || '')
const toggleBookmark = () => emit('bookmark', props.post.id || '')
const handleShare = () => emit('share', props.post.id || '')
const handleComment = () => emit('comment', props.post.id || '')
</script>
