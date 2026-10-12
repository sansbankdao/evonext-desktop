// scripts/check-exact-deps.mjs
// HARD RULE: every dependency must be pinned to an EXACT version.
// Ranges (^ ~ >= <= > < *), `latest`, tags, and workspace/file/url specs are
// FORBIDDEN because a non-exact spec lets a future install resolve a different
// build than the one that was tested (this is exactly what broke the v26.10.7
// release: "@tauri-apps/plugin-notification": "^2.4.0" resolved to 2.5.1).
// This guard runs on `preinstall` (every pnpm/npm/yarn install, locally, in CI,
// and on evorunner) and exits non-zero if any spec is not exact.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

// An EXACT spec is a bare semver version: MAJOR.MINOR.PATCH with optional
// prerelease/build suffix and NOTHING else (no leading range operator).
const EXACT_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const violations = [];
for (const section of SECTIONS) {
  const deps = pkg[section];
  if (!deps) continue;
  for (const [name, spec] of Object.entries(deps)) {
    if (!EXACT_RE.test(spec)) {
      violations.push(`  ${section}.${name}: "${spec}"`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    '\n[check-exact-deps] ❌ Non-exact dependency versions are FORBIDDEN.\n' +
      'Every dependency must be pinned to an exact version (no ^ ~ >= * latest, etc.).\n\n' +
      violations.join('\n') +
      '\n\nFix: replace each with the exact resolved version, e.g. "1.2.3".\n'
  );
  process.exit(1);
}

console.log('[check-exact-deps] ✓ all dependency versions are exact.');
