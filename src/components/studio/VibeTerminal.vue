<!-- src/components/studio/VibeTerminal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
    SparklesIcon,
    PaperAirplaneIcon,
    ChevronDownIcon
} from '@heroicons/vue/24/outline'
import { marked } from 'marked'

const props = defineProps<{
    isOpen: boolean,
    contextCode: string,
    activeTab: string
}>()

const emit = defineEmits(['toggle'])

const vibeInput = ref('')
const isThinking = ref(false)
const chatHistory = ref<{role: string, content: string}[]>([])
const htmlDisplay = ref<string>('')

const _parseNonCodeSections = (_src: string) => {
    // Temporarily replace code blocks
    const placeholders: any = []

    _src = _src.replace(/<code>[\s\S]*?<\/code>/g, (match: any) => {
        placeholders.push(match)
        return '\0'
    })

    // Create a custom renderer
    const renderer = {
        // <code>
        code({ tokens }: { tokens: string; depth: number; }): string {
            const text = this.parser.parseInline(tokens)

            return `
                <code class="border-4 border-rose-400 rounded-xl">
                    ${text}
                </code>`
        },

        // h1, h2, h3
        heading({ tokens, depth }: { tokens: string; depth: number; }): string {
            const text = this.parser.parseInline(tokens)
            const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-')

            return `
                <h${depth} class="text-2xl font-bold text-rose-600">
                <a name="${escapedText}" class="anchor" href="#${escapedText}">
                    <span class="header-link"></span>
                </a>
                ${text}
                </h${depth}>`
        },

        // <ol>, <ul>
        list({ tokens }: { tokens: string; depth: number; }): string {
            const text = this.parser.parseInline(tokens)

            return `
                <li class="list-decimal pl-5">
                    ${text}
                </li>`
        }
    }

    marked.use({ renderer })

    // Parse markdown on non-code parts
    let result = marked.parse(_src) as string

    // Restore code blocks
    result = result.replace(/\0/g, () => placeholders.shift())

    return result
}

// function _addTailwindToCodeBlocks(_html: string) {
//     // Step 1: Handle block code <pre><code>
//     _html = _html.replace(
//         /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
//         '<pre class="block my-2 py-3 px-2 bg-slate-800 border border-sky-600 rounded-lg overflow-x-auto text-slate-100 font-mono text-xs"><code$1 class="block">$2</code></pre>'
//     )

//     // Step 2: Handle remaining inline <code> (not inside <pre>)
//     return _html.replace(
//         /<code>([\s\S]*?)<\/code>/g,
//         '<code class="inline-flex px-1 py-0.5 bg-slate-600 border border-sky-400 rounded text-slate-100 font-mono text-xs">$1</code>'
//     )
// }

const displayContent = ((_source: any) => {
    if (!_source) return 'please wait...'
    htmlDisplay.value = _parseNonCodeSections(_source)
    // return _addTailwindToCodeBlocks(_parseNonCodeSections(_source))
    return _parseNonCodeSections(_source)
})

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
        /* Make (remote) Vibe Terminal API request. */
        const response = await invoke<string>('ask_vibe_terminal', request)
            .catch(err => {
                console.error(err)
                chatHistory.value.push({ role: 'assistant', content: err.message })
            })

        /* Add chat history. */
        chatHistory.value.push({ role: 'assistant', content: response as string })
    } catch (e) {
        /* Add chat history. */
        chatHistory.value.push({ role: 'assistant', content: "Error connecting to Vibe Terminal." })
    } finally {
        /* Stop thinking. */
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
                            <div v-html="displayContent(msg.content)" />
                        </div>
                    </div>

                    <div v-if="isThinking" class="text-left">
                        <div class="inline-block px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse text-cyan-500 font-medium tracking-widest">
                            I'm thinking. Just a moment...
                        </div>
                    </div>
                </div>

                <div class="relative mt-auto">
                    <textarea
                        v-model="vibeInput"
                        @keyup.enter.exact="askVibe"
                        :disabled="isThinking"
                        placeholder="Ask Domino..."
                        class="w-full bg-slate-100 dark:bg-slate-900 font-bold text-sky-600 placeholder:text-sky-400 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 pr-10 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                        rows="2"
                    ></textarea>

                    <button @click="askVibe" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full">
                        <PaperAirplaneIcon class="w-5 h-5 text-cyan-500" />
                    </button>
                </div>

                <section>
                    <div class="h-20 p-3 border-2 rounded-xl text-xs font-mono overflow-auto">
                        {{ chatHistory[chatHistory.length - 1]?.content }}
                    </div>
                    <div class="h-20 p-3 border-2 rounded-xl text-xs font-mono overflow-auto">
                        {{ htmlDisplay }}
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
