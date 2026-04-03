<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Switch } from "$lib/components/ui/switch";
    import { Badge } from "$lib/components/ui/badge";
    import { t } from "svelte-i18n";
    import { Plus, Pencil, Trash2, ShieldCheck, AlertCircle, Zap, Brain, Network, Activity } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import type { RiskRule, AssetRiskProfile } from "$lib/types";
    import RiskRuleForm from "./RiskRuleForm.svelte";

    let {
        rules = $bindable([]),
        assetRiskProfiles = [],
    } = $props<{
        rules: RiskRule[];
        assetRiskProfiles: AssetRiskProfile[];
    }>();

    const prefix = "risk.ruleBuilder";
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

<div class="space-y-4">
    {#if !showForm}
        <div class="flex items-center justify-between px-1">
            <h3 class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                <ShieldCheck class="w-4 h-4" />
                {$t(`${prefix}.title`)}
            </h3>
            <Button variant="ghost" size="sm" onclick={handleAddNew} class="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                <Plus class="w-3.5 h-3.5 mr-1" />
                {$t(`${prefix}.addRule`)}
            </Button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pb-2">
            {#each ['maxDailyLoss', 'profitTarget', 'sumContracts', 'maxTrades'] as preset}
                <button 
                  class="h-10 p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all flex flex-col items-center justify-center text-center gap-0.5"
                  onclick={() => createPreset(preset)}
                >
                  <span class="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary tracking-tighter line-clamp-1">
                    {$t(`${prefix}.presets.${preset}`)}
                  </span>
                </button>
            {/each}
        </div>

        <div class="space-y-6">
            {@render ruleGroup(globalRules, $t(`${prefix}.groups.global`), Brain)}
            {@render ruleGroup(combinedRules, $t(`${prefix}.groups.combined`), Network)}
            {@render ruleGroup(assetRules, $t(`${prefix}.groups.asset`), Activity)}
        </div>

        {#if rules.length === 0}
            <div class="p-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                <Activity class="w-8 h-8" />
                <p class="text-[10px] font-black uppercase tracking-widest">{$t(`${prefix}.noRules`)}</p>
            </div>
        {/if}
    {:else}
        <div in:slide={{ duration: 250 }}>
            <RiskRuleForm
                rule={editingRule}
                {assetRiskProfiles}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        </div>
    {/if}
</div>

{#snippet ruleGroup(groupRules: RiskRule[], title: string, icon: any)}
    {#if groupRules.length > 0}
        <div class="space-y-2 animate-in fade-in slide-in-from-top-1">
            <div class="flex items-center gap-2 px-1">
                <svelte:component this={icon} class="w-3 h-3 text-muted-foreground/50" />
                <h4 class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {title}
                </h4>
                <div class="flex-1 h-[1px] bg-white/5"></div>
            </div>
            
            <div class="grid grid-cols-1 gap-2">
                {#each groupRules as r (r.id)}
                    <div class="group relative p-3 rounded-xl border border-white/5 bg-card/10 hover:border-primary/20 transition-all flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 {r.enabled ? 'text-primary' : 'text-muted-foreground opacity-30'} transition-colors">
                                <Zap class="w-3.5 h-3.5" />
                            </div>
                            <div class="space-y-0.5">
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-black uppercase tracking-tight {r.enabled ? 'text-foreground' : 'text-muted-foreground opacity-50'}">{r.name}</span>
                                    <Badge class="h-4 text-[8px] font-black bg-primary/10 border-primary/20 text-primary px-1.5 flex items-center gap-1">
                                        {$t(`${prefix}.targetType.${r.target_type}`) || r.target_type}
                                    </Badge>
                                </div>
                                <p class="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                    Condição: <span class="text-foreground/80 font-black">{getOperatorSymbol(r.operator)} {r.value}</span>
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors" onclick={() => handleEdit(r)}>
                                <Pencil class="w-3 h-3" />
                            </button>
                            <button class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-rose-500/50 hover:bg-rose-500/20 hover:text-rose-500 transition-colors" onclick={() => handleDelete(r.id)}>
                                <Trash2 class="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
{/snippet}
