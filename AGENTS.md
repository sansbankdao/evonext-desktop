# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Devin, etc.) when working with code in this repository. Use this as your primary reference for project structure, commands, flows, and conventions to minimize errors and hallucinations.

## Project Overview

EvoNext Desktop is a cross-platform (Windows/macOS/Linux) Tauri v2 desktop application for a decentralized social platform. It is built on the Dash Platform, offering features such as censorship-resistant posting, decentralized identities (DPNS), integrated wallet functionality (assets/transactions), staking for premium access (Sansnote/SANS), app discovery, and secure key management. All cryptographic operations are handled client-side, communicating with the Dash network via DAPI gRPC without any central servers.

**Tech Stack:**
- **Frontend:** Vue 3 (Composition API), TypeScript, Vite, Tailwind CSS.
- **Backend:** Rust, Tauri v2.
- **State Management:** Pinia (stores) and Composables.
- **Styling:** Tailwind CSS.
- **Protocol:** Dash Platform (DAPI gRPC).

## Commands

### Core Development

pnpm install # Install dependencies
pnpm tauri dev # Start Development Server (Frontend + Backend)
pnpm tauri build # Production Build
pnpm test # Run Tests
pnpm test:ui # Run Tests in UI Mode

### Backend (Rust) Specific

cd src-tauri # Navigate to Rust source
cargo test # Run Rust tests
cargo check # Check code without building

**Note:** Ensure you have Rust (stable), Node.js (v20+), and pnpm installed. Follow the Tauri v2 Prerequisites guide for system dependencies.

## Architecture

This is a hybrid Tauri v2 application consisting of a JavaScript/Vue frontend and a Rust backend.

- **Frontend (src/):** Handles the UI, routing, and application state. It communicates with the backend via Tauri's IPC (invoke).
- **Backend (src-tauri/):** Handles secure operations (mnemonic generation, key derivation, signing) and network communication (DAPI client). It exposes commands to the frontend defined in src-tauri/src/commands/.
- **Capabilities:** Tauri v2 uses "capabilities" defined in src-tauri/capabilities/ to manage permissions between frontend and backend (e.g., main.json allows core identity operations).

### Source Structure (Frontend)

src/
├── main.ts # Application entry point, Tauri setup
├── App.vue # Root component
├── router/
│   └── index.ts # Vue Router configuration
├── assets/ # Static assets (icons, styles)
├── components/ # Reusable Vue components
│   ├── SidebarNav.vue
│   ├── PostItem.vue
│   ├── Header.vue
│   ├── connect/ # Onboarding components
│   │   ├── ConnectSeedForm.vue
│   │   └── KeyDiscoveryForm.vue
│   └── addKey/ # Key management components
│       ├── KeyForm.vue
│       └── IdentityList.vue
├── screens/ # Page-level components (Routes)
│   ├── Connect.vue       # Onboarding screen
│   ├── Home.vue # Main feed, trending, messages
│   ├── Identity/ # Identity management screens
│   │   ├── Register.vue
│   │   ├── AddKey.vue
│   │   └── ManageKeys.vue
│   ├── Posts.vue # Social feed
│   ├── wallet/ # Wallet screens
│   │   ├── Overview.vue
│   │   ├── Send.vue
│   │   ├── Deposit.vue
│   │   └── Swap.vue
│   ├── Studio.vue # Post editor
│   ├── Stakeline.vue     # Staking interface
│   ├── Settings.vue      # App settings
│   └── ... # Other screens (Apps, Explorer, etc.)
├── composables/ # Vue Composition API logic
│   ├── useIdentity.ts    # Identity connection logic
│   ├── useWallet.ts      # Wallet logic
│   ├── usePosts.ts       # Post fetching and creation
│   ├── useMnemonic.ts    # Mnemonic validation/derivation
│   ├── usePlatform.ts    # Dash Platform SDK wrapper
│   └── ... # Other composables (Network, Keys, Notifications)
├── stores/ # Pinia stores (State Management)
│   ├── identity/ # Identity state & actions
│   │   ├── actions/      # Identity specific actions (connect, keys, balance)
│   │   ├── index.ts
│   │   └── state.ts
│   ├── posts/ # Posts state & actions
│   │   ├── actions/      # Fetch, create, interact
│   │   └── index.ts
│   ├── wallet/ # Wallet state & actions
│   │   ├── actions/      # API calls, transforms
│   │   └── index.ts
│   ├── settings.ts
│   └── system.ts
├── services/ # Business logic layer
│   └── identity/
│       ├── discovery/    # Identity discovery logic
│       │   ├── BaseDiscovery.ts
│       │   ├── SeedDiscovery.ts
│       │   ├── KeyDiscovery.ts
│       │   └── IdentityManager.ts
│       └── keyDerivation.service.ts
├── types/ # TypeScript interfaces
│   ├── wallet.ts
│   ├── identity.ts
│   ├── posts.ts
│   ├── assets.ts
│   └── ...
├── utils/ # Utility functions
│   ├── keys.ts
│   ├── dash.ts
│   ├── errors.ts
│   └── ...
└── constants/ # App constants

### Source Structure (Backend)

src-tauri/
├── src/main.rs # Tauri entry point
├── src/lib.rs # Library root
├── src/commands/ # Tauri commands (exposed to frontend)
│   ├── identity_commands.rs    # Identity operations
│   ├── dapi_commands.rs # DAPI interaction
│   ├── asset_commands.rs       # Wallet assets
│   ├── mnemonic_commands.rs    # Mnemonic handling
│   └── settings_commands.rs    # App settings
├── src/dapi/ # DAPI Client implementation
│   ├── client/
│   │   ├── mod.rs # Client logic
│   │   ├── cache.rs      # Caching layer
│   │   └── methods/      # Specific DAPI methods
│   │       ├── identity.rs
│   │       ├── documents.rs
│   │       └── contracts.rs
│   └── types.rs # DAPI types
├── src/utils/ # Rust utilities
│   ├── store.rs # Local storage wrapper
│   ├── network_file.rs   # Network config
│   └── macros.rs
├── src/config/ # Configuration management
├── capabilities/ # Tauri v2 permissions
│   ├── main.json
│   └── listen.json
├── tauri.conf.json       # Tauri configuration
└── Cargo.toml # Rust dependencies

## Key Flows

### 1. User Onboarding / Connection
1. User opens app, routed to screens/Connect.vue.
2. Enters Seed Phrase in components/connect/ConnectSeedForm.vue.
3. Frontend validates mnemonic via useMnemonic.ts / mnemonic_commands.rs.
4. Identity discovery runs (services/identity/discovery/):
    - SeedDiscovery: Uses HD path derivation.
    - KeyDiscovery: Uses provided public keys.
5. App queries DAPI (via dapi_commands.rs) to check if identity exists.
6. If found, state is populated in stores/identity/ and user routed to Home.

### 2. Creating a Post
1. User navigates to screens/Studio.vue.
2. Types content in components/studio/Editor.vue.
3. On submit, usePosts.ts triggers create action.
4. Document is prepared according to Dash Platform contract schema.
5. Backend signs document with identity key (identity_commands.rs).
6. Document is broadcast to Dash Platform via DAPI (dapi/client/).

### 3. Sending Funds (Wallet)
1. User navigates to screens/wallet/Send.vue.
2. Inputs recipient address and amount.
3. Frontend validates inputs via useWallet.ts.
4. Transaction is built and signed in Rust (asset_commands.rs).
5. Broadcasted via DAPI or Insight API.
6. UI updates via wallet store and notifications.

### 4. Adding a Key to Identity
1. User goes to screens/Identity/AddKey.vue.
2. Selects key type (e.g., Authentication, Voting) via components/addKey/KeyForm.vue.
2. New key is derived or generated.
3. Transaction is prepared to add key to Identity contract.
4. Signed and broadcast via identity_commands.rs.
5. useIdentityDiscovery refreshes identity state.

## Key Types & Concepts

- **Identity:** A Dash Platform Identity (ID) containing public keys.
- **DPNS:** Dash Platform Name Service (human-readable names).
- **Documents:** Data structures stored on the platform (Posts, Profiles).
- **Keys:**
    - ECDSA_SECP256K1
    - BLS (Potential future support)
    - Purposes: AUTHENTICATION, TRANSFER, VOTING.
- **Networks:**
    - Testnet (Default for dev)
    - Mainnet
- **SANS:** Sansnote token used for staking/premium features.
- **DAPI:** Decentralized API for Dash Platform communication.

## Dependencies

**Frontend:**
- Vue 3
- Tauri API (@tauri-apps/api)
- Pinia
- Vue Router
- Tailwind CSS

**Backend:**
- Tauri v2
- Dash SDK (Rust bindings or gRPC clients)
- Tokio (Async runtime)
- Serde (Serialization)

**Note:** Private keys are NEVER exposed to the frontend. All cryptographic operations happen in the Rust backend.

## Conventions

- **Naming:**
    - TypeScript/JavaScript: camelCase for variables/functions, PascalCase for classes/components.
    - Rust: snake_case for variables/functions, PascalCase for types/structs.
- **File Naming:** Vue components are PascalCase (e.g., UserProfile.vue), utilities are camelCase.
- **State Management:** Use Pinia stores for global state. Use composables for reusable logic.
- **Error Handling:** Use utils/errors.ts for standardized error types. Rust should return Result types.
- **Async:** Use async/await consistently. Tauri commands are async.
- **Tauri Commands:** Defined in src-tauri/src/commands/ and must be registered in lib.rs/main.rs.
- **Security:** Always validate inputs on both sides. Never log sensitive data (mnemonics, seeds).

## Testing

- **Frontend:** Located alongside components or in test files. Run with pnpm test.
- **Backend:** Rust unit tests in src-tauri/src. Run with cargo test.
- **Integration:** Use Tauri test driver or manual testing via pnpm tauri dev.

## Troubleshooting

- **"cargo metadata not found":** Ensure Rust is installed and in your PATH. Source ~/.cargo/env if necessary.
- **Build errors on Linux:** Ensure system dependencies (libwebkit2gtk, etc.) are installed per Tauri docs.
- **DAPI Connection Issues:** Check network configuration in src-tauri/src/config/ and ensure you are not blocked by a firewall.
