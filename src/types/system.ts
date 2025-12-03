// src/types/settings.ts

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
        }
    }
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
