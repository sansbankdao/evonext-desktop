// src/router/index.ts

/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'
import getLicense from '@/libs/getLicense'
import getNetwork from '@/libs/getNetwork'

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
let isPremiumSansIdentity = false

/* Initialize routes with all possible routes. */
const routes = [
    {
        path: '/',
        component: AppLayout,
        children: [
            { path: '', component: Home },
            { path: 'about', component: About },
            { path: 'apps', component: Apps },
            { path: 'bootstrap', component: Bootstrap },
            { path: 'community', component: Community },
            { path: 'explorer', component: Explorer },
            { path: 'favorites', component: Favorites },
            { path: 'identity', component: Identity },
            { path: 'identity/register', component: IdentityRegister },
            { path: 'posts', component: Posts },
            { path: 'settings', component: Settings },
            { path: 'stakeline', component: Stakeline },
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
    history: createWebHashHistory(),
    routes,
})

/* Handle global route guard. */
router.beforeEach(async (_to, _from, next) => {
    /* Request current network and license status. */
    const network = await getNetwork()
    isPremiumSansIdentity = await getLicense() !== ''

    /* Define premium routes. */
    const premiumRoutes = ['apps', 'community', 'favorites']
    const routeName = _to.path.split('/')[1] // NOTE: Get first path segment.

    if (premiumRoutes.includes(routeName)) {
        if (network === 'testnet') {
            // NOTE: Testnet, always allow.
            next()
        } else {
            // NOTE: Non-testnet, check license.
            if (isPremiumSansIdentity) {
                next()
            } else {
                // NOTE: Redirect to stakeline for upgrade.
                next('/stakeline')
            }
        }
    } else {
        // NOTE: Non-premium route: always allow.
        next()
    }
})

export default router
