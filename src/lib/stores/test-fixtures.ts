import { vi } from 'vitest';
import type { 
    Account, Currency, Market, AssetType, Modality, 
    Timeframe, ChartType, Indicator, RiskProfile, AssetRiskProfile, 
    Asset 
} from '$lib/types';

// Mocked Tauri Invoke Interceptor
export function setupTauriMock(mockResponses: Record<string, any> = {}) {
    return vi.fn().mockImplementation((cmd: string) => {
        if (cmd in mockResponses) {
            return Promise.resolve(mockResponses[cmd]);
        }
        return Promise.resolve([]);
    });
}

// -----------------------------------------------------
// Core Domain Fixtures
// -----------------------------------------------------

export const mockCurrencies: Currency[] = [
    { id: 'currency:USD', code: 'USD', name: 'US Dollar', symbol: '$' },
    { id: 'currency:BRL', code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

export const mockMarkets: Market[] = [
    { id: 'market:B3', name: 'B3 - Brasil Bolsa Balcão', code: 'B3', country: 'BR' },
    { id: 'market:NASDAQ', name: 'NASDAQ', code: 'NASDAQ', country: 'US' },
];

export const mockAssetTypes: AssetType[] = [
    { id: 'type_stock_br', name: 'Ações BR', code: 'STK_BR', market_id: 'market:B3', has_expiration: false, tax_profile_id: 'tax_br' },
    { id: 'type_fut_br', name: 'Futuros BR', code: 'FUT_BR', market_id: 'market:B3', has_expiration: true, tax_profile_id: 'tax_br_fut' },
];

export const mockAccounts: Account[] = [
    {
        id: 'account:1',
        nickname: 'Main B3 Account',
        account_type: 'real',
        broker: 'BTG Pactual',
        account_number: '12345-6',
        currency_id: 'currency:BRL',
        currency: 'BRL',
        balance: 10000,
        custom_logo: null
    },
    {
        id: 'account:2',
        nickname: 'Forex Demo',
        account_type: 'demo',
        broker: 'IC Markets',
        account_number: 'DEMO-99',
        currency_id: 'currency:USD',
        currency: 'USD',
        balance: 50000,
        custom_logo: null
    }
];

export const mockAssets: Asset[] = [
    {
        id: 'asset:PETR4',
        symbol: 'PETR4',
        name: 'Petrobras PN',
        market_id: 'market:B3',
        asset_type_id: 'type_stock_br',
        currency_id: 'currency:BRL',
        point_value: 1,
        tick_size: 0.01,
        is_active: true
    },
    {
        id: 'asset:WIN',
        symbol: 'WIN',
        name: 'Mini Índice',
        market_id: 'market:B3',
        asset_type_id: 'type_fut_br',
        currency_id: 'currency:BRL',
        point_value: 0.20, // BRL per point
        tick_size: 5,
        is_active: true
    }
];

export const mockRiskProfiles: RiskProfile[] = [
    {
        id: 'risk_profile:1',
        name: 'Agressivo B3',
        account_ids: ['account:1'],
        max_daily_loss: 500,
        max_weekly_loss: 2000,
        max_monthly_loss: 5000,
        max_consecutive_losses: 3,
        daily_profit_target: 1000,
        active: true,
        growth_params: null,
        linked_asset_risk_profile_ids: ['asset_risk:WIN'],
        combined_rules: []
    } as any
];

export const mockAssetRiskProfiles: AssetRiskProfile[] = [
    {
        id: 'asset_risk:WIN',
        asset_id: 'asset:WIN',
        min_contracts: 1,
        max_contracts: 10,
        default_stop_points: 150,
        default_take_profit_points: 300,
        max_daily_trades: 5,
        allowed_trading_hours: null
    } as any
];

export const mockModalities: Modality[] = [
    { id: 'modality:daytrade', name: 'Day Trade', code: 'DT', description: 'Abrir e fechar no mesmo dia' },
    { id: 'modality:swing', name: 'Swing Trade', code: 'SW', description: 'Posição por dias' }
];

export const mockTimeframes: Timeframe[] = [
    { id: 'timeframe:m5', name: '5 Minutos', code: 'M5', minutes: 5 },
    { id: 'timeframe:d1', name: 'Diário', code: 'D1', minutes: 1440 }
];

export const mockChartTypes: ChartType[] = [
    { id: 'chart:candles', name: 'Candlestick', code: 'CANDLE' },
    { id: 'chart:renko', name: 'Renko', code: 'RENKO' }
];

export const mockIndicators: Indicator[] = [
    { id: 'ind:vwap', name: 'VWAP', code: 'VWAP', category: 'Volume' },
    { id: 'ind:rsi', name: 'RSI', code: 'RSI', category: 'Momentum' }
];
