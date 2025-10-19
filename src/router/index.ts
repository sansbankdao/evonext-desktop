/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'

/* Import your layout and screens. */
import AppLayout from '../layouts/AppLayout.vue'
import Home from '../screens/Home.vue'

import About from '../screens/About.vue'
import Apps from '../screens/Apps.vue'
import Bootstrap from '../screens/Bootstrap.vue'
import Community from '../screens/Community.vue'
import Connect from '../screens/Connect.vue'
import Explorer from '../screens/Explorer.vue'
import Favorites from '../screens/Favorites.vue'

import Identity from '../screens/Identity.vue'
import IdentityRegister from '../screens/Identity/Register.vue'

import Posts from '../screens/Posts.vue'
import Settings from '../screens/Settings.vue'
import Stakehouse from '../screens/Stakehouse.vue'
import Wallet from '../screens/Wallet.vue'

/* Set Premium SANS Identity flag. */
// NOTE: FIVE HUNDRED (500) STAKED SANS IS REQUIRED
//       to unlock early access to PREMIUM features.
const PREMIUM_SANS_IDENTITY = false

/* Initialize routes. */
const routes = [
    {
        path: '/',
        component: AppLayout, // NOTE: layout wraps all pages
        children: [
            { path: '', component: Home }, // NOTE: default child route
            { path: 'about', component: About },
            { path: 'apps', component: PREMIUM_SANS_IDENTITY ? Apps : Stakehouse },
            { path: 'bootstrap', component: Bootstrap },
            { path: 'community', component: PREMIUM_SANS_IDENTITY ? Community : Stakehouse },
            { path: 'explorer', component: PREMIUM_SANS_IDENTITY ? Explorer : Stakehouse },
            { path: 'favorites', component: PREMIUM_SANS_IDENTITY ? Favorites : Stakehouse },

            { path: 'identity', component: Identity },
            { path: 'identity-register', component: IdentityRegister },

            { path: 'posts', component: Posts },
            { path: 'settings', component: Settings },
            { path: 'wallet', component: Wallet },

            { path: 'connect', component: Connect },
            { path: 'disconnect', component: Connect },
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
