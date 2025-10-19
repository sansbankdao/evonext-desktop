<template>
    <RouterView />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const manageUpdater = async () => {
    /* Request check. */
    const update = await check()

    /* Handle update. */
    if (update) {
        console.log(
            `Found update ${update.version} from ${update.date} with notes ${update.body}.`
        )

        let downloaded = 0
        let contentLength = 0

        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall((event) => {
            switch (event.event) {
            case 'Started':
                contentLength = Number(event.data.contentLength)
                console.log(`started downloading ${event.data.contentLength} bytes`)
                break
            case 'Progress':
                downloaded += event.data.chunkLength
                console.log(`downloaded ${downloaded} from ${contentLength}`)
                break
            case 'Finished':
                console.log('download finished')
                break
            }
        })

        console.log('Update installed successfully!')
        await relaunch()
    } else {
        console.log('NO updates found.')
    }
}

/* Initialize (navigation) router. */
const router = useRouter()

let unlisten: UnlistenFn | undefined

// 2. Set up the listener when the component is mounted
onMounted(async () => {
    unlisten = await listen('navigate', (event) => {
        console.log('Navigating to:', event.payload)

        /* Validate event payload. */
        if (typeof event.payload !== 'undefined' && event.payload !== null) {
            /* Go to target. */
            router.push(event.payload)
        }
    })

    manageUpdater()
})

// 4. Clean up the listener when the component is unmounted
onUnmounted(() => {
    if (unlisten) {
        unlisten()
    }
})
</script>

<style>
/* Use for global styles (e.g. scrollbars). */
</style>
