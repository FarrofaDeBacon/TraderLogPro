<script lang="ts">
  import { assetsStore } from "$lib/stores/assets.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { userProfileStore } from "$lib/stores/user-profile.svelte";
  import { riskStore } from "$lib/stores/riskStore.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import {
    SystemCard,
    SystemMetric,
    SystemHeader
  } from "$lib/components/ui/system";
  import { Separator } from "$lib/components/ui/separator";
  import { t, locale } from "svelte-i18n";
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
      Brain,
      ShieldCheck,
      ChevronRight,
      Flame,
      Info,
      Globe,
      TrendingDown,
      Timer
  } from "lucide-svelte";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { cn } from "$lib/utils";
  
  // Derived states
  let activeProfile = $derived(riskSettingsStore.activeProfile);
  let cockpit = $derived(riskStore.riskCockpitState);
  let validation = $derived(riskStore.deskValidationResult);
  let deskProgression = $derived(riskStore.deskStageProgressionState);
  let deskFeedback = $derived(riskStore.deskProgressFeedback);
  let growthContext = $derived(riskStore.resolvedGrowthContext);

  let dailyDrawdown = $derived(cockpit?.dailyRiskStatus.currentDailyDrawdown || 0);
  let isBlocked = $derived(!validation?.allowed || cockpit?.dailyRiskStatus.isLocked || cockpit?.dailyRiskStatus.dailyLossHit);
  let hasWarnings = $derived(validation?.warnings && validation.warnings.length > 0);
  
  let mainStatus = $derived(
      isBlocked ? "blocked" : 
      hasWarnings ? "caution" : 
      "allowed"
  );

  // Auto-selecionar primeiro ativo se nenhum estiver ativo
  $effect(() => {
     if (!riskStore.activeAssetId && assetsStore.assets.length > 0) {
       // Tenta encontrar o WIN ou o primeiro da lista
       const defaultAsset = assetsStore.assets.find(a => a.symbol.includes('WIN')) || assetsStore.assets[0];
       riskStore.activeAssetId = defaultAsset.id;
     }
  });

  let currencyCode = $derived(
      activeProfile?.capital_source === 'LinkedAccount' && activeProfile.linked_account_id 
      ? accountsStore.accounts.find(a => a.id === activeProfile?.linked_account_id)?.currency || 'BRL'
      : userProfileStore.userProfile.main_currency || 'BRL'
  );

  // Diagnostics: Context Resolution Observability (Svelte 5 safe context)
  $effect(() => {
    if (growthContext?.resolution) {
      const res = growthContext.resolution;
      console.groupCollapsed(`[Cockpit] Context Resolution: ${res.source.toUpperCase()}`);
      console.log("Ativo Selecionado:", riskStore.activeAssetId || "Nenhum");
      console.log("Motivo:", res.sourceReason);
      console.log("Meta Fase:", res.currentPhaseTarget);
      console.log("Drawdown:", res.currentPhaseDrawdown);
      console.log("Lotes:", res.currentPhaseLotLimit);
      console.log("Total Fases:", res.totalPhases);
      console.groupEnd();
    }
  });

  let activePhase = $derived.by(() => {
    if (growthContext?.growthPhase) return growthContext.growthPhase;
    
    // Fallback defensivo para o plano global do perfil
    const planId = activeProfile?.growth_plan_id;
    if (!planId) return null;
    
    const plan = riskSettingsStore.growthPlans.find(p => p.id === planId);
    if (!plan || !plan.phases || plan.phases.length === 0) return null;
    
    const phaseIndex = plan.current_phase_index ?? 0;
    return plan.phases[phaseIndex] || plan.phases[0] || null;
  });
  let nextPhase = $derived(riskStore.nextGrowthPhase);
  let growthEval = $derived(riskStore.riskCockpitState?.growthEvaluation || riskStore.globalGrowthEvaluation);
  
  let profitGoal = $derived(
      activePhase?.conditions_to_advance?.find(c => c.metric === 'profit_target' || c.metric === 'target_financial')?.value || 0
  );
  
  let currentLimit = $derived(cockpit?.dailyRiskStatus.effectiveMaxDailyLoss || activeProfile?.max_daily_loss || 0);
  let limitLabel = $derived(growthEval ? "Limite do Estágio Atual" : $t('risk.cockpit.stats.globalLimit'));
  let ptcLoss = $derived(Math.min((dailyDrawdown / (currentLimit || 1)) * 100, 100));
  let isLossHot = $derived(ptcLoss > 80);

  function formatValue(val: number) {
    return new Intl.NumberFormat($locale || "pt-BR", {
      style: "currency",
      currency: currencyCode,
    }).format(val);
  }

</script>

<div class="flex-1 flex flex-col space-y-3 p-3 md:p-4 animate-in fade-in duration-500 min-h-screen">
  
  <!-- TOP NAVIGATION (ULTRA COMPACT COCKPIT) -->
  <SystemCard status="primary" class="flex flex-col md:flex-row justify-between items-center gap-4 p-3 shadow-2xl bg-primary/5">
    <div class="flex items-center gap-6">
      <SystemHeader 
        title={$t('risk.dashboard.title') || 'RISK CONTROL'}
        subtitle={$t('risk.dashboard.subtitle')}
        icon={Shield}
        variant="page"
        class="mb-0"
      />
      
      <Separator orientation="vertical" class="h-10 opacity-10" />
      
      {#if activeProfile}
        <div class="flex items-center gap-3">
          <div class="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 group hover:border-indigo-500/30 transition-all">
            <Shield class="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span class="text-foreground/90">{activeProfile?.name}</span>
          </div>
          {#if growthContext?.resolution}
            {@const res = growthContext.resolution}
            <div class={cn(
                "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-4 transition-all",
                res.source === 'scope' 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                    : "bg-indigo-500/5 border-indigo-500/10 text-indigo-400/80"
            )}>
              <div class="flex items-center gap-2">
                <Layers class="w-3 h-3" />
                <span>
                    {res.source === 'scope' ? `GRUPO: ${res.scopeName}` : `MODO GLOBAL: ${res.currentPhaseName}`}
                </span>
              </div>
              
              {#if res.source === 'scope' && res.assetIds.length > 0}
                <Separator orientation="vertical" class="h-3 opacity-20 bg-emerald-500" />
                <div class="flex items-center gap-1.5 overflow-hidden max-w-[200px]">
                  <span class="text-[8px] opacity-60">ATIVOS NO ESCOPO:</span>
                  {#each res.assetIds as aid}
                    <span class="text-[8px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                      {assetsStore.assets.find(a => a.id === aid)?.symbol}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

      <div class="flex items-center gap-3">
        <Select.Root type="single" bind:value={riskStore.activeAssetId}>
            <Select.Trigger class="w-[180px] h-9 text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 transition-all flex items-center justify-between px-3">
                <div class="flex items-center gap-2">
                    <Globe class="w-3.5 h-3.5 text-indigo-400 opacity-60" />
                    <span class="truncate">
                        {riskStore.activeAsset?.symbol || $t('risk.cockpit.selectAsset')}
                    </span>
                </div>
            </Select.Trigger>
            <Select.Content class="bg-card border-border/60">
                <Select.Group>
                    <Select.Label class="text-[9px] font-black uppercase tracking-widest opacity-40 py-2">MERCADO ATIVO</Select.Label>
                    {#each assetsStore.assets as asset}
                        <Select.Item value={asset.id} class="text-[10px] font-bold uppercase tracking-widest">
                            {asset.symbol} - {asset.name}
                        </Select.Item>
                    {/each}
                </Select.Group>
            </Select.Content>
        </Select.Root>

        <Button variant="outline" size="sm" href="/" class="text-[9px] font-black h-9 uppercase tracking-[0.3em] text-muted-foreground border-white/5 bg-white/5 px-4 hover:bg-white/10 hover:text-white transition-all">
          {$t('dashboard.title')}
        </Button>
      </div>
    </SystemCard>

  {#if !activeProfile}
    <SystemCard class="flex-1 flex items-center justify-center p-12 border-dashed border-white/10">
      <div class="text-center max-w-sm">
        <div class="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-500">
          <Lock class="w-10 h-10 text-muted-foreground/30" />
        </div>
        <h2 class="text-2xl font-black tracking-tighter uppercase mb-2 text-white/90">{$t('risk.cockpit.noProfile')}</h2>
        <p class="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{$t('risk.cockpit.noProfileDesc')}</p>
      </div>
    </SystemCard>
  {:else}
    <!-- OPERATIONAL STATUS BAR -->
    <SystemCard 
      status={mainStatus === 'blocked' ? 'danger' : mainStatus === 'caution' ? 'warning' : 'success'}
      class="relative overflow-hidden p-3 transition-all duration-700 shadow-2xl group"
    >
      <!-- Technical Grid Overlay -->
      <div class="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>

      <div class="relative z-10 flex flex-col lg:flex-row items-center gap-4">
        <div class="flex items-center gap-6 shrink-0">
          <div class={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 shadow-inner",
            mainStatus === 'blocked' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : 
            mainStatus === 'caution' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
            "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          )}>
            {#if mainStatus === 'blocked'} <ShieldAlert class="w-6 h-6" />
            {:else if mainStatus === 'caution'} <AlertTriangle class="w-6 h-6" />
            {:else} <ShieldCheck class="w-6 h-6" /> {/if}
          </div>
          <SystemHeader 
            title={mainStatus === 'blocked' ? $t('risk.cockpit.status.systemLocked') : mainStatus === 'caution' ? $t('risk.cockpit.status.orangeAlert') : $t('risk.cockpit.status.clearTrack')}
            subtitle={$t('risk.cockpit.status.terminalStatus')}
            variant="compact"
            class={cn(
                "mb-0",
                mainStatus === 'blocked' ? "text-rose-400" : 
                mainStatus === 'caution' ? "text-amber-400" : 
                "text-emerald-400"
            )}
          />
        </div>

        <Separator orientation="vertical" class="hidden lg:block h-12 opacity-10" />

        <div class="flex-1">
          <p class="text-[11px] font-black uppercase tracking-widest leading-relaxed text-foreground/80 max-w-4xl">
            {#if mainStatus === 'blocked'}
              {validation?.reasons[0] ? $t(`risk.cockpit.engine.${validation.reasons[0]}`, { default: validation.reasons[0] }) : $t('risk.cockpit.supervisor.blocked')}
            {:else if mainStatus === 'caution'}
              {validation?.warnings[0] ? $t(`risk.cockpit.engine.${validation.warnings[0]}`, { default: validation.warnings[0] }) : $t('risk.cockpit.supervisor.caution')}
            {:else}
              {$t('risk.cockpit.status.onPlanSlogan')}
            {/if}
          </p>
        </div>

        {#if mainStatus === 'allowed'}
          <div class="hidden xl:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 shadow-inner">
            <div class="relative w-2 h-2">
                <div class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                <div class="relative rounded-full bg-emerald-500 w-2 h-2"></div>
            </div>
            <span class="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/90">{$t('risk.cockpit.status.clearPath')}</span>
          </div>
        {/if}
      </div>
    </SystemCard>

    <!-- MAIN GRIDS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      
      <!-- LEFT: RISK ZONE (Layer 1: Financial Daily) -->
      <SystemCard status="danger" class="flex flex-col min-h-[420px] overflow-hidden group p-4 space-y-4">
          <SystemHeader 
            title={$t('risk.cockpit.sections.ruinRisk')}
            icon={ShieldAlert}
            class="mb-0"
          >
            {#snippet actions()}
              <Badge variant="outline" class="text-[8px] font-black uppercase tracking-widest border-white/10 bg-white/5 text-muted-foreground">{$t('risk.cockpit.status.realTimeMonitor')}</Badge>
            {/snippet}
          </SystemHeader>

          <div class="space-y-6 text-foreground">
            <SystemMetric 
              label={limitLabel} 
              value={formatValue(currentLimit)} 
              status="danger"
              weight="black"
            />
            
            <div class="space-y-2">
                <div class="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-50 px-1">
                    <span>{$t('risk.cockpit.stats.drawdownProgression')} (MAX INTRADAY)</span>
                    <span>{((cockpit?.dailyRiskStatus.maxDailyDrawdown || 0) / (currentLimit || 1) * 100).toFixed(1)}%</span>
                </div>
                <div class="relative w-full h-10 bg-black/60 rounded-xl overflow-hidden border border-white/5 p-1 shadow-inner ring-1 ring-white/5">
                <div 
                    class={cn(
                    "absolute top-1 left-1 bottom-1 transition-all duration-1000 rounded-lg flex items-center justify-end px-4",
                    isLossHot ? "bg-gradient-to-r from-rose-600 to-rose-400 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.3)]" : "bg-gradient-to-r from-rose-500/60 to-rose-500"
                    )} 
                    style="width: calc({Math.min(((cockpit?.dailyRiskStatus.maxDailyDrawdown || 0) / (currentLimit || 1) * 100), 100)}% - 8px)"
                >
                    {#if ptcLoss > 20}
                        <ShieldAlert class="w-4 h-4 text-white/50" />
                    {/if}
                </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <SystemMetric 
                label={$t('risk.cockpit.stats.consumed')} 
                value={formatValue(cockpit?.dailyRiskStatus.dailyGrossLoss || 0)} 
                status="danger"
                weight="black"
                class="bg-black/40 p-2.5 rounded-xl border border-white/5 group-hover:border-rose-500/20 transition-all"
              />
              <SystemMetric 
                label={$t('risk.cockpit.stats.remaining')} 
                value={formatValue(cockpit?.dailyRiskStatus.remainingLossAllowance || 0)} 
                status="success"
                weight="black"
                class="bg-black/40 p-2.5 rounded-xl border border-white/5 group-hover:border-emerald-500/20 transition-all text-right items-end"
              />
            </div>
          </div>

          <!-- Allowed Size -->
          <div class="bg-indigo-500/5 p-3.5 rounded-2xl border border-white/5 flex justify-between items-center transition-all hover:bg-indigo-500/10 hover:border-indigo-500/20 mt-1 shadow-inner ring-1 ring-white/5">
            {#if riskStore.positionSizingResult?.isValid}
              <div class="flex flex-col">
                <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                  <Target class="w-4 h-4" /> {$t('risk.cockpit.stats.allowedSizing')}
                </p>
                {#if riskStore.positionSizingResult?.isValid}
                  <p class="text-[8px] font-black text-indigo-400/40 uppercase tracking-[0.2em]">{$t('risk.cockpit.stats.availableOperational')}</p>
                {/if}
              </div>
              {#if riskStore.positionSizingResult?.isValid}
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-black font-mono text-white tracking-tighter">
                    {riskStore.positionSizingResult.allowedContracts}
                  </span>
                  <span class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">{$t('risk.finance.contracts').toUpperCase()}</span>
                </div>
              {/if}
            {:else}
              <div class="flex flex-col">
                <p class="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                  <Target class="w-4 h-4" /> {$t('risk.cockpit.stats.allowedSizing')}
                </p>
              </div>
              <Badge variant="outline" class="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] font-black uppercase py-2 px-4 shadow-none tracking-widest">
                {$t('risk.cockpit.stats.blockedStatus')}
              </Badge>
            {/if}
          </div>

          <!-- Violations list -->
          {#if validation && !validation.allowed && validation.reasons && validation.reasons.length > 0}
            <div class="mt-auto pt-4 space-y-2">
              <p class="text-[9px] font-black uppercase tracking-[0.4em] text-rose-500 opacity-60 px-1">{$t('risk.cockpit.sections.registeredViolations')}</p>
              <div class="space-y-1">
                  {#each validation.reasons as reason}
                    <div class="flex items-center gap-2 text-[10px] font-black text-rose-400/90 uppercase tracking-widest bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 animate-in slide-in-from-left duration-300">
                      <TrendingDown class="w-3 h-3 shrink-0 text-rose-500/40" />
                      <span>{$t(`risk.cockpit.engine.${reason}`, { default: reason })}</span>
                    </div>
                  {/each}
              </div>
            </div>
          {/if}
      </SystemCard>

      <!-- RIGHT: EVOLUTION ZONE (Layer 2 & 3: Growth & Progression) -->
      <SystemCard status="success" class="flex flex-col min-h-[420px] overflow-hidden group p-4 space-y-4">
          {#if activeProfile}
            <!-- CAMADA 1: FASE ATUAL -->
            <div class={cn(
                "p-4 rounded-3xl border transition-all duration-500 shadow-inner ring-1 ring-white/5",
                growthEval?.phaseStatus === 'maintenance' ? "bg-indigo-500/10 border-indigo-500/30" : 
                growthEval?.phaseStatus === 'max_reached' ? "bg-amber-500/5 border-amber-500/20" :
                growthEval?.phaseStatus === 'protected' ? "bg-rose-500/5 border-rose-500/20" :
                "bg-emerald-500/5 border-emerald-500/20"
            )}>
              <div class="flex justify-between items-start mb-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <Layers class={cn("w-4 h-4", growthEval?.phaseStatus === 'maintenance' ? "text-indigo-400" : "text-emerald-400")} />
                    <span class={cn("text-[10px] font-black uppercase tracking-[0.2em]", growthEval?.phaseStatus === 'maintenance' ? "text-indigo-400/80" : "text-emerald-400/80")}>
                      {$t('risk.cockpit.stats.current_phase')}
                      <span class="opacity-30 ml-2">[{growthEval?.phaseIndex ?? '?'}/{growthEval?.totalPhases ?? '?'}]</span>
                    </span>
                  </div>
                  <h3 class="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                    {activePhase?.name || '---'}
                  </h3>
                </div>
                
                {#if growthEval?.canPromote}
                  <Button 
                    variant="default" 
                    size="sm" 
                    class="h-8 px-4 bg-indigo-500 hover:bg-indigo-400 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                    onclick={() => riskStore.promotePhase()}
                  >
                    <TrendingUp class="w-3 h-3 mr-2" />
                    {$t('risk.evolution.promote')}
                  </Button>
                {:else if growthEval?.phaseStatus === 'max_reached'}
                    <Badge variant="outline" class="border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest py-1 bg-amber-500/5">
                        {$t('risk.cockpit.status.phase_max_reached')}
                    </Badge>
                {:else if growthEval?.phaseStatus === 'protected'}
                    <Badge variant="outline" class="border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest py-1 bg-rose-500/5">
                        {$t('risk.status_list.regression_triggered')}
                    </Badge>
                {:else}
                    <Badge variant="outline" class="border-white/10 text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest py-1">
                        {$t('risk.evolution.stages.should_remain')}
                    </Badge>
                {/if}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <p class="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Lotes Permitidos</p>
                    <p class="text-lg font-black font-mono text-white">{activePhase?.lot_size || '0'} <span class="text-[10px] opacity-40">CONTRATOS</span></p>
                </div>
                <div class="space-y-1 text-right">
                    <p class="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                        {growthEval?.phaseStatus === 'max_reached' ? $t('risk.cockpit.status.maintenance_mode') : 'Objetivo de Lucro'}
                    </p>
                    <p class={cn("text-lg font-black font-mono", growthEval?.phaseStatus === 'maintenance' ? "text-indigo-400" : "text-emerald-400")}>
                        {growthEval?.phaseStatus === 'max_reached' ? 'ESTÁVEL' : formatValue(profitGoal)}
                    </p>
                </div>
              </div>
            </div>

             <!-- CAMADA 2: MISSÕES / CHECKLIST DE CRITÉRIOS (Layer 3) -->
            <div class="space-y-3 flex-1 flex flex-col pt-1">
              <SystemHeader 
                  title={growthEval?.phaseStatus === 'max_reached' ? "MANUTENÇÃO DE CONSISTÊNCIA" : $t('risk.cockpit.sections.pendingMissions')}
                  icon={growthEval?.phaseStatus === 'max_reached' ? ShieldCheck : Activity}
                  class="mb-0 {growthEval?.phaseStatus === 'maintenance' ? 'text-indigo-400/70' : 'text-emerald-500/70'}"
              >
                  {#snippet actions()}
                      <span class="text-[8px] font-black text-muted-foreground opacity-30 uppercase tracking-widest">
                        {growthEval?.phaseStatus === 'max_reached' ? "AUDITORIA CONTÍNUA" : "REQUISITOS DE EVOLUÇÃO"}
                      </span>
                  {/snippet}
              </SystemHeader>

              <div class="grid gap-2">
                {#if growthEval}
                    {#each growthEval.advanceConditions as cond}
                        <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
                            <div class="flex items-center gap-3">
                                <div class={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center bg-background/50 border",
                                    cond.isMet ? "border-emerald-500/30 text-emerald-500" : "border-white/10 text-muted-foreground/40"
                                )}>
                                    {#if cond.isMet}
                                        <CheckCircle2 class="w-4 h-4" />
                                    {:else}
                                        <Timer class="w-4 h-4" />
                                    {/if}
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-foreground/90">
                                        {$t(cond.label_key)}
                                    </span>
                                    <span class="text-[9px] font-bold text-muted-foreground/60 uppercase">
                                        {$t('risk.evolution.growthPlan')}
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 text-right">
                                <div class="flex flex-col items-end">
                                    <span class={cn(
                                        "text-[10px] font-mono font-bold",
                                        cond.isMet ? "text-emerald-400" : "text-foreground/60"
                                    )}>
                                        {cond.metric.includes('win_rate') ? cond.current.toFixed(1) + '%' : 
                                         cond.metric.includes('profit') || cond.metric.includes('target') ? formatValue(cond.current) : 
                                         cond.current}
                                    </span>
                                    <span class="text-[8px] font-black text-muted-foreground/30 uppercase tracking-tighter">
                                        META: {cond.metric.includes('win_rate') ? cond.target.toFixed(1) + '%' : 
                                               cond.metric.includes('profit') || cond.metric.includes('target') ? formatValue(cond.target) : 
                                               cond.target}
                                    </span>
                                </div>
                                <div class={cn("w-1 h-8 rounded-full", cond.isMet ? "bg-emerald-500/50" : "bg-white/10")}></div>
                            </div>
                        </div>
                    {/each}

                    {#if growthEval.shouldRegress}
                        <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                            <ShieldAlert class="w-5 h-5 text-rose-500" />
                            <div class="flex flex-col">
                                <span class="text-[10px] font-black text-rose-400 uppercase tracking-widest">{$t('risk.status_list.regression_triggered')}</span>
                                <span class="text-[9px] font-bold text-rose-500/60 uppercase">Motivo: {$t(growthEval.regressionReasonKey || 'risk.status_list.stable')}</span>
                            </div>
                        </div>
                    {/if}
                {:else if deskFeedback && deskFeedback.length > 0}
                    <!-- Fallback para Desk Progression (Mesa Proprietária sem plano global) -->
                    {#each deskFeedback as feedback}
                      <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-background/50 border border-white/5">
                            <Info class="w-4 h-4 text-amber-500" />
                          </div>
                          <div class="flex flex-col text-left">
                            <span class="text-[10px] font-black uppercase tracking-widest text-foreground/90">{feedback}</span>
                          </div>
                        </div>
                      </div>
                    {/each}
                {/if}
              </div>
            </div>

            <!-- CAMADA 3: PRÓXIMA FASE (PREVIEW) -->
            {#if nextPhase}
              <div class="mt-auto p-4 rounded-3xl border border-dashed border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group/next shadow-inner">
                 <div class="absolute inset-0 bg-indigo-500/5 translate-x-full group-hover/next:translate-x-0 transition-transform duration-1000"></div>
                 <div class="relative z-10">
                      <div class="flex justify-between items-center mb-2">
                          <div class="flex items-center gap-2">
                              <ChevronRight class="w-3.5 h-3.5 text-indigo-400/60" />
                              <span class="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400/40">{$t('risk.cockpit.stats.next_phase')}</span>
                          </div>
                      </div>
                      <div class="flex justify-between items-baseline">
                          <h4 class="text-sm font-black text-indigo-300 uppercase tracking-widest leading-none">{nextPhase.name}</h4>
                          <div class="flex gap-4">
                              <div class="text-right">
                                  <span class="text-[8px] font-bold text-muted-foreground/30 uppercase block">Lotes</span>
                                  <span class="text-xs font-black font-mono text-indigo-200">{nextPhase.lot_size}</span>
                              </div>
                              <div class="text-right">
                                  <span class="text-[8px] font-bold text-muted-foreground/30 uppercase block">Meta</span>
                                  <span class="text-xs font-black font-mono text-indigo-200">
                                      {formatValue(nextPhase.conditions_to_advance?.find(c => c.metric === 'profit_target' || c.metric === 'target_financial')?.value || 0)}
                                  </span>
                              </div>
                          </div>
                      </div>
                 </div>
              </div>
            {/if}


          {:else}
            <!-- NENHUM PERFIL ATIVO -->
            <div class="flex-1 flex flex-col items-center justify-center py-12 gap-6 bg-white/5 rounded-3xl border border-dashed border-white/10 mt-2">
              <div class="w-20 h-20 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                <Shield class="w-12 h-12 text-muted-foreground/20" />
              </div>
              <div class="text-center space-y-2">
                <p class="text-lg font-black text-white/40 uppercase tracking-tighter">{$t('risk.cockpit.noProfile')}</p>
                <p class="text-[9px] text-muted-foreground/60 font-black uppercase tracking-[0.4em] leading-none">{$t('risk.cockpit.noProfileDesc')}</p>
              </div>
            </div>
          {/if}
      </SystemCard>
    </div>

    <!-- AI ADVISOR BOTTOM PANEL -->
    <SystemCard class="p-4 shadow-2xl relative overflow-hidden group">
      <!-- High-Tech Aesthetic Background -->
      <div class="absolute right-0 top-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64 translate-x-20 transition-transform duration-1000 group-hover:scale-110"></div>
      <div class="absolute left-0 bottom-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] -ml-40 -mb-40 group-hover:scale-125 transition-transform duration-700"></div>
      
      <!-- Scanline effect -->
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(255,255,255,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

      <div class="relative z-10 flex flex-col lg:flex-row items-center gap-4">
        <div class="relative">
            <div class="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-2xl relative z-10 transform -rotate-2 group-hover:rotate-0 transition-all duration-300">
                <Brain class="w-9 h-9 text-indigo-300" />
            </div>
            <!-- Pulse dot -->
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-black flex items-center justify-center z-20">
                <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
            </div>
        </div>

        <div class="flex-1 text-center lg:text-left space-y-2">
          <SystemHeader 
            title={$t('risk.cockpit.sections.emotionalSupervisor')}
            class="mb-0 text-indigo-400/80"
          >
            {#snippet actions()}
                <div class="flex gap-1">
                    <div class="w-1 h-1 rounded-full bg-indigo-500/30"></div>
                    <div class="w-1 h-1 rounded-full bg-indigo-500/50"></div>
                    <div class="w-1 h-1 rounded-full bg-indigo-500/80 animate-pulse"></div>
                </div>
            {/snippet}
          </SystemHeader>
          <p class="text-xl md:text-2xl font-black text-white/90 leading-none tracking-tighter uppercase">
            {#if mainStatus === 'blocked'}
              {$t('risk.cockpit.supervisor.blocked')}
            {:else if mainStatus === 'caution'}
              {$t('risk.cockpit.supervisor.caution')}
            {:else if cockpit?.dailyRiskStatus.dailyPnL && (cockpit.dailyRiskStatus.dailyPnL) > (profitGoal * 0.7) && profitGoal > 0}
              {$t('risk.cockpit.supervisor.targetHigh')}
            {:else}
              {$t('risk.cockpit.supervisor.stable')}
            {/if}
          </p>
          <p class="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">{$t('risk.cockpit.status.aiEngineStatus')}</p>
        </div>
        
        <div class="flex items-center gap-2 opacity-20 group-hover:opacity-50 transition-all duration-700">
          <div class="w-8 h-1 bg-indigo-500 rounded-full"></div>
          <div class="w-4 h-1 bg-indigo-500 rounded-full"></div>
          <div class="w-2 h-1 bg-indigo-500 rounded-full"></div>
        </div>
      </div>
    </SystemCard>
  {/if}
</div>

<style>
  /* Base reset for terminal fonts */
  :global(body) {
    letter-spacing: -0.01em;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  .animate-pulse-slow {
    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
