<!-- src/components/studio/VibeTerminal.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
    SparklesIcon,
    PaperAirplaneIcon,
    ChevronRightIcon,
    LightBulbIcon
} from '@heroicons/vue/24/outline'
import { marked, type RendererObject, type Tokens } from 'marked'

const props = defineProps<{
    isOpen: boolean,
    contextCode: string,
    activeTab: string
}>()

const emit = defineEmits(['toggle'])

const vibeInput = ref('')
const isThinking = ref(false)
const useReasoning = ref(false)
const chatHistory = ref<{role: string, content: string}[]>([])
const htmlDisplay = ref<string>('')

// --- Resize Logic (Absolute Positioning Strategy) ---
const panelRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)
const panelWidth = ref(400) // Initial width

const MIN_WIDTH = 320
const MAX_WIDTH = 800

function startResize(e: MouseEvent) {
    e.preventDefault()
    isResizing.value = true

    // Attach listeners to the document to catch movements outside the panel
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
}

function onResize(e: MouseEvent) {
    if (!panelRef.value) return

    // Get the viewport width (window.innerWidth)
    const viewportWidth = window.innerWidth

    // Calculate new width:
    // The mouse X position is the left edge of our panel.
    // Panel Width = Viewport Right Edge - Mouse X Position
    const newWidth = viewportWidth - e.clientX

    // Constrain the width
    panelWidth.value = Math.max(MIN_WIDTH, Math.min(newWidth, MAX_WIDTH))
}

function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)

    // Restore cursor and selection
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
}

// --- Copy Button Functionality ---
const copyCodeToClipboard = async (targetId: string) => {
    const preElement = document.getElementById(targetId)
    if (!preElement) return false

    const codeElement = preElement.querySelector('code')
    const textToCopy = codeElement ? codeElement.textContent : preElement.textContent

    try {
        await navigator.clipboard.writeText(textToCopy || '')
        return true
    } catch (err) {
        console.error('Failed to copy:', err)
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy || ''
        document.body.appendChild(textArea)
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        return success
    }
}

const initializeCopyButtons = () => {
    // Remove any existing listeners first to avoid duplicates
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true))
    })

    // Add click handlers to all copy buttons
    document.addEventListener('click', async (e) => {
        // Type-safe check for target
        if (!e.target || !(e.target instanceof Element)) return

        const copyBtn = e.target.closest('.copy-btn')
        if (!copyBtn) return

        const targetId = copyBtn.getAttribute('data-copy-target')
        const container = copyBtn.closest('.code-block-container')
        const successMsg = container?.querySelector('.copy-success')
        const originalText = copyBtn.innerHTML

        if (!container || !successMsg) return

        // Show copying state
        copyBtn.innerHTML = `
            <svg class="w-4 h-4 inline-block mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Copying...
        `
        copyBtn.setAttribute('disabled', 'true')

        // Copy to clipboard
        const success = await copyCodeToClipboard(targetId || '')

        if (success) {
            // Show success message
            copyBtn.classList.add('hidden')
            successMsg.classList.remove('hidden')

            // Reset after 2 seconds
            setTimeout(() => {
                successMsg.classList.add('hidden')
                copyBtn.classList.remove('hidden')
                copyBtn.innerHTML = originalText
                copyBtn.removeAttribute('disabled')
            },1131242000)
        } else {
            // Show error state
            copyBtn.innerHTML = `
                <svg class="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Failed
            `
            copyBtn.classList.add('bg-red-700', 'hover:bg-red-600')
            copyBtn.classList.remove('bg-slate-700', 'hover:bg-slate-600')

            setTimeout(() => {
                copyBtn.innerHTML = originalText
                copyBtn.removeAttribute('disabled')
                copyBtn.classList.remove('bg-red-700', 'hover:bg-red-600')
                copyBtn.classList.add('bg-slate-700', 'hover:bg-slate-600')
            }, 2000)
        }
    })

    // Optional: Add keyboard accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const activeElement = document.activeElement
            if (!activeElement || !(activeElement instanceof Element)) return

            const activeCopyBtn = activeElement.closest('.copy-btn')
            if (activeCopyBtn instanceof HTMLElement) {
                e.preventDefault()
                activeCopyBtn.click()
            }
        }
    })
}

// Initialize copy buttons on mount and after each chat update
onMounted(() => {
    initializeCopyButtons()
})

// Watch for changes to chatHistory and reinitialize copy buttons
watch(chatHistory, async () => {
    // Wait for Vue to update the DOM
    await nextTick()
    initializeCopyButtons()
}, { deep: true })

// Clean up listeners if component is unmounted while resizing
onUnmounted(() => {
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
})

// --- Markdown Parsing ---
const _parseAllSections = (_src: string) => {
    const placeholders: any = []
    _src = _src.replace(/<code>[\s\S]*?<\/code>/g, (match) => {
        placeholders.push(match)
        return '\0'
    })

    const renderer: Partial<RendererObject> = {
        code({ text, lang }: Tokens.Code) {
            const escaped = marked.parseInline(text) as string
            const id = `code-${Math.random().toString(36).substr(2, 9)}`
            return `
                <div class="relative code-block-container group my-3">
                    <pre id="${id}" class="code-block block p-4 bg-slate-900 border-l-4 border-amber-500 rounded-r-md shadow-lg overflow-x-auto font-mono text-sm leading-relaxed">
                        <code class="language-${lang} text-amber-50">${escaped}</code>
                    </pre>
                    <button
                        data-copy-target="${id}"
                        class="copy-btn absolute top-2 right-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-md border border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                        title="Copy to clipboard"
                    >
                        <svg class="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        Copy
                    </button>
                    <div class="copy-success hidden absolute top-2 right-2 px-3 py-1.5 bg-emerald-700 text-emerald-50 text-xs font-medium rounded-md border border-emerald-600 animate-pulse">
                        <svg class="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Copied!
                    </div>
                </div>`
        },
        heading({ text, depth }: Tokens.Heading) {
            const parsedText = marked.parseInline(text) as string
            const sizes = {
                1: 'text-3xl font-bold mb-4 pb-2 border-b border-slate-200',
                2: 'text-2xl font-semibold mb-3 mt-6 text-slate-800',
                3: 'text-xl font-medium mb-2 mt-5 text-slate-700',
                4: 'text-lg font-medium mb-2 mt-4 text-slate-600'
            }
            const sizeClass = sizes[depth as keyof typeof sizes] || 'text-base font-medium'
            return `<h${depth} class="${sizeClass}">${parsedText}</h${depth}>`
        },
        list({ ordered, items }: Tokens.List) {
            const tag = ordered ? 'ol' : 'ul'
            const listClasses = ordered
                ? 'list-decimal pl-6 my-3 space-y-2'
                : 'list-disc pl-5 my-3 space-y-2'

            const listItems = items.map(item => {
                const content = marked.parseInline(item.text) as string
                return `<li class="text-slate-700">${content}</li>`
            }).join('')
            return `<${tag} class="${listClasses}">${listItems}</${tag}>`
        },
        paragraph({ text }: Tokens.Paragraph) {
            const parsedText = marked.parseInline(text) as string
            return `<p class="mb-4 text-slate-600 leading-relaxed">${parsedText}</p>`
        },
        blockquote({ text }: Tokens.Blockquote) {
            const parsedText = marked.parseInline(text) as string
            return `<blockquote class="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-3 italic text-slate-700">${parsedText}</blockquote>`
        },
        table({ header, rows }: Tokens.Table) {
            // Extract text from table cell objects
            const headerCells = header.map(cell =>
                `<th class="px-4 py-3 bg-slate-100 border border-slate-300 font-semibold text-slate-800 text-left">${marked.parseInline(cell.text)}</th>`
            ).join('')

            const bodyRows = rows.map(row => {
                const cells = row.map(cell =>
                    `<td class="px-4 py-2 border border-slate-300 text-slate-700">${marked.parseInline(cell.text)}</td>`
                ).join('')
                return `<tr class="hover:bg-slate-50 transition-colors duration-150">${cells}</tr>`
            }).join('')

            return `<div class="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-sm">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead><tr>${headerCells}</tr></thead>
                    <tbody class="divide-y divide-slate-200">${bodyRows}</tbody>
                </table>
            </div>`
        },
        // Additional renderers for better coverage
        codespan({ text }: Tokens.Codespan) {
            return `<code class="bg-slate-800 text-amber-200 px-1 py-0.5 rounded font-mono text-sm">${text}</code>`
        },
        link({ href, text }: Tokens.Link) {
            const parsedText = marked.parseInline(text) as string
            return `<a href="${href}" class="text-amber-600 hover:text-amber-800 underline hover:underline-offset-2 transition-colors">${parsedText}</a>`
        },
        strong({ text }: Tokens.Strong) {
            const parsedText = marked.parseInline(text) as string
            return `<strong class="font-bold text-slate-900">${parsedText}</strong>`
        },
        em({ text }: Tokens.Em) {
            const parsedText = marked.parseInline(text) as string
            return `<em class="italic text-slate-800">${parsedText}</em>`
        }
    }
    marked.use({ renderer })
    let result = marked.parse(_src) as string
    result = result.replace(/\0/g, () => placeholders.shift())
    return result
}

const displayContent = ((_source: any) => {
    if (!_source) return 'please wait...'
    htmlDisplay.value = _parseAllSections(_source)
    return _parseAllSections(_source)
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
        useReasoning: useReasoning.value
    }

    try {
        const response = await invoke<string>('ask_vibe_terminal', request)
            .catch(err => {
                console.error(err)
                chatHistory.value.push({ role: 'assistant', content: err.message })
            })
        chatHistory.value.push({ role: 'assistant', content: response as string })
    } catch (e) {
        chatHistory.value.push({ role: 'assistant', content: "Error connecting to Vibe Terminal." })
    } finally {
        isThinking.value = false
    }
}
</script>

<template>
    <!-- Relative container is required for absolute positioning -->
    <div class="relative h-full w-full">

        <!-- Slot for underlying content (if any) -->
        <slot />

        <!-- Absolute Positioned Side Panel -->
        <div
            ref="panelRef"
            class="absolute top-0 right-0 h-full z-40 flex"
            :class="[
                'transition-all duration-300 ease-in-out',
                isOpen ? 'translate-x-0' : 'translate-x-full'
            ]"
            :style="{ width: `${panelWidth}px` }"
        >
            <!-- Resize Handle (Left Edge) -->
            <div
                @mousedown="startResize"
                :class="[
                    'w-1.5 h-full flex-shrink-0 cursor-col-resize relative group',
                    'bg-slate-200 dark:bg-slate-700',
                    'hover:bg-cyan-500 dark:hover:bg-cyan-400',
                    'transition-colors duration-150'
                ]"
            >
                <!-- Visual Indicator -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                        :class="[
                            'w-1 h-12 rounded-full transition-colors duration-150',
                            isResizing
                                ? 'bg-cyan-500 dark:bg-cyan-400'
                                : 'bg-slate-400 dark:bg-slate-500 group-hover:bg-white'
                        ]"
                    />
                </div>
            </div>

            <!-- Panel Content -->
            <div class="flex-1 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-hidden">

                <!-- Header -->
                <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <span class="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                        <SparklesIcon class="w-5 h-5 text-cyan-500" />
                        Vibe Terminal
                    </span>
                    <button @click="emit('toggle')" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <ChevronRightIcon class="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <!-- Chat History -->
                <div class="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar">
                    <div v-for="(msg, i) in chatHistory" :key="i" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
                        <div :class="['inline-block px-3 py-2 rounded-2xl max-w-[90%]',
                            msg.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-tr-none'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none']"
                        >
                            <div v-html="displayContent(msg.content)" />
                        </div>
                    </div>

                    <div v-if="isThinking" class="text-left">
                        <div class="inline-block px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse text-cyan-500 font-medium tracking-widest">
                            I'm thinking. Just a moment...
                        </div>
                    </div>
                </div>

                <!-- Input Controls -->
                <div class="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700">
                    <textarea
                        v-model="vibeInput"
                        @keyup.enter.exact="askVibe"
                        :disabled="isThinking"
                        placeholder="Ask Domino..."
                        class="w-full bg-slate-100 dark:bg-slate-900 font-bold text-sky-600 placeholder:text-sky-400 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 pr-10 focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none"
                        rows="2"
                    ></textarea>

                    <div class="flex items-center justify-between mt-2">
                        <button
                            @click="useReasoning = !useReasoning"
                            :class="[
                                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                                useReasoning
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                            ]"
                        >
                            <LightBulbIcon class="w-4 h-4" />
                            <span>Reasoning</span>
                        </button>

                        <button @click="askVibe" class="p-1 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-full">
                            <PaperAirplaneIcon class="w-5 h-5 text-cyan-500" />
                        </button>
                    </div>
                </div>

                <!-- Debug Section -->
                <div class="flex-shrink-0 h-32 p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-1">
                    <div class="text-[10px] text-slate-400 uppercase font-bold">Debug Output</div>
                    <div class="flex-1 p-2 border rounded bg-white dark:bg-slate-900 text-xs font-mono overflow-auto text-slate-500">
                        {{ htmlDisplay || '(empty)' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Floating Action Button (FAB) when closed -->
        <button
            v-if="!isOpen"
            @click="emit('toggle')"
            class="absolute top-4 right-4 z-30 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform hover:scale-110"
        >
            <SparklesIcon class="w-5 h-5 text-cyan-500" />
        </button>

    </div>
</template>
