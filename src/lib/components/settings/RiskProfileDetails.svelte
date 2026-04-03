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

  let { profile } = $props<{ profile: RiskProfile }>();

  let currentPlan = $derived(
    profile.growth_plan_id ? riskSettingsStore.getGrowthPlanForProfile(profile.id) : null
  );

  function getEffectiveLimits(p: RiskProfile) {
    let dailyLoss = p.max_daily_loss;
    let dailyTarget = p.daily_target;
    let targetUnit = '$';
    let lossUnit = '$';

    // 1. Prioridade: Plano de Crescimento Ativo (Overwrites static limits)
    if (currentPlan && currentPlan.enabled && currentPlan.phases) {
      const phase = currentPlan.phases[currentPlan.current_phase_index];
      if (phase) {
        const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');

        // Encontra a meta de lucro nas condições de avanço
        const targetCond = phase.conditions_to_advance?.find(c => {
          const m = normalize(c.metric);
          return ['profit', 'netpnl', 'profittarget', 'metadelucro', 'meta', 'pnl'].includes(m);
        });
        if (targetCond) {
          dailyTarget = targetCond.value;
          targetUnit = currentPlan.target_unit === 'points' ? 'pts' : '$';
        }

        // Encontra o limite de perda nas condições de regressão ou avanço (daily loss)
        const lossCond = phase.conditions_to_demote?.find(c => {
          const m = normalize(c.metric);
          return ['dailyloss', 'maxdailyloss', 'perdadiaria', 'lossdiario', 'drawdown'].includes(m);
        });
        if (lossCond) {
          dailyLoss = lossCond.value;
          lossUnit = currentPlan.drawdown_unit === 'points' ? 'pts' : '$';
        }
      }
    } else if (p.use_advanced_rules && p.risk_rules) {
      // 2. Fallback: Regras Avançadas (Risk Rules)
      const lossRule = p.risk_rules.find(r => r.enabled && r.target_type === 'max_daily_loss');
      if (lossRule) dailyLoss = Number(lossRule.value);

      const targetRule = p.risk_rules.find(r => r.enabled && r.target_type === 'profit_target');
      if (targetRule) dailyTarget = Number(targetRule.value);
    }

    return { dailyLoss, dailyTarget, targetUnit, lossUnit };
  }

  let limits = $derived(getEffectiveLimits(profile));
</script>

<div class="space-y-3 py-1">
  <!-- Header Summary -->
  <div class="flex items-center justify-between">
    <div class="space-y-0.5">
      <h2 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
        <Shield class="w-3.5 h-3.5 text-primary" />
        {profile.name}
      </h2>
      <div class="flex items-center gap-1.5">
        <Badge variant="outline" class="text-[8px] h-3.5 font-bold uppercase tracking-tighter px-1">
          {$t(`risk.accountTypes.${profile.account_type_applicability}`) || profile.account_type_applicability}
        </Badge>
        {#if currentPlan?.enabled}
          <Badge
            variant="default"
            class="h-3.5 text-[8px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-1"
          >
            <TrendingUp class="w-2.5 h-2.5 mr-1" />
            {$t("risk.growthPlan.activeStatus")}
          </Badge>
        {/if}
      </div>
    </div>
  </div>

  <Separator class="opacity-20" />

  <div class="grid grid-cols-2 gap-2">
    <!-- Downside Protection -->
    <div class="p-2 rounded border border-rose-500/10 bg-rose-500/5 space-y-1">
      <div class="flex items-center gap-1 text-rose-500/60 font-black text-[8px] uppercase tracking-wider">
        <Shield class="w-2.5 h-2.5" />
        {$t("risk.plan.sections.downside")}
      </div>
      <div class="flex justify-between items-baseline">
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Loss Máximo</span>
        <span class="font-black text-rose-500 text-xs">
          {limits.lossUnit === '$' ? 'R$ ' : ''}{limits.dailyLoss.toLocaleString('pt-BR', { minimumFractionDigits: limits.lossUnit === '$' ? 2 : 0 })}{limits.lossUnit === 'pts' ? ' pts' : ''}
        </span>
      </div>
      <div class="flex justify-between items-baseline">
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Risco/Trade</span>
        <span class="font-black text-[9px]">{profile.max_risk_per_trade_percent}%</span>
      </div>
    </div>

    <!-- Upside Targets -->
    <div class="p-2 rounded border border-emerald-500/10 bg-emerald-500/5 space-y-1">
      <div class="flex items-center gap-1 text-emerald-500/60 font-black text-[8px] uppercase tracking-wider">
        <Target class="w-2.5 h-2.5" />
        {$t("risk.plan.sections.upside")}
      </div>
      <div class="flex justify-between items-baseline">
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Meta Diária</span>
        <span class="font-black text-emerald-500 text-xs">
          {limits.targetUnit === '$' ? 'R$ ' : ''}{limits.dailyTarget.toLocaleString('pt-BR', { minimumFractionDigits: limits.targetUnit === '$' ? 2 : 0 })}{limits.targetUnit === 'pts' ? ' pts' : ''}
        </span>
      </div>
      <div class="flex justify-between items-baseline">
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Mínimo R/R</span>
        <span class="font-black text-[9px]">1:{profile.min_risk_reward}</span>
      </div>
    </div>
  </div>

  <!-- Discipline & Rules -->
  <div class="p-2 rounded border border-white/5 bg-card/20 grid grid-cols-2 gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 px-0.5">
        <Clock class="w-2.5 h-2.5 text-muted-foreground/60" />
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Trades/Dia</span>
      </div>
      <span class="text-[10px] font-black">{profile.max_trades_per_day}</span>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 px-0.5">
        <Lock class="w-2.5 h-2.5 text-muted-foreground/60" />
        <span class="text-[7px] text-muted-foreground uppercase font-bold">Trava Loss</span>
      </div>
      <span class="text-[9px] font-black {profile.lock_on_loss ? 'text-rose-500' : 'text-emerald-500'} uppercase">
        {profile.lock_on_loss ? 'SIM' : 'NÃO'}
      </span>
    </div>

    {#if profile.lock_on_loss}
      <div class="col-span-2 flex items-center gap-1.5 px-1 py-0.5 rounded bg-rose-500/5 border border-rose-500/10">
        <AlertTriangle class="w-2 h-2 text-rose-500/60" />
        <p class="text-[7px] font-bold text-rose-500/60 uppercase">Auto-bloqueio ativo no teto de loss.</p>
      </div>
    {/if}
  </div>

  <!-- Growth Plan Summary (Badges Mode) -->
  {#if currentPlan && currentPlan.enabled && currentPlan.phases && currentPlan.phases.length > 0}
    <div class="space-y-1 pt-0.5">
      <div class="flex items-center gap-1.5 px-1 opacity-40">
        <TrendingUp class="w-2.5 h-2.5 text-primary" />
        <span class="text-[8px] font-black uppercase tracking-widest">Escalagem de Lotes</span>
      </div>
      <div class="flex flex-wrap gap-1">
        {#each currentPlan.phases as phase, i}
          <Badge
            variant={i === currentPlan.current_phase_index ? "default" : "outline"}
            class="h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter transition-all
              {i === currentPlan.current_phase_index
                ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-white/10'
                : 'bg-white/5 border-white/5 opacity-40'}"
          >
            <span class="opacity-50 mr-1">#{i + 1}</span>
            {phase.name}: <span class="ml-1 text-foreground/80">{phase.lot_size} lotes</span>
          </Badge>
        {/each}
      </div>
    </div>
  {/if}
</div>
