<script lang="ts">
    import { t } from "svelte-i18n";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Select from "$lib/components/ui/select";
    import { Badge } from "$lib/components/ui/badge";
    import type { DeskConfig, AssetRiskProfile } from "$lib/types";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { CheckCircle2, XCircle, Clock, AlertTriangle, Info } from "lucide-svelte";
    import { cn } from "$lib/utils";

    let { 
        config = $bindable(),
        availableAssetProfiles = []
    } = $props<{
        config: DeskConfig | undefined;
        availableAssetProfiles: AssetRiskProfile[];
    }>();

    // In case the config is completely missing from older DB entries, initialize it when enabled
    function ensureInitialized() {
        if (!config) {
            config = {
                enabled: true,
                plan_name: "",
                allowed_asset_ids: [],
                max_combined_exposure: 0,
                max_total_loss: 0,
                profit_target: 0,
                day_trade_only: true,
                close_before_market_close_minutes: 0,
                consistency_mode: "none",
                max_single_day_profit_share: 0,
                mdr_mode: "none",
                stages: [
                    { id: 'margin_building', name: 'Construção de Margem', enabled: true, mdr_mode: 'none', rule_50_percent_enabled: false, consistency_enabled: false },
                    { id: 'real_phase_1', name: 'Conta Real - Fase 1', enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: true, consistency_enabled: true },
                    { id: 'real_final', name: 'Conta Real - Definitiva', enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: false, consistency_enabled: true }
                ],
                current_stage_index: 0
            };
            return;
        }
        if (!config.plan_name) config.plan_name = "";
        if (!config.allowed_asset_ids) config.allowed_asset_ids = [];
        if (!config.max_combined_exposure) config.max_combined_exposure = 0;
        if (!config.max_total_loss) config.max_total_loss = 0;
        if (!config.profit_target) config.profit_target = 0;
        if (config.day_trade_only === undefined) config.day_trade_only = true;
        if (!config.close_before_market_close_minutes) config.close_before_market_close_minutes = 0;
        if (!config.consistency_mode) config.consistency_mode = "none";
        if (!config.max_single_day_profit_share) config.max_single_day_profit_share = 0;
        if (!config.mdr_mode) config.mdr_mode = "none";
        if (!config.stages || config.stages.length === 0) {
            config.stages = [
                { id: 'margin_building', name: $t("risk.desk.stages.margin_building"), enabled: true, mdr_mode: 'none', rule_50_percent_enabled: false, consistency_enabled: false },
                { id: 'real_phase_1', name: $t("risk.desk.stages.real_phase_1"), enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: true, consistency_enabled: true },
                { id: 'real_final', name: $t("risk.desk.stages.real_final"), enabled: true, mdr_mode: 'percent_of_margin', rule_50_percent_enabled: false, consistency_enabled: true }
            ];
        }
        if (config.current_stage_index === undefined) config.current_stage_index = 0;
    }

    $effect(() => {
        if (config.enabled) {
            ensureInitialized();
        }
    });

    function toggleAssetProfile(profileId: string) {
        if (!config.allowed_asset_ids) config.allowed_asset_ids = [];
        if (config.allowed_asset_ids.includes(profileId)) {
            config.allowed_asset_ids = config.allowed_asset_ids.filter((id: string) => id !== profileId);
        } else {
            config.allowed_asset_ids = [...config.allowed_asset_ids, profileId];
        }
    }

    const audit = $derived(riskStore.historicalAudit);
    const progression = $derived(riskStore.deskStageProgressionState);
    const feedback = $derived(riskStore.deskProgressFeedback);

</script>

<div class="space-y-6">
    <div class="flex items-center justify-between p-4 rounded-lg border bg-background/50">
        <div class="space-y-0.5">
            <Label class="text-base font-semibold">{$t("risk.desk.config")}</Label>
            <p class="text-sm text-muted-foreground">{$t("risk.desk.enable")}</p>
        </div>
        <Switch checked={config?.enabled ?? false} onCheckedChange={(c: boolean) => {
            if (c) {
                ensureInitialized();
                if (config) config.enabled = true;
            } else if (config) {
                config.enabled = false;
            }
        }} />
    </div>

    {#if config?.enabled}
        <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-6 flex gap-3 items-start">
            <Info class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div class="space-y-1">
                <p class="text-xs font-bold text-amber-600 dark:text-amber-400">{$t("risk.desk.title")}</p>
                <p class="text-[10px] text-muted-foreground leading-relaxed">
                    {$t("risk.desk.desc")}
                </p>
            </div>
        </div>

        <div class="p-6 rounded-lg border bg-background/30 space-y-6">
            
                <!-- Nome do Plano -->
                <div class="space-y-2">
                    <Label>{$t("risk.finance.planName")}</Label>
                    <Input bind:value={config.plan_name} placeholder={$t("risk.finance.planNamePlaceholder") || "Ex: 5PI Book 4k"} />
                </div>

                <!-- MDR Mode -->
                <div class="space-y-2">
                    <Label>{$t("risk.rules.builder.presets.maxDailyLoss")}</Label>
                    <Select.Root
                        type="single"
                        bind:value={config.mdr_mode}
                    >
                        <Select.Trigger>
                            {#if config.mdr_mode === "fixed"}
                                {$t("risk.growth.modes.accumulate")}
                            {:else if config.mdr_mode === "percent_of_margin"}
                                {$t("risk.growth.modes.recover")}
                            {:else}
                                {$t("risk.growth.none")}
                            {/if}
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="none">{$t("risk.growth.none")}</Select.Item>
                            <Select.Item value="fixed">{$t("risk.growth.modes.accumulate")}</Select.Item>
                            <Select.Item value="percent_of_margin">{$t("risk.growth.modes.recover")}</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </div>

                <!-- Estágio Atual -->
                {#if config.stages && config.stages.length > 0}
                    <div class="space-y-2 pt-4 border-t border-current/10">
                        <Label>{$t("risk.desk.stages.currentStage")}</Label>
                        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
                            <Select.Root
                                type="single"
                                value={config.current_stage_index?.toString() ?? "0"}
                                onValueChange={(v: string) => { if(config) config.current_stage_index = parseInt(v); }}
                            >
                                <Select.Trigger class="w-full md:w-[300px]">
                                    {config.stages[config.current_stage_index ?? 0]?.name || $t("risk.plan.finance.selectAccount")}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each config.stages as stage, i}
                                        <Select.Item value={i.toString()}>{stage.name}</Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Auditoria Histórica -->
            {#if audit}
                <div class="mt-8 space-y-4">
                    <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {$t("risk.desk.auditTitle")}
                    </h3>
                    
                    <div class={cn(
                        "p-4 rounded-lg border flex flex-col gap-3",
                        audit.status === 'passed' ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" :
                        audit.status === 'failed' ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" :
                        "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                    )}>
                        <div class="flex items-center gap-2 font-bold text-base">
                            {#if audit.status === 'passed'}
                                <CheckCircle2 class="w-5 h-5" /> {$t("risk.desk.status.passed")}
                            {:else if audit.status === 'failed'}
                                <XCircle class="w-5 h-5" /> {$t("risk.desk.status.failed")}
                            {:else}
                                <Clock class="w-5 h-5" /> {$t("risk.desk.status.pending")}
                            {/if}
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                            <div class="flex flex-col">
                                <span class="opacity-80 text-xs">{$t("risk.desk.metrics.operatedDays")}</span>
                                <span class="font-semibold">{audit.metrics.operated_days}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="opacity-80 text-xs">{$t("risk.desk.metrics.positiveDays")}</span>
                                <span class="font-semibold">{audit.metrics.positive_days}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="opacity-80 text-xs">{$t("risk.desk.metrics.bestDayShare")}</span>
                                <span class="font-semibold">{audit.metrics.best_day_share_percent.toFixed(1)}%</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="opacity-80 text-xs">{$t("risk.desk.metrics.totalProfit")}</span>
                                <span class="font-semibold">{audit.metrics.total_net_profit.toFixed(2)}</span>
                            </div>
                        </div>

                        {#if audit.reasons.length > 0}
                            <div class="mt-2 pt-3 border-t border-current/10 space-y-1">
                                {#each audit.reasons as reason}
                                    <p class="text-xs flex items-start gap-1.5 opacity-90">
                                        <span class="mt-0.5">•</span> {reason}
                                    </p>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Progressão de Estágio -->
            {#if progression}
                <div class="mt-4 p-4 rounded-lg border bg-background/50 space-y-3">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="space-y-0.5">
                            <h4 class="font-semibold text-sm">{$t("risk.desk.progression.title")}</h4>
                            <p class="text-xs text-muted-foreground uppercase tracking-widest">
                                {$t("risk.desk.progression.current")}: <span class="font-mono font-bold text-primary">{$t(`risk.desk.stages.${progression.currentPhaseId.toLowerCase()}`) || config.stages.find((s: any) => s.id.toLowerCase() === progression.currentPhaseId.toLowerCase())?.name || progression.currentPhaseId}</span>
                            </p>
                        </div>
                        {#if progression.canPromote}
                            <Badge variant="default" class="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                                {$t("risk.desk.progression.can_advance")}
                            </Badge>
                        {:else}
                            <Badge variant="secondary" class="text-muted-foreground">
                                {$t("risk.desk.progression.should_remain")}
                            </Badge>
                        {/if}
                    </div>

                    {#if progression.advanceConditions.length > 0}
                        <div class="space-y-2 mt-2 pt-2 border-t border-current/10">
                            {#each progression.advanceConditions as check}
                                <div class="flex items-center gap-2 text-xs">
                                    {#if check.isMet}
                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                        <span class="text-muted-foreground">{check.metric}: {check.current}/{check.target}</span>
                                    {:else}
                                        <div class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                        <span class="text-amber-500/90">{check.metric}: {check.current}/{check.target}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                    {#if progression.regressionConditions.length > 0 && !progression.canPromote}
                        <div class="pt-2">
                            {#each progression.regressionConditions as r}
                                <p class="text-[10px] text-amber-500 italic flex items-center gap-1">
                                    <span class="mt-0.5">•</span> {r.metric}: {r.current} (Max: {r.target})
                                </p>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
    {/if}
</div>
