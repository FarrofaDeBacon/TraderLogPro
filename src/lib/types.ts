
export type TradingSession = {
    start_time: string;  // "HH:MM" format
    end_time: string;    // "HH:MM" format
};

export type Market = {
    id: string;
    code: string;
    name: string;
    timezone: string;
    trading_days: number[];
    trading_sessions: TradingSession[];
};

export type AssetType = {
    id: string;
    name: string;
    code: string;
    market_id: string;
    default_fee_id?: string;
    tax_profile_id?: string; // New field
    unit_label: string;
    result_type: "points" | "currency";
};

// ... (other types remain)

export type TaxRule = {
    id: string;
    name: string; // e.g., "Swing Trade Ações", "Day Trade Geral"
    tax_rate: number; // Percentage (e.g., 20.0, 15.0)
    withholding_rate: number; // "Dedo-duro" (e.g., 1.0, 0.005)
    exemption_threshold: number; // 0 for none, 20000 for Stocks
    basis: string; // "NetProfit" | "GrossProfit"
    cumulative_losses: boolean; // Can offset past losses? (True for most)
    trade_type: string; // "DayTrade" | "SwingTrade"
    withholding_basis: string; // "Profit" | "SalesVolume"
    revenue_code: string; // e.g., "6015", "3317"
};

export type TaxProfile = {
    id: string;
    name: string;
    description?: string;
};

export type TaxProfileEntry = {
    id: string;
    tax_profile_id: string;
    modality_id: string;
    tax_rule_id: string;
};

export type TaxMapping = {
    id: string;
    asset_type_id: string; // FK to AssetType
    modality_id: string; // FK to Modality ("Day Trade", "Swing Trade")
    tax_rule_id: string; // FK to TaxRule
};

export type Asset = {
    id: string;
    symbol: string;
    name: string;
    asset_type_id: string;
    point_value: number;
    // Position Sizing Config
    contract_size?: number;
    /** @deprecated Use min_contracts on AssetRiskProfile instead */
    min_contracts?: number;
    /** @deprecated Use max_contracts on AssetRiskProfile instead */
    max_contracts?: number;
    /** @deprecated Use default_stop_points on AssetRiskProfile instead */
    default_stop_points?: number;
    default_fee_id?: string;
    tax_profile_id?: string;
    is_root: boolean;
    root_id?: string;
};

export type Currency = {
    id: string;
    code: string;
    symbol: string;
    name: string;
    exchange_rate: number;
};

export type Account = {
    id: string;
    nickname: string;
    account_type: "Real" | "Demo" | "Prop";
    broker: string;
    account_number: string;
    currency: string;
    currency_id?: string;
    balance: number;
    custom_logo: string | null;
};

export type JournalEntry = {
    id: string;
    date: string;
    content: string;
    emotional_state_id: string | null;
    intensity: number;
    followed_plan?: boolean;
    risk_accepted?: boolean;
    market_context?: string;
    daily_score?: number;
};

export type Trade = {
    id: string;
    date: string; // YYYY-MM-DD
    asset_symbol: string;
    asset_type_id: string;
    strategy_id: string;
    account_id: string;
    result: number; // In Account Currency
    quantity: number;
    direction: "Buy" | "Sell";
    entry_price: number;
    exit_price: number | null;
    exit_date: string | null;
    fee_total: number;
    notes: string;

    // Technical Context
    timeframe: string;
    volatility: string;

    // Entry Psychology
    entry_emotional_state_id: string | null;
    entry_emotional_state_name: string | null;

    // Closing Context
    exit_reason: string | null;
    exit_emotional_state_id: string | null;
    exit_emotional_state_name: string | null;

    // Deep Analysis
    entry_rationale: string;
    confirmation_signals: string;
    market_context: string;
    relevant_news: string;
    psychology_analysis_during: string;

    followed_plan: boolean;
    what_worked: string;
    mistakes_improvements: string;
    lessons_learned: string;

    images: string[];
    partial_exits: any[];
    modality_id: string | null;
    stop_loss: number | null;
    take_profit: number | null;
    intensity: number;
    asset_id?: string;
    
    // Processed fields for high-performance dashboard calculations
    processed_timestamp?: number;
    processed_result_brl?: number;
};

export type Strategy = {
    id: string;
    name: string;
    description: string;
    market_ids: string[];
    timeframes: string[];
    asset_types: string[];
    indicators: string[];
    specific_assets: string[];
    entry_criteria: string;
    exit_criteria: string;
    management_criteria: string;
    has_partial: boolean;
    partial_description: string;
    images: { path: string, description: string }[];
};

export type UserProfile = {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    theme: "light" | "dark" | "system" | "";
    language: string;
    timezone: string;
    main_currency: string;
    avatar: string | null;
    convert_all_to_main: boolean;
    onboarding_completed: boolean;
    currency_api_url: string;
    birth_date: string | null;
    trial_start_date: string | null;
    license_key: string | null;
    password_hash?: string;
    recovery_hash?: string;
    utc_offset: number;
};

export type EmotionalState = {
    id: string;
    name: string;
    impact: 'Positive' | 'Negative' | 'Neutral';
    description: string;
    potential_impact: string;
    weight: number;
};

export type Tag = {
    id: string;
    name: string;
    color: string;
};

export type Indicator = {
    id: string;
    name: string;
    category?: 'Trend' | 'Oscillator' | 'Volume' | 'Other';
    plot_type?: 'Overlay' | 'SubWindow';
    default_color?: string;
    usage_description?: string;
    parameters?: { key: string, value: string }[];
};

export type Timeframe = {
    id: string;
    name: string;
    value: string;
};

export type ChartType = {
    id: string;
    name: string;
    base_type?: 'TimeBased' | 'Renko' | 'Range';
    parameter?: string;
};

export type ApiConfig = {
    id: string;
    provider: string; // openai, custom, etc.
    api_key: string;
    enabled: boolean;
    daily_limit: number;
    requests_today: number;
    extra_config: string;
};

export type CashTransaction = {
    id: string;
    date: string; // YYYY-MM-DD
    amount: number;
    type: "Deposit" | "Withdraw" | "Adjustment" | "DailyResult";
    description: string;
    account_id: string;
    trade_ids?: string[];
    category?: string;
    system_linked?: boolean;
};

export type Modality = {
    id: string;
    name: string;
    description?: string;
};

export type FeeCustomItem = {
    id: string;
    name: string;
    value: number;
    type: "fixed" | "percentage";
    category: "cost" | "tax";
};

export type FeeProfile = {
    id: string;
    name: string;
    broker: string;
    account_id?: string;
    fixed_fee: number;
    percentage_fee: number;
    exchange_fee: number;
    iss: number;
    currency_spread: number;
    withholding_tax: number;
    income_tax_rate: number;
    custom_items: FeeCustomItem[];
    tax_rule_id?: string;
    notes: string;
};

export type TaxAppraisal = {
    id: string;
    name: string;
    broker: string;
    tax_rate: number;
    tax_due: number;
    withheld_tax: number;
    withholding_credit_used: number;
    withholding_credit_remaining: number;
    tax_payable: number;
    tax_accumulated: number;
    total_payable: number;
    is_exempt: boolean;
    calculation_date: string;
    status: "Pending" | "Paid" | "Ok";
    trade_ids: string[];
};

export type TaxLoss = {
    id?: string;
    trade_type: string;
    amount: number;
    origin_date: string;
    balance: number;
};

export type RiskCondition = {
    metric: string;
    operator: string;
    value: number;
};

export type GrowthPhase = {
    id?: string;
    level: number;
    name: string;
    lot_size: number;
    conditions_to_advance: RiskCondition[];
    conditions_to_demote: RiskCondition[];
};

export type GrowthPlan = {
    id: string;
    name: string;
    enabled: boolean;
    current_phase_index: number;
    currentPhaseStartedAt?: string; // ISO String
    phases: GrowthPhase[];
    daily_loss_mode?: 'accumulate' | 'recover';
    phase_drawdown_mode?: 'accumulate' | 'recover';
    phase_target_mode?: 'cumulative' | 'reset_each_phase';
    target_unit: 'financial' | 'points';
    drawdown_unit: 'financial' | 'points';
};

export type RiskProfile = {
    id: string;
    name: string;
    /** @deprecated Superseded by RiskRule(target_type='max_daily_loss') */
    max_daily_loss: number;
    /** @deprecated Superseded by RiskRule(target_type='profit_target') */
    daily_target: number;
    max_risk_per_trade_percent: number;
    /** @deprecated Superseded by RiskRule(target_type='max_trades_per_day') */
    max_trades_per_day: number;
    min_risk_reward: number;
    lock_on_loss: boolean;
    account_type_applicability: 'All' | 'Prop' | 'Real' | 'Demo' | 'Specific';
    account_ids: string[];
    target_type: "Financial" | "Points";
    capital_source: "Fixed" | "LinkedAccount";
    fixed_capital: number;
    linked_account_id: string | null;
    psychological_coupling_enabled: boolean;
    outlier_regression_enabled: boolean;
    sniper_mode_enabled: boolean;
    sniper_mode_selectivity: number;
    psychological_lookback_count: number;
    outlier_lookback_count: number;
    psychological_threshold: number;
    lot_reduction_multiplier: number;
    psychological_search_strategy: 'Strict' | 'Sequence';
    active: boolean;
    /** @deprecated Superseded by AssetRiskProfile context */
    default_stop_points?: number;
    /** @deprecated Superseded by AssetRiskProfile context */
    min_contracts?: number;
    /** @deprecated Superseded by AssetRiskProfile context */
    max_contracts?: number;
    linked_asset_risk_profile_ids?: string[];
    /** @deprecated Superseded by RiskRule(scope='combined') */
    combined_rules?: CombinedRiskRule[];
    risk_rules?: RiskRule[];
    desk_config?: DeskConfig;
    growth_plan_id?: string;
    use_advanced_rules?: boolean;
};

export type DeskStage = {
    id: string; // e.g., 'margin_building', 'real_phase_1', 'real_final'
    name: string;
    enabled: boolean;
    mdr_mode: 'none' | 'fixed' | 'percent_of_margin';
    mdr_percent?: number;
    mdr_limit_cap?: number;
    min_trading_days?: number;
    rule_50_percent_enabled: boolean;
    consistency_enabled: boolean;
};

export type DeskConfig = {
    enabled: boolean;
    plan_name?: string;
    /** @deprecated Superseded by RiskProfile.linked_asset_risk_profile_ids */
    allowed_asset_ids?: string[];
    /** @deprecated Superseded by RiskRule(target_type='sum_contracts', scope='combined') */
    max_combined_exposure?: number;
    /** @deprecated Superseded by RiskRule(target_type='max_total_loss' or 'max_daily_loss') */
    max_total_loss?: number;
    /** @deprecated Superseded by RiskRule(target_type='profit_target') */
    profit_target?: number;
    /** @deprecated Superseded by RiskRule(target_type='day_trade_only') */
    day_trade_only?: boolean;
    /** @deprecated Superseded by RiskRule(target_type='close_before_close') */
    close_before_market_close_minutes?: number;
    /** @deprecated Superseded by RiskRule(target_type='consistency') */
    consistency_mode?: 'none' | '5days_3positive' | '10days_5positive' | '5days_3positive_or_10days_5positive';
    /** @deprecated Superseded by RiskRule(target_type='rule_50_percent') */
    max_single_day_profit_share?: number;
    min_trading_days?: number;
    mdr_mode?: 'none' | 'fixed' | 'percent_of_margin';
    stages?: DeskStage[];
    current_stage_index?: number;
};

/**
 * Resultado da auditoria/validação de progressão de um estágio operacional da Mesa
 */
export type DeskStageProgressionResult = {
  current_stage_id: string;
  can_advance: boolean;
  next_stage_id?: string;
  should_remain: boolean;
  should_regress?: boolean;
  reasons: string[];
  warnings: string[];
  checks: Array<{
    key: string;
    passed: boolean;
    reason?: string;
  }>;
};

/**
 * Feedback operacional amigável detalhando o que falta para avançar ou quais regras estão sendo violadas
 */
export type DeskProgressFeedback = {
  missing_requirements: string[];
  progress: Array<{
    key: string;
    current: number;
    target: number;
    label: string;
  }>;
  suggestions: string[];
};

export type RiskRuleOperator = '<=' | '>=' | '=' | '<' | '>' | 'between';
export type RiskRuleScope = 'global' | 'asset' | 'combined';
export type RiskRuleTargetType =
    | 'sum_contracts'
    | 'max_daily_loss'
    | 'profit_target'
    | 'day_trade_only'
    | 'close_before_close'
    | 'consistency'
    | 'rule_50_percent'
    | 'max_trades_per_day'
    | 'min_trading_days';

export type RiskRule = {
    id: string;
    name: string;
    enabled: boolean;
    scope: RiskRuleScope;
    target_type: RiskRuleTargetType;
    operator: RiskRuleOperator;
    value: number | boolean;
    value_secondary?: number;
    asset_risk_profile_ids?: string[];
};

export type CombinedRiskRule = {
    id: string;
    name: string;
    enabled: boolean;
    rule_type: 'sum_contracts';
    asset_risk_profile_ids: string[];
    operator: '<=' | '>=' | '=' | '<' | '>';
    limit_value: number;
};

export type RiskScopeProfile = {
    id?: string;
    name: string;
    /** @deprecated Use asset_ids para suporte a múltiplos ativos */
    asset_id?: string; 
    /** Lista de IDs de ativos que pertencem a este escopo operacional */
    asset_type_id?: string;
    asset_ids: string[];
    default_stop_points: number;
    min_contracts: number;
    max_contracts: number;
    notes?: string;
    growth_override_enabled?: boolean;
    growth_phases_override?: GrowthPhase[];
    current_phase_index?: number;
    currentPhaseStartedAt?: string; // ISO String
};

/** Alias mantido para compatibilidade legado em toda a aplicação durante a transição */
export type AssetRiskProfile = RiskScopeProfile;

export type RiskContextResolution = {
    source: "scope" | "global";
    sourceReason: string;
    scopeId?: string;
    scopeName?: string;
    growthPlanId?: string;
    growthPlanName?: string;
    currentPhaseIndex: number;
    totalPhases: number;
    currentPhaseName: string;
    currentPhaseTarget: number;
    currentPhaseDrawdown: number;
    currentPhaseMaxDailyLoss: number;
    currentPhaseLotLimit: number;
    assetIds: string[];
    conditionsToAdvance?: RiskCondition[];
    conditionsToDemote?: RiskCondition[];
    phaseStartedAt?: string;
    resolvedAt: string;
};

export type ResolvedGrowthContext = {
    asset?: Asset;
    assetRiskProfile?: RiskScopeProfile;
    riskProfile: RiskProfile;
    growthPlan?: GrowthPlan;
    growthSourceType: "global" | "assetProfile";
    growthPhase: any;
    resolution: RiskContextResolution;
};

export type TaxPayment = {
    id: string;
    period: string; // "YYYY-MM"
    tax_due: number; // Calculated original tax
    fine: number; // Multa
    interest: number; // Juros
    total_paid: number;
    payment_date: string | null;
    status: "Pending" | "Paid";
    notes: string;
};
