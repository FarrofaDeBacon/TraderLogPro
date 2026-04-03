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
    import { cn, formatCurrency } from "$lib/utils";

    let deskProgression = $derived(riskStore.deskStageProgressionState);
    let audit = $derived(riskStore.historicalAudit);
    let cockpit = $derived(riskStore.riskCockpitState);
    
    let activeProfile = $derived(riskSettingsStore.activeProfile);
    let isDeskEnabled = $derived(activeProfile?.desk_config?.enabled);
    let activeGrowthPlan = $derived(activeProfile?.growth_plan_id ? riskSettingsStore.growthPlans.find(p => p.id === activeProfile?.growth_plan_id) : undefined);
    
    let growthMetrics = $derived(cockpit?.growthEvaluation?.metrics);
    
    let lossLimit = $derived(activeProfile?.max_daily_loss || 1);
    let lossPercent = $derived(cockpit ? Math.min((Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1 / lossLimit) * 100, 100) : 0);

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
        return formatCurrency(val, currencyCode);
    }
</script>

{#if (isDeskEnabled || activeGrowthPlan?.enabled) && deskProgression && cockpit}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2">
        <!-- SEÇÃO ESQUERDA: STATUS E JORNADA -->
        <Card.Root class="border border-white/5 bg-background/20 backdrop-blur-md overflow-hidden relative p-3 flex flex-col justify-between min-h-[120px]">
             <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                    <div class="p-1 rounded bg-primary/10 border border-primary/20">
                        <TrendingUp class="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                        <h2 class="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                            {activeGrowthPlan?.name || $t("risk.rules.desk.title")}
                        </h2>
                        <h3 class="text-sm font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-2">
                            {$t(`risk.rules.desk.stages.${(deskProgression.currentPhaseId || 'default').toLowerCase()}`)}
                            <span class="text-[10px] text-primary font-mono bg-primary/10 px-1 rounded">
                                {deskProgression.phaseIndex + 1}/{deskProgression.totalPhases}
                            </span>
                        </h3>
                        {#if cockpit.growthEvaluation?.shouldRegress}
                            <div class="mt-1.5 flex items-center gap-1.5 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                                <ShieldAlert class="w-2.5 h-2.5 text-rose-500" />
                                <span class="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">
                                    {$t(cockpit.growthEvaluation.regressionReasonKey || 'risk.states.violation').toUpperCase()}
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[200px]">
                    {#each Array(deskProgression.totalPhases) as _, i}
                        <div class={cn(
                            "w-5 h-1.5 rounded-full transition-all duration-500",
                            i === deskProgression.phaseIndex ? "bg-primary glow-primary w-8" : 
                            i < deskProgression.phaseIndex ? "bg-emerald-500 opacity-60" : "bg-white/10"
                        )}></div>
                    {/each}
                </div>
             </div>

             <div class="mt-4 flex flex-wrap gap-2 items-end justify-between">
                <div class="flex gap-4">
                    <div>
                        <p class="text-[8px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Exposure</p>
                        <p class="text-xs font-black tracking-tighter uppercase leading-none">
                            {activeGrowthPlan?.phases[deskProgression.phaseIndex]?.lot_size || cockpit.growthPhase?.maxContracts || 0} CTR
                        </p>
                    </div>
                    <div>
                        <p class="text-[8px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Session</p>
                        <div class="flex items-center gap-1">
                             <div class={cn("w-1.5 h-1.5 rounded-full", cockpit.dailyRiskStatus.isLocked ? "bg-rose-500 animate-pulse" : "bg-emerald-500")}></div>
                             <span class="text-[10px] font-black uppercase tracking-tighter">{cockpit.dailyRiskStatus.statusLabel}</span>
                        </div>
                    </div>
                </div>

                {#if deskProgression.canPromote}
                    <Button 
                        onclick={advanceDeskStage}
                        size="sm"
                        class="h-7 neon-glow bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-4 hover:bg-emerald-400"
                    >
                        {$t("risk.growth.actions.promote")}
                        <ArrowRight class="w-3 h-3 ml-2" />
                    </Button>
                {:else}
                    <div class="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
                         <Clock class="w-3 h-3 text-muted-foreground/50" />
                         <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{$t("risk.rules.desk.maintenance")}</span>
                    </div>
                {/if}
             </div>
        </Card.Root>

        <!-- SEÇÃO DIREITA: MÉTRICAS DE EVOLUÇÃO -->
        <Card.Root class="border border-white/5 bg-background/20 backdrop-blur-md p-3 flex flex-col justify-between">
            <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                {#each deskProgression.advanceConditions as prog}
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {$t(prog.label_key || `risk.metrics.${prog.metric.toLowerCase()}`)}
                            </span>
                            <span class="text-[9px] font-mono font-bold {prog.isMet ? 'text-emerald-500' : 'text-foreground'}">
                                {prog.current.toFixed(prog.unit === '%' ? 1 : 0)}{prog.unit || ''}
                                <span class="text-white/20">/</span>
                                {prog.target.toFixed(0)}{prog.unit || ''}
                            </span>
                        </div>
                        <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                                class={cn("h-full transition-all duration-1000", prog.isMet ? "bg-emerald-500" : "bg-primary")} 
                                style="width: {Math.min((prog.current / Math.max(prog.target, 0.01)) * 100, 100)}%"
                            ></div>
                        </div>
                    </div>
                {/each}

                <!-- Risco Diário Integrado -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-black text-rose-500/80 uppercase tracking-widest">Daily Limit</span>
                        <span class="text-[9px] font-mono font-bold text-foreground">
                            {formatValue(Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1)}
                            <span class="text-white/20">/</span>
                            {formatValue(activeProfile?.max_daily_loss || 0)}
                        </span>
                    </div>
                    <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            class={cn("h-full transition-all duration-1000", lossPercent > 80 ? "bg-rose-500" : "bg-rose-500/30")} 
                            style="width: {lossPercent}%"
                        ></div>
                    </div>
                </div>

                <!-- Drawdown Integrado -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">
                            {activeGrowthPlan?.drawdown_unit === 'points' ? 'Points Drawdown' : 'Max Drawdown'}
                        </span>
                        <span class="text-[9px] font-mono font-bold text-foreground">
                            {#if activeGrowthPlan?.drawdown_unit === 'points'}
                                {growthMetrics?.drawdownAmountPoints.toFixed(0) || '0'} pts
                            {:else}
                                {growthMetrics?.drawdownPercent.toFixed(1) || '0'}%
                            {/if}
                        </span>
                    </div>
                    <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            class={cn("h-full transition-all duration-1000", (growthMetrics?.drawdownPercent || 0) > 80 ? "bg-rose-500" : "bg-amber-500/40")} 
                            style="width: {Math.min(growthMetrics?.drawdownPercent || 0, 100)}%"
                        ></div>
                    </div>
                </div>
            </div>
        </Card.Root>
    </div>
{/if}
