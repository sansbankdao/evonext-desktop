<!-- src/components/connect/ConnectSeedForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Header: Length Selector + Status Badge + Visibility Toggle -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <!-- Phrase Length -->
            <div class="flex-1">
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                    </svg>
                    Phrase Length
                </label>
                <fieldset class="grid grid-cols-2 gap-3">
                    <label class="flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden"
                        :class="localWordCount === '12'
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'">
                        <input type="radio" value="12" v-model="localWordCount" :disabled="isSearching" class="sr-only disabled:cursor-not-allowed">
                        <span class="font-bold text-base relative z-10" :class="{'opacity-50': isSearching}">12 Words</span>
                    </label>
                    <label class="flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden"
                        :class="localWordCount === '24'
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'">
                        <input type="radio" value="24" v-model="localWordCount" :disabled="isSearching" class="sr-only disabled:cursor-not-allowed">
                        <span class="font-bold text-base relative z-10" :class="{'opacity-50': isSearching}">24 Words</span>
                    </label>
                </fieldset>
            </div>

            <!-- Status Badge & Visibility -->
            <div class="flex items-center gap-2 sm:gap-4">
                <!-- Validation Status Badge -->
                <div class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border font-mono transition-all duration-300"
                    :class="[
                        isReady ? 'bg-emerald-100 dark:bg-emerald-800/40 border-emerald-400 text-emerald-800 dark:text-emerald-200' :
                        isMnemonicError ? 'bg-red-100 dark:bg-red-800/40 border-red-400 text-red-800 dark:text-red-200' :
                        'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
                        isMnemonicError ? 'animate-[shake_0.5s_ease-in-out]' : ''
                    ]"
                    role="status"
                    :aria-label="statusAriaLabel">
                    <svg v-if="isReady" class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="isMnemonicError" class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                    <span class="whitespace-nowrap">
                        {{ validWordCount }} / {{ totalWords }} {{ isReady ? 'Valid!' : isMnemonicError ? 'Invalid' : 'Words' }}
                    </span>
                </div>

                <!-- Visibility Toggle -->
                <button
                    type="button"
                    @click="showWords = !showWords"
                    :disabled="isSearching"
                    class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm h-[46px] sm:h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg v-if="!showWords" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <span class="sr-only">{{ showWords ? 'Hide Words' : 'Show Words' }}</span>
                </button>
            </div>
        </div>

        <!-- Seed Word Inputs Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 relative">
            <div v-for="(_, index) in seedWords" :key="index" class="relative group">
                <!-- Number Tooltip -->
                <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-900/95 dark:bg-slate-800/95 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-md z-10 pointer-events-none border border-slate-700 dark:border-slate-600 hidden sm:inline-block">
                    Word {{ index + 1 }}
                </span>

                <!-- Input -->
                <div class="relative">
                    <input
                        :id="`seed-word-${index}`"
                        :ref="(el) => { if (el) inputs[index] = el as HTMLInputElement }"
                        v-model="seedWords[index]"
                        @input="handleInput(index, $event)"
                        @blur="onInputBlur(index)"
                        @focus="onInputFocus(index)"
                        @keydown="onKeydown(index, $event)"
                        @paste.prevent="handlePaste"
                        :type="showWords ? 'text' : 'password'"
                        autocomplete="off"
                        spellcheck="false"
                        :disabled="isSearching || shakeClasses[index]"
                        :placeholder="showWords ? '' : (index + 1).toString()"
                        class="w-full bg-white dark:bg-slate-800 border-2 rounded-xl pt-10 pb-3 px-4 text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 font-mono text-sm tracking-wide shadow-sm peer z-10 relative disabled:opacity-60 disabled:cursor-not-allowed"
                        :class="[
                            getInputBorderClass(index),
                            'focus:ring-4 focus:ring-opacity-50 focus:shadow-md',
                            shakeClasses[index] ? 'animate-[shake_0.4s_ease-in-out]' : ''
                        ]"
                        :aria-invalid="isWordInvalid(index)"
                        :aria-label="`Seed word ${index + 1}`"
                    />

                    <!-- Reset Shake State after Animation -->
                    <Transition name="fade">
                        <div v-if="shakeClasses[index]"
                            @after-leave="shakeClasses[index] = false"
                            class="absolute inset-0 z-20 pointer-events-none"></div>
                    </Transition>

                    <!-- Live Feedback Icon (absolute overlay) -->
                    <div class="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none transition-opacity duration-200">
                        <!-- Valid Check -->
                        <svg v-if="isValidWord(seedWords[index])" class="w-5 h-5 text-emerald-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        <!-- Error X (only shows if blurred and invalid) -->
                        <svg v-else-if="fieldBlurred[index] && seedWords[index] && !isValidWord(seedWords[index])" class="w-5 h-5 text-red-500 drop-shadow-sm animate-[pulse_2s_infinite]" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </div>

                    <!-- Suggestions Dropdown -->
                    <Transition name="slide-up">
                        <ul v-if="activeIndex === index && suggestions.length > 0"
                            class="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 max-h-48 overflow-auto focus-within:ring-2 focus-within:ring-cyan-500 transition-all"
                            role="listbox">
                            <li v-for="(suggestion, sIndex) in suggestions" :key="suggestion"
                                class="px-3 py-2 text-sm font-mono cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/50 transition-colors flex items-center justify-between group"
                                :class="{'bg-cyan-100 dark:bg-cyan-900/50': sIndex === highlightedIndex}"
                                @mousedown.prevent="selectSuggestion(suggestion)"
                                @mouseenter="highlightedIndex = sIndex"
                                role="option">
                                <span>{{ suggestion }}</span>
                                <svg v-if="sIndex === highlightedIndex" class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                            </li>
                        </ul>
                    </Transition>
                </div>
            </div>
        </div>

        <!-- Paste Helper -->
        <div class="text-xs text-slate-500 dark:text-slate-400 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <svg class="w-4 h-4 inline mr-2 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            You can paste your entire seed phrase into any field. The words will be automatically distributed.
        </div>

        <!-- Step 2: Show Discovered Identity -->
        <div v-if="discoveredIdentity" class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 class="font-bold text-emerald-800 dark:text-emerald-300">Discovered Identity</h3>
            </div>

            <div>
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Identity Details
                </label>

                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Identity ID:</span>
                        <code class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded truncate flex-1">
                            {{ discoveredIdentity.identityId }}
                        </code>
                        <button @click="copyToClipboard(discoveredIdentity.identityId!)" class="ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Balance:</span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                            {{ formatBalance(discoveredIdentity.balance?.toString() || '0') }} Dash
                        </span>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Revision:</span>
                        <span class="text-slate-700 dark:text-slate-300">{{ (discoveredIdentity as any).revision }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Public Keys:</span>
                        <span class="text-slate-700 dark:text-slate-300">{{ (discoveredIdentity.publicKeys || []).length }} found</span>
                    </div>

                    <div v-if="(discoveredIdentity as any).dpnsUsername" class="flex items-center gap-2">
                        <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">DPNS Name:</span>
                        <span class="text-blue-600 dark:text-blue-400 font-medium">{{ (discoveredIdentity as any).dpnsUsername }}</span>
                    </div>
                </div>
            </div>

            <div class="pt-2">
                <button
                    @click.prevent="connectWriteOnlyFromDiscovered"
                    class="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Continue with this Identity
                </button>
            </div>
        </div>

        <!-- Or manually enter Identity ID -->
        <div v-if="showManualIdentity" class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">2</div>

                    <h3 class="font-bold text-slate-700 dark:text-slate-300">
                        Enter Identity Manually
                    </h3>
                </div>

                <button @click="toggleManualIdentity" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Cancel
                </button>
            </div>

            <div>
                <label for="manualIdentityId" class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Identity ID or DPNS Name
                </label>

                <input
                    id="manualIdentityId"
                    type="text"
                    v-model="manualIdentityId"
                    placeholder="e.g., username.dash or 5DbLw..."
                    class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-slate-400/30 focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm"
                    @input="emitUpdate"
                />
            </div>

            <div class="pt-2">
                <button
                    @click.prevent="$emit('use-manual-identity')"
                    :disabled="!manualIdentityId.trim()"
                    class="w-full py-2 px-4 bg-slate-500 hover:bg-slate-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Use this Identity ID
                </button>
            </div>
        </div>

        <!-- Or manually specify identity -->
        <div v-if="!discoveredIdentity && !showManualIdentity" class="text-center">
            <button
                @click="toggleManualIdentity"
                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
                Can't discover identity? Enter Identity ID manually
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import * as bip39 from 'bip39'
import { useIdentityStore } from '@/stores/identity'
import type { DiscoveredIdentity } from '@/types'

interface Props {
    wordCount: '12' | '24'
    seedWords: string[]
    discoveredIdentity?: DiscoveredIdentity | null
    manualIdentityId: string
    network?: 'mainnet' | 'testnet'
    isSearching?: boolean
}

interface Emits {
    (e: 'update:wordCount', count: '12' | '24'): void
    (e: 'update:seedWords', words: string[]): void
    (e: 'paste', words: string[]): void
    (e: 'discover-identity'): void
    (e: 'use-manual-identity'): void
    (e: 'update:manualIdentityId', value: string): void
    (e: 'submit'): void
    (e: 'validate', valid: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
    network: 'testnet',
    isSearching: false
})

const emit = defineEmits<Emits>()

const localWordCount = ref<'12' | '24'>(props.wordCount)

// Initialize seedWords safely using props, defaulting to empty strings if props are partial
const seedWords = ref<string[]>([...props.seedWords])
const showWords = ref(false)
const showManualIdentity = ref(false)
const manualIdentityId = ref(props.manualIdentityId)

// Input Refs for Focus Management
const inputs = ref<(HTMLInputElement | null)[]>([])

// Validation State
const fieldBlurred = ref<boolean[]>([])
const shakeClasses = ref<boolean[]>([])

// BIP39 & Wordlist
let englishWordlist: string[] = []

onMounted(async () => {
    // Await wordlist initialization
    const list = await bip39.wordlists.english
    if (Array.isArray(list)) {
        englishWordlist = list
    }

    // Track field blur/validation
    fieldBlurred.value = Array(seedWords.value.length).fill(false)
    shakeClasses.value = Array(seedWords.value.length).fill(false)
    inputs.value = Array(seedWords.value.length).fill(null)
})

const store = useIdentityStore()
const discoveredIdentity = ref<DiscoveredIdentity | null>(props.discoveredIdentity || null)
const network = ref<'mainnet' | 'testnet'>(props.network || 'testnet')

// Auto-discovery logic via debounce
const phrase = computed(() => seedWords.value.join(' '))
const debouncedPhrase = useDebounce(phrase, 300)
const isMnemonicValid = ref(false)
const mnemonicError = ref('')

// Watcher fixed to handle object structure from useDebounce properly
watch(
    () => debouncedPhrase.value,
    (val: string) => {
        try {
            // Guard against undefined
            if (val === undefined) {
                isMnemonicValid.value = false
                mnemonicError.value = ''
                emit('validate', false)
                return
            }

            // Only validate if full phrase length matches target
            const targetLen = localWordCount.value === '24' ? 24 : 12
            const words = val.trim().split(/\s+/).filter(w => w.length > 0)

            if (words.length !== targetLen) {
                isMnemonicValid.value = false
                mnemonicError.value = 'Incorrect number of words'
                emit('validate', false)
                return
            }

            // Validate full mnemonic
            isMnemonicValid.value = bip39.validateMnemonic(val)
            mnemonicError.value = ''
            emit('validate', isMnemonicValid.value)
        } catch (e) {
            isMnemonicValid.value = false
            mnemonicError.value = 'Invalid checksum'
            emit('validate', false)
        }
    },
    { immediate: true }
)

// Per-word validation
const isValidWord = (word?: string): boolean => {
    if (!word || !word.trim() || englishWordlist.length === 0) return false
    const clean = word.trim().toLowerCase()
    return englishWordlist.includes(clean)
}

const isWordInvalid = (index: number): boolean => {
    return (fieldBlurred.value[index] ?? false) && !isValidWord(seedWords.value[index])
}

const validWordCount = computed(() => seedWords.value.filter(isValidWord).length)
const totalWords = computed(() => seedWords.value.length)
const isReady = computed(() => validWordCount.value === totalWords.value && isMnemonicValid.value)
const isMnemonicError = computed(() => !!mnemonicError.value)

const statusAriaLabel = computed(() =>
    isReady.value ? 'Mnemonic valid and ready' :
    isMnemonicError.value ? mnemonicError.value : `${validWordCount.value}/${totalWords.value} valid words`
)

// Suggestions Logic
const activeIndex = ref(-1)
const highlightedIndex = ref(0)
const suggestions = ref<string[]>([])

const updateSuggestions = (word: string, index: number) => {
    const clean = word.toLowerCase().trim()
    if (englishWordlist.length === 0 || clean.length < 2) {
        suggestions.value = []
        activeIndex.value = -1
        return
    }
    suggestions.value = englishWordlist
        .filter(w => w.startsWith(clean) && w !== clean)
        .slice(0, 5)
    activeIndex.value = index
    highlightedIndex.value = 0
}

const selectSuggestion = (suggestion: string) => {
    const idx = activeIndex.value
    if (idx >= 0 && idx < seedWords.value.length) {
        seedWords.value[idx] = suggestion
        emit('update:seedWords', seedWords.value)
        suggestions.value = []
        activeIndex.value = -1
        nextTick(() => focusNext(idx))
    }
}

// Input Event Handlers
const handleInput = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    if (target) {
        seedWords.value[index] = target.value
        emit('update:seedWords', seedWords.value)

        // Reset shake if typing
        shakeClasses.value[index] = false
        fieldBlurred.value[index] = false

        updateSuggestions(target.value, index)
    }
}

const onInputBlur = (index: number) => {
    fieldBlurred.value[index] = true

    // Trigger validation with visual feedback
    const currentWord = seedWords.value[index]
    if (!isValidWord(currentWord) && (currentWord?.trim().length ?? 0) > 0) {
        shakeClasses.value[index] = true
    } else {
        shakeClasses.value[index] = false
    }

    // Close suggestions
    if (activeIndex.value === index) {
        setTimeout(() => {
            suggestions.value = []
            activeIndex.value = -1
        }, 250)
    }

    // ADDED: Small delay to allow focus transition (auto-advance) to settle
    // This fixes the issue where blurring the last word immediately focuses another,
    // cancelling the blur event effect before the check runs.
    setTimeout(() => {
        if (isReady.value) {
            emit('paste', seedWords.value)
        }
    }, 250)
}

const onInputFocus = (index: number) => {
    // Reset shake state on focus to allow re-triggering
    shakeClasses.value[index] = false
    updateSuggestions(seedWords.value[index] ?? '', index)

    nextTick(() => {
        const input = inputs.value[index]
        if (input) {
            const val = input.value
            input.setSelectionRange(val.length, val.length)
        }
    })
}

const onKeydown = (index: number, event: KeyboardEvent) => {
    const word = seedWords.value[index] ?? ''
    if (!word.trim()) return

    // Suggestion Navigation
    if (suggestions.value.length > 0) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            highlightedIndex.value = (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            if (highlightedIndex.value >= 0 && highlightedIndex.value < suggestions.value.length) {
                selectSuggestion(suggestions.value[highlightedIndex.value]!)
                return
            } else if (event.key === 'Tab') {
                focusNext(index)
                return
            }
        }
        return
    }

    // Auto-advance on Space or Tab if valid word
    const cleanWord = word.trim().toLowerCase()
    if ((event.key === ' ' || event.key === 'Tab') && isValidWord(cleanWord)) {
        event.preventDefault()
        focusNext(index)
        return
    }

    // Enter Key: Submit if valid complete phrase, else advance
    if (event.key === 'Enter') {
        event.preventDefault()
        if (isReady.value) {
            emit('submit')
        } else {
            focusNext(index)
        }
    }
}

const focusNext = (index: number) => {
    const total = seedWords.value.length
    const nextIndex = (index + 1) % total

    nextTick(() => {
        const input = inputs.value[nextIndex]
        if (input) {
            input.focus()
        }
    })
}

// Border Styles
const getInputBorderClass = (index: number) => {
    const word = seedWords.value[index] ?? ''
    const isFocus = activeIndex.value === index
    const isBlurred = fieldBlurred.value[index] ?? false

    if (isFocus) {
        return 'border-cyan-500 ring-4 ring-cyan-500/20 bg-cyan-50/30 dark:bg-cyan-900/20'
    }

    if (isBlurred) {
        if (isValidWord(word)) {
            return 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/30'
        } else if (word.trim().length > 0) {
            return 'border-red-500 bg-red-50/50 dark:bg-red-900/30'
        }
    }

    return 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
}

// Existing watchers/handlers (updated to use localWordCount)
watch(localWordCount, (newCount) => {
    emit('update:wordCount', newCount)

    const count = parseInt(newCount, 10)
    // Initialize ref arrays for new length
    const newBlurState = Array(count).fill(false)
    const newShakeState = Array(count).fill(false)
    const newInputsState = Array(count).fill(null)

    if (seedWords.value.length > count) {
        seedWords.value = seedWords.value.slice(0, count)
    } else if (seedWords.value.length < count) {
        seedWords.value = [...seedWords.value, ...Array(count - seedWords.value.length).fill('')]
    }

    // Re-initialize states based on new length, preserving where possible
    for (let i = 0; i < count; i++) {
        newBlurState[i] = fieldBlurred.value[i] ?? false
        newShakeState[i] = shakeClasses.value[i] ?? false
        newInputsState[i] = inputs.value[i] ?? null
    }

    fieldBlurred.value = newBlurState
    shakeClasses.value = newShakeState
    inputs.value = newInputsState

    emit('update:seedWords', seedWords.value)
})

watch(() => props.seedWords, (newWords) => {
    // Sync from parent
    if (!newWords) return

    if (newWords.length !== seedWords.value.length) {
        seedWords.value = [...newWords]
    } else if (newWords.join(' ') !== seedWords.value.join(' ')) {
        seedWords.value = [...newWords]
    }
}, { deep: true })

watch(() => props.discoveredIdentity, (val) => {
    discoveredIdentity.value = val || null
})

watch(manualIdentityId, (value) => emit('update:manualIdentityId', value))

const handlePaste = (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text') || ''
    const words = pastedText
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

    const totalSlots = seedWords.value.length
    seedWords.value = Array(totalSlots).fill('')

    for (let i = 0; i < Math.min(words.length, totalSlots); i++) {
        seedWords.value[i] = words[i] || ''
    }

    // Mark all fields as blurred to trigger validation visuals
    fieldBlurred.value = Array(totalSlots).fill(true)

    emit('update:seedWords', seedWords.value)
    emit('paste', words)

    // Focus first empty slot
    nextTick(() => {
        const firstEmpty = seedWords.value.findIndex(w => !w.trim())
        const targetIndex = firstEmpty !== -1 ? firstEmpty : 0
        inputs.value[targetIndex]?.focus()
    })
}

const emitUpdate = () => {
    emit('update:seedWords', seedWords.value)
}

async function connectWriteOnlyFromDiscovered() {
    const id = discoveredIdentity.value
    if (!id) return
    try {
        await store.connectWriteOnlyFromDiscovered(
            {
                identityId: id.identityId,
                identityIdx: (id as any).identityIdx ?? 0,
                balance: id.balance ?? null,
                revision: (id as any).revision ?? null,
                username: (id as any).username ?? id.identityId,
                dpnsUsername: (id as any).dpnsUsername ?? null,
                publicKeys: (id as any).publicKeys ?? null,
                publicKeyIds: (id as any).publicKeyIds ?? null
            },
            network.value
        )
    } catch (e) {
        console.error('connectWriteOnlyFromDiscovered failed:', e)
    }
}

const formatBalance = (balance: string): string => {
    if (!balance) return '0.00000000'
    const bigIntBalance = BigInt(balance)
    const dashBalance = Number(bigIntBalance) / 100000000
    return dashBalance.toFixed(8)
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Copied to clipboard:', text)
        })
        .catch(err => {
            console.error('Failed to copy:', err)
        })
}

const toggleManualIdentity = () => {
    showManualIdentity.value = !showManualIdentity.value
}

onUnmounted(() => {
    // Clean up inputs array to avoid potential memory leaks
    inputs.value = []
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.2s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
