import { describe, it, expect } from 'vitest';
import { validateTradeContext } from './desk-validation-engine';
import type { DeskConfig, CombinedRiskRule, AssetRiskProfile } from '$lib/types';
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
        expect(result.reasons).toContain("Ativo selecionado não é permitido pela regra da Mesa.");
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
        expect(result.reasons[0]).toContain("Soma de contratos excede o limite (35 > 30)");
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
        expect(result.warnings).toContain("Regra de encerramento temporário configurada, mas contexto de horário atual indisponível.");
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
        expect(result.warnings).toContain("Regra Day Trade Only habilitada, mas o prazo da operação atual não foi informado.");
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
        expect(result.reasons).toContain("Plano da Mesa permite apenas modo Day Trade.");
    });
});
