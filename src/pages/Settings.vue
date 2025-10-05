<!-- src/pages/Home.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                App Settings
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

                    <!-- Page Header -->
                    <div class="space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Settings</h1>
                        <p class="text-lg text-slate-400">Manage your application preferences and profile.</p>
                    </div>

                    <!-- Appearance Section -->
                    <div class="bg-slate-800 p-6 rounded-xl">
                        <h2 class="text-xl font-semibold text-white">Appearance</h2>
                        <p class="mt-1 text-slate-400">Customize the look and feel of the app.</p>
                        <div class="mt-6">
                            <fieldset>
                                <legend class="sr-only">Theme</legend>
                                <div class="flex items-center gap-4">
                                    <!-- System Theme Option -->
                                    <button @click="Settings.setTheme('system')" :class="['flex-1 text-center p-4 rounded-lg border-2 transition', Settings.theme === 'system' ? 'border-cyan-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500']">
                                        <span class="font-medium text-white">System</span>
                                    </button>
                                    <!-- Light Theme Option -->
                                    <button @click="Settings.setTheme('light')" :class="['flex-1 text-center p-4 rounded-lg border-2 transition', Settings.theme === 'light' ? 'border-cyan-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500']">
                                        <span class="font-medium text-white">Light</span>
                                    </button>
                                    <!-- Dark Theme Option -->
                                    <button @click="Settings.setTheme('dark')" :class="['flex-1 text-center p-4 rounded-lg border-2 transition', Settings.theme === 'dark' ? 'border-cyan-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500']">
                                        <span class="font-medium text-white">Dark</span>
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <!-- Profile & Notifications Form -->
                    <form @submit.prevent="handleSaveChanges">
                        <div class="flex flex-col gap-8">
                            <!-- Profile Section -->
                            <div class="bg-slate-800 p-6 rounded-xl">
                                <h2 class="text-xl font-semibold text-white">Profile</h2>
                                <p class="mt-1 text-slate-400">This information will be displayed publicly.</p>
                                <div class="mt-6 grid grid-cols-1 gap-y-6">
                                    <div>
                                        <label for="displayName" class="block text-sm font-medium text-slate-300">Display Name</label>
                                        <input v-model="localProfile.displayName" type="text" name="displayName" id="displayName" class="mt-1 block w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition">
                                    </div>
                                    <div>
                                        <label for="username" class="block text-sm font-medium text-slate-300">Username</label>
                                        <input v-model="localProfile.username" type="text" name="username" id="username" disabled class="mt-1 block w-full bg-slate-900 border-slate-700 rounded-lg p-3 text-slate-400 cursor-not-allowed">
                                    </div>
                                    <div>
                                        <label for="bio" class="block text-sm font-medium text-slate-300">Bio</label>
                                        <textarea v-model="localProfile.bio" name="bio" id="bio" rows="3" class="mt-1 block w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Notifications Section -->
                            <div class="bg-slate-800 p-6 rounded-xl">
                                <h2 class="text-xl font-semibold text-white">Notifications</h2>
                                <p class="mt-1 text-slate-400">Choose how you want to be notified.</p>
                                <div class="mt-6 space-y-4">
                                    <div v-for="(enabled, key) in localNotifications" :key="key" class="flex items-center justify-between">
                                        <span class="font-medium text-slate-300 capitalize">{{ key.replace(/([A-Z])/g, ' $1') }}</span>
                                        <button @click="localNotifications[key] = !localNotifications[key]" type="button" :class="[enabled ? 'bg-cyan-500' : 'bg-slate-600', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900']">
                                            <span :class="[enabled ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Bar -->
                        <div class="mt-8 pt-5 border-t border-slate-700">
                            <div class="flex justify-end items-center gap-4">
                                <p v-if="showSuccessMessage" class="text-sm text-green-400 transition-opacity duration-300">Changes saved successfully!</p>
                                <p v-if="Settings.error" class="text-sm text-red-400">{{ Settings.error }}</p>
                                <button type="submit" :disabled="Settings.isLoading" class="inline-flex justify-center rounded-lg bg-cyan-500 py-2 px-6 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span v-if="!Settings.isLoading">Save Changes</span>
                                    <span v-else>Saving...</span>
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
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { ProfileSettings, NotificationSettings } from '@/stores/settings'

const Settings = useSettingsStore()

// Use local state for form bindings to avoid updating the store on every keystroke.
// This also makes a "Reset" or "Cancel" feature possible.
const localProfile = ref<ProfileSettings>({ ...Settings.profile })
const localNotifications = ref<NotificationSettings>({ ...Settings.notifications })

// Keep local state in sync if the store changes from another source
watch(() => Settings.profile, (newProfile) => {
    localProfile.value = { ...newProfile }
})

watch(() => Settings.notifications, (newNotifications) => {
    localNotifications.value = { ...newNotifications }
})

// Load initial settings when the component is mounted
onMounted(() => {
    // In a real app, you might only call this once in your root App.vue
    // Settings.loadSettings();
})

const handleSaveChanges = async () => {
    await Settings.saveSettings({
        profile: localProfile.value,
        notifications: localNotifications.value,
    })
}

// A ref to show a temporary success message
const showSuccessMessage = ref(false)

watch(() => Settings.lastSaved, () => {
    if (Settings.lastSaved) {
        showSuccessMessage.value = true
        setTimeout(() => showSuccessMessage.value = false, 3000)
    }
})
</script>
