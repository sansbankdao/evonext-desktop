// src/services/crypto.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hash160, randomBytes } from './crypto'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
describe('crypto service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    describe('hash160', () => {
        it('should handle Uint8Array input', async () => {
            const input = new Uint8Array([1, 2, 3])
            vi.mocked(invoke).mockResolvedValue([10, 20])
            const result = await hash160(input)
            expect(invoke).toHaveBeenCalledWith('hash160', { data: [1, 2, 3] })
            expect(result).toBeInstanceOf(Uint8Array)
            expect(Array.from(result)).toEqual([10, 20])
        })
        it('should handle number array input', async () => {
            const input = [4, 5, 6]
            vi.mocked(invoke).mockResolvedValue([30])
            await hash160(input)
            expect(invoke).toHaveBeenCalledWith('hash160', { data: [4, 5, 6] })
        })
        it('should handle objects with buffer (WASM Memory)', async () => {
            const buffer = new ArrayBuffer(2)
            const view = new Uint8Array(buffer)
            view[0] = 7
            view[1] = 8
            vi.mocked(invoke).mockResolvedValue([9])
            await hash160({ buffer })
            expect(invoke).toHaveBeenCalledWith('hash160', { data: [7, 8] })
        })
        it('should throw error for empty data', async () => {
            await expect(hash160([])).rejects.toThrow('hash160 input data is empty')
        })
        it('should throw error for invalid types', async () => {
            await expect(hash160(null as any)).rejects.toThrow()
        })
    })
    describe('randomBytes', () => {
        it('should call tauri random_bytes and return Uint8Array', async () => {
            vi.mocked(invoke).mockResolvedValue([255, 128])
            const result = await randomBytes(2)
            expect(invoke).toHaveBeenCalledWith('random_bytes', { length: 2 })
            expect(result).toEqual(new Uint8Array([255, 128]))
        })
    })
})
