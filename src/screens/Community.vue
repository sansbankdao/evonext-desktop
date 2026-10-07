<!-- src/screens/Community.vue -->
<template>
    <main>
        <Header title="Community Center" />


        <section class="bg-surface-card font-sans text-content min-h-screen rounded-inner mx-4">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 gap-6">

                <div class="bg-surface-card p-4 rounded-inner border border-edge shadow-sm">
                    <h2 class="text-xl font-semibold text-content mb-4">
                        Conversations
                    </h2>

                    <div class="space-y-2">
                        <a v-for="convo in conversations" :key="convo.id" href="#" class="flex items-center gap-4 p-3 rounded-control hover:bg-surface-raise dark:hover:bg-surface-raise transition border border-edge/50 /50">
                            <div class="relative">
                                <img :src="convo.avatarUrl" :alt="convo.name" class="size-12 rounded-inner"/>
                                <span v-if="convo.unread > 0" class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"> {{ convo.unread }}</span>
                            </div>

                            <div class="flex-1 truncate">
                                <div class="flex justify-between items-baseline">
                                    <p class="font-semibold text-content">
                                        {{ convo.name }}
                                    </p>

                                    <p class="text-xs text-content-soft dark:text-content-soft">
                                        {{ convo.timestamp }}
                                    </p>
                                </div>

                                <p class="text-sm text-content-soft truncate">
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
                        <div class="bg-surface-card p-4 rounded-inner border border-edge shadow-sm">
                            <h2 class="text-xl font-semibold text-content mb-4">
                                Find New Contacts
                            </h2>

                            <div class="relative">
                                <input
                                    type="text"
                                    placeholder="Search by username (e.g., satoshi.dash)"
                                    class="w-full bg-surface-raise bg-surface-raise border border-edge  rounded-control py-3 pl-10 pr-4 text-content placeholder-content-faint dark:placeholder-content-faint focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition"
                                />

                                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg class="h-5 w-5 text-content-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                            </div>

                            <!-- Example Search Result -->
                            <div class="mt-4 flex items-center justify-between bg-surface-raise bg-surface-raise/50 p-3 rounded-control border border-edge/50 /50">
                                <div class="flex items-center gap-3">
                                    <img src="https://ui-avatars.com/api/?name=Satoshi&background=16a34a&color=fff" alt="Satoshi" class="size-10 rounded-inner"/>
                                    <div>
                                        <p class="font-semibold text-content">
                                            Shomari
                                        </p>

                                        <p class="text-sm text-content-soft">
                                            shomari.dash
                                        </p>
                                    </div>
                                </div>

                                <button class="inline-flex items-center gap-2 rounded-inner bg-sky-500 hover:bg-sky-600 py-1.5 px-4 text-sm font-semibold text-white shadow-sm transition border border-sky-300">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add
                                </button>
                            </div>
                        </div>

                        <!-- Contact Requests Section -->
                        <div class="bg-surface-card p-4 rounded-inner border border-edge shadow-sm">
                            <!-- Tabs -->
                            <div class="border-b border-edge">
                                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                                    <button @click="activeTab = 'pending'" :class="[activeTab === 'pending' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-content-soft hover:border-edge dark:hover:border-edge hover:text-content dark:hover:text-content', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium rounded-t-xl']">
                                        Pending Requests
                                    </button>

                                    <button @click="activeTab = 'active'" :class="[activeTab === 'active' ? 'border-sky-400 text-sky-600 dark:text-sky-400' : 'border-transparent text-content-soft hover:border-edge dark:hover:border-edge hover:text-content dark:hover:text-content', 'whitespace-nowrap border-b-2 py-3 px-1 text-base font-medium rounded-t-xl']">
                                        Active Contacts ({{ activeContacts.length }})
                                    </button>
                                </nav>
                            </div>

                            <!-- Pending Requests Content -->
                            <div v-if="activeTab === 'pending'" class="mt-6 space-y-4">
                                <div v-for="contact in pendingRequests" :key="contact.id" class="flex items-center justify-between p-4 rounded-control border border-edge/50 /50 hover:bg-surface-raise dark:hover:bg-surface-raise/50 transition">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-inner"
                                        />

                                        <div>
                                            <p class="font-semibold text-content">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-content-soft">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <button class="bg-emerald-500 hover:bg-emerald-600 p-2.5 rounded-inner shadow-sm" title="Accept">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        </button>

                                        <button class="bg-red-500 hover:bg-red-600 p-2.5 rounded-inner shadow-sm" title="Decline">
                                            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <p v-if="pendingRequests.length === 0" class="text-center text-content-faint py-4">No pending requests.</p>
                            </div>

                            <!-- Active Contacts Content -->
                            <div v-if="activeTab === 'active'" class="mt-6 space-y-4">
                                <div v-for="contact in activeContacts" :key="contact.id" class="flex items-center justify-between p-4 rounded-control border border-edge/50 /50 hover:bg-surface-raise dark:hover:bg-surface-raise/50 transition">
                                    <div class="flex items-center gap-4">
                                        <img
                                            :src="contact.avatarUrl"
                                            :alt="contact.name"
                                            class="size-12 rounded-inner"
                                        />

                                        <div>
                                            <p class="font-semibold text-content">
                                                {{ contact.name }}
                                            </p>

                                            <p class="text-sm text-content-soft">
                                                {{ contact.username }}
                                            </p>
                                        </div>
                                    </div>

                                    <button class="bg-surface-raise hover:bg-surface-raise dark:hover:bg-surface-raise text-content font-semibold px-4 py-1.5 rounded-control text-sm transition shadow-sm border border-edge ">
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
