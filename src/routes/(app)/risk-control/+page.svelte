<script lang="ts">
    import { settingsStore } from "$lib/stores/settings.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { formatCurrency } from "$lib/utils";
    import * as Card from "$lib/components/ui/card";
    import { t } from "svelte-i18n";
    
    import { 
        CheckCircle2, 
        XCircle, 
        AlertTriangle, 
        Info, 
        ShieldAlert, 
        TrendingUp, 
        Shield, 
        Activity,
        Lock,
        Target,
        Layers
    } from "lucide-svelte";
    
    // Derived states para consumo sem re-cálculos locais
    let activeProfile = $derived(settingsStore.activeProfile);
    let cockpit = $derived(riskStore.riskCockpitState);
    let validation = $derived(riskStore.deskValidationResult);
    let deskFeedback = $derived(riskStore.deskProgressFeedback);
    let deskProgression = $derived(riskStore.deskStageProgressionState);
    let deskAudit = $derived(riskStore.deskAuditState);
    let growthContext = $derived(riskStore.resolvedGrowthContext);

    // Helpers ultra-simples para traduzir o status
    let dailyDrawdown = $derived(Math.max(0, -(cockpit?.dailyRiskStatus.dailyPnL || 0)));
    let isBlocked = $derived(!validation?.allowed || cockpit?.dailyRiskStatus.isLocked || cockpit?.dailyRiskStatus.dailyLossHit);
    let hasWarnings = $derived(validation?.warnings && validation.warnings.length > 0);
    
    let mainStatus = $derived(
        isBlocked ? "blocked" : 
        hasWarnings ? "caution" : 
        "allowed"
    );

    let currencyCode = $derived(
        activeProfile?.capital_source === 'LinkedAccount' && activeProfile.linked_account_id 
        ? settingsStore.accounts.find(a => a.id === activeProfile?.linked_account_id)?.currency || 'USD'
        : settingsStore.userProfile.main_currency || 'USD'
    );
</script>

<div class="flex-1 flex flex-col space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
    
    <!-- Cabeçalho Principal Enxuto -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
            <h1 class="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                <Activity class="w-8 h-8 text-primary" />
                {$t('risk.cockpit.title')}
            </h1>
            <p class="text-muted-foreground mt-1">{$t('risk.cockpit.subtitle')}</p>
        </div>
        
        <!-- BLOCO 1 - CONTEXTO (ENXUTO) -->
        {#if activeProfile}
        <div class="flex flex-wrap items-center gap-2 bg-black/20 p-2 rounded-lg border border-border/10">
            <div class="px-3 py-1 bg-black/40 rounded border border-border/20 text-xs text-muted-foreground flex items-center gap-2">
                <Shield class="w-3 h-3 text-primary" />
                {$t('risk.cockpit.profile')} <span class="font-bold text-foreground">{activeProfile.name}</span>
            </div>
            {#if growthContext}
            <div class="px-3 py-1 bg-primary/10 rounded border border-primary/20 text-xs text-primary flex items-center gap-2">
                <Layers class="w-3 h-3" />
                {$t('risk.cockpit.plan')} <span class="font-bold">{growthContext.growthPhase.name}</span>
            </div>
            {/if}
            {#if riskStore.activeAssetId}
            <div class="px-3 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs text-emerald-500 font-bold uppercase tracking-wider">
                {$t('risk.cockpit.asset')} {settingsStore.assets.find(a => a.id === riskStore.activeAssetId)?.symbol || 'Nenhum'}
            </div>
            {:else}
            <div class="px-3 py-1 bg-rose-500/10 rounded border border-rose-500/20 text-xs text-rose-500 font-bold uppercase tracking-wider">
                {$t('risk.cockpit.selectAsset')}
            </div>
            {/if}
        </div>
        {/if}
    </div>

    <!-- Empty State se não houver perfil -->
    {#if !activeProfile}
        <div class="p-8 text-center rounded-xl bg-muted/10 border border-dashed border-border/20 flex flex-col items-center justify-center min-h-[300px]">
            <Lock class="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h2 class="text-xl font-bold">{$t('risk.cockpit.noProfile')}</h2>
            <p class="text-muted-foreground max-w-sm mt-2">{$t('risk.cockpit.noProfileDesc')}</p>
        </div>
    {:else}

    <!-- ================= GRID BENTO PRINCIPAL ================= -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">

        <!-- BLOCO 0 e 2: DECISÃO MESTRA & STATUS RÁPIDO (Col Left - 4) -->
        <div class="md:col-span-4 flex flex-col gap-6">
            
            <!-- BLOCO 0: DECISÃO -->
            <div class="rounded-2xl border-2 p-6 flex flex-col gap-4 shadow-lg transition-colors
                {mainStatus === 'blocked' ? 'border-rose-500/50 bg-rose-500/5' : 
                 mainStatus === 'caution' ? 'border-amber-500/50 bg-amber-500/5' : 
                 'border-emerald-500/30 bg-emerald-500/5 glow-emerald'}">
                
                <div class="flex flex-col gap-1 text-center items-center justify-center py-4">
                    {#if mainStatus === 'blocked'}
                        <XCircle class="w-16 h-16 text-rose-500 mb-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        <h2 class="text-3xl font-black text-rose-500 uppercase tracking-tighter">{$t('risk.cockpit.statusBlocked')}</h2>
                        <p class="font-bold text-foreground mt-2 text-lg">{$t('risk.cockpit.statusBlockedDesc1')}</p>
                        <p class="text-rose-400/80 text-sm">
                            {validation?.reasons[0] || $t('risk.cockpit.statusBlockedDesc2')}
                        </p>
                    {:else if mainStatus === 'caution'}
                        <AlertTriangle class="w-16 h-16 text-amber-500 mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        <h2 class="text-3xl font-black text-amber-500 uppercase tracking-tighter">{$t('risk.cockpit.statusCaution')}</h2>
                        <p class="font-bold text-foreground mt-2 text-lg">{$t('risk.cockpit.statusCautionDesc1')}</p>
                        <p class="text-amber-400/80 text-sm">{$t('risk.cockpit.statusCautionDesc2')}</p>
                    {:else}
                        <CheckCircle2 class="w-16 h-16 text-emerald-500 mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <h2 class="text-3xl font-black text-emerald-500 uppercase tracking-tighter">{$t('risk.cockpit.statusAllowed')}</h2>
                        <p class="font-bold text-foreground mt-2 text-lg">{$t('risk.cockpit.statusAllowedDesc1')}</p>
                        <p class="text-emerald-400/80 text-sm">{$t('risk.cockpit.statusAllowedDesc2')}</p>
                    {/if}
                </div>
            </div>

            <!-- BLOCO 2: STATUS CARDS -->
            <div class="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div class="p-4 rounded-xl border border-border/10 bg-card/50 flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest">{$t('risk.cockpit.dailyDrawdown')}</span>
                    <span class="text-2xl font-black font-mono {dailyDrawdown > 0 ? 'text-rose-500' : 'text-emerald-500'}">
                        {formatCurrency(dailyDrawdown, currencyCode)}
                    </span>
                    {#if activeProfile.max_daily_loss > 0}
                        <div class="mt-2 w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div class="h-full bg-rose-500 rounded-full" style="width: {Math.min((dailyDrawdown / activeProfile.max_daily_loss) * 100, 100)}%"></div>
                        </div>
                    {/if}
                </div>
                
                <div class="p-4 rounded-xl border border-border/10 bg-card/50 flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest flex items-center gap-1">
                        {$t('risk.cockpit.sizing')}
                        <Info class="w-3 h-3 text-blue-400" />
                    </span>
                    {#if riskStore.positionSizingResult?.isValid}
                        <span class="text-2xl font-black font-mono text-primary">
                            {riskStore.positionSizingResult.allowedContracts} <span class="text-sm">{$t('risk.cockpit.contracts')}</span>
                        </span>
                    {:else}
                        <span class="text-2xl font-black font-mono text-rose-500">{$t('risk.cockpit.blockedZero')}</span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- BLOCO CENTRAL: ALERTAS, PROGRESSO E MISSING REQUIREMENTS (Col Middle/Right - 8) -->
        <div class="md:col-span-8 flex flex-col gap-6">
            
            <!-- BLOCO 4: ALERTAS (Separados) -->
            {#if !validation?.allowed && validation?.reasons && validation.reasons.length > 0}
            <div class="bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg p-5 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-wider text-sm">
                    <Lock class="w-4 h-4" /> {$t('risk.cockpit.violations')}
                </div>
                <ul class="list-disc list-inside text-sm text-rose-400/90 space-y-1">
                    {#each validation.reasons as reason}
                        <li>{reason}</li>
                    {/each}
                </ul>
            </div>
            {/if}

            {#if validation?.warnings && validation.warnings.length > 0}
            <div class="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg p-5 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-sm">
                    <AlertTriangle class="w-4 h-4" /> {$t('risk.cockpit.warnings')}
                </div>
                <ul class="list-disc list-inside text-sm text-amber-400/90 space-y-1">
                    {#each validation.warnings as warning}
                        <li>{warning}</li>
                    {/each}
                </ul>
            </div>
            {/if}

            <!-- BLOCO 5: PROGRESSO vs RISCO -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Painel Progresso -->
                <Card.Root class="border-emerald-500/20 shadow-none bg-emerald-500/5">
                    <Card.Header class="pb-2">
                        <Card.Title class="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                            <TrendingUp class="w-4 h-4" />
                            {$t('risk.cockpit.evolutionStatus')}
                        </Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="flex justify-between items-center border-b border-black/10 pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.dailyProfit')}</span>
                            <span class="font-mono font-bold {cockpit?.dailyRiskStatus.dailyPnL && cockpit.dailyRiskStatus.dailyPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}">
                                {formatCurrency(cockpit?.dailyRiskStatus.dailyPnL || 0, currencyCode)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center border-b border-black/10 pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.profitDays')}</span>
                            <span class="font-mono font-bold text-foreground">
                                {deskProgression?.checks.find(c => c.key === 'min_positive_days')?.passed ? '✅' : (deskAudit?.metrics.positive_days || 0)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.targetHit')}</span>
                            <span class="font-mono font-bold {cockpit?.dailyRiskStatus.dailyTargetHit ? 'text-emerald-500' : 'text-muted-foreground'}">
                                {cockpit?.dailyRiskStatus.dailyTargetHit ? $t('risk.cockpit.yes') : $t('risk.cockpit.no')}
                            </span>
                        </div>
                    </Card.Content>
                </Card.Root>

                <!-- Painel Risco Relacional -->
                <Card.Root class="border-border/10 shadow-none bg-card/50">
                    <Card.Header class="pb-2">
                        <Card.Title class="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ShieldAlert class="w-4 h-4" />
                            {$t('risk.cockpit.riskTriggers')}
                        </Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="flex justify-between items-center border-b border-black/10 pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.overtrading')}</span>
                            <span class="font-mono font-bold {cockpit?.disciplineEvaluation?.overtradingDetected ? 'text-rose-500' : 'text-emerald-500'}">
                                {cockpit?.disciplineEvaluation?.overtradingDetected ? $t('risk.cockpit.imminentRisk') : $t('risk.cockpit.controlled')}
                            </span>
                        </div>
                        <div class="flex justify-between items-center border-b border-black/10 pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.maxLot')}</span>
                            <span class="font-mono font-bold text-primary">
                                {growthContext?.growthPhase.lot_size || '---'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center pb-2">
                            <span class="text-sm text-foreground/80">{$t('risk.cockpit.mdrStatus')}</span>
                            <span class="font-mono font-bold {activeProfile.desk_config?.mdr_mode !== 'none' ? 'text-amber-500' : 'text-muted-foreground'}">
                                {activeProfile.desk_config?.mdr_mode !== 'none' ? $t('risk.cockpit.watched') : $t('risk.cockpit.openBook')}
                            </span>
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>

            <!-- Col span full base for checks -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- BLOCO 3: O QUE FALTA PARA AVANÇAR -->
                <Card.Root class="border-primary/20 bg-primary/5">
                    <Card.Header class="pb-2">
                        <Card.Title class="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            {$t('risk.cockpit.missingReqs')}
                        </Card.Title>
                    </Card.Header>
                    <Card.Content>
                        {#if deskFeedback?.missing_requirements && deskFeedback.missing_requirements.length > 0}
                            <ul class="space-y-3 mt-2">
                                {#each deskFeedback.missing_requirements as req}
                                    <li class="flex items-start gap-2 text-sm text-foreground/90 leading-tight">
                                        <div class="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5"></div>
                                        {$t(req.includes('.') ? req : `desk.feedback.${req}`, { default: req })}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <div class="py-4 text-center text-emerald-500 font-bold flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 class="w-8 h-8" />
                                {$t('risk.cockpit.allReqsMet')}
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>

                <!-- BLOCO 6: CHECKS DE REGRAS -->
                <Card.Root class="border-border/10 bg-black/10">
                    <Card.Header class="pb-2">
                        <Card.Title class="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            {$t('risk.cockpit.auditedRules')}
                        </Card.Title>
                    </Card.Header>
                    <Card.Content>
                        {#if deskProgression?.checks && deskProgression.checks.length > 0}
                            <ul class="space-y-2.5 mt-2">
                                {#each deskProgression.checks as check}
                                    <li class="flex items-center gap-3 text-sm">
                                        {#if check.passed}
                                            <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span class="text-foreground/80 capitalize line-through opacity-70">{$t(`risk.cockpit.engine.${check.key}`, { default: check.key.replace(/_/g, ' ') })}</span>
                                        {:else}
                                            <div class="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex shrink-0 items-center justify-center">
                                                <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                            </div>
                                            <span class="text-foreground font-medium capitalize">{$t(`risk.cockpit.engine.${check.key}`, { default: check.key.replace(/_/g, ' ') })} {$t('risk.cockpit.pending')}</span>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <div class="text-sm text-muted-foreground py-4 text-center italic">
                                {$t('risk.cockpit.noRules')}
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </div>
            
        </div>
    </div>
    {/if}
</div>
