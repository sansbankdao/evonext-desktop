<template>
    <div ref="editorContainer" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'

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
