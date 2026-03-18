import type { DeskConfig, CombinedRiskRule } from '$lib/types';
import type { DeskValidationContext, DeskValidationResult } from './types';

export function validateTradeContext(
    desk: DeskConfig | undefined,
    context: DeskValidationContext,
    combinedRules: CombinedRiskRule[]
): DeskValidationResult {
    
    // Default allowed state if desk is not enabled
    const result: DeskValidationResult = {
        allowed: true,
        reasons: [],
        warnings: [],
        checks: {
            allowedAsset: true,
            combinedExposure: true,
            dayTradeOnly: true,
            closeBeforeMarketClose: true,
        }
    };

    if (!desk || !desk.enabled) {
        return result;
    }

    // 1. Ativo Permitido
    // Only check if allowed_asset_ids exists and has length > 0
    if (desk.allowed_asset_ids && desk.allowed_asset_ids.length > 0) {
        if (!context.assetRiskProfileId || !desk.allowed_asset_ids.includes(context.assetRiskProfileId)) {
            result.checks.allowedAsset = false;
            result.reasons.push("Ativo selecionado não é permitido pela regra da Mesa.");
        }
    }

    // 2. Exposição Máxima Combinada
    // Only evaluating matching sum_contracts CombinedRiskRules if they exist
    if (context.combinedExposure !== undefined && combinedRules && combinedRules.length > 0) {
        const sumRules = combinedRules.filter(r => r.enabled && r.rule_type === "sum_contracts");
        for (const rule of sumRules) {
            // Check if current asset is part of this rule explicitly
            if (context.assetRiskProfileId && rule.asset_risk_profile_ids.includes(context.assetRiskProfileId)) {
                // Determine limits: example supports <= 
                if (rule.operator === "<=" && context.combinedExposure > rule.limit_value) {
                    result.checks.combinedExposure = false;
                    result.reasons.push(`Soma de contratos excede o limite (${context.combinedExposure} > ${rule.limit_value})`);
                }
            }
        }
    }

    // 3. Day Trade Only
    if (desk.day_trade_only) {
        if (context.isSwingTrade === undefined) {
            result.warnings.push("Regra Day Trade Only habilitada, mas o prazo da operação atual não foi informado.");
        } else if (context.isSwingTrade) {
            result.checks.dayTradeOnly = false;
            result.reasons.push("Plano da Mesa permite apenas modo Day Trade.");
        }
    }

    // 4. Encerrar posições antes do fechamento
    if (desk.close_before_market_close_minutes && desk.close_before_market_close_minutes > 0) {
        if (context.currentTimeMinutes === undefined) {
             result.warnings.push("Regra de encerramento temporário configurada, mas contexto de horário atual indisponível.");
        } else {
             // Example placeholder logic for actual validation once time constraints exist in context
        }
    }
    
    // Resolve overall allowance
    result.allowed = result.checks.allowedAsset && 
                     result.checks.combinedExposure && 
                     result.checks.dayTradeOnly && 
                     result.checks.closeBeforeMarketClose;

    return result;
}
