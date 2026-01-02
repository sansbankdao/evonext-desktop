<!-- src/components/addKey/IdentityList.vue -->
<template>
    <div class="space-y-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Select Identity
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="identity in identities" :key="identity.id"
                 @click="$emit('select-identity', identity)"
                 class="relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                 :class="selectedIdentity?.id === identity.id
                    ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'">

                <div class="flex items-start gap-4">
                    <!-- Avatar -->
                    <div class="flex-shrink-0">
                        <div class="size-12 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold">
                            {{ getIdentityInitial(identity) }}
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {{ getIdentityDisplayName(identity) }}
                        </h3>

                        <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {{ identity.username || identity.id?.slice(0, 16) + '...' }}
                        </p>

                        <!-- Key Badges -->
                        <div class="mt-2 flex flex-wrap gap-1">
                            <span v-for="(key, index) in limitedKeys(identity.publicKeys)" :key="index"
                                  :class="getKeyBadgeClass(key)"
                                  class="text-xs px-2 py-1 rounded-full">
                                {{ getKeyTypeShort(key) }}
                            </span>

                            <span v-if="hasMoreKeys(identity.publicKeys)"
                                  class="text-xs text-slate-500 dark:text-slate-400">
                                +{{ getAdditionalKeysCount(identity.publicKeys) }} more
                            </span>
                        </div>
                    </div>

                    <!-- Selection Indicator -->
                    <div v-if="selectedIdentity?.id === identity.id" class="flex-shrink-0">
                        <div class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Missing Transfer Key Warning -->
                <div v-if="!hasTransferKey(identity) && showMissingWarning"
                     class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                        <span class="text-sm font-semibold">
                            Missing TRANSFER Key
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IIdentity, IPublicKey } from '@/types'

defineProps<{
    identities: IIdentity[]
    selectedIdentity?: IIdentity | null
    showMissingWarning?: boolean
}>()

defineEmits<{
    'select-identity': [identity: IIdentity]
}>()

const getIdentityInitial = (identity: IIdentity): string => {
    const name = identity.displayName || identity.username || 'ID'
    return name.charAt(0).toUpperCase()
}

const getIdentityDisplayName = (identity: IIdentity): string => {
    if (identity.displayName) return identity.displayName
    if (identity.username) return identity.username.split('.')[0] || 'Unnamed Identity'
    return 'Unnamed Identity'
}

// const getPurposeLabel = (purpose: number | string): string => {
//     const purposeNum = typeof purpose === 'string' ? parseInt(purpose) : purpose
//     switch(purposeNum) {
//         case 0: return 'AUTHENTICATION'
//         case 1: return 'TRANSFER'
//         case 2: return 'ENCRYPTION'
//         case 3: return 'TRANSFER'
//         default: return `Purpose ${purpose}`
//     }
// }

// const getSecurityLevelLabel = (level: number | string): string => {
//     const levelNum = typeof level === 'string' ? parseInt(level) : level
//     switch(levelNum) {
//         case 0: return 'MASTER'
//         case 1: return 'CRITICAL'
//         case 2: return 'HIGH'
//         case 3: return 'MEDIUM'
//         case 4: return 'LOW'
//         default: return `Level ${level}`
//     }
// }

// const getSecurityLevelClass = (level: number | string): string => {
//     const levelNum = typeof level === 'string' ? parseInt(level) : level
//     switch(levelNum) {
//         case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
//         case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
//         case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
//         case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
//         case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
//         default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
//     }
// }

const getKeyBadgeClass = (key: IPublicKey): string => {
    const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
    if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (purpose === 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (purpose === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const getKeyTypeShort = (key: IPublicKey): string => {
    const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
    if (purpose === 1 || purpose === 3) return 'TRANSFER'
    if (purpose === 0) return 'AUTH'
    if (purpose === 2) return 'ENCRYPT'
    return 'KEY'
}

const hasTransferKey = (identity: IIdentity): boolean => {
    return identity?.publicKeys?.some((key: IPublicKey) => {
        const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
        return purpose === 1 || purpose === 3
    }) || false
}

const limitedKeys = (keys?: IPublicKey[]): IPublicKey[] => {
    if (!keys) return []
    return keys.slice(0, 3)
}

const hasMoreKeys = (keys?: IPublicKey[]): boolean => {
    return (keys?.length || 0) > 3
}

const getAdditionalKeysCount = (keys?: IPublicKey[]): number => {
    return (keys?.length || 0) - 3
}
</script>
