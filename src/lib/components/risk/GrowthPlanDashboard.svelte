<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { accountsStore } from "$lib/stores/accounts.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Progress } from "$lib/components/ui/progress";
    import { Button } from "$lib/components/ui/button";
    import { TrendingUp, Target, AlertOctagon, ShieldAlert, CheckCircle, AlertTriangle, Info, Clock, CheckCircle2, ArrowRight } from "lucide-svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { toast } from "svelte-sonner";
    import { t, locale } from "svelte-i18n";
    import { cn } from "$lib/utils";

    let deskProgression = $derived(riskStore.deskStageProgressionState);
    let audit = $derived(riskStore.historicalAudit);
    let cockpit = $derived(riskStore.riskCockpitState);
    
    let activeProfile = $derived(riskSettingsStore.activeProfile);
    let isDeskEnabled = $derived(activeProfile?.desk_config?.enabled);
    let activeGrowthPlan = $derived(activeProfile?.growth_plan_id ? riskSettingsStore.growthPlans.find(p => p.id === activeProfile?.growth_plan_id) : undefined);
    
    // Fallback metrics
    let growthMetrics = $derived(cockpit?.growthEvaluation?.metrics);

    function advanceDeskStage() {
        if (activeProfile && activeProfile.desk_config && deskProgression?.canPromote) {
            const currentIndex = activeProfile.desk_config.current_stage_index ?? 0;
            const newDeskConfig = {
                ...activeProfile.desk_config,
                current_stage_index: currentIndex + 1
            };
            riskSettingsStore.updateRiskProfile(activeProfile.id, { desk_config: newDeskConfig });
            toast.success($t("risk.messages.deskAdvanceSuccess"));
        }
    }

    let currencyCode = $derived(
        activeProfile?.capital_source === 'LinkedAccount' && activeProfile.linked_account_id 
        ? accountsStore.accounts.find(a => a.id === activeProfile?.linked_account_id)?.currency || 'BRL'
        : 'BRL'
    );

    function formatValue(val: number) {
        return new Intl.NumberFormat($locale || "pt-BR", {
            style: "currency",
            currency: currencyCode,
        }).format(val);
    }
</script>

{#if isDeskEnabled && deskProgression && cockpit}
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <!-- HEADER / JORNADA -->
        <Card.Root class="border-2 border-primary/20 bg-background/50 overflow-hidden relative shadow-lg">
            <div class="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <Card.Content class="p-6 relative z-10">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <TrendingUp class="w-5 h-5 text-primary" />
                            <h2 class="text-xl font-bold tracking-tight">{$t("risk.desk.title")}</h2>
                        </div>
                        <p class="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            {$t("risk.desk.progression.current")}: 
                            <Badge variant="outline" class="font-bold text-foreground bg-background border-primary/30 uppercase">
                                {$t(`risk.desk.stages.${(deskProgression.currentPhaseId || 'default').toLowerCase()}`)}
                            </Badge>
                        </p>
                    </div>

                    <div class="text-right flex flex-col items-end gap-2">
                        {#if deskProgression.canPromote}
                            <Badge class="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-sm py-1.5 px-4 outline outline-1 outline-emerald-500/30">
                                <CheckCircle class="w-4 h-4 mr-2 inline" />
                                {$t("risk.desk.progression.can_advance")}
                            </Badge>
                        {:else}
                            <Badge variant="default" class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-sm py-1.5 px-4 outline outline-1 outline-primary/30">
                                <Clock class="w-4 h-4 mr-2 inline" />
                                {$t("risk.desk.progression.should_remain")}
                            </Badge>
                        {/if}
                    </div>
                </div>
            </Card.Content>
        </Card.Root>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- PISTONS (PROMOÇÃO/METAS) -->
            <div class="space-y-5 p-5 rounded-xl border bg-card/50 shadow-sm relative overflow-hidden">
                <div class="absolute left-0 top-0 w-1 h-full bg-emerald-500/50"></div>
                <div class="flex items-center gap-2 pb-3 border-b border-border/50">
                    <div class="p-1.5 rounded-md bg-emerald-500/10">
                        <Target class="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 class="font-semibold text-base">{$t("risk.growthPlan.targetsTitle")}</h3>
                </div>

                {#if deskProgression.advanceConditions.every(c => c.isMet) && deskProgression.canPromote}
                    <div class="flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                        </div>
                        <p class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {$t("risk.growthPlan.allMetMessage")}
                        </p>
                        <Button 
                            onclick={advanceDeskStage}
                            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-500/20"
                        >
                            {$t("risk.growthPlan.actions.promote")}
                            <ArrowRight class="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each deskProgression.advanceConditions as prog}
                            <div class="space-y-2.5">
                                <div class="flex justify-between text-sm items-end">
                                    <span class="font-medium text-muted-foreground">{$t(prog.label_key || prog.metric)}</span>
                                    <div class="text-right">
                                        <span class="font-mono font-bold text-foreground">{prog.current.toFixed(1)}</span>
                                        <span class="font-mono text-muted-foreground text-xs"> / {prog.target.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div class="h-2.5 bg-muted rounded-full overflow-hidden border border-border/50 shadow-inner">
                                    <div class="h-full bg-emerald-500 transition-all duration-1000 ease-out relative" style="width: {Math.min((prog.current / Math.max(prog.target, 0.01)) * 100, 100)}%">
                                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if deskProgression.advanceConditions.some(c => !c.isMet)}
                    <div class="mt-6 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <h4 class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">{$t("risk.states.evolutionRequirements")}</h4>
                        {#each deskProgression.advanceConditions.filter(c => !c.isMet) as req}
                            <div class="flex items-start gap-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                                <AlertTriangle class="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{$t(req.label_key) || req.metric}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- ZONAS DE PERIGO (DEMOÇÃO/LIMITES) -->
            <div class="space-y-5 p-5 rounded-xl border bg-card/50 shadow-sm relative overflow-hidden">
                <div class="absolute left-0 top-0 w-1 h-full bg-rose-500/50"></div>
                <div class="flex items-center gap-2 pb-3 border-b border-border/50">
                    <div class="p-1.5 rounded-md bg-rose-500/10">
                        <AlertOctagon class="w-5 h-5 text-rose-500" />
                    </div>
                    <h3 class="font-semibold text-base">{$t("risk.growthPlan.dangerZones")}</h3>
                </div>

                <div class="space-y-6">
                    <!-- Limite de Perda Diária -->
                    {#if cockpit.dailyRiskStatus}
                        {@const lossLimit = activeProfile?.max_daily_loss || 0}
                        {@const currentLoss = Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1}
                        {@const lossPercent = lossLimit > 0 ? Math.min((currentLoss / Math.max(lossLimit, 0.01)) * 100, 100) : 0}
                        <div class="space-y-2.5">
                            <div class="flex justify-between text-sm items-end">
                                <span class="font-medium text-muted-foreground">{$t("risk.growthPlan.currentDailyLoss")}</span>
                                <div class="text-right">
                                    <span class="font-mono font-bold {lossPercent > 85 ? 'text-rose-500' : 'text-foreground'}">{formatValue(currentLoss)}</span>
                                    <span class="font-mono text-muted-foreground text-xs"> / {formatValue(lossLimit)}</span>
                                </div>
                            </div>
                            <div class="h-2.5 bg-muted rounded-full overflow-hidden border border-border/50 shadow-inner">
                                <div class={cn(
                                    "h-full transition-all duration-1000 ease-out",
                                    lossPercent > 85 ? "bg-rose-500 animate-[pulse_1s_infinite]" : lossPercent > 50 ? "bg-amber-500" : "bg-primary/50"
                                )} style="width: {lossPercent}%"></div>
                            </div>
                        </div>
                    {/if}

                    <!-- Drawdown MDD / Retenção -->
                    {#if audit}
                        {@const mddLimit = activeProfile?.desk_config?.max_total_loss || 0}
                        <!-- Em Mesas prop, o MDD absoluto geralmente bate com o PnL liquido geral, ou margem negativa -->
                        <!-- Se o total_net_profit for negativo, é drawdown. -->
                        {@const currentDrawdown = Math.min(audit.metrics.total_net_profit, 0) * -1}
                        {@const mddPercent = mddLimit > 0 ? Math.min((currentDrawdown / Math.max(mddLimit, 0.01)) * 100, 100) : 0}
                        
                        {#if mddLimit > 0}
                            <div class="space-y-2.5">
                                <div class="flex justify-between text-sm items-end">
                                    <span class="font-medium text-muted-foreground">{$t("risk.growthPlan.totalDrawdown")}</span>
                                    <div class="text-right">
                                        <span class="font-mono font-bold {mddPercent > 85 ? 'text-rose-500' : 'text-foreground'}">{formatValue(currentDrawdown)}</span>
                                        <span class="font-mono text-muted-foreground text-xs"> / {formatValue(mddLimit)}</span>
                                    </div>
                                </div>
                                <div class="h-2.5 bg-muted rounded-full overflow-hidden border border-border/50 shadow-inner">
                                    <div class={cn(
                                        "h-full transition-all duration-1000 ease-out",
                                        mddPercent > 85 ? "bg-rose-500 animate-[pulse_1s_infinite]" : mddPercent > 50 ? "bg-amber-500" : "bg-primary/50"
                                    )} style="width: {mddPercent}%"></div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>

                {#if deskProgression.regressionConditions.length > 0}
                    <div class="mt-6 p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                        <h5 class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{$t("risk.growthPlan.behavioralRestrictions")}</h5>
                        {#each deskProgression.regressionConditions as sug}
                            <div class="flex items-start gap-2 text-xs text-muted-foreground">
                                <Info class="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
                                <span>{$t(sug.label_key) || sug.metric}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{:else if activeGrowthPlan && activeGrowthPlan.enabled && cockpit?.growthEvaluation}
    <!-- STANDALONE GROWTH PLAN (SE A MESA ESTIVER DESATIVADA MAS O PLANO GENERICO ESTIVER ATIVO) -->
    <Card.Root class="border-2 border-primary/20 bg-primary/5 shadow-sm">
        <Card.Header class="pb-2">
            <div class="flex justify-between items-center">
                <div class="space-y-1">
                    <Card.Title class="flex items-center gap-2">
                        <TrendingUp class="w-5 h-5 text-primary" />
                        {$t("risk.growthPlan.title")}
                    </Card.Title>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="grid grid-cols-2 gap-6 pt-2">
                <div class="space-y-3">
                    <div class="flex items-center gap-1.5 border-b border-border/50 pb-1">
                        <Target class="w-4 h-4 text-emerald-500" />
                        <span class="text-xs font-semibold text-emerald-600">{$t("risk.growthPlan.goalsProgress")}</span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">{$t("risk.desk.metrics.totalProfit")}</span>
                        <span class="font-mono font-bold text-emerald-600">{formatValue(cockpit.growthEvaluation.metrics.netPnL)}</span>
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex items-center gap-1.5 border-b border-border/50 pb-1">
                        <AlertOctagon class="w-4 h-4 text-rose-500" />
                        <span class="text-xs font-semibold text-rose-600">{$t("risk.growthPlan.dangerZones")}</span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">{$t("risk.growthPlan.totalDrawdown")}</span>
                        <span class="font-mono font-bold {cockpit.growthEvaluation.metrics.drawdownPercent > 80 ? 'text-rose-500' : 'text-foreground'}">
                            {cockpit.growthEvaluation.metrics.drawdownPercent.toFixed(2)}%
                        </span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">{$t("risk.growthPlan.currentDailyLoss")}</span>
                        <span class="font-mono font-bold">{formatValue(Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1)} <span class="text-xs text-muted-foreground font-normal">/ {formatValue(activeProfile?.max_daily_loss || 0)}</span></span>
                    </div>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
{/if}
