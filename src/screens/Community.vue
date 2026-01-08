<!-- src/screens/Community.vue -->
<template>
    <main>
        <Header title="Community Center" />


        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 gap-6">

                <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        Conversations
                    </h2>

                    <div class="space-y-2">
                        <a v-for="convo in conversations" :key="convo.id" href="#" class="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition border border-slate-200/50 dark:border-slate-600/50">
                            <div class="relative">
                                <img :src="convo.avatarUrl" :alt="convo.name" class="size-12 rounded-2xl"/>
                                <span v-if="convo.unread > 0" class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"> {{ convo.unread }}</span>
                            </div>

                            <div class="flex-1 truncate">
                                <div class="flex justify-between items-baseline">
                                    <p class="font-semibold text-slate-900 dark:text-slate-100">
                                        {{ convo.name }}
                                    </p>

                                    <p class="text-xs text-slate-600 dark:text-slate-500">
                                        {{ convo.timestamp }}
                                    </p>
                                </div>

                                <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
                                    {{ convo.lastMessage }}
                                </p>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Main 2-Column Layout -->
                <div class="flex flex-col gap-8">

                    <!-- Main Content Area (Left, wider column) -->
                    <main class="flex flex-col gap-8">
                        <!-- Search Section -->
                        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                Find New Contacts
                            </h2>

                            <div class="relative">
                                <input
                                    type="text"
                                    placeholder="Search by username (e.g., satoshi.dash)"
                                    class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition"
                                />

                                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg class="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                            </div>

                            <!-- Example Search Result -->
                            <div class="mt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-600/50">
                                <div class="flex items-center gap-3">
                                    <img src="https://ui-avatars.com/api/?name=Satoshi&background=16a34a&color=fff" alt="Satoshi" class="size-10 rounded-2xl"/>
                                    <div>
                                        <p class="font-semibold text-slate-900 dark:text-slate-100">
                                            Shomari
                                        </p>

                                        <p class="text-sm text-slate-600 dark:text-slate-400">
                                            shomari.dash
                                        </p>
                                    </div>
                                </div>

                                <button class="inline-flex items-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 py-1.5 px-4 text-sm font-semibold text-white shadow-sm transition border border-sky-300">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add
                                </button>
                            </div>
                        </div>

                        <!-- Contact Requests Section -->
                        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <!-- Tabs -->
                            <div class="border-b border-slate-200 dark:border-slate-700">
                                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                                    <button @click="activeTab = 'pending'" :class="[activeTab === 'pending' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium rounded-t-xl']">
                                        Pending Requests
                                    </button>

                                    <button @click="activeTab = 'active'" :class="[activeTab === 'active' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium rounded-t-xl']">
                                        Active Contacts ({{ activeContacts.length }})
                                    </button>
                                </nav>
                            </div>

                            <!-- Pending Requests Content -->
                            <div v-if="activeTab === 'pending'" class="mt-6 space-y-4">
                                <div v-for="contact in pendingRequests" :key="contact.id" class="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-2xl"
                                        />

                                        <div>
                                            <p class="font-semibold text-slate-900 dark:text-slate-100">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-slate-600 dark:text-slate-400">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <button class="bg-emerald-500 hover:bg-emerald-600 p-2.5 rounded-2xl shadow-sm" title="Accept">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        </button>

                                        <button class="bg-red-500 hover:bg-red-600 p-2.5 rounded-2xl shadow-sm" title="Decline">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <p v-if="pendingRequests.length === 0" class="text-center text-slate-500 dark:text-slate-400 py-4">No pending requests.</p>
                            </div>

                            <!-- Active Contacts Content -->
                            <div v-if="activeTab === 'active'" class="mt-6 space-y-4">
                                <div v-for="contact in activeContacts" :key="contact.id" class="flex items-center justify-between p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-2xl"
                                        />

                                        <div>
                                            <p class="font-semibold text-slate-900 dark:text-slate-100">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-slate-600 dark:text-slate-400">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <button class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold px-4 py-1.5 rounded-xl text-sm transition shadow-sm border border-slate-200 dark:border-slate-600">
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
import { ref, computed } from 'vue'
import Header from '@/components/Header.vue'

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
const pendingRequests = computed(() => contacts.value.filter(c => c.status === 'pending-incoming'))
const activeContacts = computed(() => contacts.value.filter(c => c.status === 'active'))
</script>
