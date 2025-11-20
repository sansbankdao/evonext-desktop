<template>
    <main class="bg-slate-900 font-sans text-slate-200 h-screen flex flex-col">
        <div class="flex flex-1 overflow-hidden">
            <!-- Main Editor Section -->
            <section class="flex-1 flex flex-col min-w-0">
                <!-- Tabs -->
                <div class="flex items-center bg-slate-900 border-b border-slate-700 flex-shrink-0">
                    <button
                        v-for="tab in tabs"
                        :key="tab.key"
                        @click="activeTab = tab.key"
                        :class="[
                            'px-4 py-3 text-sm font-medium',
                            activeTab === tab.key
                                ? 'border-b-2 border-cyan-400 text-cyan-400'
                                : 'text-slate-400 hover:bg-slate-800'
                        ]"
                    >
                        {{ tab.name }}
                    </button>
                </div>

                <!-- Editor Panes -->
                <div class="relative flex-grow bg-slate-800">
                    <div v-show="activeTab === 'project'" class="absolute inset-0 p-6 text-slate-300">
                        <h2 class="text-xl font-bold mb-4">Welcome to 'My 1st Mini App'</h2>
                        <p>This is where you can edit project settings, metadata, or a README.</p>
                    </div>
                    <div v-show="activeTab === 'html'" class="absolute inset-0">
                        <Editor language="html" v-model="htmlCode" />
                    </div>
                    <div v-show="activeTab === 'css'" class="absolute inset-0">
                        <Editor language="css" v-model="cssCode" />
                    </div>
                    <div v-show="activeTab === 'js'" class="absolute inset-0">
                        <Editor language="javascript" v-model="jsCode" />
                    </div>
                </div>
            </section>

            <!-- Preview & Publishing Section -->
            <section class="w-[450px] shrink-0 border-l border-slate-700 bg-slate-800 flex flex-col overflow-y-auto">
                <div class="w-full">
                    <!-- Device Preview Accordion -->
                    <div class="border-b border-slate-700">
                        <button @click="activeAccordion = 'preview'" class="w-full flex justify-between items-center p-4 hover:bg-slate-700/50">
                            <span class="font-semibold text-white">Device Preview</span>
                            <div class="flex items-center gap-4 ml-auto">
                                <button title="Run" class="text-slate-400 hover:text-white"><PlayIcon class="w-5 h-5" /></button>
                                <button title="Options" class="text-slate-400 hover:text-white"><Cog6ToothIcon class="w-5 h-5" /></button>
                                <ChevronDownIcon :class="['w-5 h-5 transition-transform', activeAccordion === 'preview' && 'rotate-180']" />
                            </div>
                        </button>
                        <div :class="['overflow-hidden transition-all duration-500 ease-in-out', activeAccordion === 'preview' ? 'max-h-[800px]' : 'max-h-0']">
                            <div class="p-6 flex flex-col items-center">
                                <div class="w-full max-w-sm h-[700px] bg-slate-900 rounded-[40px] p-4 border-4 border-slate-700 shadow-2xl">
                                    <div class="w-full h-full bg-white rounded-3xl overflow-hidden">
                                        <iframe title="Preview" sandbox="allow-scripts" class="w-full h-full border-none"></iframe>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Publishing Manager Accordion -->
                    <div>
                        <button @click="activeAccordion = 'publish'" class="w-full flex justify-between items-center p-4 hover:bg-slate-700/50">
                            <span class="font-semibold text-white">Publishing Manager</span>
                             <ChevronDownIcon :class="['w-5 h-5 transition-transform', activeAccordion === 'publish' && 'rotate-180']" />
                        </button>
                         <div :class="['overflow-hidden transition-all duration-500 ease-in-out', activeAccordion === 'publish' ? 'max-h-[800px]' : 'max-h-0']">
                            <div class="p-4">
                               <div class="mt-2 text-slate-300 bg-slate-900/50 rounded-lg space-y-4 p-4">
                                    <h3 class="text-lg font-bold text-white mb-2">Publish to Dash Platform</h3>
                                    <p class="text-sm text-slate-400 mb-4">Deploy your mini app by creating documents on Dash Drive.</p>
                                    <div class="space-y-3 text-sm">
                                        <div class="bg-slate-800 p-2 rounded"><strong>EvoApp:</strong> My 1st Mini App</div>
                                        <div class="bg-slate-800 p-2 rounded"><strong>EvoFile:</strong> index.html</div>
                                    </div>
                                    <button class="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg">
                                        Publish Version 1.0.0
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    // DocumentDuplicateIcon,
    PlayIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
} from '@heroicons/vue/24/outline'
import Editor from '@/components/Editor.vue'

// State Management
const activeTab = ref('project')
const activeAccordion = ref('preview')

const tabs = [
    { key: 'project', name: 'My 1st Mini App' },
    { key: 'html', name: 'HTML' },
    { key: 'css', name: 'STYLE' },
    { key: 'js', name: 'SCRIPT' },
]

// Sample Code for Editors
const htmlCode = ref(`<h1 class="text-2xl font-bold text-sky-600">Hello, EvoNext!</h1>
<p>This is your first mini app.</p>`)
const cssCode = ref(`body {
    padding: 1rem;
    font-family: sans-serif;
}`)
const jsCode = ref(`console.log('My 1st Mini App loaded!');`)
</script>
