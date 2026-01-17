<!-- src/components/ComposeModal.vue -->
<template>
    <div class="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div class="sm:flex sm:items-start">
            <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 sm:mx-0 sm:h-10 sm:w-10"
            >
                <!-- Pen Icon for New Post -->
                <svg v-if="!postToEdit" class="h-6 w-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <!-- Pencil Icon for Edit -->
                <svg v-else class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </div>

            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-slate-900 dark:text-slate-100" id="modal-title">
                    {{ postToEdit ? 'Update Post' : 'Create new post' }}
                </h3>
                <div class="mt-4 space-y-4">

                    <!-- Remix Badge (Context Only) -->
                    <div v-if="originalRemixPost && !postToEdit" class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex items-start gap-3 transition-all">
                        <svg class="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <div class="flex-1 overflow-hidden">
                            <p class="text-sm font-medium text-purple-800 dark:text-purple-300">
                                You are remixing <span class="font-bold">@{{ originalRemixPost.author?.username || 'unknown' }}</span>
                            </p>
                            <p class="text-xs text-purple-600 dark:text-purple-400 truncate mt-0.5">
                                "{{ originalRemixPost.content }}"
                            </p>
                        </div>
                        <button
                            @click="clearRemix"
                            title="Cancel Remix"
                            class="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 p-1"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <!-- Text Area Area -->
                    <div class="relative">
                        <textarea
                            ref="textareaRef"
                            v-model="content"
                            @keydown="preventEnterSubmit"
                            rows="5"
                            class="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 p-3 transition-colors resize-none"
                            :placeholder="postToEdit ? 'Edit your post...' : 'What is happening?!'"
                        ></textarea>

                        <!-- Media Preview Area -->
                        <div v-if="mediaUrls.length > 0" class="mt-3 grid grid-cols-2 gap-2">
                            <div v-for="(url, index) in mediaUrls" :key="index" class="relative group aspect-video bg-black rounded-md overflow-hidden border border-slate-700">
                                <img :src="url" class="w-full h-full object-cover" alt="Upload preview">
                                <button
                                    @click="removeMedia(index)"
                                    class="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Hidden File Input -->
                    <input
                        type="file"
                        ref="fileInputRef"
                        @change="handleFileUpload"
                        multiple
                        accept="image/*"
                        class="hidden"
                    />

                    <!-- Action Bar -->
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                            <div class="flex items-center gap-2">
                                <button
                                    @click="triggerFileUpload"
                                    class="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors relative"
                                    title="Add Media"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <div class="flex items-center gap-3">
                                <!-- Language Selector -->
                                <select v-model="selectedLanguage" class="text-xs border-slate-200 dark:border-slate-700 rounded-md shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-500 focus:ring-opacity-50 bg-transparent text-slate-600 dark:text-slate-400 py-1">
                                    <option value="en">en</option>
                                    <option value="es">es</option>
                                    <option value="fr">fr</option>
                                    <option value="de">de</option>
                                    <option value="ja">ja</option>
                                </select>

                                <!-- Sensitive Toggle -->
                                <button
                                    @click="isSensitive = !isSensitive"
                                    :class="[
                                        'text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5',
                                        isSensitive
                                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                                    ]"
                                >
                                    <span class="w-2 h-2 rounded-full" :class="isSensitive ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
                                    {{ isSensitive ? 'Sensitive' : 'Safe' }}
                                </button>
                            </div>
                        </div>

                        <!-- Submit and Close Buttons -->
                        <div class="flex flex-row-reverse gap-3 sm:gap-4">
                            <button
                                type="button"
                                @click="submit"
                                :disabled="isSubmitting || !content.trim()"
                                class="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-base font-medium text-white hover:from-cyan-700 hover:to-cyan-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <span v-if="isSubmitting" class="mr-2">
                                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </span>
                                {{ isSubmitting ? 'Broadcasting...' : (postToEdit ? 'Update Post' : 'Post') }}
                            </button>
                            <button
                                type="button"
                                @click="close"
                                :disabled="isSubmitting"
                                class="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none sm:mt-0 sm:text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, nextTick } from 'vue'
import { usePosts } from '@/composables/usePosts'
import { useNotification } from '@/composables/useNotification'
import type { IPost } from '@/types/posts'

// --- Props & Emits ---
interface Props {
    postToEdit?: IPost | null
    remixParent?: IPost | null
}

const props = withDefaults(defineProps<Props>(), {
    postToEdit: null,
    remixParent: null
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'post-created', post: IPost): void
    (e: 'post-updated', post: IPost): void
    (e: 'clear-remix'): void
}>()

// --- Composables & Stores ---
const { createPost } = usePosts()
const { showSuccess, showError } = useNotification()

// --- State ---
const content = ref('')
const mediaUrls = ref<string[]>([])
const isSubmitting = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()
const isSensitive = ref(false)
const selectedLanguage = ref('en')

// Derived state for Remix context
const originalRemixPost = computed(() => props.remixParent)

// --- Lifecycle & Watchers ---

// Populate fields when editing
watch(() => props.postToEdit, (newPost) => {
    if (newPost) {
        content.value = newPost.content || ''
        mediaUrls.value = newPost.mediaUrls || []
        isSensitive.value = !!newPost.isSensitive
        selectedLanguage.value = newPost.language || 'en'
    } else {
        resetForm()
    }
}, { immediate: true })

// Focus textarea on mount
nextTick(() => {
    if (textareaRef.value) {
        textareaRef.value.focus()
    }
})

// --- Methods ---

function resetForm() {
    content.value = ''
    mediaUrls.value = []
    isSensitive.value = false
    selectedLanguage.value = 'en'
}

function close() {
    if (isSubmitting.value) return
    resetForm()
    emit('close')
}

function preventEnterSubmit(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        submit()
    }
}

function triggerFileUpload() {
    fileInputRef.value?.click()
}

function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement
    const files = target.files

    if (files && files.length > 0) {
        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file)
            mediaUrls.value.push(url)
        })
    }
}

function removeMedia(index: number) {
    mediaUrls.value.splice(index, 1)
}

function clearRemix() {
    emit('clear-remix')
}

async function submit() {
    if (isSubmitting.value) return

    if (!content.value.trim() && mediaUrls.value.length === 0) {
        showError('Post cannot be empty')
        return
    }

    isSubmitting.value = true

    try {
        if (props.postToEdit) {
            // ... Update logic
        } else {
            // Construct options object dynamically
            const postOptions = {
                isSensitive: isSensitive.value,
                language: selectedLanguage.value,
                // Only add these keys if they have values
                ...(mediaUrls.value.length > 0 && { mediaUrl: mediaUrls.value }),
                ...(originalRemixPost.value?.id && { remix: originalRemixPost.value.id })
            }

            const newPost = await createPost(content.value, postOptions)

            if (newPost) {
                showSuccess('Post broadcasted successfully')
                emit('post-created', newPost)
                close()
            } else {
                showError('Failed to verify post broadcast')
            }
        }
    } catch (error: any) {
        console.error('[ComposeModal] Submission error:', error)
        showError(error.message || 'Verification on Dash Platform failed')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<style scoped>
/* Custom scrollbar for textarea */
textarea::-webkit-scrollbar {
    width: 8px;
}

textarea::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.dark textarea::-webkit-scrollbar-track {
    background: #1e293b;
}

.dark textarea::-webkit-scrollbar-thumb {
    background: #475569;
}

.dark textarea::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

/* Smooth transitions */
.group-hover\:opacity-100 {
    transition: opacity 150ms ease-in-out;
}

/* Ensure images don't overflow */
img {
    max-width: 100%;
    height: auto;
}
</style>
