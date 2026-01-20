<!-- src/components/connect/ManualIdentityInput.vue -->
 <template>
    <div class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 class="font-bold text-slate-700 dark:text-slate-300">Enter Identity Manually</h3>
            </div>
            <button @click="$emit('cancel')" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
        </div>

        <div>
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Identity ID or DPNS Name
            </label>
            <input
                type="text"
                :value="modelValue"
                @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                placeholder="e.g., username.dash or 5DbLw..."
                class="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-slate-400/30 focus:border-slate-500 transition-all font-mono text-sm"
            />
        </div>

        <div class="pt-2">
            <button
                @click.prevent="$emit('confirm')"
                :disabled="!modelValue?.trim()"
                class="w-full py-2 px-4 bg-slate-500 hover:bg-slate-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
