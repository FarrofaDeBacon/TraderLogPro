<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Switch } from "$lib/components/ui/switch";
    import { Badge } from "$lib/components/ui/badge";
    import { t } from "svelte-i18n";
    import {
        Plus,
        Pencil,
        Trash2,
        ShieldCheck,
    } from "lucide-svelte";
    import type { RiskRule, AssetRiskProfile } from "$lib/types";
    import RiskRuleForm from "./RiskRuleForm.svelte";

    let {
        rules = $bindable([]),
        assetRiskProfiles = [],
    } = $props<{
        rules: RiskRule[];
        assetRiskProfiles: AssetRiskProfile[];
    }>();

    const prefix = "settings.risk.form.ruleBuilder";

    let showForm = $state(false);
    let editingRule = $state<RiskRule | undefined>(undefined);

    const globalRules = $derived(rules.filter((r: RiskRule) => r.scope === "global"));
    const combinedRules = $derived(rules.filter((r: RiskRule) => r.scope === "combined"));
    const assetRules = $derived(rules.filter((r: RiskRule) => r.scope === "asset"));

    function handleAddNew() {
        editingRule = undefined;
        showForm = true;
    }

    function handleEdit(rule: RiskRule) {
        editingRule = rule;
        showForm = true;
    }

    function handleDelete(id: string) {
        rules = rules.filter((r: RiskRule) => r.id !== id);
    }

    function handleSave(rule: RiskRule) {
        const existingIdx = rules.findIndex((r: RiskRule) => r.id === rule.id);
        if (existingIdx >= 0) {
            rules = rules.map((r: RiskRule) => r.id === rule.id ? rule : r);
        } else {
            rules = [...rules, rule];
        }
        showForm = false;
        editingRule = undefined;
    }

    function handleCancel() {
        showForm = false;
        editingRule = undefined;
    }

    function toggleRule(id: string) {
        rules = rules.map((r: RiskRule) => r.id === id ? { ...r, enabled: !r.enabled } : r);
    }

    function createPreset(presetKey: string) {
        let newRule: RiskRule = {
            id: crypto.randomUUID(),
            name: $t(`${prefix}.presets.${presetKey}`),
            enabled: true,
            scope: "global",
            target_type: "max_daily_loss",
            operator: "<=",
            value: 0,
            asset_risk_profile_ids: []
        };
        switch(presetKey) {
            case 'maxDailyLoss': newRule.target_type = "max_daily_loss"; newRule.operator = "<="; break;
            case 'profitTarget': newRule.target_type = "profit_target"; newRule.operator = ">="; break;
            case 'maxTrades': newRule.target_type = "max_trades_per_day"; newRule.operator = "<="; break;
            case 'dayTradeOnly': newRule.target_type = "day_trade_only"; newRule.operator = "="; newRule.value = true; break;
            case 'consistency': newRule.target_type = "consistency"; newRule.operator = "="; newRule.value = true; break;
            case 'rule50': newRule.target_type = "rule_50_percent"; newRule.operator = "="; newRule.value = true; break;
            case 'closeBeforeClose': newRule.target_type = "close_before_close"; newRule.operator = "="; newRule.value = true; break;
            case 'sumContracts': newRule.target_type = "sum_contracts"; newRule.operator = "<="; newRule.scope = 'combined'; break;
        }
        editingRule = newRule;
        showForm = true;
    }

    function getScopeColor(scope: string): string {
        switch (scope) {
            case "global": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
            case "asset": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
            case "combined": return "bg-violet-500/10 text-violet-400 border-violet-500/30";
            default: return "";
        }
    }

    function getOperatorSymbol(op: string): string {
        switch (op) {
            case "<=": return "≤";
            case ">=": return "≥";
            case "=": return "=";
            case "<": return "<";
            case ">": return ">";
            case "between": return "↔";
            default: return op;
        }
    }
</script>

<div class="space-y-3">
    <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 font-bold text-primary">
            <ShieldCheck class="w-4 h-4" />
            {$t(`${prefix}.title`)}
        </h3>
        {#if !showForm}
            <Button variant="outline" size="sm" onclick={handleAddNew} class="gap-1.5">
                <Plus class="w-3.5 h-3.5" />
                {$t(`${prefix}.addRule`)}
            </Button>
        {/if}
    </div>

    {#if !showForm}
        <div class="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('maxDailyLoss')}>
                {$t(`${prefix}.presets.maxDailyLoss`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('profitTarget')}>
                {$t(`${prefix}.presets.profitTarget`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('sumContracts')}>
                {$t(`${prefix}.presets.sumContracts`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('maxTrades')}>
                {$t(`${prefix}.presets.maxTrades`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('dayTradeOnly')}>
                {$t(`${prefix}.presets.dayTradeOnly`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('closeBeforeClose')}>
                {$t(`${prefix}.presets.closeBeforeClose`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('consistency')}>
                {$t(`${prefix}.presets.consistency`)}
            </Button>
            <Button variant="secondary" size="sm" class="text-xs shrink-0" onclick={() => createPreset('rule50')}>
                {$t(`${prefix}.presets.rule50`)}
            </Button>
        </div>
    {/if}

    <!-- Rules List -->
    {#if rules.length === 0 && !showForm}
        <p class="text-sm text-muted-foreground italic py-4 text-center">
            {$t(`${prefix}.noRules`)}
        </p>
    {/if}

    {#if !showForm}
        {@render ruleGroup(globalRules, $t(`${prefix}.groups.global`))}
        {@render ruleGroup(combinedRules, $t(`${prefix}.groups.combined`))}
        {@render ruleGroup(assetRules, $t(`${prefix}.groups.asset`))}
    {/if}

    <!-- Inline Form -->
    {#if showForm}
        <RiskRuleForm
            rule={editingRule}
            {assetRiskProfiles}
            onSave={handleSave}
            onCancel={handleCancel}
        />
    {/if}
</div>
