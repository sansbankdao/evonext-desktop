<!-- src/screens/Identities.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Identity Manager
            </h1>

            <div class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg">
                <span class="w-[300px]">
                    <span class="text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-slate-900 font-sans text-slate-200">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">

                    <!-- Page Header and Create Action -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div class="space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Manage Identities</h1>
                            <p class="text-lg text-slate-400">Switch between your profiles or create a new one.</p>
                        </div>
                        <button class="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 px-6 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 transition">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            <span>Create New Identity</span>
                        </button>
                    </div>

                    <!-- Grid of Identity Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <!-- Use v-for to loop through the identities -->
                        <div v-for="identity in identities" :key="identity.id"
                            class="bg-slate-800 rounded-xl border-2 transition-colors flex flex-col"
                            :class="identity.id === activeIdentityId ? 'border-cyan-400' : 'border-slate-700 hover:border-slate-600'">

                            <!-- Card Header -->
                            <div class="p-6 flex items-start gap-4">
                                <img :src="identity.avatarUrl" :alt="identity.displayName" class="size-16 rounded-full flex-shrink-0"/>
                                <div class="flex-1">
                                    <h2 class="text-xl font-bold text-white">{{ identity.displayName }}</h2>
                                    <p class="text-slate-400">{{ identity.username }}</p>
                                </div>
                                <span v-if="identity.id === activeIdentityId" class="bg-cyan-500/10 text-cyan-400 text-xs font-bold px-2 py-1 rounded-full">
                                    Active
                                </span>
                            </div>

                            <!-- Card Body -->
                            <div class="px-6 pb-6 space-y-4">
                                <p class="text-slate-300 leading-relaxed">{{ identity.bio }}</p>
                                <div>
                                    <label class="text-xs font-medium text-slate-500">Identifier</label>
                                    <div class="relative mt-1">
                                        <input type="text" readonly :value="identity.id" class="w-full bg-slate-900 text-slate-400 font-mono text-sm p-2 rounded-lg border border-slate-700 pr-10">
                                        <button @click="copyToClipboard(identity.id)" class="absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 hover:text-white" title="Copy Identifier">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Card Footer / Action -->
                            <div class="mt-auto p-6 border-t border-slate-700">
                                <button v-if="identity.id !== activeIdentityId" @click="switchToIdentity(identity.id)"
                                        class="w-full inline-flex justify-center rounded-lg bg-slate-700 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 transition">
                                    Switch to this Identity
                                </button>
                                <div v-else class="text-center text-sm font-medium text-slate-500">
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
import { ref } from 'vue'

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

</script>
