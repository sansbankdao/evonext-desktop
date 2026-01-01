// src/types/apps.ts

/**
 * ================================================
 * MINI APP TYPES
 * ================================================
 */

/**
 * MiniApp - Core application definition
 */
export interface IMiniApp {
    // Core metadata
    name: string;                 // Human-readable name
    shortName?: string;           // Short display name (for UI)
    description: string;          // App description
    version: string;              // Semantic version (1.0.0)

    // URLs
    appUrl: string;               // Main app URL (where the app is hosted)
    iconUrl: string;              // App icon URL
    bannerUrl?: string;           // Banner/hero image
    website?: string;             // Official website
    repository?: string;          // GitHub/GitLab repo

    // Developer info
    developer: IAppDeveloper;
    publisher?: IAppPublisher;

    // Categories & tags
    category: AppCategory;
    subcategory?: string;         // e.g., "DeFi", "NFT", "Social"
    tags: string[];               // Search/filter tags

    // Platform compatibility
    platforms: AppPlatform[];     // Where this app can run
    supportedChains?: string[];   // Blockchains supported (e.g., ["dash", "ethereum", "solana"])

    // Permissions & capabilities
    permissions: AppPermission[];
    capabilities: AppCapability[];

    // State & lifecycle
    status: AppStatus;
    visibility: AppVisibility;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    lastVersionUpdate?: Date;

    // Distribution
    installUrl?: string;          // Direct install URL
    packageHash?: string;         // Hash of app package for verification

    // Monetization
    monetization?: AppMonetization;
    price?: number;               // Price in USD (0 for free)
    subscription?: AppSubscription;

    // Analytics & engagement
    installCount: number;
    rating?: number;              // 0-5 stars
    reviewCount?: number;
    dailyActiveUsers?: number;
    weeklyActiveUsers?: number;

    // Storage requirements
    storage?: {
        required: number;         // Required storage in bytes
        persistent: boolean;      // Can store data persistently
    };

    // Runtime info
    runtime?: {
        sdkVersion: string;       // SDK version used
        environment: 'sandbox' | 'production';
        memoryLimit?: number;     // Max memory in MB
        timeout?: number;         // Max execution time in ms
    };

    // Privacy & compliance
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
    ageRating: 'E' | 'E10+' | 'T' | 'M' | 'AO'; // ESRB-like ratings
    dataCollection?: AppDataCollection;
}
/**
 * App Developer
 */
export interface IAppDeveloper {
    name: string;
    verified: boolean;            // Platform-verified developer
    website?: string;
    social?: {
        twitter?: string;
        github?: string;
        discord?: string;
    };
    reputation?: number;          // Developer reputation score
    appsPublished: number;
}

/**
 * App Publisher (if different from developer)
 */
export interface IAppPublisher {
    name: string;
    verified: boolean;
    website?: string;
}

/**
 * App Category Enum
 */
export type AppCategory =
    | 'games'
    | 'social'
    | 'finance'
    | 'productivity'
    | 'utilities'
    | 'entertainment'
    | 'education'
    | 'tools'
    | 'news'
    | 'shopping'
    | 'travel'
    | 'health'
    | 'lifestyle'
    | 'other';

/**
 * Platform Enum
 */
export type AppPlatform =
    | 'web'          // Standard web app
    | 'mobile'       // Mobile-optimized
    | 'desktop'      // Desktop-optimized
    | 'embedded'     // Embedded in other apps
    | 'vr'           // Virtual Reality
    | 'ar';          // Augmented Reality

/**
 * App Permission Enum
 */
export type AppPermission =
    | 'read_profile'
    | 'write_profile'
    | 'read_contacts'
    | 'write_contacts'
    | 'read_wallet'
    | 'write_wallet'
    | 'read_messages'
    | 'write_messages'
    | 'read_feed'
    | 'write_feed'
    | 'read_calendar'
    | 'write_calendar'
    | 'read_location'
    | 'read_camera'
    | 'read_microphone'
    | 'read_storage'
    | 'write_storage'
    | 'read_notifications'
    | 'write_notifications'
    | 'network_access';

/**
 * App Capability Enum (what the app can do)
 */
export type AppCapability =
    | 'payments'           // Can process payments
    | 'nft_minting'        // Can mint NFTs
    | 'decentralized_storage' // Can use IPFS/Arweave
    | 'identity_verification' // Can verify identity
    | 'biometric_auth'     // Can use biometric auth
    | 'offline_mode'       // Can work offline
    | 'multiplayer'        // Supports multiplayer
    | 'real_time_updates'  // Real-time data
    | 'push_notifications'; // Can send push notifications

/**
 * App Status
 */
export type AppStatus =
    | 'draft'
    | 'pending_review'
    | 'approved'
    | 'rejected'
    | 'published'
    | 'suspended'
    | 'archived'
    | 'blacklisted';

/**
 * App Visibility
 */
export type AppVisibility =
    | 'public'
    | 'private'
    | 'unlisted'
    | 'invite_only'
    | 'whitelist_only';

/**
 * Monetization Model
 */
export interface AppMonetization {
    model: 'free' | 'freemium' | 'paid' | 'subscription' | 'in_app_purchases' | 'ads' | 'donation';
    details?: {
        price?: number;
        currency?: string;
        trialPeriodDays?: number;
        adProvider?: string;
        iapProducts?: InAppProduct[];
    };
}

/**
 * In-App Product
 */
export interface InAppProduct {
    name: string;
    description: string;
    type: 'consumable' | 'non_consumable' | 'subscription' | 'renewable_subscription';
    price: number;
    currency: string;
    features: string[];
}

/**
 * App Subscription
 */
export interface AppSubscription {
    available: boolean;
    plans?: SubscriptionPlan[];
    currentPlan?: string;
}
export interface SubscriptionPlan {
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: 'monthly' | 'yearly' | 'lifetime';
    features: string[];
}

/**
 * Data Collection Info
 */
export interface AppDataCollection {
    collects: DataCollectionType[];
    retentionDays?: number;
    thirdPartySharing?: ThirdPartyDataSharing[];
    privacyCompliance?: PrivacyCompliance[];
}
export type DataCollectionType =
    | 'personal_info'
    | 'usage_data'
    | 'device_info'
    | 'location'
    | 'contacts'
    | 'financial_info'
    | 'health_data';
export interface ThirdPartyDataSharing {
    name: string;
    purpose: string;
    privacyPolicyUrl: string;
}
export type PrivacyCompliance =
    | 'gdpr'
    | 'ccpa'
    | 'coppa'
    | 'hipaa';

/**
 * ================================================
 * APP INSTANCE & SESSION TYPES
 * ================================================
 */

/**
 * App Instance - A specific installation/instance of an app
 */
export interface IAppInstance {
    appId: string;                // Reference to IMiniApp.id
    // User-specific data
    userId: string;               // User who installed it
    identityId?: string;          // Identity used with this app
    // Installation info
    installedAt: Date;
    updatedAt: Date;
    version: string;              // Version installed
    autoUpdate: boolean;          // Auto-update enabled
    // Permissions granted by user
    grantedPermissions: AppPermission[];
    revokedPermissions: AppPermission[];
    // App state
    session?: IAppSession;        // Current session if running
    data?: Record<string, any>;   // App-specific persisted data
    // Usage stats
    lastLaunched?: Date;
    launchCount: number;
    totalTimeUsed: number;        // In seconds
    // Storage
    storageUsed: number;          // Bytes
    storageQuota?: number;        // Max storage allowed
    // Security
    verified: boolean;            // App integrity verified
    signature?: string;           // Digital signature
}

/**
 * App Session - Current running instance
 */
export interface IAppSession {
    instanceId: string;
    appId: string;
    // Session state
    status: 'starting' | 'running' | 'paused' | 'background' | 'terminated' | 'crashed';
    startedAt: Date;
    lastActiveAt: Date;
    // Context
    context: AppContext;
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    // Memory & performance
    memoryUsage?: number;
    cpuUsage?: number;
    networkUsage?: {
        bytesReceived: number;
        bytesSent: number;
    };
    // Security
    securityToken: string;        // Session token
    ipAddress?: string;
    userAgent?: string;
    // Data
    localStorage?: Record<string, any>;
    sessionStorage?: Record<string, any>;
    cookies?: Record<string, string>;
}

/**
 * App Context - Information provided to the app
 */
export interface AppContext {
    user: AppUserContext;
    device: AppDeviceContext;
    platform: AppPlatformContext;
    permissions: AppPermission[];
    capabilities: AppCapability[];
}
export interface AppUserContext {
    userId: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    walletAddress?: string;
    identityId?: string;
    locale?: string;
    timezone?: string;
}
export interface AppDeviceContext {
    type: 'mobile' | 'desktop' | 'tablet' | 'tv' | 'wearable';
    os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
    browser?: string;
    screen: {
        width: number;
        height: number;
        dpi: number;
    };
    storage: {
        total: number;
        available: number;
    };
    network: 'wifi' | 'cellular' | 'ethernet' | 'offline';
}
export interface AppPlatformContext {
    name: string;                 // "Dash Mini Apps", "Telegram", "Farcaster"
    version: string;
    sdkVersion: string;
    apiVersion: string;
    capabilities: string[];
    theme: 'light' | 'dark';
}

/**
 * ================================================
 * APP INTERACTION TYPES
 * ================================================
 */

/**
 * App Event - Communication from app to platform
 */
export interface IAppEvent {
    type: AppEventType;
    timestamp: Date;
    sessionId: string;
    metadata?: Record<string, any>;
}
export type AppEventType =
    | 'launch'
    | 'close'
    | 'pause'
    | 'resume'
    | 'error'
    | 'permission_request'
    | 'payment_request'
    | 'share_request'
    | 'storage_request'
    | 'network_request'
    | 'notification_request'
    | 'biometric_request'
    | 'custom';

/**
 * App Message - Communication between apps or app <-> platform
 */
export interface IAppMessage {
    from: string;                 // App ID or 'platform'
    to: string;                   // App ID or 'platform'
    type: 'request' | 'response' | 'broadcast' | 'event';
    payload: any;
    timestamp: Date;
    signature?: string;           // For verifying sender
    metadata?: {
        requestId?: string;       // For request/response pairs
        correlationId?: string;
        priority?: 'low' | 'normal' | 'high' | 'critical';
    };
}

/**
 * App Action - User-initiated action from platform to app
 */
export interface IAppAction {
    type: AppActionType;
    payload?: any;
    sessionId: string;
    timestamp: Date;
}
export type AppActionType =
    | 'navigate'
    | 'refresh'
    | 'share'
    | 'save'
    | 'bookmark'
    | 'rate'
    | 'review'
    | 'report'
    | 'install_update'
    | 'toggle_theme'
    | 'toggle_auto_update'
    | 'revoke_permission'
    | 'clear_data'
    | 'uninstall'
    | 'custom';

/**
 * App Notification
 */
export interface IAppNotification {
    appId: string;
    title: string;
    body: string;
    iconUrl?: string;
    imageUrl?: string;
    priority: 'low' | 'normal' | 'high';
    category?: string;
    data?: Record<string, any>;
    actions?: NotificationAction[];
    timestamp: Date;
    read: boolean;
    interacted: boolean;
}
export interface NotificationAction {
    title: string;
    type: 'button' | 'input';
    action?: string;              // URL or action identifier
    placeholder?: string;         // For input type
}

/**
 * ================================================
 * APP STORE & DISCOVERY TYPES
 * ================================================
 */

/**
 * App Store Listing
 */
export interface IAppStoreListing {
    appId: string;
    featured: boolean;
    ranking: number;              // For sorting in store
    featuredUntil?: Date;
    promotion?: {
        type: 'sale' | 'new' | 'updated' | 'trending' | 'editor_pick';
        badgeText?: string;
        badgeColor?: string;
    };
    statistics: {
        installs24h: number;
        installs7d: number;
        installs30d: number;
        rating24h?: number;
        retention7d?: number;     // Percentage of users still using after 7 days
    };
    categories: AppCategory[];
    tags: string[];
    supportedLanguages: string[];
    ageRestriction?: number;      // Minimum age in years
    regionRestrictions?: string[]; // ISO country codes where available
}

/**
 * App Review
 */
export interface IAppReview {
    appId: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    rating: 1 | 2 | 3 | 4 | 5;
    title?: string;
    content: string;
    versionReviewed?: string;     // App version when reviewed
    deviceInfo?: string;          // Device used
    helpfulCount: number;
    reportCount: number;
    reply?: {
        developerId: string;
        content: string;
        repliedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * App Analytics
 */
export interface IAppAnalytics {
    appId: string;
    date: Date;
    // Installation metrics
    newInstalls: number;
    uninstalls: number;
    totalInstalls: number;
    // Engagement metrics
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    returningUsers: number;
    // Session metrics
    sessions: number;
    averageSessionDuration: number; // In seconds
    totalTimeSpent: number;       // In seconds
    // Performance metrics
    crashRate: number;            // Percentage
    loadTime: number;             // Average in ms
    // Feature usage
    featureUsage: Record<string, number>; // Feature ID -> usage count
    // Revenue metrics (if applicable)
    revenue?: number;
    inAppPurchases?: number;
}

/**
 * ================================================
 * APP PAYMENT & ECONOMICS TYPES
 * ================================================
 */

/**
 * App Payment
 */
export interface IAppPayment {
    appId: string;
    userId: string;
    type: 'purchase' | 'subscription' | 'in_app_purchase' | 'donation' | 'ad_revenue';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    exchangeRate?: number;        // To USD if different currency
    productId?: string;           // For in-app purchases
    subscriptionId?: string;      // For subscription payments
    // Platform fees & revenue share
    platformFee: number;
    developerRevenue: number;
    networkFee?: number;
    transactionHash?: string;     // Blockchain transaction hash
    paymentMethod?: 'crypto' | 'credit_card' | 'in_app_balance' | 'free';
    metadata?: Record<string, any>;
    createdAt: Date;
    completedAt?: Date;
}

/**
 * App Revenue Summary
 */
export interface IAppRevenue {
    appId: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate: Date;
    totalRevenue: number;
    revenueByType: Record<string, number>;
    revenueByCurrency: Record<string, number>;
    platformFees: number;
    developerEarnings: number;
    activeSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    // In-app purchases
    iapRevenue: number;
    iapTransactions: number;
    topProducts: Array<{
        productId: string;
        name: string;
        revenue: number;
        transactions: number;
    }>;
}

/**
 * ================================================
 * APP DISCOVERY & RECOMMENDATION TYPES
 * ================================================
 */

/**
 * App Recommendation
 */
export interface IAppRecommendation {
    appId: string;
    reason: RecommendationReason;
    score: number;                // 0-100 recommendation score
    context?: RecommendationContext;
}
export type RecommendationReason =
    | 'similar_to_installed'
    | 'trending'
    | 'new_release'
    | 'editor_pick'
    | 'friends_using'
    | 'category_popular'
    | 'personalized';
export interface RecommendationContext {
    basedOnApp?: string;          // App that triggered recommendation
    userInterests?: string[];     // User's interests/tags
    friendsUsing?: string[];      // Friend IDs also using
}

/**
 * App Search Result
 */
export interface IAppSearchResult {
    app: IMiniApp;
    relevance: number;            // 0-1 relevance score
    matchReason: string;          // Why it matched the search
    highlightedMatches?: {
        name?: string[];
        description?: string[];
        tags?: string[];
    };
}

/**
 * ================================================
 * UTILITY TYPES & HELPERS
 * ================================================
 */

/**
 * App Filter Options
 */
export interface IAppFilterOptions {
    category?: AppCategory | AppCategory[];
    status?: AppStatus;
    visibility?: AppVisibility;
    platforms?: AppPlatform[];
    permissions?: AppPermission[];
    capabilities?: AppCapability[];
    minRating?: number;
    priceRange?: { min?: number; max?: number };
    installedOnly?: boolean;
    verifiedOnly?: boolean;
    searchTerm?: string;
    tags?: string[];
    supportedChains?: string[];
    sortBy?: 'name' | 'rating' | 'installs' | 'price' | 'recent' | 'trending';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

/**
 * App Installation Request
 */
export interface IAppInstallRequest {
    appId: string;
    userId: string;
    permissions?: AppPermission[];
    autoUpdate?: boolean;
    installContext?: {
        source: 'store' | 'url' | 'qr' | 'friend' | 'ad';
        referrer?: string;
        campaign?: string;
    };
}

/**
 * App Update Check
 */
export interface IAppUpdateCheck {
    appId: string;
    currentVersion: string;
    availableVersion?: string;
    updateAvailable: boolean;
    updateType?: 'patch' | 'minor' | 'major' | 'security';
    changelog?: string;
    size?: number;                // Update size in bytes
    mandatory: boolean;
}

/**
 * App Backup/Restore
 */
export interface IAppBackup {
    appId: string;
    userId: string;
    timestamp: Date;
    data: Record<string, any>;
    settings: Record<string, any>;
    version: string;
    hash: string;                 // For verification
}

/**
 * App Error/Diagnostics
 */
export interface IAppError {
    appId: string;
    userId?: string;
    sessionId?: string;
    type: 'crash' | 'error' | 'warning' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    stackTrace?: string;
    code?: string;
    context: {
        appVersion: string;
        platformVersion: string;
        deviceInfo?: string;
        networkStatus?: string;
        memoryUsage?: number;
    };
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

// Helper type for app lists with pagination
export interface PaginatedAppList {
    apps: IMiniApp[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// Helper type for app statistics
export type AppStats = {
    totalApps: number;
    byCategory: Record<AppCategory, number>;
    byStatus: Record<AppStatus, number>;
    newThisWeek: number;
    topRated: IMiniApp[];
    trending: IMiniApp[];
};

// Type guard for IMiniApp
export function isMiniApp(obj: any): obj is IMiniApp {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.version === 'string' &&
        typeof obj.appUrl === 'string';
}

// Type guard for IAppInstance
export function isAppInstance(obj: any): obj is IAppInstance {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.appId === 'string' &&
        typeof obj.userId === 'string' &&
        obj.installedAt instanceof Date;
}
