// src/stores/identity/saveKeys.contract.test.ts
//
// STATIC SWEEP — the systemic regression guard.
//
// The v26.9.14 "Connection failed" bug was a single missing field
// (`lastUsed`) in one payload-construction site. A per-site unit test
// would not have caught it because the site's own test asserted the
// buggy shape. This test instead scans the REAL SOURCE TEXT of every
// file that builds a `saveKeys` payload and fails if any of them
// constructs an object literal that omits a required field.
//
// It is deliberately mechanical: it reads the files from disk with
// `fs.readFileSync`, so a newly added call site is covered the moment
// it is written, with no test wiring required.

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
    IPRIVATE_KEY_ENTRY_NUMBER_FIELDS,
    IPRIVATE_KEY_ENTRY_STRING_FIELDS
} from './utils'

const REPO_ROOT = path.resolve(__dirname, '../../..')

/**
 * Every required wire field of the Rust `IPrivateKeyEntry` struct
 * (src-tauri/src/models.rs:150-160) / generated binding
 * (src/bindings.ts:203).
 */
const REQUIRED_FIELDS = [
    ...IPRIVATE_KEY_ENTRY_STRING_FIELDS,
    ...IPRIVATE_KEY_ENTRY_NUMBER_FIELDS
]

/**
 * Known-good object literals that legitimately produce an
 * `IPrivateKeyEntry`. Each entry names its source file and is checked to
 * contain every required field in the same literal.
 *
 * NOTE: `derivedFromMnemonic` is an EXTRA field the frontend carries.
 * Serde ignores unknown fields, so it is allowed but not required.
 */
const PAYLOAD_SITES: Array<{ file: string; marker: string }> = [
    {
        file: 'src/stores/identity/actions/connectWriteOnly.ts',
        marker: 'privateKeyEntries.push({'
    },
    {
        // Uses the LAST `saveKeys(` in the file (the inline payload literal
        // in `connectWithPrivateKey`), not the one in `saveIdentityWithKeys`.
        file: 'src/stores/identity/actions/connection.ts',
        marker: 'await this.saveKeys(network, identityId, [{'
    },
    {
        file: 'src/composables/useConnect.ts',
        marker: 'await store.saveKeys(network, identityId, [{'
    },
    {
        file: 'src/services/identity/discovery/KeyDiscovery.ts',
        marker: 'await this.store.saveKeys(network, identityId, [{'
    },
    {
        file: 'src/services/identity/discovery/SeedDiscovery.ts',
        marker: 'entries.push({'
    }
]

/**
 * Extracts the balanced `{ ... }` object literal that starts at or after
 * `fromIndex`. Returns null when no balanced literal is found.
 *
 * NOTE: `fromIndex` is advanced past the marker's own `{`, because some
 * markers (e.g. a comment referencing `.safu-{network}.json`) contain
 * brace characters that are not the payload literal.
 */
function extractObjectLiteral(source: string, fromIndex: number): string | null {
    const start = source.indexOf('{', fromIndex)
    if (start === -1) return null
    let depth = 0
    for (let i = start; i < source.length; i++) {
        const ch = source[i]
        if (ch === '{') depth++
        else if (ch === '}') {
            depth--
            if (depth === 0) return source.slice(start, i + 1)
        }
    }
    return null
}

/**
 * True when `literal` declares `field` either as `field: value` or as an
 * ES2015 shorthand property `field,`. The latter is used by
 * `connection.ts` / `useConnect.ts` for `identityId` and `privateKey`.
 */
function literalDeclaresField(literal: string, field: string): boolean {
    const asPair = new RegExp(`(^|[{,\\s])${field}\\s*:`).test(literal)
    const asShorthand = new RegExp(`(^|[{,\\s])${field}\\s*(,|\\n|$)`).test(literal)
    return asPair || asShorthand
}

/** Strips line comments so commented-out fields are not counted. */
function stripLineComments(text: string): string {
    return text
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n')
}

describe('saveKeys payload contract — static sweep of every call site', () => {
    it('the required-field list matches the Rust struct exactly', () => {
        // Locked to src-tauri/src/models.rs:150-160.
        expect([...REQUIRED_FIELDS].sort()).toEqual(
            [
                'identityId',
                'keyId',
                'purpose',
                'securityLevel',
                'keyType',
                'privateKey',
                'publicKey',
                'createdAt',
                'lastUsed'
            ].sort()
        )
    })

    it('every listed payload site file exists', () => {
        for (const { file } of PAYLOAD_SITES) {
            const abs = path.join(REPO_ROOT, file)
            expect(fs.existsSync(abs), `missing payload site file: ${file}`).toBe(true)
        }
    })

    it.each(PAYLOAD_SITES)(
        '$file builds an IPrivateKeyEntry with every required field',
        ({ file, marker }) => {
            const abs = path.join(REPO_ROOT, file)
            const source = stripLineComments(fs.readFileSync(abs, 'utf8'))

            // Use the LAST occurrence so files with several saveKeys call
            // sites are checked at the one that actually builds entries.
            const at = source.lastIndexOf(marker)
            expect(at, `marker not found in ${file}: ${marker}`).toBeGreaterThan(-1)

            const literal = extractObjectLiteral(source, at)
            expect(literal, `no balanced object literal after marker in ${file}`).not.toBeNull()

            const missing = REQUIRED_FIELDS.filter(
                (f) => !literalDeclaresField(literal as string, f)
            )

            expect(
                missing,
                `${file} constructs a saveKeys entry missing: ${missing.join(', ')}. ` +
                    `This is the exact class of bug that produced the v26.9.14 ` +
                    `"Connection failed" error (Rust IPrivateKeyEntry requires every ` +
                    `field, src-tauri/src/models.rs:150-160).`
            ).toEqual([])
        }
    )

    it('no source file invokes saveKeys/save_identity_with_keys with an unchecked array literal', () => {
        // Any `saveKeys(` or `save_identity_with_keys(` call must either use a
        // named variable (checked by the per-site tests) or an inline literal
        // that is covered by PAYLOAD_SITES above.
        const roots = ['src']
        const files: string[] = []
        const walk = (dir: string) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name)
                if (e.isDirectory()) walk(p)
                else if (/\.(ts|vue)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(p)
            }
        }
        for (const r of roots) walk(path.join(REPO_ROOT, r))

        const coveredMarkers = PAYLOAD_SITES.map((s) => s.marker)
        const offenders: string[] = []

        for (const abs of files) {
            const rel = path.relative(REPO_ROOT, abs)
            const source = stripLineComments(fs.readFileSync(abs, 'utf8'))
            const callRe = /\b(saveKeys|save_identity_with_keys)\s*\(/g
            let m: RegExpExecArray | null
            while ((m = callRe.exec(source)) !== null) {
                const after = source.slice(m.index, m.index + 400)
                // Inline array literal argument?
                if (!/\[\s*\{/.test(after)) continue
                // Skip the known, individually-tested sites. The marker may
                // sit slightly BEFORE the call (e.g. a comment header), so
                // look back a little as well as forward.
                const window = source.slice(Math.max(0, m.index - 220), m.index + 400)
                const covered = coveredMarkers.some((mk) => window.includes(mk))
                if (!covered) {
                    offenders.push(`${rel}: inline saveKeys literal near offset ${m.index}`)
                }
            }
        }

        expect(
            offenders,
            'Uncovered inline saveKeys payload literal(s) found. Add them to ' +
                'PAYLOAD_SITES so their field set is verified against the Rust ' +
                'IPrivateKeyEntry contract.'
        ).toEqual([])
    })

    it('the Rust contract still requires last_used (guards the Rust side too)', () => {
        const modelsRs = fs.readFileSync(
            path.join(REPO_ROOT, 'src-tauri/src/models.rs'),
            'utf8'
        )
        const structMatch = modelsRs.match(
            /pub struct IPrivateKeyEntry\s*\{([\s\S]*?)\n\}/
        )
        expect(structMatch, 'IPrivateKeyEntry struct not found in models.rs').not.toBeNull()

        const body = structMatch![1] ?? ''
        // If this ever becomes optional, the whole class of bug returns
        // silently, so fail loudly.
        expect(
            /#\[serde\(default\)\]\s*pub last_used: String/.test(body),
            '`last_used` must NOT have #[serde(default)]; making it optional ' +
                're-introduces the v26.9.14 "Connection failed" bug'
        ).toBe(false)
        expect(body).toMatch(/pub last_used: String,/)

        // All nine fields present.
        for (const snake of [
            'identity_id',
            'key_id',
            'purpose',
            'security_level',
            'key_type',
            'private_key',
            'public_key',
            'created_at',
            'last_used'
        ]) {
            expect(body, `models.rs IPrivateKeyEntry missing ${snake}`).toContain(
                `pub ${snake}:`
            )
        }
    })

    it('the generated TS binding still declares lastUsed as required', () => {
        const bindings = fs.readFileSync(path.join(REPO_ROOT, 'src/bindings.ts'), 'utf8')
        const m = bindings.match(/export type IPrivateKeyEntry = \{([^}]*)\}/)
        expect(m, 'IPrivateKeyEntry type not found in src/bindings.ts').not.toBeNull()
        const body = m![1] ?? ''
        expect(body).toMatch(/lastUsed:\s*string(?!\s*\|)/)
        expect(body).not.toMatch(/lastUsed\?/)
    })

    it('connectWriteOnly builds its payload with lastUsed (the v26.9.14 fix)', () => {
        const src = fs.readFileSync(
            path.join(REPO_ROOT, 'src/stores/identity/actions/connectWriteOnly.ts'),
            'utf8'
        )
        // The exact line that was missing before the fix.
        expect(src).toMatch(/lastUsed:\s*new Date\(\)\.toISOString\(\)/)
    })
})
