/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'

/* Import your layout and pages. */
import AppLayout from '../layouts/AppLayout.vue'
import Home from '../pages/Home.vue'
import Explore from '../pages/Explore.vue'
import Posts from '../pages/Posts.vue'
import Community from '../pages/Community.vue'
import Apps from '../pages/Apps.vue'
import Wallet from '../pages/Wallet.vue'
import Favorites from '../pages/Favorites.vue'
import Identities from '../pages/Identities.vue'
import Settings from '../pages/Settings.vue'

/* Initialize routes. */
const routes = [
    {
        path: '/',
        component: AppLayout, // NOTE: layout wraps all pages
        children: [
            { path: '', component: Home }, // NOTE: default child route
            { path: 'explore', component: Explore },
            { path: 'posts', component: Posts },
            { path: 'community', component: Community },
            { path: 'apps', component: Apps },
            { path: 'wallet', component: Wallet },
            { path: 'favorites', component: Favorites },
            { path: 'identities', component: Identities },
            { path: 'settings', component: Settings },
        ]
    }
]

/* Initialize router. */
const router = createRouter({
    // Use hash mode for easier compatibility with Tauri
    history: createWebHashHistory(),
    routes,
})

export default router
