// src/utils/debugLogger.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useDebugLogger, debugLogger } from './debugLogger'
describe('debugLogger', () => {
    beforeEach(() => {
        const { clear } = useDebugLogger()
        clear()
        // Ensure the window object is initialized for the test scope
        if (typeof window !== 'undefined') {
            (window as any).debugLogs = []
        }
    })
    describe('useDebugLogger composable', () => {
        it('should log messages and maintain length limit', () => {
            const { logs, log } = useDebugLogger()
            log('test message', 'info')
            expect(logs.value.length).toBe(1)
            expect(logs.value[0].message).toBe('test message')
            // Fill beyond limit (50)
            for (let i = 0; i < 60; i++) {
                log(`msg ${i}`)
            }
            expect(logs.value.length).toBe(50)
        })
        it('should clear logs', () => {
            const { logs, log, clear } = useDebugLogger()
            log('test')
            clear()
            expect(logs.value.length).toBe(0)
        })
    })
    describe('debugLogger singleton', () => {
        it('should use window global array for logging', () => {
            debugLogger.log('global log', 'error')
            const logs = (window as any).debugLogs
            // Check if logs exists to satisfy TS, though runtime guarantee exists
            expect(logs).toBeDefined()
            expect((logs as any[]).length).toBeGreaterThan(0)
            expect((logs as any[])[0].message).toBe('global log')
            expect((logs as any[])[0].type).toBe('error')
        })
    })
})
