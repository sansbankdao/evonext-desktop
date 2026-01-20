<!-- src/components/connect/IdentityCard.vue -->
 <template>
    <div class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
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
                        {{ identity.identityId }}
                    </code>
                    <button @click="copyToClipboard(identity.identityId!)" class="ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                        <!-- Copy Icon -->
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Balance:</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                        {{ formatBalance(identity.balance?.toString() || '0') }} Dash
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Revision:</span>
                    <span class="text-slate-700 dark:text-slate-300">{{ (identity as any).revision }}</span>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">Public Keys:</span>
                    <span class="text-slate-700 dark:text-slate-300">{{ (identity.publicKeys || []).length }} found</span>
                </div>

                <div v-if="(identity as any).dpnsUsername" class="flex items-center gap-2">
                    <span class="text-slate-500 dark:text-slate-400 font-medium min-w-[120px]">DPNS Name:</span>
                    <span class="text-blue-600 dark:text-blue-400 font-medium">{{ (identity as any).dpnsUsername }}</span>
                </div>
            </div>
        </div>

        <div class="pt-2">
            <button
                @click.prevent="$emit('connect')"
                class="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Continue with this Identity
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DiscoveredIdentity } from '@/types'

defineProps<{ identity: DiscoveredIdentity }>()
defineEmits<{ (e: 'connect'): void }>()

const formatBalance = (balance: string): string => {
    if (!balance) return '0.00000000'
    const val = Number(BigInt(balance)) / 100000000
    return val.toFixed(8)
}

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)
</script>
