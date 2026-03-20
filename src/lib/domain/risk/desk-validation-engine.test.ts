import { describe, it, expect } from 'vitest';
import { validateTradeContext, calculateHistoricalAudit, evaluateDeskStageProgression, generateDeskProgressFeedback } from './desk-validation-engine';
import type { DeskConfig, CombinedRiskRule, AssetRiskProfile, Trade } from '$lib/types';
import type { DeskValidationContext } from './types';

describe('DeskValidationEngine', () => {
    
    const baseConfig: DeskConfig = {
        enabled: true,
        plan_name: "Mock 4K",
        allowed_asset_ids: ["arp_win", "arp_wdo"],
        max_combined_exposure: 30,
        max_total_loss: 4000,
        profit_target: 4000,
        day_trade_only: true,
        close_before_market_close_minutes: 30,
        consistency_mode: "none",
        max_single_day_profit_share: 0,
        mdr_mode: "none"
    };

    const combinedRules: CombinedRiskRule[] = [
        {
            id: "cr_1",
            name: "Max 30",
            enabled: true,
            rule_type: "sum_contracts",
            asset_risk_profile_ids: ["arp_win", "arp_wdo"],
            operator: "<=",
            limit_value: 30
        }
    ];

    it('Scenario A: Ativo permitido, sem violação combinada -> allowed = true', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: false,
            currentTimeMinutes: 600, // 10:00 AM
            combinedExposure: 10
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(true);
        expect(result.checks.allowedAsset).toBe(true);
        expect(result.checks.combinedExposure).toBe(true);
        expect(result.reasons.length).toBe(0);
        expect(result.warnings.length).toBe(0);
    });

    it('Scenario B: Ativo não permitido -> allowed = false, reason preenchido', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_petr4",
            isSwingTrade: false,
            currentTimeMinutes: 600,
            combinedExposure: 0
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(false);
        expect(result.checks.allowedAsset).toBe(false);
        expect(result.reasons).toContain("desk.reasons.invalid_asset");
    });

    it('Scenario C: Regra combinada excede limite (ex: 30) -> allowed = false', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: false,
            currentTimeMinutes: 600,
            combinedExposure: 35 // exceeds 30
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(false);
        expect(result.checks.combinedExposure).toBe(false);
        expect(result.reasons[0]).toContain("desk.reasons.max_exposure");
    });

    it('Scenario D: Regra combinada respeitada -> allowed = true', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: false,
            currentTimeMinutes: 600,
            combinedExposure: 30 // exactly max
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(true);
        expect(result.checks.combinedExposure).toBe(true);
    });

    it('Scenario E: Regra de horário sem contexto suficiente -> retorna warning', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: false,
            currentTimeMinutes: undefined, // no time context
            combinedExposure: 15
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(true); // fallbacks to true if it can't evaluate hard block
        expect(result.checks.closeBeforeMarketClose).toBe(true);
        expect(result.warnings).toContain("desk.warnings.time_constraint");
    });

    it('Scenario F: Day trade only sem contexto suficiente -> retorna warning', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: undefined, // missing swing trade context
            currentTimeMinutes: 600,
            combinedExposure: 15
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(true);
        expect(result.checks.dayTradeOnly).toBe(true);
        expect(result.warnings).toContain("desk.warnings.day_trade_only");
    });

    it('Scenario G: Day trade only violation -> blocks operation', () => {
        const context: DeskValidationContext = {
            assetRiskProfileId: "arp_win",
            isSwingTrade: true,
            currentTimeMinutes: 600,
            combinedExposure: 15
        };

        const result = validateTradeContext(baseConfig, context, combinedRules);
        
        expect(result.allowed).toBe(false);
        expect(result.checks.dayTradeOnly).toBe(false);
        expect(result.reasons).toContain("desk.reasons.day_trade_only");
    });
});

describe('DeskAuditEngine (Historical Prop Firm Validation)', () => {
    const baseDesk: DeskConfig = {
        enabled: true,
        plan_name: "Mock Prop",
        consistency_mode: "none",
        max_single_day_profit_share: 0,
        min_trading_days: 0
    };

    function createMockTrade(dateStr: string, pnl: number): Trade {
        return {
            id: Math.random().toString(),
            date: dateStr, // e.g. "2026-03-01T10:00:00"
            asset_symbol: "WIN",
            asset_type_id: "idx",
            strategy_id: "s1",
            account_id: "a1",
            result: pnl,
            quantity: 1,
            direction: "Buy",
            entry_price: 1000,
            exit_price: 1010,
            exit_date: dateStr,
            fee_total: 1,
            notes: "",
            timeframe: "M5",
            volatility: "Mid",
            entry_emotional_state_id: null,
            entry_emotional_state_name: null,
            exit_reason: null,
            exit_emotional_state_id: null,
            exit_emotional_state_name: null,
            entry_rationale: "",
            confirmation_signals: "",
            market_context: "",
            relevant_news: "",
            psychology_analysis_during: "",
            followed_plan: true,
            what_worked: "",
            mistakes_improvements: "",
            lessons_learned: "",
            images: [],
            partial_exits: [],
            modality_id: "m1",
            stop_loss: null,
            take_profit: null,
            intensity: 3
        };
    }

    it('Scenario A: 5days_3positive -> passed when 5 operated, 3 positive', () => {
        const desk = { ...baseDesk, consistency_mode: '5days_3positive' as const };
        const trades = [
            createMockTrade("2026-03-01T10:00:00", 100), // Day 1: +100
            createMockTrade("2026-03-02T10:00:00", -50), // Day 2: -50
            createMockTrade("2026-03-03T10:00:00", 200), // Day 3: +200
            createMockTrade("2026-03-04T10:00:00", -10), // Day 4: -10
            createMockTrade("2026-03-05T10:00:00", 50),  // Day 5: +50
        ];
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.metrics.operated_days).toBe(5);
        expect(result.metrics.positive_days).toBe(3);
        expect(result.status).toBe('passed');
    });

    it('Scenario B: 10days_5positive -> passed when 10 operated, 5 positive', () => {
        const desk = { ...baseDesk, consistency_mode: '10days_5positive' as const };
        const trades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => 
            createMockTrade(`2026-03-${d.toString().padStart(2, '0')}T10:00:00`, d <= 5 ? 100 : -50)
        );
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.metrics.operated_days).toBe(10);
        expect(result.metrics.positive_days).toBe(5);
        expect(result.status).toBe('passed');
    });

    it('Scenario C: 5days_3positive_or_10days_5positive -> passed when one rule is met', () => {
        const desk = { ...baseDesk, consistency_mode: '5days_3positive_or_10days_5positive' as const };
        const trades = [
            createMockTrade("2026-03-01T10:00", 100),
            createMockTrade("2026-03-02T10:00", -50),
            createMockTrade("2026-03-03T10:00", 200),
            createMockTrade("2026-03-04T10:00", -10),
            createMockTrade("2026-03-05T10:00", 50),
        ];
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.status).toBe('passed');
    });

    it('Scenario D: Insufficient history -> pending', () => {
        const desk = { ...baseDesk, consistency_mode: '5days_3positive' as const };
        const trades = [
            createMockTrade("2026-03-01T10:00", 100),
        ];
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.status).toBe('pending');
        expect(result.reasons[0]).toContain('desk.reasons.consistency_pending');
    });

    it('Scenario E: 50% Rule Violated (best day > limit) -> failed', () => {
        const desk = { ...baseDesk, max_single_day_profit_share: 50 };
        const trades = [
            createMockTrade("2026-03-01T10:00", 800),
            createMockTrade("2026-03-02T10:00", 200),
        ];
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.metrics.total_net_profit).toBe(1000);
        expect(result.metrics.best_day_profit).toBe(800);
        expect(result.metrics.best_day_share_percent).toBe(80);
        expect(result.status).toBe('failed');
        expect(result.reasons[0]).toContain('desk.reasons.max_share_50');
    });

    it('Scenario F: 50% Rule Respected -> passed', () => {
        const desk = { ...baseDesk, max_single_day_profit_share: 50 };
        const trades = [
            createMockTrade("2026-03-01T10:00", 400),
            createMockTrade("2026-03-02T10:00", 300),
            createMockTrade("2026-03-03T10:00", 300),
        ];
        const result = calculateHistoricalAudit(trades, desk);
        expect(result.metrics.best_day_profit).toBe(400);
        expect(result.metrics.best_day_share_percent).toBe(40);
        expect(result.status).toBe('passed');
    });

    it('Scenario G: Min Trading Days Validation -> pending / passed', () => {
        const desk = { ...baseDesk, min_trading_days: 10 };
        const trades = [createMockTrade("2026-03-01T10:00", 100)];
        const resPending = calculateHistoricalAudit(trades, desk);
        expect(resPending.status).toBe('pending');
        expect(resPending.reasons[0]).toContain('desk.reasons.min_operated_days');

        const trades10 = [1,2,3,4,5,6,7,8,9,10].map(d => createMockTrade(`2026-03-${d.toString().padStart(2, '0')}T10:00`, 10));
        const resPassed = calculateHistoricalAudit(trades10, desk);
        expect(resPassed.status).toBe('passed');
    });
});

describe('DeskAuditEngine (Etapa 9 - Stage Overrides)', () => {
    const defaultStages: DeskConfig['stages'] = [
        { id: 'margin_building', name: 'Construção de Margem', enabled: true, mdr_mode: 'none', rule_50_percent_enabled: false, consistency_enabled: false },
        { id: 'real_phase_1', name: 'Conta Real - Fase 1', enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: true, consistency_enabled: true },
        { id: 'real_final', name: 'Conta Real - Definitiva', enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: false, consistency_enabled: true }
    ];

    const baseDesk9: DeskConfig = {
        enabled: true,
        plan_name: "Mock Prop Stages",
        consistency_mode: "5days_3positive",
        max_single_day_profit_share: 50,
        min_trading_days: 10,
        stages: defaultStages,
        current_stage_index: 0
    };

    function trade(d: string, p: number): Trade {
        return { 
            id: 'x', date: d, asset_symbol: 'WDO', asset_type_id: 'i', strategy_id: '1', account_id: '1', 
            result: p, quantity: 1, direction: 'Buy', entry_price: 1, exit_price: 2, exit_date: d, fee_total: 0, 
            notes: '', timeframe: 'M5', volatility: 'Mid', entry_emotional_state_id: null, entry_emotional_state_name: null, 
            exit_reason: null, exit_emotional_state_id: null, exit_emotional_state_name: null, entry_rationale: '', 
            confirmation_signals: '', market_context: '', relevant_news: '', psychology_analysis_during: '', followed_plan: true, 
            what_worked: '', mistakes_improvements: '', lessons_learned: '', images: [], partial_exits: [], modality_id: '', stop_loss: null, take_profit: null, intensity: 3 
        };
    }

    it('Scenario A: margin_building -> ignores 50% rule and consistency', () => {
        const desk = { ...baseDesk9, current_stage_index: 0 }; // margin_building disables both
        // Only 1 trade, representing 1 day worked, and 100% of profit. Normally fails everything.
        const trades = [ trade("2026-03-01T10:00:00", 1000) ];
        
        // However, minDays is still 10 globally, and margin_building doesn't override it explicitly (undefined falls back to DeskConfig)
        // Wait, the prompt says "auditoria continua funcionando". If minDays is 10, it will still pending for minDays! Let's assure that.
        const res = calculateHistoricalAudit(trades, desk);
        expect(res.status).toBe('pending');
        expect(res.reasons[0]).toContain('desk.reasons.min_operated_days');
        // BUT 50% rule or consistency SHOULD NOT be in the reasons!
        expect(res.reasons.find(r => r.includes('50%'))).toBeUndefined();
        expect(res.reasons.find(r => r.includes('consistência'))).toBeUndefined();
        
        // If we supply 10 days to margin_building, it should pass cleanly despite single day share!
        const trades10 = [1,2,3,4,5,6,7,8,9,10].map(d => trade(`2026-03-${d.toString().padStart(2, '0')}T10:00:00`, d === 1 ? 1000 : 10));
        const resPass = calculateHistoricalAudit(trades10, desk);
        expect(resPass.status).toBe('passed');
        expect(resPass.metrics.best_day_share_percent).toBeGreaterThan(90); // 1000 out of 1090 is >90%
    });

    it('Scenario B: real_phase_1 -> applies 50% rule and consistency', () => {
        const desk = { ...baseDesk9, current_stage_index: 1 }; // real_phase_1 (both TRUTHY)
        // Passes minimum days (10 trades)
        // 1 big day = fails 50% rule
        const trades = [1,2,3,4,5,6,7,8,9,10].map(d => trade(`2026-03-${d.toString().padStart(2, '0')}T10:00:00`, d === 1 ? 1000 : 10));
        
        const res = calculateHistoricalAudit(trades, desk);
        expect(res.status).toBe('failed');
        expect(res.reasons[0]).toContain('desk.reasons.max_share_50'); // 50% rule triggered
    });

    it('Scenario C: real_final -> consistency enabled, 50% rule disabled', () => {
        const desk = { ...baseDesk9, current_stage_index: 2 }; // real_final
        // 1 big day (violates 50%, but ignored here)
        // Consistency: 10 days, all positive
        const trades = [1,2,3,4,5,6,7,8,9,10].map(d => trade(`2026-03-${d.toString().padStart(2, '0')}T10:00:00`, d === 1 ? 1000 : 10));
        
        const res = calculateHistoricalAudit(trades, desk);
        expect(res.status).toBe('passed'); // Should pass completely!
    });

    it('Scenario D: stage changes override behaviors correctly', () => {
        // Create 2 trades, highly volatile
        const trades = [
            trade('2026-03-01T10:00:00', 900),
            trade('2026-03-02T10:00:00', 100)
        ];
        
        // Let's set minDays to 2 so it doesn't pend
        const deskD = { ...baseDesk9, min_trading_days: 2 };

        // Test with phase 1 (50% rule active -> fails)
        deskD.current_stage_index = 1;
        const resPhase1 = calculateHistoricalAudit(trades, deskD);
        expect(resPhase1.status).toBe('failed');

        // Test with real_final (50% rule disabled -> passes (well, pending for consistency?))
        deskD.current_stage_index = 2;
        const resPhaseFinal = calculateHistoricalAudit(trades, deskD);
        // Wait, consistency is "5days_3positive", but trades array only has 2 days!
        // So real_final will be PENDING for consistency!
        expect(resPhaseFinal.status).toBe('pending');
        expect(resPhaseFinal.reasons[0]).toContain('desk.reasons.consistency_pending');

        // Test with margin_building (consistency disabled, 50% rule disabled)
        deskD.current_stage_index = 0;
        const resMargin = calculateHistoricalAudit(trades, deskD);
        expect(resMargin.status).toBe('passed'); // Everything disabled besides minDays(2) -> PASSES!
    });
});

describe('evaluateDeskStageProgression', () => {
    const configWithStages: DeskConfig = {
        enabled: true,
        stages: [
            { id: "margin_building", name: "Construção", enabled: true, min_trading_days: 5, rule_50_percent_enabled: false, consistency_enabled: false, mdr_mode: 'none' },
            { id: "real_phase_1", name: "Fase 1", enabled: true, min_trading_days: 10, rule_50_percent_enabled: true, consistency_enabled: false, mdr_mode: 'none' },
            { id: "real_final", name: "Fase Final", enabled: true, min_trading_days: 0, rule_50_percent_enabled: true, consistency_enabled: true, mdr_mode: 'none' }
        ],
        current_stage_index: 0
    };

    const dummyAuditResult = (days: number, status: 'passed' | 'pending'): object => ({
        status,
        metrics: { operated_days: days, positive_days: 0, total_net_profit: 0, best_day_profit: 0, best_day_share_percent: 0 },
        reasons: [],
        warnings: []
    });

    it('CENARIO A: margin_building missing minimum days -> cannot advance', () => {
        const audit = dummyAuditResult(3, 'passed') as any; // Passed global rules but not days
        const res = evaluateDeskStageProgression(configWithStages, audit);
        expect(res.current_stage_id).toBe('margin_building');
        expect(res.can_advance).toBe(false);
        expect(res.should_remain).toBe(true);
        expect(res.reasons).toContain('desk.progression.reasons.pending_days');
        expect(res.checks.find(c => c.key === 'min_trading_days')?.passed).toBe(false);
    });

    it('CENARIO B: margin_building fulfilled minimum days -> advance to real_phase_1', () => {
        const audit = dummyAuditResult(5, 'passed') as any;
        const res = evaluateDeskStageProgression(configWithStages, audit);
        expect(res.current_stage_id).toBe('margin_building');
        expect(res.can_advance).toBe(true);
        expect(res.next_stage_id).toBe('real_phase_1');
        expect(res.checks.every(c => c.passed)).toBe(true);
    });

    it('CENARIO C: real_phase_1 fulfilled conditions -> advance to real_final', () => {
        const configPhase1 = { ...configWithStages, current_stage_index: 1 };
        const audit = dummyAuditResult(12, 'passed') as any; // 12 days > 10 min
        const res = evaluateDeskStageProgression(configPhase1, audit);
        expect(res.current_stage_id).toBe('real_phase_1');
        expect(res.can_advance).toBe(true);
        expect(res.next_stage_id).toBe('real_final');
    });

    it('CENARIO D: real_final has no next stage -> remain only', () => {
        const configFinal = { ...configWithStages, current_stage_index: 2 };
        const audit = dummyAuditResult(30, 'passed') as any;
        const res = evaluateDeskStageProgression(configFinal, audit);
        expect(res.current_stage_id).toBe('real_final');
        expect(res.can_advance).toBe(false);
        expect(res.should_remain).toBe(true);
        expect(res.reasons).toContain('desk.progression.reasons.max_stage_reached');
    });
});

describe('generateDeskProgressFeedback', () => {
    const configWithStages: DeskConfig = {
        enabled: true,
        profit_target: 3000,
        stages: [
            { id: "margin_building", name: "Construção", enabled: true, min_trading_days: 5, rule_50_percent_enabled: false, consistency_enabled: false, mdr_mode: 'none' },
            { id: "real_phase_1", name: "Fase 1", enabled: true, min_trading_days: 10, rule_50_percent_enabled: true, consistency_enabled: false, mdr_mode: 'none' }
        ],
        current_stage_index: 0
    };

    const dummyAuditResult = (days: number, profit: number, bestShare: number, reasons: string[]): any => ({
        status: reasons.length > 0 ? 'pending' : 'passed',
        metrics: { operated_days: days, positive_days: 0, total_net_profit: profit, best_day_profit: 0, best_day_share_percent: bestShare },
        reasons,
        warnings: []
    });

    it('Falta de dias mínimos e lucro - Gera múltiplos feedbacks', () => {
        const audit = dummyAuditResult(2, 500, 10, []); // 2 days < 5; 500 profit < 3000
        const feedback = generateDeskProgressFeedback(configWithStages, audit, []);
        
        expect(feedback.missing_requirements).toContain('desk.feedback.missing_days');
        expect(feedback.missing_requirements).toContain('desk.feedback.missing_profit');
        
        expect(feedback.progress.find(p => p.key === 'min_days')?.current).toBe(2);
        expect(feedback.progress.find(p => p.key === 'profit_target')?.target).toBe(3000);
    });

    it('Aviso da Regra dos 50% atingindo o warning, mas não estourando', () => {
        const configPhase1 = { ...configWithStages, current_stage_index: 1 };
        const audit = dummyAuditResult(11, 3500, 48, []); // 48% is close to 50%
        const feedback = generateDeskProgressFeedback(configPhase1, audit, []);
        
        // Cannot advance due to profit? No, profit is 3500 > 3000
        expect(feedback.missing_requirements.length).toBe(0); // Perfect!
        expect(feedback.suggestions).toContain('desk.feedback.warning_50_percent'); // Generated warning
        expect(feedback.progress.find(p => p.key === 'rule_50')?.current).toBe(48);
    });

    it('Sucesso pleno sem feedbacks negativos', () => {
        // Profit > 3000, Days 12 > 10, best share = 20%
        const configPhase1 = { ...configWithStages, current_stage_index: 1 };
        const audit = dummyAuditResult(12, 4000, 20, []); 
        const feedback = generateDeskProgressFeedback(configPhase1, audit, []);
        
        expect(feedback.missing_requirements.length).toBe(0);
        expect(feedback.suggestions.length).toBe(0); // 20% is very safe!
        expect(feedback.progress.length).toBeGreaterThan(0); // still shows the green progress bars
    });

    it('Violação explícita da Regra dos 50% gera block', () => {
        const configPhase1 = { ...configWithStages, current_stage_index: 1 };
        const audit = dummyAuditResult(11, 3500, 80, ['Concentre-se, violou a regra dos 50%']); 
        const feedback = generateDeskProgressFeedback(configPhase1, audit, []);
        
        expect(feedback.missing_requirements).toContain('desk.feedback.failed_50_percent');
    });
});

