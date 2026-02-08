// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(test)]
mod main_tests;

fn main() {
    evonext::setup_environment();
    evonext::run();
}
