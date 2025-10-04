/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'

/* Import your layout and pages. */
import AppLayout from '../layouts/AppLayout.vue'
import Home from '../pages/Home.vue'

import Apps from '../pages/Apps.vue'
import Bootstrap from '../pages/Bootstrap.vue'
import Community from '../pages/Community.vue'
import Explorer from '../pages/Explorer.vue'
import Favorites from '../pages/Favorites.vue'
import Identities from '../pages/Identities.vue'
import Posts from '../pages/Posts.vue'
import Settings from '../pages/Settings.vue'
import Wallet from '../pages/Wallet.vue'

/* Set Premium SANS Identity flag. */
// NOTE: FIVE HUNDRED (500) STAKED SANS IS REQUIRED
//       to unlock early access to PREMIUM features.
const PREMIUM_SANS_IDENTITY = true

/* Initialize routes. */
const routes = [
    {
        path: '/',
        component: AppLayout, // NOTE: layout wraps all pages
        children: [
            { path: '', component: Home }, // NOTE: default child route
            { path: 'apps', component: PREMIUM_SANS_IDENTITY ? Apps : Bootstrap },
            { path: 'bootstrap', component: Bootstrap },
            { path: 'community', component: PREMIUM_SANS_IDENTITY ? Community : Bootstrap },
            { path: 'explorer', component: PREMIUM_SANS_IDENTITY ? Explorer : Bootstrap },
            { path: 'favorites', component: PREMIUM_SANS_IDENTITY ? Favorites : Bootstrap },
            { path: 'identities', component: Identities },
            { path: 'posts', component: PREMIUM_SANS_IDENTITY ? Posts : Bootstrap },
            { path: 'settings', component: Settings },
            { path: 'wallet', component: Wallet },
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
