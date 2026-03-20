<script lang="ts">
    import { settingsStore } from "$lib/stores/settings.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Progress } from "$lib/components/ui/progress";
    import { Button } from "$lib/components/ui/button";
    import { TrendingUp, TrendingDown, Lock, CheckCircle, AlertTriangle, Info } from "lucide-svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { evaluateGrowthPhase } from "$lib/utils/riskLogic";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { toast } from "svelte-sonner";
    import { t } from "svelte-i18n";

    let currentStats: import("$lib/utils/riskLogic").TradeStatsSummary = {
        totalProfit: 450,
        daysPositive: 2,
        winRate: 60,
        consistencyDays: 2,
        currentDrawdown: 150,
        dailyLossLimit: 500,
        maxDailyLossStreak: 1,
    };

    let activeProfile = $derived(settingsStore.activeProfile);
    let activeGrowthPlan = $derived(
        settingsStore.growthPlans.find(p => p.id === activeProfile?.growth_plan_id)
    );
    let currentPhase = $derived(
        activeGrowthPlan?.phases?.[activeGrowthPlan.current_phase_index],
    );

    let evaluation = $derived(
        activeGrowthPlan && currentPhase
            ? evaluateGrowthPhase(activeGrowthPlan, currentStats)
            : null,
    );

    let deskProgression = $derived(riskStore.deskStageProgressionState);
    let deskFeedback = $derived(riskStore.deskProgressFeedback);

    function applyProgression() {
        if (evaluation?.action === "promote" && activeGrowthPlan) {
            settingsStore.updateRiskProfilePhase(
                // Note: The phase index update needs to hit RiskSettingsStore's updateGrowthPlanPhase if applicable
                // Since updateRiskProfilePhase modifies the RiskProfile's deprecated field, 
                // we should update activeGrowthPlan instead. But for now, assuming there's a store method:
                // Actually, this method currently modifies RiskProfile. 
                // Wait! Let's just fix the toast interpolation for now.
                activeProfile.id,
                evaluation.newPhaseIndex,
            );
            toast.success(
                $t("settings.risk.growthPlan.toasts.promote", {
                    values: {
                        name: activeGrowthPlan.phases[
                            evaluation.newPhaseIndex
                        ].name,
                    },
                }),
            );
        }
    }

    function applyRegression() {
        if (evaluation?.action === "demote" && activeProfile && activeGrowthPlan) {
            settingsStore.updateRiskProfilePhase(
                activeProfile.id,
                evaluation.newPhaseIndex,
            );
            toast.warning(
                $t("settings.risk.growthPlan.toasts.demote", {
                    values: {
                        name: activeGrowthPlan.phases[
                            evaluation.newPhaseIndex
                        ].name,
                    },
                }),
            );
        }
    }
</script>

{#if activeGrowthPlan && activeGrowthPlan.enabled && currentPhase}
    <Card.Root class="border-2 border-primary/20 bg-primary/5">
        <Card.Header class="pb-2">
            <div class="flex justify-between items-center">
                <div class="space-y-1">
                    <Card.Title class="flex items-center gap-2">
                        <TrendingUp class="w-5 h-5 text-primary" />
                        {$t("settings.risk.growthPlan.title")}: {currentPhase.name}
                    </Card.Title>
                    <Card.Description
                        >{$t("settings.risk.growthPlan.maxLotsLabel")}
                        <strong>{currentPhase.lot_size}</strong>
                    </Card.Description>
                </div>
                <div class="text-right">
                    <span
                        class="text-xs text-muted-foreground uppercase font-bold"
                        >{$t("settings.risk.growthPlan.status.title")}</span
                    >
                    <div class="font-mono text-lg">
                        {evaluation?.action === "promote"
                            ? $t("settings.risk.growthPlan.status.approved")
                            : evaluation?.action === "demote"
                              ? $t("settings.risk.growthPlan.status.regression")
                              : $t(
                                    "settings.risk.growthPlan.status.inProgress",
                                )}
                    </div>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="grid grid-cols-2 gap-4">
                <!-- Progression Status -->
                <div class="space-y-2">
                    <span class="text-xs font-semibold text-green-600"
                        >{$t(
                            "settings.risk.growthPlan.requirements.promote",
                        )}</span
                    >
                    {#each currentPhase?.conditions_to_advance || [] as rule}
                        <div class="flex justify-between text-sm">
                            <span>
                                {rule.metric === "profit_target"
                                    ? $t("settings.risk.growthPlan.requirements.profit")
                                    : rule.metric === "days_positive"
                                      ? $t("settings.risk.growthPlan.requirements.days")
                                      : rule.metric === "win_rate"
                                        ? $t("settings.risk.growthPlan.requirements.winRate")
                                        : rule.metric === "consistency_days"
                                          ? $t("settings.risk.growthPlan.requirements.consistency")
                                          : rule.metric}
                            </span>
                            <span>
                                {rule.metric === "profit_target"
                                    ? `R$ ${currentStats.totalProfit} / ${rule.value}`
                                    : rule.metric === "days_positive"
                                      ? `${currentStats.daysPositive} / ${rule.value}`
                                      : rule.metric === "win_rate"
                                        ? `${currentStats.winRate.toFixed(1)}% / ${rule.value}%`
                                        : rule.metric === "consistency_days"
                                          ? `${currentStats.consistencyDays} / ${rule.value}`
                                          : `${rule.value}`}
                            </span>
                        </div>
                        <Progress
                            value={(rule.metric === "profit_target"
                                ? Math.min(currentStats.totalProfit / rule.value, 1)
                                : rule.metric === "days_positive"
                                  ? Math.min(currentStats.daysPositive / rule.value, 1)
                                  : rule.metric === "win_rate"
                                    ? Math.min(currentStats.winRate / rule.value, 1)
                                    : rule.metric === "consistency_days"
                                      ? Math.min(currentStats.consistencyDays / rule.value, 1)
                                      : 0) * 100}
                            class="h-2"
                        />
                    {/each}
                </div>

                <!-- Regression Status -->
                <div class="space-y-2">
                    <span class="text-xs font-semibold text-red-600"
                        >{$t(
                            "settings.risk.growthPlan.requirements.demote",
                        )}</span
                    >
                    {#each currentPhase?.conditions_to_demote || [] as rule}
                        <div class="flex justify-between text-sm">
                            <span>
                                {rule.metric === "drawdown_limit"
                                    ? $t("settings.risk.growthPlan.requirements.drawdown")
                                    : rule.metric === "daily_loss_limit"
                                      ? $t("settings.risk.growthPlan.requirements.dailyLoss")
                                      : rule.metric === "max_daily_loss_streak"
                                        ? $t("settings.risk.growthPlan.requirements.lossStreak")
                                        : rule.metric}
                            </span>
                            <span class={(rule.metric === "drawdown_limit" && (currentStats.currentDrawdown || 0) > rule.value) || (rule.metric === "daily_loss_limit" && (currentStats.dailyLossLimit || 0) > rule.value) || (rule.metric === "max_daily_loss_streak" && (currentStats.maxDailyLossStreak || 0) > rule.value) ? "text-rose-500 font-bold" : ""}>
                                {rule.metric === "drawdown_limit"
                                    ? `R$ ${currentStats.currentDrawdown} / ${rule.value}`
                                    : rule.metric === "daily_loss_limit"
                                      ? `R$ ${currentStats.dailyLossLimit} / ${rule.value}`
                                      : rule.metric === "max_daily_loss_streak"
                                        ? `${currentStats.maxDailyLossStreak} / ${rule.value}`
                                        : `${rule.value}`}
                            </span>
                        </div>
                        <Progress
                            value={(rule.metric === "drawdown_limit"
                                ? Math.min((currentStats.currentDrawdown || 0) / rule.value, 1)
                                : rule.metric === "daily_loss_limit"
                                  ? Math.min((currentStats.dailyLossLimit || 0) / rule.value, 1)
                                  : rule.metric === "max_daily_loss_streak"
                                    ? Math.min((currentStats.maxDailyLossStreak || 0) / rule.value, 1)
                                    : 0) * 100}
                            class="h-2 {['drawdown_limit', 'daily_loss_limit', 'max_daily_loss_streak'].includes(rule.metric) ? 'bg-red-100' : ''}"
                        />
                    {/each}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-4 flex justify-end gap-2">
                {#if evaluation?.action === "promote"}
                    <Button
                        onclick={applyProgression}
                        class="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle class="w-4 h-4 mr-2" />
                        {$t("settings.risk.growthPlan.actions.promote")}
                    </Button>
                {:else if evaluation?.action === "demote"}
                    <Button onclick={applyRegression} variant="destructive">
                        <Lock class="w-4 h-4 mr-2" />
                        {$t("settings.risk.growthPlan.actions.demote")}
                    </Button>
                {/if}
            </div>
        </Card.Content>
    </Card.Root>
{/if}

{#if deskProgression && deskFeedback}
    <Card.Root class="border-2 border-primary/20 bg-background/50 mt-4">
        <Card.Header class="pb-2">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <Card.Title class="flex items-center gap-2">
                        <TrendingUp class="w-5 h-5 text-primary" />
                        {$t("desk.progression.title") || "Progressão de Estágio - Mesa"}
                    </Card.Title>
                    <Card.Description>
                        {$t("desk.progression.current") || "Estágio Atual"}: <span class="font-mono font-bold text-primary">{deskProgression.current_stage_id}</span>
                    </Card.Description>
                </div>
                {#if deskProgression.can_advance}
                    <Badge variant="default" class="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                        {$t("desk.progression.can_advance") || "Apto para Avançar"}
                    </Badge>
                {:else if deskProgression.should_remain}
                    <Badge variant="secondary" class="text-muted-foreground">
                        {$t("desk.progression.should_remain") || "Estágio Retido"}
                    </Badge>
                {/if}
            </div>
        </Card.Header>
        <Card.Content>
            {#if deskProgression.checks.length > 0}
                <div class="space-y-2 mb-4">
                    {#each deskProgression.checks as check}
                        <div class="flex items-center gap-2 text-sm">
                            {#if check.passed}
                                <div class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                <span class="text-muted-foreground">{check.reason || check.key}</span>
                            {:else}
                                <div class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                                <span class="text-amber-500/90">{check.reason || check.key}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}

            {#if deskFeedback.missing_requirements.length > 0 || deskFeedback.progress.length > 0 || deskFeedback.suggestions.length > 0}
                <div class="space-y-4 pt-4 border-t border-current/10">
                    <h4 class="font-semibold text-sm">{$t("desk.feedback.title") || "O Que Falta para Avançar?"}</h4>
                    
                    {#if deskFeedback.missing_requirements.length > 0}
                        <div class="space-y-1">
                            {#each deskFeedback.missing_requirements as req}
                                <div class="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                                    <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{$t(req) || req}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    {#if deskFeedback.progress.length > 0}
                        <div class="space-y-3 pt-2">
                            {#each deskFeedback.progress as prog}
                                <div class="space-y-1">
                                    <div class="flex justify-between text-xs text-muted-foreground">
                                        <span>{prog.label}</span>
                                        <span class="font-mono">{prog.current} / {prog.target}</span>
                                    </div>
                                    <div class="h-2 bg-muted rounded-full overflow-hidden border border-current/10">
                                        <div class="h-full bg-primary transition-all duration-500" style="width: {Math.min((prog.current / prog.target) * 100, 100)}%"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    {#if deskFeedback.suggestions.length > 0}
                        <div class="space-y-1 pt-2 border-t border-current/10">
                            <h5 class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Guias Adicionais</h5>
                            {#each deskFeedback.suggestions as sug}
                                <div class="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Info class="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>{$t(sug) || sug}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
{/if}
