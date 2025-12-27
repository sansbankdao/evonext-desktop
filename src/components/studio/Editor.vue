<!-- src/components/studio/Editor.vue -->
<template>
    <div ref="editorContainer" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'

/*
 * CRITICAL FIX: Explicitly import workers using Vite's worker suffix.
 * This ensures they are bundled correctly and don't violate CSP or crash WebKit.
 */
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Define the environment globally so Monaco knows how to spawn workers
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker()
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker()
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker()
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker()
        }
        return new editorWorker()
    }
}

// Define props for the component
const props = defineProps<{
    modelValue: string
    language: 'html' | 'css' | 'javascript' | 'markdown'
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
    if (editorContainer.value) {
        editor = monaco.editor.create(editorContainer.value, {
            value: props.modelValue,
            language: props.language,
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            padding: { top: 16 },
            fontSize: 14,
        })
    }
})

// Clean up the editor instance when the component is destroyed
onBeforeUnmount(() => {
    if (editor) {
        editor.dispose()
    }
})
</script>
