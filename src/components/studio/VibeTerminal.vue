<!-- src/components/studio/VibeTerminal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
    SparklesIcon,
    PaperAirplaneIcon,
    ChevronDownIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
    isOpen: boolean,
    contextCode: string,
    activeTab: string
}>()

const emit = defineEmits(['toggle'])

const vibeInput = ref('')
const isThinking = ref(false)
const chatHistory = ref<{role: string, content: string}[]>([])

async function askVibe() {
    if (!vibeInput.value || isThinking.value) return

    const userPrompt = vibeInput.value
    chatHistory.value.push({ role: 'user', content: userPrompt })
    vibeInput.value = ''
    isThinking.value = true

    const request = {
        convoid: props.activeTab,
        context: props.contextCode,
        prompt: userPrompt,
    }

    try {
        const response = await invoke<string>('ask_vibe_terminal', request)
        chatHistory.value.push({ role: 'assistant', content: response })
    } catch (e) {
        chatHistory.value.push({ role: 'assistant', content: "Error connecting to Vibe Terminal." })
    } finally {
        isThinking.value = false
    }
}
</script>

<template>
    <div class="border-b border-slate-200 dark:border-slate-700">
        <button @click="emit('toggle')" class="w-full flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <span class="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <SparklesIcon class="w-5 h-5 text-cyan-500" />
                Vibe Terminal
            </span>
            <ChevronDownIcon :class="['w-5 h-5 transition-transform', isOpen && 'rotate-180']" />
        </button>

        <div :class="['overflow-hidden transition-all duration-500 ease-in-out', isOpen ? 'max-h-[600px]' : 'max-h-0']">
            <div class="p-4 flex flex-col h-[450px]">
                <div class="flex-1 overflow-y-auto space-y-4 mb-4 text-sm pr-2 custom-scrollbar">
                    <div v-for="(msg, i) in chatHistory" :key="i" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
                        <div :class="['inline-block px-3 py-2 rounded-2xl max-w-[90%]',
                            msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none']">
                            {{ msg.content }}
                        </div>
                    </div>
                    <div v-if="isThinking" class="text-left">
                        <div class="inline-block px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse text-cyan-500 font-medium">
                            Thinking...
                        </div>
                    </div>
                </div>

                <div class="relative mt-auto">
                    <input v-model="vibeInput" @keyup.enter="askVibe" :disabled="isThinking" type="text" placeholder="Ask Domino..."
                        class="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 pr-10 focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
                    <button @click="askVibe" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full">
                        <PaperAirplaneIcon class="w-5 h-5 text-cyan-500" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
