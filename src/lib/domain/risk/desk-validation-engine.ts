import type { DeskConfig, CombinedRiskRule, Trade, RiskRule, DeskStageProgressionResult, DeskProgressFeedback } from '$lib/types';
import type { DeskValidationContext, DeskValidationResult, DeskAuditResult, DeskAuditStatus } from './types';

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
            result.reasons.push("invalid_asset");
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
                    result.reasons.push("max_exposure");
                }
            }
        }
    }

    // 3. Day Trade Only
    if (desk.day_trade_only) {
        if (context.isSwingTrade === undefined) {
            result.warnings.push("day_trade_only");
        } else if (context.isSwingTrade) {
            result.checks.dayTradeOnly = false;
            result.reasons.push("day_trade_only_violation");
        }
    }

    // 4. Encerrar posições antes do fechamento
    if (desk.close_before_market_close_minutes && desk.close_before_market_close_minutes > 0) {
        if (context.currentTimeMinutes === undefined) {
             result.warnings.push("time_constraint");
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

/**
 * Calculates historical compliance for Prop Firm/Desk challenges purely based on trades and config.
 */
export function calculateHistoricalAudit(
    trades: Trade[],
    desk: DeskConfig,
    rules?: RiskRule[]
): DeskAuditResult {
    const result: DeskAuditResult = {
        status: 'pending',
        reasons: [],
        warnings: [],
        metrics: {
            operated_days: 0,
            positive_days: 0,
            total_net_profit: 0,
            best_day_profit: 0,
            best_day_share_percent: 0,
        }
    };

    if (!desk.enabled) {
        result.status = 'passed';
        result.warnings.push("table_disabled");
        return result;
    }

    // 1. Group trades by Day
    const dailyPnL: Record<string, number> = {};
    for (const trade of trades) {
        const day = trade.date ? trade.date.split('T')[0] : 'unknown';
        if (day === 'unknown') continue;
        if (!dailyPnL[day]) dailyPnL[day] = 0;
        dailyPnL[day] += trade.result;
    }

    const operatedDays = Object.keys(dailyPnL).length;
    let positiveDays = 0;
    let totalNetProfit = 0;
    let bestDayProfit = 0;

    for (const day in dailyPnL) {
        const pnl = dailyPnL[day];
        totalNetProfit += pnl;
        if (pnl > 0) {
            positiveDays++;
            if (pnl > bestDayProfit) {
                bestDayProfit = pnl;
            }
        }
    }

    const bestDaySharePercent = totalNetProfit > 0 ? (bestDayProfit / totalNetProfit) * 100 : 0;

    result.metrics = {
        operated_days: operatedDays,
        positive_days: positiveDays,
        total_net_profit: totalNetProfit,
        best_day_profit: bestDayProfit,
        best_day_share_percent: bestDaySharePercent,
    };

    let failed = false;
    let pending = false;

    // Etapa 9 - Localizar estagio ativo e aplicar overrides
    const activeStage = 
        desk.stages && desk.current_stage_index !== undefined && desk.stages.length > desk.current_stage_index && desk.stages[desk.current_stage_index]?.enabled 
        ? desk.stages[desk.current_stage_index] 
        : null;

    // 2. Minimum Trading Days
    const minDaysRule = rules?.find(r => r.target_type === 'min_trading_days' && r.enabled);
    const minDaysConfig = desk.min_trading_days;
    // Stage override takes precedence over desk config but explicit rule wins
    const minDays = minDaysRule ? Number(minDaysRule.value) : (activeStage?.min_trading_days ?? minDaysConfig);
    
    if (minDays && minDays > 0) {
        if (operatedDays < minDays) {
            pending = true;
            result.reasons.push("min_operated_days");
        }
    }

    // 3. Rule of 50% (Max single day profit share)
    const rule_50_enabled = activeStage ? activeStage.rule_50_percent_enabled : true;

    if (rule_50_enabled) {
        const shareRule = rules?.find(r => r.target_type === 'rule_50_percent' && r.enabled);
        const maxShare = shareRule ? Number(shareRule.value) : desk.max_single_day_profit_share;

        if (maxShare && maxShare > 0 && totalNetProfit > 0) {
            if (bestDaySharePercent > maxShare) {
                failed = true;
                result.reasons.push("max_share_50");
            }
        }
    }

    // 4. Consistency Mode
    const rule_cons_enabled = activeStage ? activeStage.consistency_enabled : true;

    if (rule_cons_enabled) {
        const consRule = rules?.find(r => r.target_type === 'consistency' && r.enabled);
        const mode = desk.consistency_mode; 
        
        // Evaluate if enabled by config OR explicit rule
        if (mode && mode !== 'none') {
            let consPassed = false;
            if (mode === '5days_3positive') {
                if (operatedDays >= 5 && positiveDays >= 3) consPassed = true;
            else if (operatedDays < 5 || positiveDays < 3 && operatedDays < 5) pending = true; 
            else failed = true;
        } else if (mode === '10days_5positive') {
            if (operatedDays >= 10 && positiveDays >= 5) consPassed = true;
            else if (operatedDays < 10) pending = true;
            else failed = true;
        } else if (mode === '5days_3positive_or_10days_5positive') {
            const pass5 = operatedDays >= 5 && positiveDays >= 3;
            const pass10 = operatedDays >= 10 && positiveDays >= 5;
            if (pass5 || pass10) {
                consPassed = true;
            } else if (operatedDays < 10) {
                pending = true; 
            } else {
                failed = true;
            }
        }

        if (!consPassed && failed) {
            result.reasons.push("consistency_failed");
        } else if (!consPassed && pending) {
            result.reasons.push("consistency_pending");
        }
    }
    }

    // 5. Final Status Resolution
    if (failed) {
        result.status = 'failed';
    } else if (pending) {
        result.status = 'pending';
    } else {
        result.status = 'passed';
    }

    return result;
}

/**
 * Avalia se o Perfil de Risco da Mesa (Prop Firm) pode avançar para o próximo estágio.
 * Computa de forma imutável, agrupando pendências e flags de travamento de estágio.
 */
export function evaluateDeskStageProgression(
    config: DeskConfig,
    currentAudit: DeskAuditResult
): DeskStageProgressionResult {
    const defaultResult: DeskStageProgressionResult = {
        current_stage_id: "unknown",
        can_advance: false,
        should_remain: true,
        reasons: [],
        warnings: [],
        checks: [],
    };

    if (!config.enabled || !config.stages || config.stages.length === 0) {
        return defaultResult;
    }

    const currentIndex = config.current_stage_index ?? 0;
    const currentStage = config.stages[currentIndex];

    if (!currentStage) return defaultResult;

    defaultResult.current_stage_id = currentStage.id;

    const checks: DeskStageProgressionResult["checks"] = [];
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Min Trading Days Check
    if (currentStage.min_trading_days && currentStage.min_trading_days > 0) {
        const passedDays = currentAudit.metrics.operated_days >= currentStage.min_trading_days;
        checks.push({
            key: "min_trading_days",
            passed: passedDays,
            reason: passedDays
                ? `Atingiu mínimo de ${currentStage.min_trading_days} dias`
                : `Faltam ${currentStage.min_trading_days - currentAudit.metrics.operated_days} dias operados`
        });
        if (!passedDays) reasons.push("progression_pending_days");
    }

    // 2. Aggregate Historical Audit Check (Consistency, Rule 50%)
    const auditPassed = currentAudit.status === "passed";
    checks.push({
        key: "historical_audit",
        passed: auditPassed,
        reason: auditPassed
            ? "Auditoria histórica OK (Consistência e Limites Validados)"
            : "Critérios de auditoria da mesa ainda pendentes de fechamento"
    });
    if (!auditPassed) reasons.push("progression_pending_audit");

    const allChecksPassed = checks.every((c: any) => c.passed);

    if (!allChecksPassed) {
        return {
            ...defaultResult,
            checks,
            reasons,
            warnings
        };
    }

    // 3. Next Stage Availability Check
    const hasNextStage = currentIndex < config.stages.length - 1;

    if (!hasNextStage) {
        reasons.push("max_stage_reached");
        return {
            ...defaultResult,
            checks,
            reasons,
            warnings
        };
    }

    const nextStage = config.stages[currentIndex + 1];

    return {
        ...defaultResult,
        can_advance: true,
        should_remain: false,
        next_stage_id: nextStage.id,
        checks,
        reasons,
        warnings
    };
}

/**
 * Tradutor universal dos status internos para um feedback limpo, numérico e acionável pelo Trader
 */
export function generateDeskProgressFeedback(
    config: DeskConfig,
    audit: DeskAuditResult,
    rules: RiskRule[]
): DeskProgressFeedback {
    const feedback: DeskProgressFeedback = {
        missing_requirements: [],
        progress: [],
        suggestions: []
    };

    if (!config.enabled || !config.stages || config.stages.length === 0) return feedback;

    const currentIndex = config.current_stage_index ?? 0;
    const currentStage = config.stages[currentIndex];
    if (!currentStage) return feedback;

    // 1. Min Trading Days
    const minDaysRule = rules?.find(r => r.target_type === 'min_trading_days' && r.enabled);
    const minDaysConfig = currentStage.min_trading_days ?? config.min_trading_days;
    const minDays = minDaysRule ? Number(minDaysRule.value) : minDaysConfig;

    if (minDays && minDays > 0) {
        if (audit.metrics.operated_days < minDays) {
            feedback.missing_requirements.push("feedback_missing_days");
        }
        feedback.progress.push({
            key: "min_days",
            current: audit.metrics.operated_days,
            target: minDays,
            label: "Dias Operados"
        });
    }

    // 2. Profit Target
    const profitTargetRule = rules?.find(r => r.target_type === 'profit_target' && r.enabled);
    const profitTargetConfig = config.profit_target;
    const profitTarget = profitTargetRule ? Number(profitTargetRule.value) : profitTargetConfig;

    if (profitTarget && profitTarget > 0) {
        if (audit.metrics.total_net_profit < profitTarget) {
            feedback.missing_requirements.push("feedback_missing_profit");
        }
        feedback.progress.push({
            key: "profit_target",
            current: audit.metrics.total_net_profit > 0 ? audit.metrics.total_net_profit : 0,
            target: profitTarget,
            label: "Meta de Lucro"
        });
    }

    // 3. Consistency
    const consistencyRule = rules?.find(r => r.target_type === 'consistency' && r.enabled);
    const hasConsistency = consistencyRule || currentStage.consistency_enabled || config.consistency_mode && config.consistency_mode !== 'none';
    
    if (hasConsistency) {
        // Find if audit failed due to consistency
        const failedConsistency = audit.reasons.some(r => r.toLowerCase().includes('consistência'));
        if (failedConsistency) {
            feedback.missing_requirements.push("feedback_missing_consistency");
        } else {
            feedback.suggestions.push("feedback_keep_consistency");
        }
    }

    // 4. Rule 50%
    const rule50Rule = rules?.find(r => r.target_type === 'rule_50_percent' && r.enabled);
    const hasRule50 = rule50Rule || currentStage.rule_50_percent_enabled || (config.max_single_day_profit_share && config.max_single_day_profit_share > 0);

    if (hasRule50) {
        const failed50 = audit.reasons.some(r => r.toLowerCase().includes('50%'));
        if (failed50) {
            feedback.missing_requirements.push("feedback_failed_50_percent");
        }
        
        let safeTreshold = 50;
        if (rule50Rule) safeTreshold = Number(rule50Rule.value);
        else if (config.max_single_day_profit_share) safeTreshold = config.max_single_day_profit_share;

        feedback.progress.push({
            key: "rule_50",
            current: audit.metrics.best_day_share_percent,
            target: safeTreshold,
            label: "Melhor Dia %"
        });

        if (audit.metrics.best_day_share_percent > safeTreshold / 2 && audit.metrics.best_day_share_percent <= safeTreshold) {
            feedback.suggestions.push("feedback_warning_50_percent");
        }
    }

    return feedback;
}
