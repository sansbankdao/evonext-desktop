# EvoNext Desktop

<div align="center">
  <img src="src/assets/icon.svg" alt="EvoNext Logo" width="150"/>
  <h1>ΞvoNext</h1>
  <p><strong>Free and Fearless Social
  <br />Connect with early-stage Founders and Creators</strong></p>
  <p>Plus, the hottest collection of Mini Apps designed to streamline your workflow and simplify everyday tasks.</p>

  <p>
    <a href="https://github.com/sansbankdao/evonext-desktop/releases/latest">
      <img src="https://img.shields.io/github/v/release/sansbankdao/evonext-desktop?style=for-the-badge" alt="Latest Release"/>
    </a>
    <a href="https://github.com/sansbankdao/evonext-desktop/blob/main/LICENSE.md">
      <img src="https://img.shields.io/github/license/sansbankdao/evonext-desktop?style=for-the-badge" alt="License"/>
    </a>
    <a href="https://github.com/sansbankdao/evonext-desktop/actions/workflows/release.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/sansbankdao/evonext-desktop/release.yml?style=for-the-badge" alt="Build Status"/>
    </a>
    <a href="https://codecov.io/gh/sansbankdao/evonext-desktop">
      <img src="https://img.shields.io/codecov/c/github/sansbankdao/evonext-desktop?style=for-the-badge&logo=codecov" alt="Coverage Status"/>
    </a>
  </p>
</div>

---

## About EvoNext

EvoNext is a next-generation social application built on the principles of decentralization, security, and free expression. In a digital world that often asks you to conform, EvoNext provides a sanctuary where you can be your most authentic self without fear of censorship or data exploitation.

Built with **Tauri v2** and powered by the **Dash Platform**, EvoNext gives you back control over your identity, your content, and your social experience.

### ✨ Key Features

*   **Decentralized Identity:** Your account is your own. No central authority can lock you out or take it away.
*   **Censorship-Resistant:** Speak your mind freely. The distributed nature of the platform protects your voice.
*   **Social & Financial Hub:** Seamlessly manage your Dash assets, participate in crowdfunding, and engage with a vibrant social feed all in one place.
*   **Premium Access via Staking:** Unlock early features and exclusive perks by staking Sansnote (SANS) tokens to the Stakeline.
*   **Secure & Private:** Your data is protected by the robust security of the Dash Platform.
*   **Cross-Platform:** Available for Windows, macOS, and Linux.

## 🚀 Getting Started (for Users)

1.  **Download the latest release:** Go to the [**Releases Page**](https://github.com/sansbankdao/evonext-desktop/releases/latest).
2.  **Find the right installer** for your operating system:
    *   **Windows:** Download the `.msi` file.
    *   **macOS:** Download the `.dmg` file.
    *   **Linux:** Download the `.AppImage` file (easiest) or the `.deb` file (for Debian/Ubuntu).
3.  **Install the application:** Double-click the downloaded file and follow the on-screen instructions.
4.  **Launch EvoNext** and enjoy your freedom!

## 💻 Development Setup (for Contributors)

Interested in contributing to EvoNext? We'd love your help! Here's how to get the development environment up and running.

### Prerequisites

*   **Rust:** [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)
*   **Node.js:** (v20+ recommended) [https://nodejs.org/](https://nodejs.org/)
*   **Glibc:** (v2.35+ recommended) Ubuntu 22.04+ | Debian 12+
*   **pnpm:** `npm install -g pnpm`
*   **Tauri System Dependencies:** Follow the official guide for your OS: [https://tauri.app/start/prerequisites](https://tauri.app/start/prerequisites)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sansbankdao/evonext-desktop.git
    cd evonext-desktop

2.  **Install frontend dependencies:**
    ```bash
    pnpm install

3.  **Run the development server:**
    ```bash
    pnpm tauri dev

### Potential Issues

```
Error [tauri_cli_node] failed to run 'cargo metadata' command to get workspace directory: No such file or directory (os error 2)
```

#### Explanation of the Problem
The error shows that cargo (Rust's package manager) is not found in the PATH.
The Rust installation step didn't properly add cargo to the PATH in the container.

#### Potential Solution #1
Use `source "$HOME/.cargo/env"` to immediately load cargo into PATH


## Security

On Ubuntu, settings are stored at `~/.local/share/app.evonext`.


## AI Recommendations

1. Rely on `src/bindings.ts` as the ONLY source of truth for the Vue front-end.

2. When you ask the AI to do something, use this prompt:
> AI, implement `[Task Name]`.
After you finish the Rust code, you must `runcargo run --bin export_types` and then `runpnpm exec tsc --noEmit` to ensure you haven't broken the frontend's connection to the backend.


## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is licensed under the MIT License. See the LICENSE.md file for details.
