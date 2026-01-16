<!-- src/screens/Asset.vue -->
<template>
    <main>
        <Header title="Asset Manager" />

        <section>
            <p>
                Coming soon...
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
