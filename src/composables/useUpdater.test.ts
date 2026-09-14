// src/composables/useUpdater.test.ts
//
// Unit tests for the centralized Tauri v2 updater composable.
//
// Mocks the three Tauri APIs the composable touches so the test runs
// outside a Tauri runtime:
//   - @tauri-apps/api/app           -> getVersion()
//   - @tauri-apps/plugin-updater    -> check(), Update.downloadAndInstall()
//   - @tauri-apps/plugin-process    -> relaunch()
//
// The composable caches `currentVersion` + the pending Update handle in
// MODULE scope (single app instance), so each test calls
// `vi.resetModules()` + dynamically re-imports the composable to get a
// fresh module — otherwise the singleton state leaks across tests.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// --- Tauri API mocks -------------------------------------------------------
//
// The Update class holds private state; a minimal stub suffices because
// the composable only calls .version, .date, .body, .downloadAndInstall().
const mockDownloadAndInstall = vi.fn()
function makeFakeUpdate(version: string, body?: string, date?: string) {
    return {
        version,
        date: date ?? '2026-09-14T06:32:00Z',
        body: body ?? 'Release notes.',
        downloadAndInstall: mockDownloadAndInstall,
    }
}

const mockCheck = vi.fn()
const mockRelaunch = vi.fn()
const mockGetVersion = vi.fn()

vi.mock('@tauri-apps/plugin-updater', () => ({
    check: (...args: unknown[]) => mockCheck(...args),
}))
vi.mock('@tauri-apps/plugin-process', () => ({
    relaunch: (...args: unknown[]) => mockRelaunch(...args),
}))
vi.mock('@tauri-apps/api/app', () => ({
    getVersion: (...args: unknown[]) => mockGetVersion(...args),
}))

// Dynamically imported per-test (after vi.resetModules) so the
// module-level singleton state (currentVersion cache + pendingUpdate)
// starts fresh for every case.
async function importUpdater() {
    const mod = await import('./useUpdater')
    return mod.useUpdater()
}

describe('useUpdater', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.resetModules()
        vi.clearAllMocks()
        // Default: installed version is older than the latest.
        mockGetVersion.mockResolvedValue('26.9.11')
        mockCheck.mockResolvedValue(null)
        mockDownloadAndInstall.mockResolvedValue(undefined)
        mockRelaunch.mockResolvedValue(undefined)
    })

    it('exposes a readonly state object with the documented shape', async () => {
        const { state } = await importUpdater()
        expect(state).toBeDefined()
        expect(state.status).toBe('idle')
        expect(state.isUpdateAvailable).toBe(false)
        expect(state.currentVersion).toBeNull() // before any check
        expect(state.latestVersion).toBeNull()
        expect(state.lastError).toBeNull()
    })

    it('checkForUpdate() returns false and syncs latestVersion when no update is available', async () => {
        const { state, checkForUpdate } = await importUpdater()

        const available = await checkForUpdate()

        expect(available).toBe(false)
        expect(mockGetVersion).toHaveBeenCalledTimes(1)
        expect(mockCheck).toHaveBeenCalledTimes(1)
        expect(state.currentVersion).toBe('26.9.11')
        expect(state.isUpdateAvailable).toBe(false)
        // No update -> latestVersion mirrors currentVersion (no surprise UX).
        expect(state.latestVersion).toBe('26.9.11')
        expect(state.status).toBe('idle')
        expect(state.lastCheckedAt).not.toBeNull()
    })

    it('checkForUpdate() returns true and populates version/date/notes when an update is available', async () => {
        mockCheck.mockResolvedValue(
            makeFakeUpdate('26.9.13', 'Hotfix batch.', '2026-09-14T06:32:00Z'),
        )

        const { state, checkForUpdate } = await importUpdater()
        const available = await checkForUpdate()

        expect(available).toBe(true)
        expect(state.isUpdateAvailable).toBe(true)
        expect(state.status).toBe('available')
        expect(state.latestVersion).toBe('26.9.13')
        expect(state.updateVersion).toBe('26.9.13')
        expect(state.updateDate).toBe('2026-09-14T06:32:00Z')
        expect(state.updateBody).toBe('Hotfix batch.')
        // Installed version is untouched.
        expect(state.currentVersion).toBe('26.9.11')
    })

    it('checkForUpdate() records the error message and sets status="error" on failure', async () => {
        mockCheck.mockRejectedValue(new Error('signature verification failed'))

        const { state, checkForUpdate } = await importUpdater()
        const available = await checkForUpdate()

        expect(available).toBe(false)
        expect(state.status).toBe('error')
        expect(state.lastError).toBe('signature verification failed')
        expect(state.isUpdateAvailable).toBe(false)
    })

    it('downloadAndInstallUpdate() drives downloadAndInstall and relaunches on success', async () => {
        mockCheck.mockResolvedValue(makeFakeUpdate('26.9.13'))

        const { state, checkForUpdate, downloadAndInstallUpdate } = await importUpdater()
        await checkForUpdate()

        await downloadAndInstallUpdate()

        expect(mockDownloadAndInstall).toHaveBeenCalledTimes(1)
        // The composable relaunches the app after a successful install.
        expect(mockRelaunch).toHaveBeenCalledTimes(1)
        expect(state.status).toBe('installed')
    })

    it('downloadAndInstallUpdate() rejects when no check has run yet', async () => {
        const { state, downloadAndInstallUpdate } = await importUpdater()

        await expect(downloadAndInstallUpdate()).rejects.toThrow(
            /No update has been detected yet/,
        )

        expect(state.status).toBe('error')
        expect(state.lastError).toMatch(/No update has been detected yet/)
        expect(mockDownloadAndInstall).not.toHaveBeenCalled()
        expect(mockRelaunch).not.toHaveBeenCalled()
    })

    it('downloadAndInstallUpdate() records the error and does NOT relaunch on install failure', async () => {
        mockCheck.mockResolvedValue(makeFakeUpdate('26.9.13'))
        mockDownloadAndInstall.mockRejectedValue(new Error('disk full'))

        const { state, checkForUpdate, downloadAndInstallUpdate } = await importUpdater()
        await checkForUpdate()

        await expect(downloadAndInstallUpdate()).rejects.toThrow('disk full')

        expect(state.status).toBe('error')
        expect(state.lastError).toBe('disk full')
        // Crucially: a failed install must NOT relaunch the app.
        expect(mockRelaunch).not.toHaveBeenCalled()
    })

    it('clearError() resets lastError and returns to idle status', async () => {
        mockCheck.mockRejectedValue(new Error('network down'))

        const { state, checkForUpdate, clearError } = await importUpdater()
        await checkForUpdate()

        expect(state.lastError).toBe('network down')
        expect(state.status).toBe('error')

        clearError()

        expect(state.lastError).toBeNull()
        // No update was ever discovered, so we return to idle.
        expect(state.status).toBe('idle')
    })
})
