<!-- src/screens/Identity/Register.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-slate-100 dark:text-slate-900 mb-4 sm:mb-0">
                Identity Registration
            </h1>

            <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span class="w-[300px]">
                    <span class="text-sky-900 dark:text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-700 dark:text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">

                    <!-- Page Header -->
                    <div class="text-center space-y-2">
                        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                            Register New Identity
                        </h1>

                        <p class="text-lg text-slate-600 dark:text-slate-400">
                            Join the decentralized web with your own unique profile.
                        </p>
                    </div>

                    <!-- Stepper UI -->
                    <div class="flex justify-between items-center">
                        <div class="flex-1 text-center">
                            <span class="block text-sm font-semibold" :class="[step === 'form' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400']">1. Choose Name</span>
                            <div class="mt-2 h-1 rounded-full" :class="[step !== 'form' ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700']"></div>
                        </div>
                        <div class="w-16 h-px bg-slate-200 dark:bg-slate-700 mx-4"></div>
                        <div class="flex-1 text-center">
                            <span class="block text-sm font-semibold" :class="[step === 'review' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400']">2. Review</span>
                            <div class="mt-2 h-1 rounded-full" :class="[step === 'seed' || step === 'loading' ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700']"></div>
                        </div>
                        <div class="w-16 h-px bg-slate-200 dark:bg-slate-700 mx-4"></div>
                        <div class="flex-1 text-center">
                            <span class="block text-sm font-semibold" :class="[step === 'seed' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400']">3. Secure Seed</span>
                            <div class="mt-2 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                    </div>

                    <!-- Step 1: Form -->
                    <div v-if="step === 'form'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <label for="displayName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
                            <input v-model="formData.displayName" type="text" id="displayName" placeholder="e.g., Alice" class="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition">
                        </div>
                        <div>
                            <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                            <div class="relative mt-1">
                                <input v-model="formData.username" type="text" id="username" placeholder="e.g., alice" class="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition pr-16">
                                <span class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 dark:text-slate-400">.dash</span>
                            </div>
                        </div>
                        <div>
                            <label for="bio" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Bio (Optional)</label>
                            <textarea v-model="formData.bio" id="bio" rows="3" class="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400 focus:border-sky-400 dark:focus:border-sky-400 transition" placeholder="Tell us a little about yourself..."></textarea>
                        </div>
                        <div class="pt-4">
                            <button @click="goToReview" class="w-full inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-base font-semibold text-white shadow-sm transition border border-sky-300">Next Step</button>
                        </div>
                    </div>

                    <!-- Step 2: Review -->
                    <div v-if="step === 'review'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">Review Your Details</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-600 dark:text-slate-400">Display Name:</span>
                                <span class="font-semibold text-slate-900 dark:text-slate-100">{{ formData.displayName }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-600 dark:text-slate-400">Username:</span>
                                <span class="font-semibold text-slate-900 dark:text-slate-100">{{ fullUsername }}</span>
                            </div>
                            <div class="flex flex-col text-left">
                                <span class="font-medium text-slate-600 dark:text-slate-400">Bio:</span>
                                <p class="font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ formData.bio || 'Not provided' }}</p>
                            </div>
                        </div>
                        <div class="pt-4 flex gap-4">
                            <button @click="goBackToForm" class="w-full inline-flex justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-3 px-6 text-base font-semibold text-slate-900 dark:text-slate-100 shadow-sm transition border border-slate-200 dark:border-slate-600">Go Back</button>
                            <button @click="createIdentity" class="w-full inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-base font-semibold text-white shadow-sm transition border border-sky-300">Confirm & Create</button>
                        </div>
                    </div>

                    <!-- Step 3: Secure Seed Phrase -->
                    <div v-if="step === 'seed'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <svg class="mx-auto h-12 w-12 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                            <h3 class="text-2xl font-bold text-red-500 dark:text-red-400">CRITICAL: Save Your Seed Phrase!</h3>
                            <p class="text-slate-600 dark:text-slate-400">Write this 12-word phrase down and store it in a secure location. This is the only way to recover your identity. **If you lose it, it is gone forever.**</p>
                        </div>
                        <div class="bg-amber-50 dark:bg-slate-900/50 border-2 border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 text-center font-mono text-lg tracking-wider text-amber-700 dark:text-amber-300">
                            {{ seedPhrase }}
                        </div>
                        <div class="relative flex items-start pt-4">
                            <div class="flex h-6 items-center">
                                <input id="confirmation" v-model="seedPhraseConfirmed" type="checkbox" class="h-4 w-4 rounded border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sky-500 focus:ring-sky-500 dark:focus:ring-sky-400">
                            </div>
                            <div class="ml-3 text-sm leading-6">
                                <label for="confirmation" class="font-medium text-slate-700 dark:text-slate-300">I have written down and secured my seed phrase.</label>
                            </div>
                        </div>
                        <div class="pt-4">
                            <button @click="finishRegistration" :disabled="!seedPhraseConfirmed" class="w-full inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed border border-sky-300">Finish Registration</button>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="step === 'loading'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center space-y-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">Creating Your Identity...</h3>
                        <p class="text-slate-600 dark:text-slate-400">Please wait while we register your new identity on the Dash Platform. This may take a moment.</p>
                        <!-- Simple spinner -->
                        <div class="flex justify-center pt-4">
                            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400 dark:border-sky-400"></div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

// --- State Management ---

// Controls which step of the registration process is visible
const step = ref<'form' | 'review' | 'seed' | 'loading'>('form');

// A reactive object to hold the user's input
const formData = reactive({
    displayName: '',
    username: '',
    bio: '',
});

// A computed property to add the .dash suffix automatically for display
const fullUsername = computed(() => {
    return formData.username ? `${formData.username}.dash` : '';
});

// Placeholder for the generated mnemonic seed phrase
const seedPhrase = ref('apple banana kiwi grape orange mango pineapple strawberry blueberry cherry melon lime');

// State for the confirmation checkbox on the seed phrase step
const seedPhraseConfirmed = ref(false);

// --- Functions ---

const goToReview = () => {
    // Add validation here before proceeding
    if (formData.displayName && formData.username) {
        step.value = 'review';
    } else {
        alert('Display Name and Username are required.');
    }
};

const createIdentity = async () => {
    console.log('Creating identity with the following data:', formData);
    step.value = 'loading';

    // --- TAURI INTEGRATION ---
    // This is where you would invoke your Rust command to create the identity.
    // The command should return the mnemonic seed phrase.
    // For example:
    // const result = await invoke<{ seed: string }>('create_new_identity', { ...formData });
    // seedPhrase.value = result.seed;

    // Simulate a delay for the backend process
    await new Promise(resolve => setTimeout(resolve, 2000));

    step.value = 'seed';
};

const finishRegistration = () => {
    if (!seedPhraseConfirmed.value) {
        alert('Please confirm you have saved your seed phrase.');
        return;
    }
    console.log('Registration finished. User has confirmed seed phrase.');
    // Here you would navigate the user to their new identity screen or dashboard
    // For example: router.push('/identities');
    alert('Identity created successfully!');
};

const goBackToForm = () => {
    step.value = 'form';
};
</script>
