<!-- src/components/AddKey/KeyForm.vue (Fixed) -->
<template>
    <div class="space-y-6">
        <div class="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Add TRANSFER Key
            </h4>

            <form @submit.prevent="$emit('add-transfer-key')" class="space-y-4">
                <!-- Key Type Selection -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Key Type
                    </label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <!-- ECDSA_SECP256K1 Option -->
                        <label class="relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200"
                               :class="form.keyType === 'ECDSA_SECP256K1'
                                   ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5'
                                   : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">
                            <input type="radio"
                                   @change="handleKeyTypeChange('ECDSA_SECP256K1')"
                                   :checked="form.keyType === 'ECDSA_SECP256K1'"
                                   class="sr-only">

                            <div class="flex items-center justify-between w-full">
                                <div>
                                    <div class="font-medium text-slate-900 dark:text-slate-100">
                                        ECDSA Secp256k1
                                    </div>
                                    <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Standard cryptographic key
                                    </div>
                                </div>

                                <div v-if="form.keyType === 'ECDSA_SECP256K1'"
                                     class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </label>

                        <!-- ECDSA_HASH160 Option -->
                        <label class="relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200"
                               :class="form.keyType === 'ECDSA_HASH160'
                                   ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5'
                                   : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">
                            <input type="radio"
                                   @change="handleKeyTypeChange('ECDSA_HASH160')"
                                   :checked="form.keyType === 'ECDSA_HASH160'"
                                   class="sr-only">

                            <div class="flex items-center justify-between w-full">
                                <div>
                                    <div class="font-medium text-slate-900 dark:text-slate-100">
                                        ECDSA Hash160
                                    </div>
                                    <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        Compressed public key hash
                                    </div>
                                </div>

                                <div v-if="form.keyType === 'ECDSA_HASH160'"
                                     class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Security Level -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Security Level
                    </label>
                    <select :value="form.securityLevel"
                            @change="handleSecurityLevelChange($event)"
                            class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200">
                        <option value="MASTER">MASTER (0 - Highest)</option>
                        <option value="CRITICAL">CRITICAL (1)</option>
                        <option value="HIGH">HIGH (2)</option>
                        <option value="MEDIUM">MEDIUM (3)</option>
                        <option value="LOW">LOW (4)</option>
                    </select>
                </div>

                <!-- Estimated Cost -->
                <div class="rounded-lg bg-slate-100 dark:bg-slate-800 p-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Estimated Cost
                        </span>
                        <span class="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                            ~100 Credits
                        </span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        This is an estimate. Actual cost may vary based on network conditions.
                    </p>
                </div>

                <!-- Confirmation -->
                <div class="flex items-start gap-3">
                    <input type="checkbox"
                           :checked="form.confirmed"
                           @change="handleConfirmedChange($event)"
                           id="confirm-add"
                           class="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 rounded">

                    <label for="confirm-add" class="text-sm text-slate-700 dark:text-slate-300">
                        I understand that adding this key requires an identity update transaction and will cost a small fee in credits.
                    </label>
                </div>

                <!-- Submit Button -->
                <div class="pt-4">
                    <button type="submit"
                            :disabled="!form.confirmed || isAdding"
                            :class="!form.confirmed || isAdding
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-xl hover:-translate-y-0.5'"
                            class="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-6 text-lg font-bold shadow-lg transition-all duration-200 focus:ring-4 focus:ring-green-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">

                        <span v-if="isAdding">
                            <span class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                            Adding Key...
                        </span>
                        <span v-else>
                            Add TRANSFER Key
                        </span>
                    </button>

                    <p class="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                        This will create and sign an identity update transaction.
                    </p>
                </div>
            </form>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
interface KeyFormState {
    keyType: 'ECDSA_SECP256K1' | 'ECDSA_HASH160'
    securityLevel: 'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    confirmed: boolean
}
interface Props {
    modelValue: KeyFormState
    isAdding?: boolean
}
interface Emits {
    'update:keyType': [value: 'ECDSA_SECP256K1' | 'ECDSA_HASH160']
    'update:securityLevel': [value: 'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW']
    'update:confirmed': [value: boolean]
    'add-transfer-key': []
}
const props = defineProps<Props>()
const emit = defineEmits<Emits>()
// Create a local computed proxy to avoid direct v-model on props
const form = computed({
    get: () => props.modelValue,
    set: (_value) => {
        // Not used directly, but needed for computed
    }
})
// Event handlers with proper typing
const handleKeyTypeChange = (value: 'ECDSA_SECP256K1' | 'ECDSA_HASH160') => {
    emit('update:keyType', value)
}
const handleSecurityLevelChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    if (target) {
        const value = target.value as 'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        emit('update:securityLevel', value)
    }
}
const handleConfirmedChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target) {
        emit('update:confirmed', target.checked)
    }
}
</script>
