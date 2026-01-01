<!-- src/components/AddKey/IdentityDetail.vue -->
<template>
    <div v-if="identity" class="space-y-6">
        <div class="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 p-6">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Selected Identity Details
            </h3>

            <div class="space-y-4">
                <!-- Identifier -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Identifier
                    </label>
                    <div class="font-mono text-sm bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-lg truncate">
                        {{ identity.id }}
                    </div>
                </div>

                <!-- Current Keys -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Current Keys
                    </label>
                    <div class="space-y-2">
                        <div v-for="(key, index) in identity.publicKeys || []"
                             :key="getKeyIdentifier(key, index)"
                             class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-slate-900 dark:text-slate-100">
                                        {{ getPurposeLabel(key.purpose) }}
                                    </span>
                                    <span :class="getSecurityLevelClass(key.securityLevel)"
                                          class="px-2 py-0.5 text-xs rounded-full">
                                        {{ getSecurityLevelLabel(key.securityLevel) }}
                                    </span>
                                </div>
                                <div class="text-xs text-slate-500 dark:text-slate-400">
                                    {{ key.type || key.keyType }}
                                </div>
                            </div>

                            <div class="text-right">
                                <div v-if="key.readOnly" class="text-xs text-amber-600 dark:text-amber-400">
                                    Read Only
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transfer Key Status -->
                <template v-if="hasTransferKey !== undefined">
                    <div v-if="hasTransferKey" class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                        <div class="flex items-center gap-3">
                            <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 class="font-semibold text-green-800 dark:text-green-300">
                                    TRANSFER Key Already Present
                                </h4>
                                <p class="text-sm text-green-700 dark:text-green-400">
                                    This identity already has a TRANSFER key, so sending transactions is already enabled.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div v-else class="rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-2 border-amber-400/30 p-6">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0">
                                <div class="rounded-full bg-amber-500/20 p-3">
                                    <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>

                            <div class="flex-1">
                                <h4 class="text-lg font-semibold text-amber-800 dark:text-amber-300">
                                    TRANSFER Key Required
                                </h4>

                                <p class="mt-2 text-amber-700 dark:text-amber-400">
                                    This identity is missing a TRANSFER key. Without it, you cannot send transactions. Adding a TRANSFER key will require a small fee for the identity update.
                                </p>

                                <div class="mt-4 space-y-3">
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">
                                            Enables sending credits and tokens
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">
                                            Requires an identity update transaction
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="size-2 rounded-full bg-amber-500"></div>
                                        <span class="text-amber-700 dark:text-amber-300">
                                            Costs a small fee in credits
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import type { IPublicKey } from '@/types'
interface Identity {
    id: string
    identity_idx: number
    username?: string
    display_name?: string
    revision?: number | bigint
    publicKeys?: IPublicKey[]
    [key: string]: any
}
defineProps<{
    identity?: Identity | null
    hasTransferKey?: boolean
}>()
const getKeyIdentifier = (key: IPublicKey, index: number): string => {
    const purpose = typeof key.purpose === 'string' ? key.purpose : key.purpose.toString()
    const securityLevel = typeof key.securityLevel === 'string' ? key.securityLevel : key.securityLevel.toString()
    return `${purpose}-${securityLevel}-${key.keyType}-${index}`
}
const getPurposeLabel = (purpose: number | string): string => {
    const purposeNum = typeof purpose === 'string' ? parseInt(purpose) : purpose
    switch(purposeNum) {
        case 0: return 'AUTHENTICATION'
        case 1: return 'TRANSFER'
        case 2: return 'ENCRYPTION'
        case 3: return 'TRANSFER'
        default: return `Purpose ${purpose}`
    }
}
const getSecurityLevelLabel = (level: number | string): string => {
    const levelNum = typeof level === 'string' ? parseInt(level) : level
    switch(levelNum) {
        case 0: return 'MASTER'
        case 1: return 'CRITICAL'
        case 2: return 'HIGH'
        case 3: return 'MEDIUM'
        case 4: return 'LOW'
        default: return `Level ${level}`
    }
}
const getSecurityLevelClass = (level: number | string): string => {
    const levelNum = typeof level === 'string' ? parseInt(level) : level
    switch(levelNum) {
        case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
        case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
}
</script>
