<!-- src/components/studio/Editor.vue -->
<template>
    <div v-if="loading" class="w-full h-full flex items-center justify-center">
        <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p class="mt-2 text-sm text-gray-400">Loading editor...</p>
        </div>
    </div>
    <div v-else-if="error" class="w-full h-full flex items-center justify-center">
        <div class="text-center text-red-400">
            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p>Failed to load editor</p>
            <button @click="loadMonaco" class="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                Retry
            </button>
        </div>
    </div>
    <div v-else ref="editorContainer" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// Define props for the component
const props = defineProps<{
    modelValue: string
    language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown'
    theme?: 'vs' | 'vs-dark' | 'hc-black'
    readOnly?: boolean
}>()

// Define emits
const emit = defineEmits<{
    'update:modelValue': [value: string]
    'editor-mounted': [editor: any]
    'editor-ready': []
}>()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref(false)

// Monaco editor instance
let editor: any = null
let monaco: any = null

// Monaco worker types
// interface MonacoWorker {
//     new(): Worker
// }

// Load Monaco editor lazily
const loadMonaco = async () => {
    try {
        loading.value = true
        error.value = false

        // Dynamically import Monaco
        monaco = await import('monaco-editor')

        // Set up Monaco environment for web workers
        setupMonacoEnvironment()

        // Create editor after Monaco is loaded
        if (editorContainer.value) {
            createEditor()
        }

        loading.value = false
        emit('editor-ready')
    } catch (err) {
        console.error('Failed to load Monaco editor:', err)
        error.value = true
        loading.value = false
    }
}

// Set up Monaco environment for web workers
const setupMonacoEnvironment = () => {
    // Only set up environment once
    if ((window as any).MonacoEnvironment) return

    ;(window as any).MonacoEnvironment = {
        getWorker(_workerId: string, label: string) {
            // Create workers on demand
            const getWorkerModule = (moduleUrl: string, label: string) => {
                return new Worker(new URL(moduleUrl, import.meta.url), {
                    name: label,
                    type: 'module'
                })
            }

            switch (label) {
                case 'json':
                    return getWorkerModule(
                        'monaco-editor/esm/vs/language/json/json.worker.js',
                        'json'
                    )
                case 'css':
                case 'scss':
                case 'less':
                    return getWorkerModule(
                        'monaco-editor/esm/vs/language/css/css.worker.js',
                        'css'
                    )
                case 'html':
                case 'handlebars':
                case 'razor':
                    return getWorkerModule(
                        'monaco-editor/esm/vs/language/html/html.worker.js',
                        'html'
                    )
                case 'typescript':
                case 'javascript':
                    return getWorkerModule(
                        'monaco-editor/esm/vs/language/typescript/ts.worker.js',
                        'typescript'
                    )
                default:
                    return getWorkerModule(
                        'monaco-editor/esm/vs/editor/editor.worker.js',
                        'editor'
                    )
            }
        }
    }
}

// Create the Monaco editor instance
const createEditor = () => {
    if (!monaco || !editorContainer.value) return

    try {
        editor = monaco.editor.create(editorContainer.value, {
            value: props.modelValue,
            language: props.language,
            theme: props.theme || 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false
            },
            readOnly: props.readOnly || false,
            wordWrap: 'on',
            folding: true,
            showFoldingControls: 'always',
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            contextmenu: true,
            formatOnPaste: true,
            formatOnType: true,
            suggestSelection: 'first',
            parameterHints: {
                enabled: true,
                cycle: true
            }
        })

        // Listen for content changes
        editor.onDidChangeModelContent(() => {
            const value = editor.getValue()
            emit('update:modelValue', value)
        })

        // Emit mounted event
        emit('editor-mounted', editor)
    } catch (err) {
        console.error('Failed to create Monaco editor:', err)
        error.value = true
    }
}

// Update editor when props change
watch(() => props.modelValue, (newValue) => {
    if (editor && editor.getValue() !== newValue) {
        editor.setValue(newValue)
    }
})

watch(() => props.language, (newLanguage) => {
    if (editor && monaco) {
        const model = editor.getModel()
        if (model) {
            monaco.editor.setModelLanguage(model, newLanguage)
        }
    }
})

watch(() => props.theme, (newTheme) => {
    if (editor && monaco) {
        monaco.editor.setTheme(newTheme || 'vs-dark')
    }
})

// Lifecycle hooks
onMounted(() => {
    loadMonaco()
})

onBeforeUnmount(() => {
    if (editor) {
        editor.dispose()
        editor = null
    }

    // Clean up Monaco environment if we're the last editor
    if ((window as any).MonacoEnvironment) {
        delete (window as any).MonacoEnvironment
    }
})

// Expose editor instance for parent component
defineExpose({
    getEditor: () => editor,
    getMonaco: () => monaco,
    focus: () => editor?.focus(),
    setValue: (value: string) => editor?.setValue(value),
    getValue: () => editor?.getValue()
})
</script>

<style scoped>
/* Editor container styling */
:deep(.monaco-editor) {
    border-radius: 0.375rem;
    overflow: hidden;
}

:deep(.monaco-editor .margin) {
    background-color: transparent;
}

/* Loading animation */
@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.animate-spin {
    animation: spin 1s linear infinite;
}
</style>
