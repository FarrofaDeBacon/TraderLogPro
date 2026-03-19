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

    <!-- Rules List -->
    {#if rules.length === 0 && !showForm}
        <p class="text-sm text-muted-foreground italic py-4 text-center">
            {$t(`${prefix}.noRules`)}
        </p>
    {/if}

    {#each rules as rule (rule.id)}
        <div
            class="flex items-center gap-3 p-3 rounded-lg border transition-all {rule.enabled
                ? 'border-border/20 bg-muted/10'
                : 'border-border/10 bg-muted/5 opacity-60'}"
        >
            <Switch
                checked={rule.enabled}
                onCheckedChange={() => toggleRule(rule.id)}
            />

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium truncate">{rule.name}</span>
                    <Badge variant="outline" class="text-[10px] px-1.5 py-0 {getScopeColor(rule.scope)}">
                        {$t(`${prefix}.scope.${rule.scope}`)}
                    </Badge>
                    <Badge variant="outline" class="text-[10px] px-1.5 py-0">
                        {$t(`${prefix}.targetType.${rule.target_type}`)}
                    </Badge>
                </div>
                <p class="text-xs text-muted-foreground mt-0.5">
                    {#if typeof rule.value === "boolean"}
                        {rule.value ? "✓" : "✗"}
                    {:else}
                        {getOperatorSymbol(rule.operator)} {rule.value}
                        {#if rule.operator === "between" && rule.value_secondary !== undefined}
                            – {rule.value_secondary}
                        {/if}
                    {/if}
                    {#if rule.asset_risk_profile_ids && rule.asset_risk_profile_ids.length > 0}
                        · {rule.asset_risk_profile_ids.length} {$t(`${prefix}.linkedProfiles`).toLowerCase()}
                    {/if}
                </p>
            </div>

            <div class="flex gap-1">
                <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => handleEdit(rule)}>
                    <Pencil class="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" onclick={() => handleDelete(rule.id)}>
                    <Trash2 class="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    {/each}

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
