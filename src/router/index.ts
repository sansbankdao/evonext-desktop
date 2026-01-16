// src/router/index.ts

/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'
import { useNetwork } from '@/composables'
import { useLicense } from '@/composables'
import { useIdentityStore } from '@/stores/identity'

/* Import your layout and screens. */
import AppLayout from '@/layouts/AppLayout.vue'
import Home from '@/screens/Home.vue'

import About from '@/screens/About.vue'
import Apps from '@/screens/Apps.vue'

import Asset from '@/screens/Asset.vue'
import AssetManage from '@/screens/asset/Manage.vue'

import Bootstrap from '@/screens/Bootstrap.vue'
import Community from '@/screens/Community.vue'
import Connect from '@/screens/Connect.vue'
import Disconnect from '@/screens/Disconnect.vue'
import Explorer from '@/screens/Explorer.vue'
import Favorites from '@/screens/Favorites.vue'

import Identity from '@/screens/Identity.vue'
import IdentityRegister from '@/screens/identity/Register.vue'
import IdentityKeys from '@/screens/identity/ManageKeys.vue'
import IdentityAddKey from '@/screens/identity/AddKey.vue'

import Launcher from '@/screens/Launcher.vue'
import LauncherSimple from '@/screens/launcher/Simple.vue'
import LauncherProject from '@/screens/launcher/Project.vue'
import LauncherPlatform from '@/screens/launcher/Platform.vue'

import Portfolio from '@/screens/Portfolio.vue'
import PortfolioManage from '@/screens/portfolio/Manage.vue'

import Posts from '@/screens/Posts.vue'
import Settings from '@/screens/Settings.vue'
import Stakeline from '@/screens/Stakeline.vue'
import Studio from '@/screens/Studio.vue'

import WalletOverview from '@/screens/wallet/Overview.vue'
import WalletDeposit from '@/screens/wallet/Deposit.vue'
import WalletSend from '@/screens/wallet/Send.vue'
import WalletSwap from '@/screens/wallet/Swap.vue'
import WalletAssetDetails from '@/screens/wallet/AssetDetails.vue'
import WalletTransactionDetails from '@/screens/wallet/TransactionDetails.vue'

/* Initialize routes with meta for premium protection. */
const routes = [
    {
        path: '/',
        component: AppLayout,
        children: [
            { path: '', component: Home },
            { path: 'about', component: About },
            {
                path: 'apps', component: Apps,
                meta: { requiresPremium: true }
            },

            // Assets
            { path: 'asset', component: Asset },
            {
                path: 'asset/manage', component: AssetManage,
                meta: { requiresPremium: true }
            },

            { path: 'bootstrap', component: Bootstrap },
            {
                path: 'community', component: Community,
                meta: { requiresPremium: true }
            },
            { path: 'explorer', component: Explorer },
            {
                path: 'favorites', component: Favorites,
                meta: { requiresPremium: true }
            },

            // Asset/Token Launcher
            { path: 'launcher', component: Launcher },
            { path: 'launcher/simple', component: LauncherSimple },
            {
                path: 'launcher/project', component: LauncherProject,
                meta: { requiresPremium: true }
            },
            {
                path: 'launcher/platform', component: LauncherPlatform,
                meta: { requiresPremium: true }
            },

            // Identity
            { path: 'identity', component: Identity },
            { path: 'identity/register', component: IdentityRegister },
            { path: 'identity/:id/keys', component: IdentityKeys, name: 'IdentityKeys' },
            { path: 'identity/:id/keys/add', component: IdentityAddKey, name: 'IdentityAddKey' },

            // Portfolio
            { path: 'portfolio', component: Portfolio },
            {
                path: 'portfolio/manage', component: PortfolioManage,
                meta: { requiresPremium: true }
            },

            // Posts
            { path: 'posts', component: Posts },

            // Settings
            { path: 'settings', component: Settings },
            { path: 'stakeline', component: Stakeline },
            { path: 'studio', component: Studio },

            // Wallet
            { path: 'wallet', component: WalletOverview },
            { path: 'wallet/deposit', component: WalletDeposit },
            { path: 'wallet/send', component: WalletSend },
            {
                path: 'wallet/swap', component: WalletSwap,
                meta: { requiresPremium: true }
            },
            { path: 'wallet/asset/:symbol', component: WalletAssetDetails },
            { path: 'wallet/transaction/:id', component: WalletTransactionDetails },

            // Connection
            { path: 'connect', component: Connect },
            { path: 'disconnect', component: Disconnect },
        ]
    }
]

/* Initialize router. */
const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        return savedPosition || { top: 0, left: 0 }
    },
})

// Add RouteMeta type augmentation
declare module 'vue-router' {
    interface RouteMeta {
        requiresPremium?: boolean;
        requiresAuth?: boolean;
        // For the asset details page
        symbol?: string;
    }
}

/* Global route guard. */
router.beforeEach(async (to, _from, next) => {
    const { network } = useNetwork()
    const { loadLicense, hasPremiumLicense } = useLicense()
    const Identity = useIdentityStore()

    try {
        // Premium Protection Logic
        if (to.meta?.requiresPremium) {
            // Bypass for development on testnet
            if (network.value === 'testnet') {
                return next()
            }

            // Load license for the current Identity ID
            if (Identity.identityId) {
                await loadLicense(Identity.identityId)

                if (hasPremiumLicense()) {
                    return next()
                }
            }

            // Fallback: Redirect if no license discovered
            console.warn(`Access denied to ${to.path}. Identity ID: ${Identity.identityId}`)
            return next('/stakeline')
        }

        next()
    } catch (error) {
        console.error('Router Guard Error:', error)
        next()
    }
})

export default router
