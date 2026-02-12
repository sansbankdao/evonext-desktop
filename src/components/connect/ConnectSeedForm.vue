<!-- src/components/connect/ConnectSeedForm.vue -->
<template>
    <div class="space-y-6">
        <!-- 1. Header: Toggle Length & Status -->
        <MnemonicHeader
            v-model:modelValue="localWordCount"
            v-model:showWords="showWords"
            :disabled="isSearching"
            :isValid="validationState.isValid"
            :error="!!validationState.error"
            :filledCount="filledWordCount"
            :totalCount="targetWordCount"
        />

        <!-- 2. The Input Grid -->
        <MnemonicGrid
            v-model="seedWords"
            :show-words="showWords"
            :disabled="isSearching"
            :is-ready="validationState.isValid"
            @submit="handleDiscovery"
            @paste="handlePasteFromGrid"
        />

        <!-- 3. Discover Identity Button -->
        <div v-if="validationState.isValid && !discoveredIdentity">
            <button
                type="button"
                @click="handleDiscovery"
                :disabled="isSearching"
                class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium rounded-xl transition-all duration-200 hover:from-cyan-600 hover:to-cyan-700 hover:shadow-lg disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
            >
                <svg v-if="isSearching" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isSearching ? 'Discovering...' : 'Discover Identity' }}</span>
            </button>
        </div>

        <!-- 4. Result: Found Identity -->
        <IdentityCard
            v-if="discoveredIdentity"
            :identity="discoveredIdentity"
            @connect="connectWithIdentity"
        />

        <!-- 5. Fallback: Manual ID -->
        <ManualIdentityInput
            v-else-if="showManualIdentity"
            v-model="manualIdentityId"
            @confirm="$emit('use-manual-identity')"
            @cancel="showManualIdentity = false"
        />

        <!-- 6. Footer Link -->
        <div v-else-if="!isSearching" class="text-center">
            <button
                @click="showManualIdentity = true"
                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
                Can't discover identity? Enter Identity ID manually
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import { useDebounce } from '@/composables/useDebounce'
import { useMnemonicValidator } from '@/composables/useMnemonic'
import { useNotification } from '@/composables/useNotification'
import type { DiscoveredIdentity } from '@/types'

// Components
import MnemonicHeader from './MnemonicHeader.vue'
import MnemonicGrid from './MnemonicGrid.vue'
import IdentityCard from './IdentityCard.vue'
import ManualIdentityInput from './ManualIdentityInput.vue'

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
    (e: 'update:manualIdentityId', value: string): void
    (e: 'submit'): void
    (e: 'discover-identity'): void
    (e: 'validate', valid: boolean): void
    (e: 'use-manual-identity'): void
    (e: 'paste', words: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
    network: 'testnet',
    isSearching: false
})

const emit = defineEmits<Emits>()

const store = useIdentityStore()
const router = useRouter()
const { showSuccess, showError } = useNotification()
const { validatePhrase, isValidWord, initWordlist } = useMnemonicValidator()

// Initialize wordlist on mount
onMounted(() => {
    initWordlist()
})

// Local State
const localWordCount = ref<'12' | '24'>(props.wordCount)
const seedWords = ref<string[]>([...props.seedWords])
const showWords = ref(false)
const showManualIdentity = ref(false)
const manualIdentityId = ref(props.manualIdentityId)

// Reactive Helpers
const targetWordCount = computed(() => parseInt(localWordCount.value))
const filledWordCount = computed(() => seedWords.value.filter(w => isValidWord(w)).length)
const phrase = computed(() => seedWords.value.join(' '))
const debouncedPhrase = useDebounce(phrase, 300)

// Validation
const validationState = computed(() =>
    validatePhrase(seedWords.value, targetWordCount.value)
)

// Handle paste from MnemonicGrid
const handlePasteFromGrid = (words: string[]) => {
    // Forward the paste event to parent
    emit('paste', words)
}

// Sync Props to Parent
watch(localWordCount, (val) => {
    emit('update:wordCount', val)
    // Resize array
    const newLen = parseInt(val)
    if (seedWords.value.length > newLen) {
        seedWords.value = seedWords.value.slice(0, newLen)
    } else {
        seedWords.value = [...seedWords.value, ...Array(newLen - seedWords.value.length).fill('')]
    }
})

watch(seedWords, (val) => emit('update:seedWords', val), { deep: true })
watch(manualIdentityId, (val) => emit('update:manualIdentityId', val))

// Sync Parent to Props (if changed externally)
watch(() => props.seedWords, (newVal) => {
    if (newVal.join(' ') !== seedWords.value.join(' ')) {
        seedWords.value = [...newVal]
    }
})

// Validation Watcher - REMOVED the paste emission
watch(debouncedPhrase, () => {
    const isValid = validationState.value.isValid
    emit('validate', isValid)
    // REMOVED: if (isValid) emit('paste', seedWords.value) - No longer needed
}, { immediate: true })

// Actions
const handleDiscovery = () => {
    if (validationState.value.isValid) {
        emit('discover-identity')
    }
}

/**
 * Connect using the discovered identity and the seed phrase from the form.
 * This is the correct flow that passes the seed phrase for key derivation.
 */
async function connectWithIdentity() {
    const identity = props.discoveredIdentity
    if (!identity) {
        showError('No identity selected')
        return
    }

    // Get the seed phrase from the form
    const seedPhrase = seedWords.value
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0)
        .join(' ')

    if (!seedPhrase || seedPhrase.split(' ').length < 12) {
        showError('Invalid seed phrase')
        return
    }

    try {
        const result = await store.connectWriteOnlyFromDiscovered(identity, seedPhrase)

        if (result.success) {
            const displayName = identity.dpnsUsername || identity.username || identity.identityId
            showSuccess(`Connected as ${displayName}`)
            router.push('/')
        } else {
            showError(result.error || 'Failed to connect')
        }
    } catch (e: any) {
        console.error('connectWithIdentity failed:', e)
        showError(e?.message || 'Connection failed')
    }
}
</script>
