<!-- src/screens/Posts.vue -->
<template>
    <main>
        <Header title="Posts | Remixes" />
        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="flex flex-col gap-8">
                    <!-- Page Header -->
                    <div class="space-y-2">
                        <p class="text-xl text-slate-600 dark:text-slate-400">
                            Discover the latest updates or share your own take on the conversation.
                        </p>
                    </div>

                    <!-- Tab Navigation -->
                    <div>
                        <div class="border-b-2 border-slate-200 dark:border-slate-700 rounded-t-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                            <nav class="-mb-px flex space-x-1 p-2" aria-label="Tabs">
                                <!-- Active Tab -->
                                <button
                                    @click="activeTab = 'posts'"
                                    :class="[
                                        'flex-1 py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                                        activeTab === 'posts'
                                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow-md'
                                    ]"
                                >
                                    Posts
                                </button>

                                <!-- Remix Tab -->
                                <button
                                    @click="activeTab = 'remix'"
                                    :class="[
                                        'flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                                        activeTab === 'remix'
                                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white'
                                    ]"
                                >
                                    Remix
                                </button>
                            </nav>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="postsStore.isLoading && postsStore.posts.length === 0" class="flex flex-col items-center justify-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>

                        <p class="mt-4 text-slate-600 dark:text-slate-400">
                            Loading posts from blockchain...
                        </p>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="postsStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                        <div class="flex items-center gap-3">
                            <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>

                            <p class="text-red-800 dark:text-red-300">
                                {{ postsStore.error }}
                            </p>
                        </div>

                        <button
                            @click="loadPosts"
                            class="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
                        >
                            Retry
                        </button>
                    </div>

                    <!-- Tab Content Area -->
                    <div v-if="!postsStore.isLoading || postsStore.posts.length > 0">
                        <!-- TAB CONTENT: POSTS -->
                        <div v-if="activeTab === 'posts'" class="flex flex-col gap-6">
                            <!-- No Posts State -->
                            <div v-if="postsStore.posts.length === 0 && !postsStore.isLoading" class="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
                                <svg class="h-16 w-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>

                                <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    No Posts Yet
                                </h3>

                                <p class="text-slate-600 dark:text-slate-400 mb-6">
                                    Be the first to share something with the community!
                                </p>

                                <button
                                    @click="showComposeModal = true"
                                    class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    Create Your First Post
                                </button>
                            </div>

                            <!-- Posts List -->
                            <div v-else class="space-y-6">
                                <!-- Create Post Card -->
                                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col gap-4 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                    <div class="flex items-start gap-4">
                                        <div v-if="identityStore.identity" class="flex items-start gap-4 w-full">
                                            <img :src="identityStore.identity?.avatarUrl || 'https://ui-avatars.com/api/?name=You&background=8b5cf6&color=fff'" alt="Your Avatar" class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-md"/>
                                            <div class="flex-1">
                                                <button
                                                    @click="showComposeModal = true"
                                                    class="w-full text-left bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-2xl px-6 py-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-all duration-200"
                                                >
                                                    Share your thoughts...
                                                </button>
                                            </div>
                                        </div>
                                        <div v-else class="w-full text-center py-4">
                                            <p class="text-slate-600 dark:text-slate-400">
                                                Connect your wallet to create posts
                                            </p>
                                            <button
                                                @click="$router.push('/connect')"
                                                class="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200"
                                            >
                                                Connect Wallet
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Post Items -->
                                <PostItem
                                    v-for="post in postsStore.sortedPosts"
                                    :key="post.id || post.ownerId + '-' + post.createdAt.getTime()"
                                    :post="post"
                                    @like="handleLike"
                                    @repost="handleRepost"
                                    @bookmark="handleBookmark"
                                    @share="handleShare"
                                />
                            </div>
                        </div>

                        <!-- TAB CONTENT: REMIX -->
                        <div v-if="activeTab === 'remix'" class="flex flex-col gap-6">
                            <div class="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
                                <svg class="h-16 w-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>

                                <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Remix Feature Coming Soon
                                </h3>

                                <p class="text-slate-600 dark:text-slate-400">
                                    The remix feature is under development. Check back soon!
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Load More Button -->
                    <div v-if="postsStore.hasNextPage" class="text-center">
                        <button
                            @click="loadMorePosts"
                            :disabled="postsStore.isLoading"
                            :class="[
                                'px-6 py-3 rounded-xl font-medium transition-all duration-200',
                                postsStore.isLoading
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 shadow-lg hover:shadow-xl'
                            ]"
                        >
                            <span v-if="postsStore.isLoading">Loading...</span>
                            <span v-else>Load More Posts</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Compose Post Modal -->
        <div v-if="showComposeModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-slate-200 dark:border-slate-700">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Create Post
                        </h3>

                        <button
                            @click="showComposeModal = false"
                            class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                        >
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="space-y-6">
                        <div class="flex items-start gap-4">
                            <img :src="identityStore?.identity?.avatarUrl || 'https://ui-avatars.com/api/?name=You&background=8b5cf6&color=fff'" alt="Your Avatar" class="size-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"/>

                            <div class="flex-1">
                                <p class="font-bold text-slate-900 dark:text-slate-100">
                                    {{ identityStore.username || 'You' }}
                                </p>

                                <p class="text-sm text-slate-500 dark:text-slate-400">
                                    Posting to the blockchain
                                </p>
                            </div>
                        </div>

                        <textarea
                            v-model="newPostContent"
                            @input="handleContentInput"
                            placeholder="What's on your mind?"
                            class="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                            maxlength="500"
                        ></textarea>

                        <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <div class="flex items-center gap-2">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" v-model="isSensitive" class="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500" />
                                    <span>Contains sensitive content</span>
                                </label>
                            </div>

                            <div>
                                {{ remainingCharacters }}/500
                            </div>
                        </div>

                        <div class="flex items-center gap-6 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                            <button
                                @click="showComposeModal = false"
                                class="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                @click="createPost"
                                :disabled="!canPost || postsStore.isLoading"
                                :class="[
                                    'px-6 py-3 rounded-xl font-medium transition-all duration-200 flex-1',
                                    !canPost || postsStore.isLoading
                                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 shadow-lg hover:shadow-xl'
                                ]"
                            >
                                <span v-if="postsStore.isLoading">Posting...</span>
                                <span v-else>Post to Blockchain</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Header from '@/components/Header.vue'
import PostItem from '@/components/PostItem.vue'
import { usePostsStore } from '@/stores/posts'
import { useIdentityStore } from '@/stores/identity'

const activeTab = ref<'posts' | 'remix'>('posts')
const showComposeModal = ref(false)
const newPostContent = ref('')
const isSensitive = ref(false)

const postsStore = usePostsStore()
const identityStore = useIdentityStore()

const remainingCharacters = computed(() => 500 - newPostContent.value.length)
const canPost = computed(() => newPostContent.value.trim().length > 0 && newPostContent.value.length <= 500)

const loadPosts = async () => {
    await postsStore.fetchPosts()
}

const loadMorePosts = async () => {
    await postsStore.fetchMorePosts()
}

const handleContentInput = () => {
    if (newPostContent.value.length > 500) {
        newPostContent.value = newPostContent.value.substring(0, 500)
    }
}

const createPost = async () => {
    if (!canPost.value) return

    const post = await postsStore.createNewPost(newPostContent.value.trim(), {
        isSensitive: isSensitive.value,
        language: 'en'
    })

    if (post) {
        showComposeModal.value = false
        newPostContent.value = ''
        isSensitive.value = false
        await loadPosts() // Refresh the posts list
    }
}

const handleLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
        await postsStore.unlikePostById(postId)
    } else {
        await postsStore.likePostById(postId)
    }
}

const handleRepost = async (postId: string) => {
    console.log('Reposting:', postId)
    // TODO: Implement repost functionality
    alert('Repost functionality coming soon!')
}

const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    if (isBookmarked) {
        await postsStore.unbookmarkPostById(postId)
    } else {
        await postsStore.bookmarkPostById(postId)
    }
}

const handleShare = (postId: string) => {
    console.log('Sharing:', postId)
    // TODO: Implement share functionality
    navigator.clipboard.writeText(`https://app.evonext/posts/${postId}`)
    alert('Post link copied to clipboard!')
}

onMounted(async () => {
    await loadPosts()
    if (identityStore.isAuthenticated) {
        await postsStore.initializeLikedPosts(identityStore.identity?.id)
    }
})
</script>
