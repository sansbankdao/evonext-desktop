// src/types/system.ts

import type { IUser } from './identity'
import type { IPost } from './posts'

export interface IApp {
    creatorId: IUser;
    canvasId: string;
    type: 'blog' | 'game' | null | undefined;
    engine: 'p5' | 'phaser' | 'godot' | null | undefined;
    content: string;
    likes: number;
    createdAt: Date;
}

export interface IAppState {
    currentUser: IUser | null;
    theme: 'light' | 'dark';
    isComposeOpen: boolean;
    replyingTo: IPost | null;
    setCurrentUser: (user: IUser | null) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    setComposeOpen: (open: boolean) => void;
    setReplyingTo: (post: IPost | null) => void;
}

export interface ILicense {
    success: boolean;
    identityId: string;
    txid: string;
    isPremium: boolean;
    createdAt: number;
    expiresAt: number;
    updatedAt?: number;
}

export interface INetwork {
    network: string;
}

export interface IDashPriceData {
    name: string;
    symbol: string;
    slug: string;
    quote: {
        USD: {
            price: number;
            pctChg24h: number;
            vol24: number;
            marketCap: number;
        };
    };
    maxSupply: number;
    cmcRank: number;
    updatedAt: string;
}

export interface ISystemState {
    dashPrice: number | null;
    dashPriceData: IDashPriceData | null;
    isLoading: boolean;
    lastUpdated: Date | null;
    error: string | null;
    priceUpdateInterval: number | null;
}

// New types for store operations
export interface StoreOperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface StoreKeys {
    assets: string;
    identity: string;
    license: string;
    mnemonic: string;
    keys: string;
    settings: string;
}

// Type for environment configuration
export interface EnvironmentConfig {
    defaultNetwork: 'testnet' | 'mainnet';
    dashswapEndpoint: string;
    dapiWebApiEndpoint: string;
    platformHttpApiMainnet: string;
    platformHttpApiTestnet: string;
    priceUpdateIntervalMs: number;
    balanceRefreshIntervalMs: number;
    enablePremiumFeatures: boolean;
    enableAutoUpdate: boolean;
}
