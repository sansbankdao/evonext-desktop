// src/types/assets.ts

// Existing interfaces...
export interface IAsset {
    // Core Asset Metadata
    id: string;                    // Unique identifier (e.g., contract tokenId or 'DASH' for native)
    name: string;                  // Human-readable name (e.g., "Dash", "USD Coin")
    symbol: string;                // Ticker symbol (e.g., "DASH", "USDC", "USD")
    precision: number;             // Decimal places (e.g., 8 for DASH, 2 for USD, 18 for most ERC20)

    // Asset Classification
    type: 'native' | 'token' | 'stablecoin' | 'nft' | 'governance' | 'utility';
    category: 'currency' | 'stablecoin' | 'defi' | 'nft' | 'governance';
    network: 'mainnet' | 'testnet' | 'devnet';
    protocol?: string;             // e.g., 'DPP', 'ERC-20', 'BEP-20'

    // Balance Information
    balance: number;               // Raw amount (in smallest unit, e.g., satoshis)
    balanceFormatted?: string;    // User-friendly formatted string (e.g., "1.23456789 DASH")
    availableBalance?: number;     // Amount available for transfers (excluding locked/staked)
    lockedBalance?: number;        // Amount locked/staked

    // Contract/Chain Data
    contractId?: string;           // For tokens: the data contract ID
    assetIndex?: number;           // Index in the asset registry
    data?: string;                 // Additional contract data (JSON string or encoded)

    // Identity/OWNERSHIP
    ownerIdentityId: string;       // The identity that owns this asset
    isOwned: boolean;              // True if this identity owns it

    // Value/Price Information
    usdValue?: number;            // Current USD value
    priceUsd?: number;            // Price per 1 unit in USD
    priceChange24h?: number;      // Percentage change in last 24h
    marketCap?: number;           // Market capitalization (if applicable)

    // Display/UI Properties
    icon?: string;                // URL or icon name
    color?: string;               // Brand color or theme color
    description?: string;
    website?: string;
    explorerUrl?: string;         // Link to blockchain explorer

    // Security & Compliance
    verified: boolean;            // Whether asset is verified/whitelisted
    blocked: boolean;             // Whether asset is blocked/blacklisted

    // Transaction Capabilities
    transferable: boolean;        // Can be sent/received
    divisible: boolean;           // Can be divided into smaller units
    burnable?: boolean;           // Can be burned/destroyed

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];              // For filtering/categorization
}

// For native assets like DASH
export interface INativeAsset extends IAsset {
    type: 'native';
    protocol: 'DPP';
    category: 'currency';
    transferable: true;
    divisible: true;
    // Additional L1-specific fields
    utxoCount?: number;
    unconfirmedBalance?: number;
}

// For stablecoins
export interface IStablecoinAsset extends IAsset {
    type: 'stablecoin';
    pegTo: 'USD' | 'EUR' | 'GBP' | 'CNY';
    issuer?: string;
    auditReportUrl?: string;
}

// For NFTs (Non-Fungible Tokens)
export interface INFTAsset extends IAsset {
    type: 'nft';
    tokenId: string;
    metadata?: {
        image?: string;
        animation_url?: string;
        attributes?: Array<{
            trait_type: string;
            value: string | number;
        }>;
        description?: string;
        external_url?: string;
    };
    collection?: {
        name: string;
        contractId: string;
        verified: boolean;
    };
    transferable: boolean;        // Some NFTs might not be transferable
    divisible: false;
}

// For governance tokens
export interface IGovernanceAsset extends IAsset {
    type: 'governance';
    votingPower: number;
    delegationEnabled: boolean;
    delegatedTo?: string;         // Identity ID delegated to
}

// Asset balance summary (for wallet overview)
export interface IAssetBalance {
    assetId: string;
    symbol: string;
    balance: number;
    balanceFormatted: string;
    usdValue: number;
    percentage: number;           // Percentage of total portfolio
}

// Asset filters for UI
export interface IAssetFilters {
    type?: IAsset['type'] | 'all';
    category?: IAsset['category'] | 'all';
    network?: IAsset['network'] | 'all';
    search?: string;
    verifiedOnly?: boolean;
    transferableOnly?: boolean;
}

// Asset price update
export interface IAssetPriceUpdate {
    assetId: string;
    priceUsd: number;
    priceChange24h?: number;
    updatedAt: Date;
}

// For your Rust struct compatibility:
// You can keep a minimal version for Tauri IPC:
export interface IAssetMinimal {
    identity_id: string;
    name: string;
    symbol: string;
    // ... add other fields as needed for Rust compatibility
}
