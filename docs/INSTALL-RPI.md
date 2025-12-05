# Raspberry Pi Installation Guide

This guide provides step-by-step instructions for installing evonext-desktop on a Raspberry Pi running Ubuntu (or a similar Debian-based distribution).

## Prerequisites

- Raspberry Pi 4 or newer with ARM64 architecture
- Ubuntu 20.04 or later (or Debian/other Debian-based distribution)
- At least 4GB of RAM is recommended
- Internet connection
- Basic familiarity with terminal commands

## Installation Steps

### 1. Update System and Install Dependencies

```bash
sudo apt update
sudo apt install automake binutils build-essential cmake curl libtool make patch pkg-config libgtk-3-dev libglib2.0-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libwebkit2gtk-4.1-dev libssl-dev
```

### 2. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"
```

### 3. Install Node.js

```bash
cd /tmp
wget https://nodejs.org/dist/v24.11.1/node-v24.11.1-linux-arm64.tar.xz
tar xf node-v24.11.1-linux-arm64.tar.xz
export PATH=/tmp/node-v24.11.1-linux-arm64/bin:$PATH
```

### 4. Install pnpm

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source "$HOME/.bashrc"
```

### 5. Clone and Build evonext-desktop

```bash
git clone https://github.com/sansbankdao/evonext-desktop
cd evonext-desktop/
pnpm install
pnpm tauri dev
```

## Running the Application

After completing the installation, you can run the application using:

```bash
cd evonext-desktop/
pnpm tauri dev
```

## Notes

- This guide is specifically for ARM64 Raspberry Pi devices
- If you're using an Intel/AMD (x86_64) system, the Node.js download URL will be different
- The installation process may take some time, especially on Raspberry Pi hardware
- First time compilation will take longer than subsequent runs
