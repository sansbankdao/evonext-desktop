// src/types/settings.ts

export interface IAppSettings {
    network: 'testnet' | 'mainnet';
    theme: string;
    notifications: {
        messages: boolean;
        mentions: boolean;
        contact_requests: boolean;
    }
    profile: {
        display_name: string;
        username: string;
        bio: string;
    }
}

export interface IProfileSettings {
    display_name: string;
    username: string;
    bio: string;
}

export interface INotificationSettings {
    messages: boolean;
    mentions: boolean;
    contact_requests: boolean;
}

export interface ISettingsState {
    theme: 'system' | 'light' | 'dark';
    network: string;
    notifications: INotificationSettings;
    profile: IProfileSettings;
    isLoading: boolean;
    error: string | null;
    lastSaved: Date | null;
}
