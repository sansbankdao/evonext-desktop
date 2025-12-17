// src/libs/identity/index.ts

// Remove the problematic exports since those functions are private
export { default as getIdentities } from '../getIdentities'
// Remove: export { searchByHash160, searchBySecp256k1 } from './getIdentities'
export { getIdentityManager } from './IdentityManager'
