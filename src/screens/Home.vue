<!-- src/screens/Home.vue -->
<template>
    <main class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
        <Header title="Maīson Ξvolution" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">

            <!-- Top Section: Balance (full width) -->
            <section class="mb-6">
                <div class="bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div class="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div class="flex-1">
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Balance</p>
                            <div class="flex items-baseline gap-2">
                                <p class="text-4xl font-black text-slate-900 dark:text-white">{{ formatCurrency(totalBalance.usd) }}</p>
                            </div>
                            <p class="text-lg font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                            </p>
                        </div>

                        <div class="md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
                            <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">My Assets</p>
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.282M12 3a8.997 8.997 0 00-7.843 4.282m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.218m0 0A11.995 11.995 0 001.5 12c0 1.605.42 3.113 1.157 4.418" /></svg>
                                    </div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">Core L1 Balance</p>
                                    <p class="text-sm font-mono text-slate-500 dark:text-slate-400">—</p>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                                    </div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">Platform Address Balance</p>
                                    <p class="text-sm font-mono text-slate-500 dark:text-slate-400">—</p>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                                    </div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">Platform Shielded Balance</p>
                                    <p class="text-sm font-mono text-slate-500 dark:text-slate-400">—</p>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
                                    </div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">Identity ID Balance</p>
                                    <p class="text-sm font-mono font-bold text-slate-900 dark:text-white">{{ identityBalanceDisplay }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Token Assets & Collectibles Row -->
            <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Token Assets</p>
                    <div v-if="walletStore.assets.length" class="flex flex-wrap gap-3">
                        <div v-for="asset in walletStore.assets" :key="asset.symbol" class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 min-w-[100px]">
                            <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center">
                                <img v-if="getIconSrc(asset.symbol)" :src="getIconSrc(asset.symbol) as string" class="w-5 h-5" />
                                <span v-else class="text-sm font-bold uppercase">{{ asset.symbol[0] }}</span>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-black text-slate-900 dark:text-white truncate">{{ getNormalizedBalance(asset) }}</p>
                                <p class="text-xs font-bold text-slate-500 uppercase">{{ asset.symbol }}</p>
                            </div>
                        </div>
                    </div>
                    <p v-else class="text-sm text-slate-400 font-medium">No token assets yet.</p>
                </div>

                <div class="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white border border-slate-800 relative overflow-hidden">
                    <h3 class="text-xl font-bold">Collectibles</h3>
                    <button class="sm:w-auto w-full py-2 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all">Coming Soon</button>
                </div>
            </section>

            <!-- Feed Section -->
            <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div v-if="isSocialAvailable" class="lg:col-span-2 flex flex-col gap-6">

                    <!-- Post Input Card -->
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div class="flex items-start gap-4">
                            <img :src="identityStore.identity?.avatarUrl ?? getFallbackAvatar(identityStore.username as string)" class="size-12 rounded-2xl object-cover bg-slate-100" />
                            <div class="flex-1">
                                <textarea v-model="content" rows="3" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-500 resize-none focus:ring-1 focus:ring-cyan-500/50" placeholder="What's on your mind?"></textarea>

                                <div v-if="mediaUrls.length > 0" class="mt-3 grid grid-cols-2 gap-2">
                                    <div v-for="(url, index) in mediaUrls" :key="index" class="relative group aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <img :src="url" class="w-full h-full object-cover">
                                        <button @click="removeMedia(index)" class="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-100 transition-opacity z-10">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                <input type="file" ref="fileInputRef" @change="handleFileUpload" multiple accept="image/*" class="hidden" />

                                <div class="flex flex-wrap justify-between items-center mt-4 gap-4">
                                    <div class="flex items-center gap-3">
                                        <button @click="triggerFileUpload" class="p-2 text-slate-500 hover:text-cyan-600 rounded-xl transition-colors">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </button>
                                        <select v-model="selectedLanguage" class="text-xs bg-transparent border-none rounded-lg text-slate-500 py-1 cursor-pointer">
                                            <option value="en">en</option>
                                            <option value="es">es</option>
                                        </select>
                                        <button @click="isSensitive = !isSensitive" :class="['text-[10px] px-2 py-1 rounded-lg border transition-all uppercase font-bold tracking-tighter', isSensitive ? 'border-red-500/50 bg-red-500/10 text-red-500' : 'border-slate-200 text-slate-400']">{{ isSensitive ? 'Sensitive' : 'Safe' }}</button>
                                    </div>

                                    <div class="flex items-center gap-4">
                                        <button
                                            @click="handleQuickPost"
                                            :disabled="!isAuthenticated || (!content.trim() && mediaUrls.length === 0) || isSubmitting"
                                            class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-2 rounded-xl transition-all disabled:opacity-30"
                                        >
                                            <span v-if="isSubmitting" class="flex items-center gap-2">
                                                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Broadcasting...
                                            </span>
                                            <span v-else>Post</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Social Feed -->
                    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                    <div class="w-2 h-2 rounded-full bg-emerald-500" :class="posts.isLoading.value ? 'animate-pulse' : ''"></div>
                                </div>
                                <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Social Feed</h2>
                            </div>
                            <div class="flex items-center gap-4">
                                <button @click="refreshFeed" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-500 transition-colors">
                                    <svg class="w-5 h-5" :class="{'animate-spin': posts.isLoading.value}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                                <button @click="showDebug = !showDebug" class="text-sm font-bold text-slate-400 uppercase">Debug</button>
                            </div>
                        </div>
                    </div>

                    <div v-if="posts.posts.value.length > 0" class="flex flex-col gap-6 mt-6">
                        <PostItem v-for="post in posts.posts.value.slice(0, 5)" :key="post.id" :post="post" @like="handleLike" />
                    </div>
                </div>

                <SocialComingSoon v-else class="lg:col-span-2" />

                <!-- Sidebar -->
                <div class="flex flex-col gap-8">
                    <PendingMessages />
                    <ContactRequests />
                    <TrendingTopics />
                </div>
            </section>

            <!-- VERBOSE DIAGNOSTIC CONSOLE -->
            <section v-if="showDebug" class="mt-6 bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 font-mono text-xs text-cyan-400 overflow-hidden shadow-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-sm font-bold uppercase tracking-tighter text-white">Diagnostic Console</h3>
                    <div class="flex gap-2">
                        <button @click="debugLogs = []" class="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/20 text-white">Clear Logs</button>
                        <button @click="showDebug = false" class="text-[10px] bg-red-500/20 px-2 py-1 rounded border border-red-500/50 text-red-500">Close</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                        <p class="text-[10px] text-slate-500 uppercase mb-2 font-bold">Store States</p>
                        <p>Identity: <span class="text-white">{{ identityStore.identityId || 'Missing' }}</span></p>
                        <p>Platform Auth: <span :class="isAuthenticated ? 'text-emerald-400' : 'text-red-400'">{{ isAuthenticated }}</span></p>
                        <p>Store Loading: <span class="text-white">{{ posts.isLoading.value }}</span></p>
                        <p>Store Error: <span class="text-red-400">{{ posts.error.value || 'None' }}</span></p>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 max-h-48 overflow-y-auto border border-white/5">
                        <p class="text-[10px] text-slate-500 uppercase mb-2 font-bold">Execution Steps</p>
                        <div v-for="(log, i) in debugLogs" :key="i" class="mb-1 border-l border-cyan-500/30 pl-2">
                            <span class="text-cyan-700">[{{ log.time }}]</span> {{ log.msg }}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useWalletStore } from '@/stores/wallet'
import { usePosts } from '@/composables/usePosts'
import { useNetwork } from '@/composables/useNetwork'

import Header from '@/components/Header.vue'
import PostItem from '@/components/posts/Item.vue'
import SocialComingSoon from '@/components/posts/SocialComingSoon.vue'
import TrendingTopics from '@/components/home/TrendingTopics.vue'
import ContactRequests from '@/components/home/ContactRequests.vue'
import PendingMessages from '@/components/home/PendingMessages.vue'

// --- Stores / Composables ---
const identityStore = useIdentityStore()
const systemStore = useSystemStore()
const walletStore = useWalletStore()
const { network: currentNetwork } = useNetwork()
const posts = usePosts()

// Yappr social contract is testnet-only (docs/HANDOFF-DCG-SDK-AND-SHIELDED.md §3.4)
const isSocialAvailable = computed(() => currentNetwork.value === 'testnet')

// --- State ---
const content = ref('')
const mediaUrls = ref<string[]>([])
const isSubmitting = ref(false)
const isSensitive = ref(false)
const selectedLanguage = ref('en')
const fileInputRef = ref<HTMLInputElement>()
const showDebug = ref(false)
const debugLogs = ref<{time: string, msg: string}[]>([])

// --- Helper Functions ---
const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false })
    debugLogs.value.unshift({ time, msg })
    console.log(`[Diagnostic] ${msg}`)
}

const getNormalizedBalance = (asset: any) => {
    const raw = Number(asset.balance) || 0
    const divisor = asset.symbol.toUpperCase().includes('USD') ? 100 : 100000000
    return (raw / divisor).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const getIconSrc = (symbol: string) => {
    const s = symbol.toLowerCase().replace(/^t/, '')
    const supported = ['dash', 'dusd', 'sans']
    return supported.includes(s) ? `/icons/${s}.svg` : null
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0).replace('$', '') + ' USD'
}

const getFallbackAvatar = (name: string | undefined): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Me')}&background=random`

// --- UI Methods ---
const resetForm = () => {
    content.value = ''
    mediaUrls.value = []
    isSensitive.value = false
    selectedLanguage.value = 'en'
}
const triggerFileUpload = () => { addLog("UI: Trigger File Picker"); fileInputRef.value?.click() }
const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files) {
        addLog(`UI: Files selected (${target.files.length})`)
        Array.from(target.files).forEach(file => mediaUrls.value.push(URL.createObjectURL(file)))
    }
}
const removeMedia = (index: number) => { mediaUrls.value.splice(index, 1); addLog("UI: Media removed") }

const refreshFeed = async () => {
    addLog("Feed: Fetching posts...")
    try { await posts.fetchPosts() }
    catch (e) { addLog(`Feed Error: ${e}`) }
}

const handleLike = (id: string) => posts.likePost(id)

// --- POST SUBMISSION LOGIC ---
const handleQuickPost = async () => {
    addLog(`Broadcasting: "${content.value.substring(0, 15)}..."`)

    if (!isAuthenticated.value) {
        addLog("Abort: Not Authenticated")
        return
    }

    isSubmitting.value = true

    try {
        const postOptions = {
            isSensitive: isSensitive.value,
            language: selectedLanguage.value,
            // NOTE: Key name is mediaUrl (singular) to match createUpdate.ts EXPECTATIONS
            ...(mediaUrls.value.length > 0 && { mediaUrl: mediaUrls.value })
        }

        addLog("Calling store.createNewPost...")

        // This triggers createNewPostAction in src/stores/posts/actions/createUpdate.ts
        const result = await posts.createPost(content.value.trim(), postOptions)

        if (result) {
            addLog("Success: SDK returned createdPost object")
            resetForm()
            isSubmitting.value = false

            // Re-fetch data
            identityStore.fetchBalance()
            addLog("Scheduled feed refresh (+1.5s)")
            setTimeout(() => refreshFeed(), 1500)
        } else {
            addLog("Failure: Store action returned NULL")
            if (posts.error.value) {
                addLog(`Store reported error: ${posts.error.value}`)
            }
        }
    } catch (e: any) {
        addLog(`Exception: ${e.message}`)
        console.error('[Home] Post Failure:', e)
    } finally {
        isSubmitting.value = false
    }
}

// --- Computed ---
const isAuthenticated = computed(() => identityStore.isAuthenticated)
const totalBalance = computed(() => {
    if (isAuthenticated.value && identityStore.balance) {
        const raw = Number(identityStore.balance)
        const dash = (raw / 1000) / 100000000
        return { dash, usd: dash * (systemStore.currentDashPrice || 0), credits: raw }
    }
    return { dash: 0, usd: 0, credits: 0 }
})

// Identity ID balance row — same conversion as totalBalance (credits -> DASH)
const identityBalanceDisplay = computed(() => {
    if (!isAuthenticated.value || !identityStore.balance) return '—'
    return totalBalance.value.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' DASH'
})

// --- Lifecycle ---
onMounted(async () => {
    addLog("Home Screen Initialized")
    if (isSocialAvailable.value) refreshFeed()
    if (isAuthenticated.value) {
        if (!identityStore.balance) identityStore.fetchBalance()
        await walletStore.refreshBalances(currentNetwork.value)
    }
})
</script>
