<!-- src/screens/launcher/Simple.vue -->
<template>
    <main>
        <Header title="Simple Launcher" />

        <section>
            <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Corrupti praesentium adipisci, sint cupiditate magnam quasi nesciunt cum quos sed beatae recusandae voluptates dicta minima pariatur ipsum iste. Eius, ipsam quibusdam!
            </p>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
// import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'

/* Initialize app router. */
// const router = useRouter()

const greeting = ref()

const init = async () => {
    greeting.value = 'hi there'
}

// 2. Set up the listener when the component is mounted
onMounted(async () => {
    init()
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    // TODO
})
</script>
