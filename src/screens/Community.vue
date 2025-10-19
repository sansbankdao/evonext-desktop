<!-- src/screens/Community.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Community Manager
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

        <section class="bg-slate-900 font-sans text-slate-200 min-h-screen">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 gap-6">

                <div class="bg-slate-800 p-6 rounded-xl">
                    <h2 class="text-xl font-semibold text-white mb-4">
                        Conversations
                    </h2>

                    <div class="space-y-2">
                        <a v-for="convo in conversations" :key="convo.id" href="#" class="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700 transition">
                            <div class="relative">
                                <img :src="convo.avatarUrl" :alt="convo.name" class="size-12 rounded-full"/>
                                <span v-if="convo.unread > 0" class="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">{{ convo.unread }}</span>
                            </div>
                            <div class="flex-1 truncate">
                                <div class="flex justify-between items-baseline">
                                    <p class="font-semibold text-white">{{ convo.name }}</p>
                                    <p class="text-xs text-slate-500">{{ convo.timestamp }}</p>
                                </div>
                                <p class="text-sm text-slate-400 truncate">{{ convo.lastMessage }}</p>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Main 2-Column Layout -->
                <div class="flex flex-col gap-8">

                    <!-- Main Content Area (Left, wider column) -->
                    <main class="flex flex-col gap-8">
                        <!-- Search Section -->
                        <div class="bg-slate-800 p-6 rounded-xl">
                            <h2 class="text-xl font-semibold text-white mb-4">
                                Find New Contacts
                            </h2>

                            <div class="relative">
                                <input
                                    type="text"
                                    placeholder="Search by username (e.g., satoshi.dash)"
                                    class="w-full bg-slate-700 border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                                />

                                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                            </div>

                            <!-- Example Search Result -->
                            <div class="mt-4 flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                                <div class="flex items-center gap-3">
                                    <img src="https://ui-avatars.com/api/?name=Satoshi&background=16a34a&color=fff" alt="Satoshi" class="size-10 rounded-full"/>
                                    <div>
                                        <p class="font-semibold text-white">
                                            Shomari
                                        </p>

                                        <p class="text-sm text-slate-400">
                                            shomari.dash
                                        </p>
                                    </div>
                                </div>

                                <button class="inline-flex items-center gap-2 rounded-md bg-cyan-500 py-1.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 transition">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add
                                </button>
                            </div>
                        </div>

                        <!-- Contact Requests Section -->
                        <div class="bg-slate-800 p-6 rounded-xl">
                            <!-- Tabs -->
                            <div class="border-b border-slate-700">
                                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                                    <button @click="activeTab = 'pending'" :class="[activeTab === 'pending' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-white', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium']">
                                        Pending Requests
                                    </button>

                                    <button @click="activeTab = 'active'" :class="[activeTab === 'active' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-white', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium']">
                                        Active Contacts ({{ activeContacts.length }})
                                    </button>
                                </nav>
                            </div>

                            <!-- Pending Requests Content -->
                            <div v-if="activeTab === 'pending'" class="mt-6 space-y-4">
                                <div v-for="contact in pendingRequests" :key="contact.id" class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-full"
                                        />

                                        <div>
                                            <p class="font-semibold text-white">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-slate-400">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <button class="bg-green-500 hover:bg-green-600 p-2.5 rounded-full" title="Accept">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        </button>

                                        <button class="bg-red-500 hover:bg-red-600 p-2.5 rounded-full" title="Decline">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <p v-if="pendingRequests.length === 0" class="text-center text-slate-500 py-4">No pending requests.</p>
                            </div>

                            <!-- Active Contacts Content -->
                            <div v-if="activeTab === 'active'" class="mt-6 space-y-4">
                                <div v-for="contact in activeContacts" :key="contact.id" class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-full"
                                        />

                                        <div>
                                            <p class="font-semibold text-white">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-slate-400">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <button class="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold px-4 py-1.5 rounded-md text-sm transition">
                                        Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>

            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Sample data structures
interface Conversation {
    id: string;
    name: string;
    avatarUrl: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
}

interface Contact {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    status: 'active' | 'pending-incoming' | 'pending-outgoing';
}

// State for the active tab
const activeTab = ref<'pending' | 'active'>('pending')

// Sample Data
const conversations = ref<Conversation[]>([
    { id: '1', name: 'Alice', avatarUrl: 'https://ui-avatars.com/api/?name=Alice&background=ec4899&color=fff', lastMessage: 'That makes sense, let\'s sync up...', timestamp: '5m ago', unread: 2 },
    { id: '2', name: 'Bob', avatarUrl: 'https://ui-avatars.com/api/?name=Bob&background=8b5cf6&color=fff', lastMessage: 'Did you see the latest proposal?', timestamp: '1h ago', unread: 0 },
    { id: '3', name: 'Charlie', avatarUrl: 'https://ui-avatars.com/api/?name=Charlie&background=f59e0b&color=fff', lastMessage: 'Perfect, thanks!', timestamp: 'yesterday', unread: 0 },
])

const contacts = ref<Contact[]>([
    { id: 'c1', name: 'Diana', username: 'diana.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Diana&background=10b981&color=fff', status: 'pending-incoming' },
    { id: 'c2', name: 'Frank', username: 'frank.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Frank&background=3b82f6&color=fff', status: 'pending-incoming' },
    { id: 'c3', name: 'Grace', username: 'grace.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Grace&background=ef4444&color=fff', status: 'pending-outgoing' },
    { id: 'c4', name: 'Alice', username: 'alice.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Alice&background=ec4899&color=fff', status: 'active' },
    { id: 'c5', name: 'Bob', username: 'bob.dash', avatarUrl: 'https://ui-avatars.com/api/?name=Bob&background=8b5cf6&color=fff', status: 'active' },
])

// Filtered lists for tabs
const pendingRequests = contacts.value.filter(c => c.status === 'pending-incoming')
const activeContacts = contacts.value.filter(c => c.status === 'active')
</script>
