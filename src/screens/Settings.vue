<!-- src/screens/Settings.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-gray-50 dark:bg-slate-900 p-6 rounded-xl shadow-lg">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
                App Settings
            </h1>

            <div class="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <span class="w-[300px]">
                    <span class="text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-600/70 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-12">

                    <!-- Page Header -->
                    <div class="space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                            Settings
                        </h1>

                        <p class="text-lg text-slate-600 dark:text-slate-400">
                            Manage your application preferences and profile.
                        </p>
                    </div>

                    <!-- Network Section -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            Network
                        </h2>

                        <p class="mt-1 text-slate-600 dark:text-slate-400">
                            Choose which network to connect to.
                        </p>

                        <div class="mt-6">
                            <fieldset>
                                <legend class="sr-only">Network</legend>
                                <div class="flex items-center gap-4">
                                    <!-- Testnet Option -->
                                    <button @click="Settings.setNetwork('testnet')" :class="['flex-1 text-center p-4 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5', Settings.network === 'testnet' ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 text-cyan-900 dark:text-cyan-100 shadow-cyan-500/25 dark:shadow-cyan-500/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm']">
                                        <span class="font-semibold">Testnet</span>
                                    </button>
                                    <!-- Mainnet Option -->
                                    <button @click="Settings.setNetwork('mainnet')" :class="['flex-1 text-center p-4 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5', Settings.network === 'mainnet' ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 text-cyan-900 dark:text-cyan-100 shadow-cyan-500/25 dark:shadow-cyan-500/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm']">
                                        <span class="font-semibold">Mainnet</span>
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <!-- Appearance Section -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            Appearance
                        </h2>

                        <p class="mt-1 text-slate-600 dark:text-slate-400">
                            Customize the look and feel of the app.
                        </p>

                        <div class="mt-6">
                            <fieldset>
                                <legend class="sr-only">Theme</legend>
                                <div class="flex items-center gap-4">
                                    <!-- System Theme Option -->
                                    <button @click="Settings.setTheme('system')" :class="['flex-1 text-center p-4 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5', Settings.theme === 'system' ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 text-cyan-900 dark:text-cyan-100 shadow-cyan-500/25 dark:shadow-cyan-500/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm']">
                                        <span class="font-semibold">System</span>
                                    </button>
                                    <!-- Light Theme Option -->
                                    <button @click="Settings.setTheme('light')" :class="['flex-1 text-center p-4 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5', Settings.theme === 'light' ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 text-cyan-900 dark:text-cyan-100 shadow-cyan-500/25 dark:shadow-cyan-500/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm']">
                                        <span class="font-semibold">Light</span>
                                    </button>
                                    <!-- Dark Theme Option -->
                                    <button @click="Settings.setTheme('dark')" :class="['flex-1 text-center p-4 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5', Settings.theme === 'dark' ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 text-cyan-900 dark:text-cyan-100 shadow-cyan-500/25 dark:shadow-cyan-500/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm']">
                                        <span class="font-semibold">Dark</span>
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <!-- Profile & Notifications Form -->
                    <form @submit.prevent="handleSaveChanges">
                        <div class="flex flex-col gap-8">
                            <!-- Profile Section -->
                            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                    Profile
                                </h2>

                                <p class="mt-1 text-slate-600 dark:text-slate-400">
                                    This information will be displayed publicly.
                                </p>

                                <div class="mt-6 grid grid-cols-1 gap-y-6">
                                    <div>
                                        <label for="displayName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
                                        <input v-model="localProfile.display_name" type="text" name="displayName" id="displayName" class="mt-1 block w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-4 ring-cyan-400/20 focus:border-cyan-400 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    </div>

                                    <div>
                                        <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                                        <input v-model="localProfile.username" type="text" name="username" id="username" disabled class="mt-1 block w-full bg-slate-100/50 dark:bg-slate-900/50 border-2 border-slate-400 dark:border-slate-700 rounded-xl p-4 text-slate-600 dark:text-slate-400 cursor-not-allowed shadow-lg">
                                    </div>

                                    <div>
                                        <label for="bio" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
                                        <textarea v-model="localProfile.bio" name="bio" id="bio" rows="3" class="mt-1 block w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-4 ring-cyan-400/20 focus:border-cyan-400 transition-all duration-200 shadow-lg hover:shadow-xl resize-vertical"></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Notifications Section -->
                            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                    Notifications
                                </h2>

                                <p class="mt-1 text-slate-600 dark:text-slate-400">
                                    Choose how you want to be notified.
                                </p>

                                <div class="mt-6 space-y-4">
                                    <div v-for="(enabled, key) in localNotifications" :key="key" class="flex items-center justify-between p-4 rounded-lg bg-slate-100/50 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-300 dark:border-slate-600">
                                        <span class="font-medium text-slate-700 dark:text-slate-300 capitalize">{{ key.replace(/([A-Z])/g, ' $1') }}</span>
                                        <button @click="localNotifications[key] = !localNotifications[key]" type="button" :class="[enabled ? 'bg-cyan-500 shadow-cyan-300' : 'bg-slate-300 dark:bg-slate-600', 'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-slate-400 dark:border-slate-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-cyan-400/20 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 shadow-lg hover:shadow-xl']">
                                            <span :class="[enabled ? 'translate-x-6 bg-white shadow-lg' : 'translate-x-1 bg-slate-600 dark:bg-slate-200', 'pointer-events-none inline-block h-6 w-6 transform rounded-full ring-0 transition-all duration-200 ease-in-out shadow-md']"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                                <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                    Security
                                </h2>

                                <p class="mt-1 text-slate-600 dark:text-slate-400">
                                    Protect your sensitive data with an encryption password.
                                </p>

                                <div class="mt-6 grid grid-cols-1 gap-y-6">
                                    <div>
                                        <label for="new-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                                        <input v-model="localPassword.new" type="password" name="new-password" id="new-password" placeholder="Enter a strong password" class="mt-1 block w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-4 ring-cyan-400/20 focus:border-cyan-400 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    </div>

                                    <div>
                                        <label for="confirm-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                                        <input v-model="localPassword.confirm" type="password" name="confirm-password" id="confirm-password" placeholder="Confirm your new password" class="mt-1 block w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-4 ring-cyan-400/20 focus:border-cyan-400 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    </div>
                                    <p v-if="localPassword.new && localPassword.new !== localPassword.confirm" class="text-sm text-red-500 dark:text-red-400 mt-2 p-3 bg-red-500/10 dark:bg-red-500/20 border border-red-400 dark:border-red-500 rounded-lg">
                                        Passwords do not match.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Action Bar -->
                        <div class="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6">
                            <div class="flex justify-end items-center gap-4">
                                <p v-if="showSuccessMessage" class="text-sm text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 px-4 py-2 rounded-lg border border-green-400 dark:border-green-500 transition-all duration-300 shadow-lg">
                                    Changes saved successfully!
                                </p>

                                <p v-if="Settings.error" class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 px-4 py-2 rounded-lg border border-red-400 dark:border-red-500 shadow-lg">
                                    {{ Settings.error }}
                                </p>

                                <button type="submit" :disabled="Settings.isLoading" class="group inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-8 text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 focus:ring-4 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-lg">
                                    <span v-if="!Settings.isLoading">Save Changes</span>
                                    <span v-else class="flex items-center gap-2">
                                        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
/* Import modules. */
import { ref, watch, onMounted } from 'vue'

import getNetwork from '@/libs/getNetwork.ts'
import { useSettingsStore } from '@/stores/settings'
import type { ProfileSettings, NotificationSettings } from '@/stores/settings'

const Settings = useSettingsStore()

const localProfile = ref<ProfileSettings>({ ...Settings.profile })
const localNotifications = ref<NotificationSettings>({ ...Settings.notifications })
const localPassword = ref({ new: '', confirm: '' })

watch(() => Settings.profile, (newProfile) => {
    localProfile.value = { ...newProfile }
})

watch(() => Settings.notifications, (newNotifications) => {
    localNotifications.value = { ...newNotifications }
})

onMounted(async () => {
    // Load the actual current network from backend
    const currentNetwork = await getNetwork()
    Settings.network = currentNetwork

    // In a real app, you might only call this once in your root App.vue
    // Settings.loadSettings()
})

const handleSaveChanges = async () => {
    await Settings.saveSettings({
        profile: localProfile.value,
        notifications: localNotifications.value,
    })
}

const showSuccessMessage = ref(false)

watch(() => Settings.lastSaved, () => {
    if (Settings.lastSaved) {
        showSuccessMessage.value = true
        setTimeout(() => showSuccessMessage.value = false, 3000)
    }
})
</script>
