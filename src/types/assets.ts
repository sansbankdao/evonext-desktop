// src/types/assets.ts

export interface IAsset {
    // Core Asset Metadata
    id: string;                    // Unique identifier (e.g., contract tokenId or 'DASH' for native)
    name: string;                  // Human-readable name (e.g., "Dash", "USD Coin")
    symbol: string;                // Ticker symbol (e.g., "DASH", "USDC", "USD")
    precision: number;             // Decimal places (e.g., 8 for DASH, 2 for USD, 18 for most ERC20)

    // Asset Classification
    type: 'native' | 'token' | 'stablecoin' | 'nft' | 'governance' | 'utility';
    category: 'currency' | 'stablecoin' | 'defi' | 'nft' | 'governance' | 'utility';
    network: 'mainnet' | 'testnet' | 'devnet' | string; // Allow custom networks
    protocol?: string;             // e.g., 'DPP', 'ERC-20', 'BEP-20'

    // Balance Information
    balance: number;               // Raw amount (in smallest unit, e.g., satoshis, wei)
    balanceFormatted: string;     // User-friendly formatted string (e.g., "1.23456789 DASH")
    availableBalance?: number;     // Amount available for transfers (excluding locked/staked)
    lockedBalance?: number;        // Amount locked/staked
    pendingBalance?: number;       // Pending/unconfirmed balance

    // Identity/OWNERSHIP
    ownerIdentityId: string;       // The identity that owns this asset
    isOwned: boolean;              // True if this identity owns it

    // Contract/Chain Data (for tokens)
    contractId?: string;           // For tokens: the data contract ID
    assetIndex?: number;           // Index in the asset registry
    data?: string;                 // Additional contract data (JSON string or encoded)
    metadataUrl?: string;          // URL to asset metadata

    // Value/Price Information
    usdValue?: number;            // Current USD value of the entire balance
    priceUsd?: number;            // Price per 1 unit in USD
    priceChange24h?: number;      // Percentage change in last 24h
    marketCap?: number;           // Market capitalization (if applicable)
    totalSupply?: number;         // Total circulating supply
    volume24h?: number;           // 24h trading volume

    // Display/UI Properties
    icon?: string;                // URL or icon name (can be data URL)
    color?: string;               // Brand color or theme color (hex/rgb)
    description?: string;         // Short description
    website?: string;             // Official website
    explorerUrl?: string;         // Link to blockchain explorer
    socialLinks?: {
        twitter?: string;
        discord?: string;
        telegram?: string;
        github?: string;
    };

    // Security & Compliance
    verified: boolean;            // Whether asset is verified/whitelisted
    blocked: boolean;             // Whether asset is blocked/blacklisted
    auditReportUrl?: string;      // Link to security audit
    issuer?: string;              // Issuing entity/organization

    // Transaction Capabilities
    transferable: boolean;        // Can be sent/received
    divisible: boolean;           // Can be divided into smaller units
    burnable?: boolean;           // Can be burned/destroyed
    mintable?: boolean;           // Can new tokens be minted
    maxSupply?: number;           // Maximum supply (if capped)

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    lastPriceUpdate?: Date;
    tags?: string[];              // For filtering/categorization (e.g., ['defi', 'governance'])

    // Platform-specific
    platformSpecific?: {
        // Dash Platform specific
        dpp?: {
            contractId: string;
            documentType: string;
            requiresIdentity?: boolean;
        };
        // EVM/Ethereum specific
        evm?: {
            contractAddress: string;
            chainId: number;
            abi?: any;
            decimals: number;
        };
        // Other chains
        solana?: {
            mintAddress: string;
            decimals: number;
        };
    };
}

// For native assets like DASH (Layer 1)
export interface INativeAsset extends IAsset {
    type: 'native';
    protocol: 'DPP' | 'UTXO' | string;
    category: 'currency';
    transferable: true;
    divisible: true;
    // Additional L1-specific fields
    utxoCount?: number;
    unconfirmedBalance?: number;
    transactionCount?: number;
    isDefault?: boolean;          // Is this the network's native token
}

// For stablecoins
export interface IStablecoinAsset extends IAsset {
    type: 'stablecoin';
    pegTo: 'USD' | 'EUR' | 'GBP' | 'CNY' | string;
    pegValue: number;             // 1:1 for USD, 0.85 for EUR, etc.
    issuer?: string;
    auditReportUrl?: string;
    collateral?: {
        type: 'fiat-backed' | 'crypto-backed' | 'algorithmic';
        ratio?: number;           // Collateralization ratio
        assets?: string[];        // Backing assets
    };
}

// For NFTs (Non-Fungible Tokens)
export interface INFTAsset extends IAsset {
    type: 'nft';
    category: 'nft';
    divisible: false;
    tokenId: string;
    collectionId?: string;
    metadata?: {
        name?: string;
        description?: string;
        image?: string;
        animation_url?: string;
        external_url?: string;
        attributes?: Array<{
            trait_type: string;
            value: string | number;
            display_type?: 'string' | 'number' | 'date' | 'boost_percentage' | 'boost_number';
        }>;
        properties?: Record<string, any>;
    };
    collection?: {
        name: string;
        contractId: string;
        verified: boolean;
        description?: string;
        externalUrl?: string;
    };
    royalty?: {
        percentage: number;
        recipient?: string;
    };
}

// For governance tokens
export interface IGovernanceAsset extends IAsset {
    type: 'governance';
    category: 'governance';
    votingPower: number;
    delegationEnabled: boolean;
    delegatedTo?: string;         // Identity ID delegated to
    votingProposals?: {
        active: number;
        participated: number;
        total: number;
    };
}

// For utility tokens (platform tokens, gas tokens, etc.)
export interface IUtilityAsset extends IAsset {
    type: 'utility';
    category: 'utility';
    utilityType: 'gas' | 'staking' | 'access' | 'reward' | 'other';
    burnable?: boolean;
    mintable?: boolean;
}

// Asset balance summary (for wallet overview)
export interface IAssetBalance {
    assetId: string;
    symbol: string;
    name: string;
    balance: number;
    balanceFormatted: string;
    usdValue: number;
    percentage?: number;           // Percentage of total portfolio
    change24h?: number;           // 24h change in USD value
}

// Asset price update
export interface IAssetPriceUpdate {
    assetId: string;
    symbol: string;
    priceUsd: number;
    priceChange24h?: number;
    volume24h?: number;
    marketCap?: number;
    updatedAt: Date;
}

// Asset statistics for charts/analytics
export interface IAssetStats {
    assetId: string;
    symbol: string;
    timestamp: Date;
    priceUsd: number;
    volume24h: number;
    marketCap?: number;
}

// Asset filters for UI
export interface IAssetFilters {
    type?: IAsset['type'] | 'all' | IAsset['type'][];
    category?: IAsset['category'] | 'all' | IAsset['category'][];
    network?: IAsset['network'] | 'all' | IAsset['network'][];
    search?: string;
    verifiedOnly?: boolean;
    transferableOnly?: boolean;
    minBalance?: number;
    maxBalance?: number;
    sortBy?: 'name' | 'symbol' | 'balance' | 'usdValue' | 'priceChange24h';
    sortOrder?: 'asc' | 'desc';
}

// For your Rust struct compatibility:
// Minimal version for Tauri IPC (keeping your exact field names)
export interface IAssetMinimal {
    identity_id: string;
    name: string;
    symbol: string;
    // Optional fields that might be useful
    asset_id?: string;
    balance?: number;
    precision?: number;
    network?: string;
}

// Asset import/export structure
export interface IAssetImport {
    assetId: string;
    contractId?: string;
    network: string;
    metadata?: Partial<IAsset>;
}

// Asset validation result
export interface IAssetValidation {
    valid: boolean;
    asset?: IAsset;
    errors?: string[];
    warnings?: string[];
}

// Portfolio summary
export interface IPortfolioSummary {
    totalValue: number;
    totalAssets: number;
    change24h: number;
    change24hPercent: number;
    byType: Record<string, { count: number; value: number }>;
    byNetwork: Record<string, { count: number; value: number }>;
    assets: IAssetBalance[];
    lastUpdated: Date;
}
