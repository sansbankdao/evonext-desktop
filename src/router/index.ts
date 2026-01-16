// src/router/index.ts

/* Import modules. */
import { createRouter, createWebHashHistory } from 'vue-router'
import { useNetwork } from '@/composables'
import { useLicense } from '@/composables'

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
    /**
     * Scroll behavior configuration.
     * - returning `savedPosition` handles the Back/Forward button behavior.
     * - returning `{ top: 0, left: 0 }` ensures the window scrolls to the top
     *   on standard navigation, preventing the "black screen" issue in Tauri.
     */
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0, left: 0 }
        }
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
    const { ensure, network } = useNetwork()
    const { loadLicense, hasPremiumLicense } = useLicense()

    try {
        // Ensure network is loaded
        await ensure()

        // Check if route requires premium access
        if (to.meta?.requiresPremium) {
            if (network.value === 'testnet') {
                // Testnet always allows premium routes (for development)
                next()
                return
            }

            // Mainnet: check license
            await loadLicense()

            if (hasPremiumLicense()) {
                next()
                return
            } else {
                console.log(`Premium route ${to.path} requires license, redirecting to stakeline`)
                next('/stakeline')
                return
            }
        }

        // Non-premium route: always allow
        next()
    } catch (error) {
        console.error('Router guard error:', error)
        // Fallback: allow navigation but log error
        next()
    }
})

export default router
