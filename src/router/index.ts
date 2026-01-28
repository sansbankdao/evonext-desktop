// src/router/index.ts

/* Import modules. */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useNetwork } from '@/composables'
import { useLicense } from '@/composables'
import { useIdentityStore } from '@/stores/identity'

/* Import your layout. */
import AppLayout from '@/layouts/AppLayout.vue'

/* Initialize routes with lazy loading. */
const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: '',
                component: () => import('@/screens/Home.vue')
            },
            {
                path: 'about',
                component: () => import('@/screens/About.vue')
            },
            {
                path: 'apps',
                component: () => import('@/screens/Apps.vue'),
                meta: { requiresPremium: true }
            },

            // Assets
            {
                path: 'asset',
                component: () => import('@/screens/Asset.vue')
            },
            {
                path: 'asset/manage',
                component: () => import('@/screens/asset/Manage.vue'),
                meta: { requiresPremium: true }
            },

            {
                path: 'bootstrap',
                component: () => import('@/screens/Bootstrap.vue')
            },
            {
                path: 'community',
                component: () => import('@/screens/Community.vue'),
                meta: { requiresPremium: true }
            },
            {
                path: 'explorer',
                component: () => import('@/screens/Explorer.vue')
            },
            {
                path: 'favorites',
                component: () => import('@/screens/Favorites.vue'),
                meta: { requiresPremium: true }
            },

            // Asset/Token Launcher
            {
                path: 'launcher',
                component: () => import('@/screens/Launcher.vue')
            },
            {
                path: 'launcher/simple',
                component: () => import('@/screens/launcher/Simple.vue')
            },
            {
                path: 'launcher/project',
                component: () => import('@/screens/launcher/Project.vue'),
                meta: { requiresPremium: true }
            },
            {
                path: 'launcher/platform',
                component: () => import('@/screens/launcher/Platform.vue'),
                meta: { requiresPremium: true }
            },

            // Identity
            {
                path: 'identity',
                component: () => import('@/screens/Identity.vue')
            },
            {
                path: 'identity/register',
                component: () => import('@/screens/identity/Register.vue')
            },
            {
                path: 'identity/:id/keys',
                component: () => import('@/screens/identity/ManageKeys.vue'),
                name: 'IdentityKeys'
            },
            {
                path: 'identity/:id/keys/add',
                component: () => import('@/screens/identity/AddKey.vue'),
                name: 'IdentityAddKey'
            },

            // Portfolio
            {
                path: 'portfolio',
                component: () => import('@/screens/Portfolio.vue')
            },
            {
                path: 'portfolio/manage',
                component: () => import('@/screens/portfolio/Manage.vue'),
                meta: { requiresPremium: true }
            },

            // Posts
            {
                path: 'posts',
                component: () => import('@/screens/Posts.vue')
            },

            // Settings
            {
                path: 'settings',
                component: () => import('@/screens/Settings.vue')
            },
            {
                path: 'stakeline',
                component: () => import('@/screens/Stakeline.vue')
            },
            {
                path: 'studio',
                component: () => import('@/screens/Studio.vue')
            },

            // Wallet
            {
                path: 'wallet',
                component: () => import('@/screens/wallet/Overview.vue')
            },
            {
                path: 'wallet/deposit',
                component: () => import('@/screens/wallet/Deposit.vue')
            },
            {
                path: 'wallet/send',
                component: () => import('@/screens/wallet/Send.vue')
            },
            {
                path: 'wallet/swap',
                component: () => import('@/screens/wallet/Swap.vue'),
                meta: { requiresPremium: true }
            },
            {
                path: 'wallet/asset/:symbol',
                component: () => import('@/screens/wallet/AssetDetails.vue')
            },
            {
                path: 'wallet/transaction/:id',
                component: () => import('@/screens/wallet/TransactionDetails.vue')
            },

            // Connection
            {
                path: 'connect',
                component: () => import('@/screens/Connect.vue')
            },
            {
                path: 'disconnect',
                component: () => import('@/screens/Disconnect.vue')
            }
        ]
    }
]

/* Initialize router. */
const router = createRouter({
    history: createWebHashHistory(),
    routes,
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
