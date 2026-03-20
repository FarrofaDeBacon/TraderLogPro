<script lang="ts">
  import { assetsStore } from "$lib/stores/assets.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { formatCurrency } from "$lib/utils";
    import * as Card from "$lib/components/ui/card";
    import { t } from "svelte-i18n";
    
    import { 
        CheckCircle2, 
        XCircle, 
        AlertTriangle, 
        ShieldAlert, 
        TrendingUp, 
        Shield, 
        Activity,
        Lock,
        Target,
        Layers,
        Brain
    } from "lucide-svelte";
    
    // Derived states para consumo sem re-cálculos locais
    let activeProfile = $derived(riskSettingsStore.activeProfile);
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
        ? accountsStore.accounts.find(a => a.id === activeProfile?.linked_account_id)?.currency || 'USD'
        : userProfileStore.userProfile.main_currency || 'USD'
    );

    let activePhase = $derived(growthContext?.growthPhase);
    let profitGoal = $derived(
        activePhase?.conditions_to_advance?.find(c => c.metric === 'profit_target' || c.metric === 'target_financial')?.value || 0
    );
    let ptcLoss = $derived(Math.min((dailyDrawdown / (activeProfile?.max_daily_loss || 1)) * 100, 100));
    let isLossHot = $derived(ptcLoss > 80);
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
                {$t('risk.cockpit.asset')} {assetsStore.assets.find(a => a.id === riskStore.activeAssetId)?.symbol || 'Nenhum'}
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

    <!-- ================= ESTRUTURA FASE 4 (EMOCIONAL) ================= -->
    <div class="flex flex-col gap-6">

        <!-- 1. TOPO: O SEMÁFORO MESTRE -->
        <div class="mb-2 rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center text-center transition-all duration-700 shadow-2xl relative overflow-hidden group
            {mainStatus === 'blocked' ? 'bg-rose-600 border-4 border-rose-500/50 text-white' : 
             mainStatus === 'caution' ? 'bg-amber-500 border-4 border-amber-400/50 text-white' : 
             'bg-emerald-600 border-4 border-emerald-500/50 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]'}">
            
            <!-- Fundo decorativo giratório -->
            <div class="absolute inset-0 opacity-[0.07] flex items-center justify-center scale-[2] group-hover:scale-[2.2] group-hover:rotate-6 transition-transform duration-1000">
                {#if mainStatus === 'blocked'} <XCircle class="w-[800px] h-[800px]" />
                {:else if mainStatus === 'caution'} <AlertTriangle class="w-[800px] h-[800px]" />
                {:else} <CheckCircle2 class="w-[800px] h-[800px]" /> {/if}
            </div>

            <div class="relative z-10 flex flex-col items-center gap-4">
                {#if mainStatus === 'blocked'}
                    <div class="bg-black/20 px-6 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-[0.2em] mb-2 backdrop-blur-sm">Ação Bloqueada</div>
                    <h2 class="text-5xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-xl">SISTEMA TRAVADO</h2>
                    <p class="text-xl md:text-3xl font-medium text-white/95 mt-2 bg-black/20 px-6 py-2 rounded shadow-inner">{validation?.reasons[0] || 'Limite de Risco atingido. Pare de operar hoje.'}</p>
                {:else if mainStatus === 'caution'}
                    <div class="bg-black/20 px-6 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-[0.2em] mb-2 backdrop-blur-sm">Risco Iminente</div>
                    <h2 class="text-5xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-xl">ALERTA LARANJA</h2>
                    <p class="text-xl md:text-3xl font-medium text-white/95 mt-2">{validation?.warnings[0] || 'Você está muito perto do limite diário.'}</p>
                {:else}
                    <div class="bg-black/20 px-6 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-[0.2em] mb-2 backdrop-blur-sm">Tudo Limpo</div>
                    <h2 class="text-5xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-xl">PISTA LIMPA</h2>
                    <p class="text-xl md:text-3xl font-medium text-emerald-100 mt-2">Você está dentro do plano. Foco, disciplina e execução.</p>
                {/if}
            </div>
        </div>

        <!-- 2. CORPO: ZONA DE PERIGO VS ZONA DE EVOLUÇÃO -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- ESQUERDA: ZONA DE RISCO (VERMELHA) -->
            <Card.Root class="border-rose-500/20 bg-rose-500/5 shadow-none overflow-hidden flex flex-col rounded-2xl">
                <div class="h-3 w-full bg-gradient-to-r from-rose-600 to-rose-400"></div>
                <Card.Header class="pb-2 pt-6 px-8">
                    <Card.Title class="text-[11px] font-black uppercase tracking-[0.15em] text-rose-500 flex items-center gap-2">
                        <ShieldAlert class="w-5 h-5" />
                        Risco de Ruína (Sizing & Target)
                    </Card.Title>
                </Card.Header>
                <Card.Content class="space-y-8 flex-1 flex flex-col justify-start px-8 pb-8 pt-4">
                    
                    <!-- A Barra de Risco -->
                    <div class="space-y-4">
                        <div class="flex justify-between items-end border-b border-rose-500/20 pb-3">
                            <span class="text-[13px] font-bold text-foreground/80 uppercase tracking-widest">Limite Global</span>
                            <span class="text-3xl font-mono font-black text-rose-500">{formatCurrency(activeProfile.max_daily_loss, currencyCode)}</span>
                        </div>
                        
                        <div class="relative w-full h-12 bg-black/50 rounded-xl overflow-hidden border border-rose-500/30">
                            <div class="absolute top-0 left-0 h-full transition-all duration-1000 flex items-center justify-end px-4 {isLossHot ? 'bg-rose-500 animate-pulse' : 'bg-rose-500/80'}" style="width: {ptcLoss}%">
                                {#if ptcLoss > 15}<span class="text-[14px] font-black font-mono text-white/90 drop-shadow-md">{ptcLoss.toFixed(0)}%</span>{/if}
                            </div>
                        </div>

                        <div class="flex justify-between text-xs font-mono font-medium mt-2">
                            <span class="text-foreground/70">Consumido: <b class="text-rose-500 text-sm tracking-tighter">{formatCurrency(dailyDrawdown, currencyCode)}</b></span>
                            <span class="text-foreground/70">Restante: <b class="text-emerald-500 text-sm tracking-tighter">{formatCurrency(Math.max(0, activeProfile.max_daily_loss - dailyDrawdown), currencyCode)}</b></span>
                        </div>
                    </div>

                    <!-- Lote Permitido -->
                    <div class="bg-background/40 p-5 rounded-xl border border-border/50 flex justify-between items-center backdrop-blur-sm">
                        <span class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Target class="w-4 h-4 text-blue-400" /> Carga Permitida
                        </span>
                        {#if riskStore.positionSizingResult?.isValid}
                            <span class="text-3xl font-black font-mono text-blue-400">
                                {riskStore.positionSizingResult.allowedContracts} <span class="text-xs uppercase tracking-widest text-muted-foreground ml-1">cts</span>
                            </span>
                        {:else}
                            <span class="text-2xl font-black font-mono text-rose-500 uppercase tracking-tight">Bloqueado</span>
                        {/if}
                    </div>

                    <!-- Violações Ativas -->
                    {#if !validation?.allowed && validation?.reasons && validation.reasons.length > 0}
                    <div class="bg-rose-500/10 border-l-4 border-rose-500 p-5 rounded-r-xl mt-2 flex flex-col gap-3">
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2"><Lock class="w-4 h-4"/> Violações Registradas</p>
                        <ul class="text-[13px] font-bold text-rose-400/90 space-y-2 leading-tight">
                            {#each validation.reasons as reason} <li>{reason}</li> {/each}
                        </ul>
                    </div>
                    {/if}
                </Card.Content>
            </Card.Root>

            <!-- DIREITA: ZONA DE EVOLUÇÃO (VERDE) -->
            <Card.Root class="border-emerald-500/20 bg-emerald-500/5 shadow-none overflow-hidden flex flex-col rounded-2xl">
                <div class="h-3 w-full bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                <Card.Header class="pb-2 pt-6 px-8">
                    <Card.Title class="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-500 flex items-center gap-2">
                        <TrendingUp class="w-5 h-5" />
                        Trilha de Aprovação
                    </Card.Title>
                </Card.Header>
                <Card.Content class="space-y-8 flex-1 flex flex-col justify-start px-8 pb-8 pt-4">
                    
                    <div class="flex items-center justify-between border-b border-emerald-500/20 pb-4">
                        <div class="space-y-1">
                            <p class="text-[10px] uppercase font-black tracking-widest text-emerald-600/70">Estágio / Plano</p>
                            <h3 class="text-3xl font-black text-foreground tracking-tighter">{activePhase?.name || 'Avaliação Base'}</h3>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="text-[10px] uppercase font-black tracking-widest text-emerald-600/70">Alvo (Meta)</p>
                            <h3 class="text-3xl font-mono font-black text-emerald-500 tracking-tighter">{formatCurrency(profitGoal, currencyCode)}</h3>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <p class="text-[10px] uppercase font-black tracking-widest text-emerald-600/70 flex items-center gap-2">
                           Missões Pendentes para Progredir
                        </p>
                        {#if deskProgression?.checks && deskProgression.checks.length > 0}
                            <ul class="space-y-3">
                                {#each deskProgression.checks as check}
                                    <li class="flex items-center gap-4 bg-background/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm transition-colors hover:bg-background/80">
                                        {#if check.passed}
                                            <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                                <CheckCircle2 class="w-4 h-4" />
                                            </div>
                                            <span class="text-sm font-bold text-muted-foreground line-through opacity-50 uppercase tracking-widest">{$t(`risk.cockpit.engine.${check.key}`, { default: check.key.replace(/_/g, ' ') })}</span>
                                        {:else}
                                            <div class="w-8 h-8 rounded-full border-2 border-emerald-500/40 flex items-center justify-center shrink-0 bg-black/20">
                                                <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                                            </div>
                                            <span class="text-[13px] font-black text-foreground uppercase tracking-wider">{$t(`risk.cockpit.engine.${check.key}`, { default: check.key.replace(/_/g, ' ') })}</span>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <div class="p-8 bg-emerald-500/10 rounded-xl text-center flex flex-col items-center justify-center gap-3 border border-emerald-500/20">
                                <CheckCircle2 class="w-10 h-10 text-emerald-500" />
                                <span class="font-black text-emerald-500 uppercase tracking-widest text-sm">Caminho Livre. Suba de Nível.</span>
                            </div>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>

        </div>

        <!-- 3. RODAPÉ: O CONSELHEIRO (AUTOMATIZADO) -->
        <div class="bg-card/70 border-2 border-border/30 p-8 rounded-3xl flex flex-col lg:flex-row items-center gap-8 shadow-xl relative overflow-hidden">
            <div class="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div class="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] relative z-10">
                <Brain class="w-10 h-10 text-indigo-500" />
            </div>
            <div class="flex-1 text-center lg:text-left relative z-10">
                <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-3 flex items-center justify-center lg:justify-start gap-2">
                    Supervisor Emocional da Mesa
                </h3>
                <p class="text-xl md:text-2xl font-bold text-foreground/90 leading-tight">
                    {#if mainStatus === 'blocked'}
                        A sua prioridade máxima agora é proteger a sua conta de quebrar. Feche a plataforma. Volte amanhã com a mente fresca, o dia operacional atingiu a estafa técnica.
                    {:else if mainStatus === 'caution'}
                        Você está muito perto de tomar um stop global. Reduza agressivamente o lote neste próximo trade. Se você tomar outro loss, encerre o dia preventivamente.
                    {:else if cockpit?.dailyRiskStatus.dailyPnL && (cockpit.dailyRiskStatus.dailyPnL) > (profitGoal * 0.7) && profitGoal > 0}
                        Atenção: Você assegurou mais de 70% da meta global do seu estágio de crescimento! O maior risco agora é a ganância devolver seu lucro de dias. Considere fechar a plataforma.
                    {:else}
                        Suas métricas térmicas estão absolutamente frias. O seu emocional deve focar apenas em executar as premissas do plano, sem pensar no dinheiro. Vá em frente.
                    {/if}
                </p>
            </div>
        </div>

    </div>
    {/if}
</div>
