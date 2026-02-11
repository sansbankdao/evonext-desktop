<!-- src/screens/Studio.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import Editor from '@/components/studio/Editor.vue'
import VibeTerminal from '@/components/studio/VibeTerminal.vue'
import PublishingManager from '@/components/studio/PublishingManager.vue'
import DevicePreview from '@/components/studio/DevicePreview.vue' // Assume existing refactor

const activeTab = ref('readme')
const activeAccordion = ref('vibe')

const htmlCode = ref('<!-- HTML here -->')
const jsCode = ref('// JS here')
const cssCode = ref('/* CSS here */')

const currentContext = computed(() => {
    if (activeTab.value === 'html') return htmlCode.value
    if (activeTab.value === 'js') return jsCode.value
    if (activeTab.value === 'css') return cssCode.value
    return ""
})

const tabs = [
    { key: 'readme', name: 'README' },
    { key: 'html', name: 'HTML' },
    { key: 'js', name: 'SCRIPT' },
    { key: 'css', name: 'STYLE' },
]
</script>

<template>
    <main class="bg-gray-50 dark:bg-slate-900 h-screen flex flex-col rounded-3xl overflow-hidden">
        <div class="flex flex-1 overflow-hidden">
            <!-- Left Side: Editor -->
            <section class="flex-1 flex flex-col min-w-0">
                <div class="flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
                        :class="['px-4 py-3 text-sm font-medium', activeTab === tab.key ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-slate-600']">
                        {{ tab.name }}
                    </button>
                </div>

                <div class="relative flex-grow bg-white dark:bg-slate-800">
                    <div v-show="activeTab === 'readme'" class="p-4">README Content</div>
                    <Editor v-show="activeTab === 'html'" language="html" v-model="htmlCode" />
                    <Editor v-show="activeTab === 'js'" language="javascript" v-model="jsCode" />
                    <Editor v-show="activeTab === 'css'" language="css" v-model="cssCode" />
                </div>
            </section>

            <!-- Right Side: Accordions -->
            <section class="w-[450px] shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
                <VibeTerminal
                    :isOpen="activeAccordion === 'vibe'"
                    @toggle="activeAccordion = 'vibe'"
                    :contextCode="currentContext"
                    :activeTab="activeTab"
                />
                <PublishingManager
                    :isOpen="activeAccordion === 'publish'"
                    @toggle="activeAccordion = 'publish'"
                />
                <DevicePreview
                    :isOpen="activeAccordion === 'preview'"
                    @toggle="activeAccordion = 'preview'"
                />
            </section>
        </div>
    </main>
</template>
