<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import {
        Shield,
        Target,
        Lock,
        AlertTriangle,
        TrendingUp,
        Clock,
        Ban,
        CheckCircle2,
    } from "lucide-svelte";
    import { t } from "svelte-i18n";
    import type { RiskProfile } from "$lib/types";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";
    import * as Card from "$lib/components/ui/card";
    import { appStore } from "$lib/stores/app.svelte";

    let { profile } = $props<{ profile: RiskProfile }>();
    
    let currentPlan = $derived(
        profile.growth_plan_id ? riskSettingsStore.getGrowthPlanForProfile(profile.id) : null
    );

    function getEffectiveLimits(p: RiskProfile) {
        let dailyLoss = p.max_daily_loss;
        let dailyTarget = p.daily_target;

        if (p.use_advanced_rules && p.risk_rules) {
            const lossRule = p.risk_rules.find(r => r.enabled && r.target_type === 'max_daily_loss');
            if (lossRule) dailyLoss = Number(lossRule.value);
            
            const targetRule = p.risk_rules.find(r => r.enabled && r.target_type === 'profit_target');
            if (targetRule) dailyTarget = Number(targetRule.value);
        }
        
        return { dailyLoss, dailyTarget };
    }

    let limits = $derived(getEffectiveLimits(profile));
</script>

<div class="space-y-6 py-4">
    <!-- Header Summary -->
    <div class="flex items-center justify-between">
        <div class="space-y-1">
            <h2 class="text-2xl font-bold flex items-center gap-2">
                <Shield class="w-6 h-6 text-primary" />
                {profile.name}
            </h2>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                    {$t(
                        `risk.accountTypes.${profile.account_type_applicability}`,
                    ) || profile.account_type_applicability}
                </Badge>
                {#if currentPlan?.enabled}
                    <Badge
                        variant="default"
                        class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                    >
                        <TrendingUp class="w-3 h-3 mr-1" />
                        {$t("risk.growthPlan.activeStatus") || $t("risk.status.allowed")}
                    </Badge>
                {/if}
            </div>
        </div>
    </div>

    <Separator />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Downside Protection -->
        <Card.Root class="border-rose-500/20 bg-rose-500/5">
            <Card.Header class="pb-2">
                <Card.Title
                    class="text-base flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                    <Shield class="w-4 h-4" />
                    {$t("risk.plan.sections.downside")}
                </Card.Title>
            </Card.Header>
            <Card.Content class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground"
                        >{$t("risk.plan.labels.dailyLossLimit")}</span
                    >
                    <span
                        class="font-bold text-red-600 dark:text-red-400 text-lg"
                    >
                        R$ {limits.dailyLoss.toFixed(2)}
                    </span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground"
                        >{$t("risk.plan.labels.maxRiskPerTrade")}</span
                    >
                    <span class="font-mono font-medium"
                        >{profile.max_risk_per_trade_percent}%</span>
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Upside Targets -->
        <Card.Root class="border-green-500/20 bg-green-500/5">
            <Card.Header class="pb-2">
                <Card.Title
                    class="text-base flex items-center gap-2 text-green-600 dark:text-green-400"
                >
                    <Target class="w-4 h-4" />
                    {$t("risk.plan.sections.upside")}
                </Card.Title>
            </Card.Header>
            <Card.Content class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground"
                        >{$t("risk.plan.labels.dailyGoal")}</span
                    >
                    <span
                        class="font-bold text-green-600 dark:text-green-400 text-lg"
                    >
                        R$ {limits.dailyTarget.toFixed(2)}
                    </span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground"
                        >{$t("risk.plan.labels.minRiskReward")}</span
                    >
                    <span class="font-mono font-medium"
                        >1:{profile.min_risk_reward}</span
                    >
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Discipline & Rules -->
    <Card.Root>
        <Card.Header class="pb-2">
            <Card.Title class="text-base flex items-center gap-2">
                <Lock class="w-4 h-4" />
                {$t("risk.plan.sections.discipline")}
            </Card.Title>
        </Card.Header>
        <Card.Content class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
                <span
                    class="text-xs text-muted-foreground block uppercase font-bold"
                    >{$t("risk.plan.labels.maxTradesDay")}</span
                >
                <div class="flex items-center gap-2">
                    <Clock class="w-4 h-4 text-muted-foreground" />
                    <span class="text-lg font-medium"
                        >{profile.max_trades_per_day}</span
                    >
                </div>
            </div>

            <div class="space-y-1">
                <span
                    class="text-xs text-muted-foreground block uppercase font-bold"
                    >{$t("risk.plan.labels.platformLock")}</span
                >
                <div class="flex items-center gap-2">
                    {#if profile.lock_on_loss}
                        <Ban class="w-4 h-4 text-rose-500" />
                        <span class="font-medium text-rose-500">
                            {$t("general.yes")}
                        </span>
                    {:else}
                        <CheckCircle2 class="w-4 h-4 text-muted-foreground" />
                        <span class="font-medium text-muted-foreground">
                            {$t("general.no")}
                        </span>
                    {/if}
                </div>
            </div>

            {#if profile.lock_on_loss}
                <div
                    class="col-span-2 mt-2 p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded flex items-start gap-2"
                >
                    <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{$t("risk.plan.labels.lockWarning")}</span>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Growth Plan Summary -->
    {#if currentPlan && currentPlan.enabled && currentPlan.phases && currentPlan.phases.length > 0}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {#each currentPlan.phases as phase, i}
                    <div
                        class="p-2 rounded border bg-muted/20 text-xs relative {i ===
                        currentPlan.current_phase_index
                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                            : ''}"
                    >
                        {#if i === currentPlan.current_phase_index}
                            <div
                                class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse"
                            ></div>
                        {/if}
                        <div class="font-bold mb-1 truncate" title={phase.name}>
                            {phase.name}
                        </div>
                        <div class="text-muted-foreground">
                            {$t("risk.growthPlan.maxLotsLabel") || $t("risk.cockpit.stats.allowedSizing")}
                            <span class="font-mono text-foreground"
                                >{phase.lot_size}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
    {/if}
</div>
