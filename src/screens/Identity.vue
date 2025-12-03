<!-- src/screens/Identity.vue -->
<template>
    <main>
        <Header title="Identity Manager" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">

                    <!-- Page Header and Create Action -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div class="space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                Choose An Identity
                            </h1>

                            <p class="text-lg text-slate-600 dark:text-slate-400">
                                Easily switch between your Identities or register a new one.
                            </p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3">
                            <RouterLink to="/identity/register" class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-8 text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                <span>Register New Identity</span>
                            </RouterLink>
                        </div>
                    </div>

                    <!-- Grid of Identity Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Use v-for to loop through the identities -->
                        <div v-for="identity in identities" :key="identity.id"
                            class="bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1
                                   border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600
                                   group"
                            :class="identity.id === activeIdentityId ? 'ring-4 ring-cyan-400/20 shadow-cyan-500/20 border-cyan-400 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5' : ''">

                            <!-- Card Header -->
                            <div class="p-6 flex items-start gap-4">
                                <img :src="identity.avatarUrl" :alt="identity.displayName" class="size-16 rounded-full flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 shadow-lg group-hover:scale-105 transition-transform duration-200"/>
                                <div class="flex-1 min-w-0">
                                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{{ identity.displayName }}</h2>
                                    <p class="text-slate-600 dark:text-slate-400 text-sm truncate">{{ identity.username }}</p>
                                </div>
                                <span v-if="identity.id === activeIdentityId" class="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold px-3 py-1 rounded-full border border-cyan-400/50 shadow-sm">
                                    Active
                                </span>
                            </div>

                            <!-- Card Body -->
                            <div class="px-6 pb-6 space-y-4 flex-1">
                                <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{{ identity.bio }}</p>
                                <div>
                                    <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Identifier</label>
                                    <div class="relative">
                                        <input type="text" readonly :value="identity.id" class="w-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-mono text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 pr-12 shadow-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 hover:shadow-md group-hover:shadow-lg">
                                        <button @click="copyToClipboard(identity.id)" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors duration-200" title="Copy Identifier">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Card Footer / Action -->
                            <div class="mt-auto p-6 border-t border-slate-200 dark:border-slate-700">
                                <button v-if="identity.id !== activeIdentityId" @click="switchToIdentity(identity.id)"
                                        class="w-full rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700 py-3 px-6 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:from-slate-400 hover:to-slate-500 dark:hover:from-slate-500 dark:hover:to-slate-600 transition-all duration-200 focus:ring-4 focus:ring-slate-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                                    Switch to this Identity
                                </button>
                                <div v-else class="text-center text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-500/20 px-6 py-4 rounded-xl border-2 border-cyan-400/30 shadow-sm">
                                    This is your active identity
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Header from '@/components/Header.vue'
// import { invoke } from '@tauri-apps/api/core'

import getIdentities from '@/libs/getIdentities'
import getMnemonic from '@/libs/getMnemonic'

// Define the TypeScript interface for an Identity
interface Identity {
    id: string;
    avatarUrl: string;
    displayName: string;
    username: string;
    bio: string;
}

// Sample data representing the user's identities
const identities = ref<Identity[]>([
    {
        id: 'BkEqcgfmNFY5TEy2atDhhFsDY1NZ6oPa4XPrDGuuWLVT',
        avatarUrl: 'https://ui-avatars.com/api/?name=Alice&background=ec4899&color=fff',
        displayName: 'Alice',
        username: 'alice.dash',
        bio: 'Exploring the frontiers of decentralized technology and sharing my journey. Founder of Project Artemis.',
    },
    {
        id: '9yZ8fGAbCDEFG12345hijklmNOPQRSTuvwxyzABCDEF',
        avatarUrl: 'https://ui-avatars.com/api/?name=Bob&background=8b5cf6&color=fff',
        displayName: 'Bob (Dev)',
        username: 'bob-dev.dash',
        bio: 'Developer account for testing and contributing to open-source Dash projects. All posts are for testing purposes.',
    },
    {
        id: 'GHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuV',
        avatarUrl: 'https://ui-avatars.com/api/?name=Photos&background=f59e0b&color=fff',
        displayName: 'Photos by C',
        username: 'c-photos.dash',
        bio: 'A collection of my photography work. Exploring light, shadow, and the moments in between.',
    },
])

// A ref to track the currently active identity ID
const activeIdentityId = ref<string>('BkEqcgfmNFY5TEy2atDhhFsDY1NZ6oPa4XPrDGuuWLVT')

// Function to handle switching identities
const switchToIdentity = (id: string) => {
    console.log(`Switching active identity to: ${id}`)
    activeIdentityId.value = id
};

// Placeholder for the copy function
const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a small "Copied!" notification here
    console.log(`Copied to clipboard: ${text}`)
}

const init = async () => {
    try {
        /* Request mnemonic. */
        const mnemonic = await getMnemonic()
        console.log('MNEMONIC IS', mnemonic)

        const identities = await getIdentities()
        console.log('IDENTITIES', identities)

    } catch (error) {
        console.error('Failed to get credentials:', error)
    }
}

onMounted(async () => {
    init()
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    // TODO
})
</script>
