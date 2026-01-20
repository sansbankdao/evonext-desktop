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
        />

        <!-- 3. Result: Found Identity -->
        <IdentityCard
            v-if="discoveredIdentity"
            :identity="discoveredIdentity"
            @connect="connectWithIdentity"
        />

        <!-- 4. Fallback: Manual ID -->
        <ManualIdentityInput
            v-else-if="showManualIdentity"
            v-model="manualIdentityId"
            @confirm="$emit('use-manual-identity')"
            @cancel="showManualIdentity = false"
        />

        <!-- 5. Footer Link -->
        <div v-else class="text-center">
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
import { ref, watch, computed } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useDebounce } from '@/composables/useDebounce'
import { useMnemonicValidator } from '@/composables/useMnemonic'
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
const { validatePhrase, isValidWord } = useMnemonicValidator()

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

// Validation Watcher
watch(debouncedPhrase, () => {
    const isValid = validationState.value.isValid
    emit('validate', isValid)
    if (isValid) emit('paste', seedWords.value)
}, { immediate: true })

// Actions
const handleDiscovery = () => {
    if (validationState.value.isValid) {
        emit('submit')
    }
}

async function connectWithIdentity() {
    const id = props.discoveredIdentity
    if (!id) return

    // Fix applied previously: prioritize DPNS name
    const effectiveUsername = (id as any).dpnsUsername || (id as any).username || id.identityId

    try {
        await store.connectWriteOnlyFromDiscovered(
            {
                identityId: id.identityId,
                identityIdx: (id as any).identityIdx ?? 0,
                balance: id.balance ?? null,
                revision: (id as any).revision ?? null,
                username: effectiveUsername,
                dpnsUsername: (id as any).dpnsUsername ?? null,
                publicKeys: (id as any).publicKeys ?? null,
                publicKeyIds: (id as any).publicKeyIds ?? null
            },
            props.network
        )
    } catch (e) {
        console.error('connectWithIdentity failed:', e)
    }
}
</script>
