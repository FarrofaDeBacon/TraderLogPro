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
    { id: 'currency:USD', code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 5 },
    { id: 'currency:BRL', code: 'BRL', name: 'Brazilian Real', symbol: 'R$', exchange_rate: 1 },
];

export const mockMarkets: Market[] = [
    { id: 'market:B3', name: 'B3 - Brasil Bolsa Balcão', code: 'B3', timezone: 'America/Sao_Paulo', trading_days: [], trading_sessions: [] },
    { id: 'market:NASDAQ', name: 'NASDAQ', code: 'NASDAQ', timezone: 'America/New_York', trading_days: [], trading_sessions: [] },
];

export const mockAssetTypes: AssetType[] = [
    { id: 'type_stock_br', name: 'Ações BR', code: 'STK_BR', market_id: 'market:B3', tax_profile_id: 'tax_br', unit_label: '', result_type: 'currency' },
    { id: 'type_fut_br', name: 'Futuros BR', code: 'FUT_BR', market_id: 'market:B3', tax_profile_id: 'tax_br_fut', unit_label: '', result_type: 'points' },
];

export const mockAccounts: Account[] = [
    {
        id: 'account:1',
        nickname: 'Main B3 Account',
        account_type: 'Real',
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
        account_type: 'Demo',
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
        asset_type_id: 'type_stock_br',
        point_value: 1,
        is_root: true
    },
    {
        id: 'asset:WIN',
        symbol: 'WIN',
        name: 'Mini Índice',
        asset_type_id: 'type_fut_br',
        point_value: 0.20, // BRL per point
        is_root: true
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
    { id: 'modality:daytrade', name: 'Day Trade', description: 'Abrir e fechar no mesmo dia' },
    { id: 'modality:swing', name: 'Swing Trade', description: 'Posição por dias' }
];

export const mockTimeframes: Timeframe[] = [
    { id: 'timeframe:m5', name: '5 Minutos', value: '5' },
    { id: 'timeframe:d1', name: 'Diário', value: '1440' }
];

export const mockChartTypes: ChartType[] = [
    { id: 'chart:candles', name: 'Candlestick', base_type: 'TimeBased', parameter: '' },
    { id: 'chart:renko', name: 'Renko', base_type: 'Renko', parameter: '' }
];

export const mockIndicators: Indicator[] = [
    { id: 'ind:vwap', name: 'VWAP', category: 'Volume' },
    { id: 'ind:rsi', name: 'RSI', category: 'Oscillator' }
];
