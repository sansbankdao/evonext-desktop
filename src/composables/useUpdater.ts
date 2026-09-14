// src/composables/useUpdater.ts
//
// Centralized Tauri v2 updater state.
//
// Shares one reactive snapshot across the app:
//   - App.vue shows a toast notification on startup when an update is
//     available (with an "Update now" action).
//   - Settings.vue renders the current vs latest version, a manual
//     "Check for updates" button, and the "Update now" button with
//     live download progress.
//
// The Tauri updater plugin (`@tauri-apps/plugin-updater`) talks to the
// manifest endpoint pinned in tauri.conf.json
// (https://manifest.evonext.app/desktop) and verifies the release
// signature against the pinned minisign pubkey BEFORE returning an
// Update object — so a signature failure surfaces here as a check
// error, never as an unverified install.

import { reactive, readonly } from 'vue'
import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getVersion } from '@tauri-apps/api/app'

export type UpdateStatus =
    | 'idle' // no check run yet, or last check found nothing
    | 'checking' // check() in flight
    | 'available' // update found, not yet downloading
    | 'downloading' // downloadAndInstall() in flight
    | 'installing' // download finished, installing
    | 'installed' // install complete; relaunch pending
    | 'error' // last check or install failed (see lastError)

export interface UpdaterState {
    currentVersion: string | null
    latestVersion: string | null
    updateVersion: string | null // version reported by the Update object (may differ from latest on retry)
    updateDate: string | null
    updateBody: string | null
    status: UpdateStatus
    isUpdateAvailable: boolean
    downloadedBytes: number
    contentLength: number
    lastError: string | null
    lastCheckedAt: number | null
}

const state = reactive<UpdaterState>({
    currentVersion: null,
    latestVersion: null,
    updateVersion: null,
    updateDate: null,
    updateBody: null,
    status: 'idle',
    isUpdateAvailable: false,
    downloadedBytes: 0,
    contentLength: 0,
    lastError: null,
    lastCheckedAt: null,
})

// The live Update object is held in module scope so the caller can
// drive download/install without re-checking (which would re-fetch the
// manifest and potentially race a second download).
let pendingUpdate: Update | null = null

async function refreshCurrentVersion(): Promise<void> {
    if (state.currentVersion !== null) return
    try {
        state.currentVersion = await getVersion()
    } catch (err) {
        // getVersion() only fails outside a Tauri runtime (e.g. unit
        // tests). Leave null — the UI degrades to "unknown".
        state.currentVersion = null
        console.warn('[updater] getVersion() failed:', err)
    }
}

function resetProgress(): void {
    state.downloadedBytes = 0
    state.contentLength = 0
}

/**
 * Check the manifest endpoint for a newer release.
 *
 * Resolves to `true` if an update is available, `false` otherwise.
 * Sets `state.status` to `'error'` and `state.lastError` on failure
 * (network error, signature verification failure, etc.).
 *
 * Safe to call repeatedly; each call re-hits the manifest endpoint and
 * replaces any previously-discovered pending update.
 */
export async function checkForUpdate(): Promise<boolean> {
    await refreshCurrentVersion()

    state.status = 'checking'
    state.lastError = null

    try {
        const update = await check()

        state.lastCheckedAt = Date.now()

        if (update) {
            pendingUpdate = update
            state.latestVersion = update.version
            state.updateVersion = update.version
            state.updateDate = update.date ?? null
            state.updateBody = update.body ?? null
            state.isUpdateAvailable = true
            state.status = 'available'
            return true
        }

        // No update available — keep latestVersion in sync with current.
        pendingUpdate = null
        state.latestVersion = state.currentVersion
        state.updateVersion = null
        state.updateDate = null
        state.updateBody = null
        state.isUpdateAvailable = false
        state.status = 'idle'
        return false
    } catch (err) {
        pendingUpdate = null
        state.isUpdateAvailable = false
        state.status = 'error'
        state.lastError = err instanceof Error ? err.message : String(err)
        console.error('[updater] check failed:', err)
        return false
    }
}

function onDownloadEvent(event: DownloadEvent): void {
    switch (event.event) {
    case 'Started':
        state.contentLength = Number(event.data.contentLength) || 0
        state.downloadedBytes = 0
        state.status = 'downloading'
        break
    case 'Progress':
        state.downloadedBytes += Number(event.data.chunkLength) || 0
        break
    case 'Finished':
        state.status = 'installing'
        break
    }
}

/**
 * Download + install the pending update (the one most recently found by
 * `checkForUpdate`). On success, relaunches the app.
 *
 * If no pending update is in scope, rejects with a clear error so the
 * UI can prompt the user to check first.
 */
export async function downloadAndInstallUpdate(): Promise<void> {
    if (!pendingUpdate) {
        state.status = 'error'
        state.lastError =
            'No update has been detected yet. Run "Check for updates" first.'
        throw new Error(state.lastError)
    }

    resetProgress()
    state.status = 'downloading'
    state.lastError = null

    try {
        await pendingUpdate.downloadAndInstall(onDownloadEvent)

        state.status = 'installed'
        // Relaunch so the new binary + bundle take effect immediately.
        await relaunch()
    } catch (err) {
        state.status = 'error'
        state.lastError = err instanceof Error ? err.message : String(err)
        console.error('[updater] downloadAndInstall failed:', err)
        throw err
    }
}

/**
 * Clear the last error and return to idle (used by the Settings UI
 * "dismiss error" affordance).
 */
export function clearError(): void {
    state.lastError = null
    if (state.status === 'error') {
        state.status = state.isUpdateAvailable ? 'available' : 'idle'
    }
}

export function useUpdater() {
    return {
        state: readonly(state),
        checkForUpdate,
        downloadAndInstallUpdate,
        clearError,
    }
}
