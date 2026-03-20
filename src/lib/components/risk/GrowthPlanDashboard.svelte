<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { settingsStore } from "$lib/stores/settings.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Progress } from "$lib/components/ui/progress";
    import { Button } from "$lib/components/ui/button";
    import { TrendingUp, Target, AlertOctagon, ShieldAlert, CheckCircle, AlertTriangle, Info, Clock, CheckCircle2, ArrowRight } from "lucide-svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { toast } from "svelte-sonner";
    import { t } from "svelte-i18n";
    import { cn } from "$lib/utils";

    let deskProgression = $derived(riskStore.deskStageProgressionState);
    let deskFeedback = $derived(riskStore.deskProgressFeedback);
    let audit = $derived(riskStore.deskAuditState);
    let cockpit = $derived(riskStore.riskCockpitState);
    
    let activeProfile = $derived(settingsStore.activeProfile);
    let isDeskEnabled = $derived(activeProfile?.desk_config?.enabled);
    let activeGrowthPlan = $derived(activeProfile?.growth_plan_id ? riskSettingsStore.growthPlans.find(p => p.id === activeProfile?.growth_plan_id) : undefined);
    
    // Fallback metrics
    let growthMetrics = $derived(cockpit?.growthEvaluation?.metrics);

    function advanceDeskStage() {
        if (activeProfile && activeProfile.desk_config && deskProgression?.can_advance) {
            const currentIndex = activeProfile.desk_config.current_stage_index ?? 0;
            const newDeskConfig = {
                ...activeProfile.desk_config,
                current_stage_index: currentIndex + 1
            };
            riskSettingsStore.updateRiskProfile(activeProfile.id, { desk_config: newDeskConfig });
            toast.success("Parabéns! Estágio da Mesa Avançado com Sucesso!");
        }
    }
</script>

{#if isDeskEnabled && deskProgression && deskFeedback && cockpit}
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <!-- HEADER / JORNADA -->
        <Card.Root class="border-2 border-primary/20 bg-background/50 overflow-hidden relative shadow-lg">
            <div class="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <Card.Content class="p-6 relative z-10">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <TrendingUp class="w-5 h-5 text-primary" />
                            <h2 class="text-xl font-bold tracking-tight">{$t("settings.risk.growthPlan.title") || "Cockpit da Mesa Proprietária"}</h2>
                        </div>
                        <p class="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            {$t("desk.progression.current") || "Estágio Atual"}: 
                            <Badge variant="outline" class="font-bold text-foreground bg-background border-primary/30 uppercase">
                                {$t(`risk.desk.stages.${deskProgression.current_stage_id.toLowerCase()}`) || deskProgression.current_stage_id}
                            </Badge>
                        </p>
                    </div>

                    <div class="text-right flex flex-col items-end gap-2">
                        {#if deskProgression.can_advance}
                            <Badge class="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-sm py-1.5 px-4 outline outline-1 outline-emerald-500/30">
                                <CheckCircle class="w-4 h-4 mr-2 inline" />
                                {$t("desk.progression.can_advance") || "Aprovado para Avançar"}
                            </Badge>
                        {:else if deskProgression.should_remain}
                            <Badge variant="default" class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-sm py-1.5 px-4 outline outline-1 outline-primary/30">
                                <Clock class="w-4 h-4 mr-2 inline" />
                                Em Avaliação (Trabalhando Margem)
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
                    <h3 class="font-semibold text-base">Metas para Avançar</h3>
                </div>

                {#if deskFeedback.progress.length === 0 && deskFeedback.missing_requirements.length === 0 && deskProgression.can_advance}
                    <div class="flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                        </div>
                        <p class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            Todas as metas concluídas! Você está pronto para o próximo estágio.
                        </p>
                        <Button 
                            onclick={advanceDeskStage}
                            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-500/20"
                        >
                            Avançar de Estágio
                            <ArrowRight class="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each deskFeedback.progress as prog}
                            <div class="space-y-2.5">
                                <div class="flex justify-between text-sm items-end">
                                    <span class="font-medium text-muted-foreground">{prog.label}</span>
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

                {#if deskFeedback.missing_requirements.length > 0}
                    <div class="mt-6 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <h4 class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Pendências</h4>
                        {#each deskFeedback.missing_requirements as req}
                            <div class="flex items-start gap-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                                <AlertTriangle class="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{$t(req) || req}</span>
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
                    <h3 class="font-semibold text-base">Zonas de Perigo</h3>
                </div>

                <div class="space-y-6">
                    <!-- Limite de Perda Diária -->
                    {#if cockpit.dailyRiskStatus}
                        {@const lossLimit = activeProfile?.max_daily_loss || 0}
                        {@const currentLoss = Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1}
                        {@const lossPercent = lossLimit > 0 ? Math.min((currentLoss / Math.max(lossLimit, 0.01)) * 100, 100) : 0}
                        <div class="space-y-2.5">
                            <div class="flex justify-between text-sm items-end">
                                <span class="font-medium text-muted-foreground">Perda Diária Atual</span>
                                <div class="text-right">
                                    <span class="font-mono font-bold {lossPercent > 85 ? 'text-rose-500' : 'text-foreground'}">R$ {currentLoss.toFixed(2)}</span>
                                    <span class="font-mono text-muted-foreground text-xs"> / R$ {lossLimit.toFixed(2)}</span>
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
                                    <span class="font-medium text-muted-foreground">Drawdown Total (MDR)</span>
                                    <div class="text-right">
                                        <span class="font-mono font-bold {mddPercent > 85 ? 'text-rose-500' : 'text-foreground'}">R$ {currentDrawdown.toFixed(2)}</span>
                                        <span class="font-mono text-muted-foreground text-xs"> / R$ {mddLimit.toFixed(2)}</span>
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

                {#if deskFeedback.suggestions.length > 0}
                    <div class="mt-6 p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                        <h5 class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Restrições Comportamentais</h5>
                        {#each deskFeedback.suggestions as sug}
                            <div class="flex items-start gap-2 text-xs text-muted-foreground">
                                <Info class="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
                                <span>{$t(sug) || sug}</span>
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
                        {$t("settings.risk.growthPlan.title") || "Plano de Crescimento"}
                    </Card.Title>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="grid grid-cols-2 gap-6 pt-2">
                <div class="space-y-3">
                    <div class="flex items-center gap-1.5 border-b border-border/50 pb-1">
                        <Target class="w-4 h-4 text-emerald-500" />
                        <span class="text-xs font-semibold text-emerald-600">Progresso de Metas</span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">Lucro Líquido Acumulado</span>
                        <span class="font-mono font-bold text-emerald-600">R$ {cockpit.growthEvaluation.metrics.netPnL.toFixed(2)}</span>
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex items-center gap-1.5 border-b border-border/50 pb-1">
                        <AlertOctagon class="w-4 h-4 text-rose-500" />
                        <span class="text-xs font-semibold text-rose-600">Zonas de Perigo</span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">Drawdown Máximo Atingido</span>
                        <span class="font-mono font-bold {cockpit.growthEvaluation.metrics.drawdownPercent > 80 ? 'text-rose-500' : 'text-foreground'}">
                            {cockpit.growthEvaluation.metrics.drawdownPercent.toFixed(2)}%
                        </span>
                    </div>
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-muted-foreground">Perda Diária Atual</span>
                        <span class="font-mono font-bold">R$ {Math.min(cockpit.dailyRiskStatus.dailyPnL, 0) * -1} <span class="text-xs text-muted-foreground font-normal">/ R$ {activeProfile?.max_daily_loss || 0}</span></span>
                    </div>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
{/if}
