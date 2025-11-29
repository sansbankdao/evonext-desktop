/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'
import getLicense from '@/libs/getLicense'

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
import Stakeline from '../screens/Stakeline.vue'
import Studio from '../screens/Studio.vue'

import WalletOverview from '../screens/wallet/Overview.vue'
import WalletDeposit from '../screens/wallet/Deposit.vue'
import WalletSend from '../screens/wallet/Send.vue'
import WalletSwap from '../screens/wallet/Swap.vue'
import WalletAssetDetails from '../screens/wallet/AssetDetails.vue'
import WalletTransactionDetails from '../screens/wallet/TransactionDetails.vue'

// NOTE: FIVE HUNDRED (500) STAKED SANS IS REQUIRED
//       to unlock early access to PREMIUM features.
const PREMIUM_SANS_IDENTITY = await getLicense() === '' ? false : true

/* Initialize routes. */
const routes = [
    {
        path: '/',
        component: AppLayout, // NOTE: layout wraps all pages
        children: [
            { path: '', component: Home }, // NOTE: default child route
            { path: 'about', component: About },
            { path: 'apps', component: PREMIUM_SANS_IDENTITY ? Apps : Stakeline },
            { path: 'bootstrap', component: Bootstrap },
            { path: 'community', component: PREMIUM_SANS_IDENTITY ? Community : Stakeline },
            { path: 'explorer', component: PREMIUM_SANS_IDENTITY ? Explorer : Stakeline },
            { path: 'favorites', component: PREMIUM_SANS_IDENTITY ? Favorites : Stakeline },

            { path: 'identity', component: Identity },
            { path: 'identity/register', component: IdentityRegister },

            { path: 'posts', component: Posts },
            { path: 'settings', component: Settings },
            { path: 'studio', component: Studio },

            { path: 'wallet', component: WalletOverview },
            { path: 'wallet/deposit', component: WalletDeposit },
            { path: 'wallet/send', component: WalletSend },
            { path: 'wallet/swap', component: WalletSwap },
            { path: 'wallet/asset/:ticker', component: WalletAssetDetails },
            { path: 'wallet/transaction/:id', component: WalletTransactionDetails },

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
