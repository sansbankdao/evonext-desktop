<!-- src/components/connect/ManualIdentityInput.vue -->
 <template>
    <div class="space-y-4 p-4 bg-surface-raise bg-surface-card/30 rounded-control border border-edge">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-surface-raise text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 class="font-bold text-content">Enter Identity Manually</h3>
            </div>
            <button @click="$emit('cancel')" class="text-sm text-content-soft hover:text-content dark:hover:text-content-faint">Cancel</button>
        </div>

        <div>
            <label class="text-sm font-bold text-content mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-content-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Identity ID or DPNS Name
            </label>
            <input
                type="text"
                :value="modelValue"
                @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                placeholder="e.g., username.dash or 5DbLw..."
                class="w-full px-4 py-3 bg-surface-card border-2 border-edge  rounded-control text-content placeholder-content-faint dark:placeholder-content-faint focus:ring-4 focus:ring-edge/30 focus:border-edge transition-all font-mono text-sm"
            />
        </div>

        <div class="pt-2">
            <button
                @click.prevent="$emit('confirm')"
                :disabled="!modelValue?.trim()"
                class="w-full py-2 px-4 bg-surface-raise hover:bg-surface-raise text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Use this Identity ID
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{
    (e: 'update:modelValue', val: string): void
    (e: 'confirm'): void
    (e: 'cancel'): void
}>()
</script>
