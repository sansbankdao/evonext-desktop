// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'

// Import your layout and pages
import AppLayout from '../layouts/AppLayout.vue'
import Home from '../pages/Home.vue'
import Explore from '../pages/Explore.vue'
import Posts from '../pages/Posts.vue'
// ... import all other pages

const routes = [
    {
        path: '/',
        component: AppLayout, // The layout wraps all pages
        children: [
            { path: '', component: Home }, // Default child route
            { path: 'explore', component: Explore },
            { path: 'posts', component: Posts },
            // ... add routes for Community, Apps, etc.
        ]
    }
]

const router = createRouter({
    // Use hash mode for easier compatibility with Tauri
    history: createWebHashHistory(),
    routes,
})

export default router
