<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Switch } from "$lib/components/ui/switch";
  import {
    Shield, Target, Lock, AlertTriangle, TrendingUp, Plus, Trash2, Zap,
    Link, ChevronRight, ShieldCheck, Brain, Activity, Copy,
    CheckCircle2, Info, AlertCircle, Network, ChevronLeft
  } from "lucide-svelte";
  import { t, locale } from "svelte-i18n";
  import type { RiskProfile } from "$lib/types";
  import { slide, fade } from "svelte/transition";
  import { Badge } from "$lib/components/ui/badge";
  import { userProfileStore } from "$lib/stores/user-profile.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import CombinedRulesSection from "./risk/CombinedRulesSection.svelte";
  import DeskConfigSection from "./risk/DeskConfigSection.svelte";
  import RiskRulesSection from "./risk/RiskRulesSection.svelte";
  import RiskProfileDetails from "./RiskProfileDetails.svelte";

  let { initialData, onSave, onCancel } = $props<{
    initialData?: RiskProfile;
    onSave: (data: Omit<RiskProfile, "id">) => void;
    onCancel: () => void;
  }>();

  // 1. STATE INITIALIZATION
  let formData = $state<Omit<RiskProfile, "id">>({
    name: initialData?.name ?? "",
    max_daily_loss: initialData?.max_daily_loss ?? 0,
    daily_target: initialData?.daily_target ?? 0,
    max_risk_per_trade_percent: initialData?.max_risk_per_trade_percent ?? 1.0,
    max_trades_per_day: initialData?.max_trades_per_day ?? 5,
    min_risk_reward: initialData?.min_risk_reward ?? 1.5,
    lock_on_loss: initialData?.lock_on_loss ?? false,
    account_type_applicability: initialData?.account_type_applicability ?? "All",
    target_type: initialData?.target_type ?? "Financial",
    capital_source: initialData?.capital_source ?? "Fixed",
    fixed_capital: initialData?.fixed_capital ?? 0,
    linked_account_id: initialData?.linked_account_id ?? null,
    growth_plan_id: initialData?.growth_plan_id,
    psychological_coupling_enabled: initialData?.psychological_coupling_enabled ?? false,
    outlier_regression_enabled: initialData?.outlier_regression_enabled ?? false,
    sniper_mode_enabled: initialData?.sniper_mode_enabled ?? false,
    sniper_mode_selectivity: initialData?.sniper_mode_selectivity ?? 3,
    psychological_lookback_count: initialData?.psychological_lookback_count ?? 10,
    outlier_lookback_count: initialData?.outlier_lookback_count ?? 20,
    psychological_threshold: initialData?.psychological_threshold ?? -2,
    lot_reduction_multiplier: initialData?.lot_reduction_multiplier ?? 0.5,
    psychological_search_strategy: initialData?.psychological_search_strategy ?? "Strict",
    account_ids: initialData?.account_ids ?? [],
    active: initialData?.active ?? false,
    use_advanced_rules: initialData?.use_advanced_rules ?? false,
    linked_asset_risk_profile_ids: initialData?.linked_asset_risk_profile_ids ?? [],
    combined_rules: initialData?.combined_rules ?? [],
    risk_rules: initialData?.risk_rules ?? [],
    desk_config: initialData?.desk_config
  });

  // 2. VALIDATION ENGINE (REACTIVE)
  const validation = $derived(riskSettingsStore.createRiskValidationState($state.snapshot(formData)));
  let activeSection = $state<"foundation" | "operational" | "intelligence" | "ecosystem" | "status" | "summary">("foundation");

  // 3. NAVIGATION & HELPERS
  const sections = [
    { id: "foundation", icon: Shield, label: "FUNDAMENTOS", sub: "GOVERNANCE" },
    { id: "operational", icon: Zap, label: "OPERAÇÕES", sub: "LIMITS" },
    { id: "intelligence", icon: Brain, label: "INTELIGÊNCIA", sub: "ALGORITHMIC" },
    { id: "ecosystem", icon: Network, label: "ECOSSISTEMA", sub: "NETWORK" },
    { id: "status", icon: Activity, label: "AUDITORIA", sub: "INTEGRITY" },
    { id: "summary", icon: Info, label: "RESUMO", sub: "PREVIEW" }
  ] as const;

  $effect(() => {
    if (formData.growth_plan_id) {
        const plan = riskSettingsStore.growthPlans.find(p => 
            p.id === formData.growth_plan_id || 
            (formData.growth_plan_id?.includes('⟨') && p.id?.includes(formData.growth_plan_id.split('⟨')[1].split('⟩')[0]))
        );
        
        if (plan) {
            const phase = plan.phases[plan.current_phase_index || 0];
            if (phase) {
                formData.max_daily_loss = phase.daily_loss_limit;
                formData.daily_target = phase.daily_profit_target;
            }
        }
    }
  });

  const currencyCode = $derived(
    formData.linked_account_id
      ? accountsStore.accounts.find(a => a.id === formData.linked_account_id)?.currency || 'BRL'
      : userProfileStore.userProfile.main_currency || 'BRL'
  );

  const effectiveCapital = $derived.by(() => {
    if (formData.capital_source === "Fixed") return formData.fixed_capital || 0;
    if (formData.capital_source === "LinkedAccount" && formData.linked_account_id) {
      return accountsStore.accounts.find(a => a.id === formData.linked_account_id)?.balance || 0;
    }
    return 0;
  });

  const estimatedRiskPerTrade = $derived((effectiveCapital * (formData.max_risk_per_trade_percent || 0)) / 100);

  function save() {
    if (validation.isValid) onSave($state.snapshot(formData));
  }

  function applyTemplate(id: string) {
    const template = riskSettingsStore.createRiskProfileTemplate(id);
    if (template) {
        formData.name = template.name;
        formData.max_daily_loss = template.max_daily_loss;
        formData.daily_target = template.daily_target;
        formData.max_risk_per_trade_percent = template.max_risk_per_trade_percent;
        formData.risk_rules = template.risk_rules || [];
    }
  }
</script>

<div class="flex flex-col md:flex-row h-[560px] bg-background/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
  <!-- SIDEBAR (LEFT) - Standardized UI -->
  <aside class="w-full md:w-[170px] bg-black/20 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
    <div class="p-4 border-b border-white/5 bg-white/[0.02]">
      <h2 class="text-[10px] font-black uppercase tracking-tight text-foreground">CONTROLE RISCO</h2>
      <p class="text-[7px] text-primary/60 font-black uppercase tracking-[0.2em] mt-0.5 opacity-80">RISK ENGINE v4.1</p>
    </div>

    <nav class="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
      {#each sections as section}
        <button
          onclick={() => activeSection = section.id}
          class="w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all group shrink-0
            {activeSection === section.id ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5' : 'hover:bg-white/5 border border-transparent'}"
        >
          <div class="flex items-center gap-3">
             <div class="p-1.5 rounded-lg {activeSection === section.id ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground group-hover:text-foreground'} transition-colors">
                <section.icon class="w-3.5 h-3.5" />
            </div>
            <div class="flex flex-col items-start leading-none">
                <span class="text-[9px] font-black uppercase tracking-tight {activeSection === section.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}">
                    {section.label}
                </span>
                <span class="text-[6px] font-bold uppercase tracking-[0.1em] opacity-30 mt-0.5">{section.sub}</span>
            </div>
          </div>
          
          <div class="flex gap-0.5">
            {#if (validation.sectionStatus as any)[section.id]?.errors > 0}
              <div class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
            {:else if (validation.sectionStatus as any)[section.id]?.warnings > 0}
              <div class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] text-center"></div>
            {:else if section.id !== 'status' && section.id !== 'summary'}
              <CheckCircle2 class="w-2.5 h-2.5 text-emerald-500/40" />
            {/if}
          </div>
        </button>
      {/each}
    </nav>

    <div class="p-4 bg-black/20 border-t border-white/5 hidden md:block">
      <div class="flex items-center justify-between mb-1.5 px-0.5">
        <span class="text-[7px] font-black uppercase text-muted-foreground/30 tracking-[0.2em]">INTEGRIDADE</span>
        <Badge variant={validation.isValid ? "outline" : "destructive"} class="h-4 text-[8px] font-black px-1.5 leading-none bg-primary/10 border-primary/20 text-primary uppercase">
          {validation.isValid ? "SECURE" : "BLOCKED"}
        </Badge>
      </div>
      <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div class="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" style="width: {validation.isValid ? '100%' : '30%'}"></div>
      </div>
    </div>
  </aside>

  <!-- CONTENT (RIGHT) -->
  <main class="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-white/[0.03] to-transparent">
    <div class="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
      {#if activeSection === "foundation"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
          <!-- Section Header Pattern -->
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Shield class="w-5 h-5 text-primary" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">FUNDAMENTOS E GOVERNANÇA</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Base de Capital e Identidade do Perfil</span>
              </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-2xl border bg-black/20 border-white/10 focus-within:border-primary/30 transition-all shadow-inner group">
              <Label class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.15em] mb-1 block group-focus-within:text-primary transition-colors">{$t("risk.form.labels.profileName")}</Label>
              <Input bind:value={formData.name} class="h-8 font-black text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none mt-0 placeholder:opacity-20 uppercase" placeholder="EX: HEDGE INSTITUCIONAL 2025" />
            </div>

            <div class="p-4 rounded-2xl border bg-black/20 border-white/10 group hover:border-white/20 transition-all">
              <Label class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.15em] mb-1 block">ORIGEM DO CAPITAL</Label>
              <Select.Root type="single" bind:value={formData.capital_source}>
                <Select.Trigger class="h-8 bg-transparent border-0 p-0 font-black text-xs shadow-none mt-0 appearance-none flex items-center justify-between">
                  <span>{formData.capital_source === "Fixed" ? $t("risk.plan.finance.fixedValue") : $t("risk.plan.finance.linkAccount")}</span>
                  <ChevronRight class="w-3.5 h-3.5 text-muted-foreground/40 rotate-90" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="Fixed" class="text-xs">{$t("risk.plan.finance.fixedValue")}</Select.Item>
                  <Select.Item value="LinkedAccount" class="text-xs">{$t("risk.plan.finance.linkAccount")}</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {#if formData.capital_source === "Fixed"}
            <div class="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 group shadow-lg shadow-primary/5 transition-all">
              <div class="flex items-center justify-between">
                <Label class="text-[10px] font-black uppercase text-primary/60 tracking-widest">{$t("risk.form.labels.capitalBase")}</Label>
                <div class="p-1 px-2 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black text-primary tracking-widest uppercase">LIQUID FUND</div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-black text-primary/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.fixed_capital} class="text-3xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-primary w-full shadow-none" />
              </div>
            </div>
          {:else}
             <div class="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 group shadow-lg shadow-primary/5 transition-all">
              <div class="flex items-center justify-between">
                <Label class="text-[10px] font-black uppercase text-primary/60 tracking-widest">{$t("risk.plan.finance.referenceAccount")}</Label>
                <Network class="w-4 h-4 text-primary opacity-40" />
              </div>
              <Select.Root type="single" bind:value={formData.linked_account_id as any}>
                <Select.Trigger class="h-10 bg-black/20 border-white/10 px-4 rounded-xl font-black text-xs shadow-none text-primary mt-1 w-full flex items-center justify-between">
                  <span>{accountsStore.accounts.find(a => a.id === formData.linked_account_id)?.nickname ?? $t("risk.plan.finance.selectAccount")}</span>
                  <ChevronRight class="w-3.5 h-3.5 opacity-40 rotate-90" />
                </Select.Trigger>
                <Select.Content>
                  {#each accountsStore.accounts as acc}
                    <Select.Item value={acc.id} class="text-xs">{acc.nickname}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          {/if}
          
          {#if !initialData}
            <div class="p-4 rounded-2xl border border-dashed border-white/10 flex flex-col gap-3 bg-white/[0.01]">
               <div class="flex items-center gap-2">
                 <Copy class="w-3 h-3 text-muted-foreground/30" />
                 <Label class="text-[9px] font-black uppercase text-muted-foreground/30 tracking-widest leading-none">IMPORTAR MODELO (OPCIONAL)</Label>
               </div>
               <Select.Root type="single" onValueChange={applyTemplate}>
                  <Select.Trigger class="h-10 bg-white/5 border-none text-[10px] font-black px-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                      <span class="opacity-40 tracking-widest">SELECIONAR TEMPLATE INSTITUCIONAL...</span>
                      <ChevronRight class="w-3.5 h-3.5 opacity-40 rotate-90" />
                  </Select.Trigger>
                  <Select.Content>
                      {#each riskSettingsStore.riskProfiles as p}
                          <Select.Item value={p.id} class="text-xs uppercase font-black">{p.name}</Select.Item>
                      {/each}
                  </Select.Content>
               </Select.Root>
            </div>
          {/if}
        </div>

      {:else if activeSection === "operational"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Zap class="w-5 h-5 text-amber-500" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">LIMITES OPERACIONAIS</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Blindagem Diária e Escalonamento</span>
              </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Daily Loss Pill -->
            <div class="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3 shadow-lg shadow-rose-500/5 relative group">
              <div class="flex items-center justify-between">
                <Label class="text-[10px] font-black uppercase text-rose-500/80 tracking-widest">{$t("risk.form.labels.dailyLoss")}</Label>
                <div class="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
                  <TrendingUp class="w-3.5 h-3.5 text-rose-500 rotate-180" />
                </div>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-black text-rose-500/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.max_daily_loss} disabled={!!formData.growth_plan_id} class="text-3xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-rose-500 w-full shadow-none disabled:opacity-50" />
              </div>
              {#if formData.growth_plan_id}
                <div class="absolute bottom-2 right-4 text-[7px] font-black uppercase tracking-widest text-rose-500/40">GOVERNED BY ENGINE</div>
              {/if}
            </div>

            <!-- Daily Target Pill -->
            <div class="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 shadow-lg shadow-emerald-500/5 relative group">
              <div class="flex items-center justify-between">
                <Label class="text-[10px] font-black uppercase text-emerald-500/80 tracking-widest">{$t("risk.form.labels.dailyTarget")}</Label>
                <div class="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <TrendingUp class="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-black text-emerald-500/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.daily_target} disabled={!!formData.growth_plan_id} class="text-3xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-emerald-500 w-full shadow-none disabled:opacity-50" />
              </div>
               {#if formData.growth_plan_id}
                <div class="absolute bottom-2 right-4 text-[7px] font-black uppercase tracking-widest text-emerald-500/40">GOVERNED BY ENGINE</div>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="h-16 px-5 bg-black/20 border border-white/10 rounded-2xl flex flex-col justify-center relative hover:bg-white/[0.04] transition-all group focus-within:border-primary/30 shadow-inner">
                <div class="flex items-center justify-between absolute top-2 left-5 right-5">
                    <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 group-focus-within:text-primary transition-colors">{$t("risk.form.labels.riskPerTrade")}</span>
                    <Badge class="bg-primary/10 text-primary border-0 font-black text-[8px] h-3 px-1 rounded-sm uppercase tracking-tighter">EST. {currencyCode} {estimatedRiskPerTrade.toFixed(0)}</Badge>
                </div>
                <div class="flex items-center gap-1 mt-3">
                    <input type="number" step="0.1" bind:value={formData.max_risk_per_trade_percent} class="bg-transparent border-none p-0 text-xl font-black tabular-nums outline-none focus:ring-0 w-full text-center" />
                    <span class="text-[10px] font-black text-muted-foreground/20 absolute right-5 bottom-3.5">% PERS</span>
                </div>
            </div>

            <div class="h-16 px-5 bg-black/20 border border-white/10 rounded-2xl flex flex-col justify-center relative hover:bg-white/[0.04] transition-all group focus-within:border-primary/30 shadow-inner">
                <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 absolute top-2 left-5 group-focus-within:text-primary transition-colors">ORDENS DIÁRIAS</span>
                <div class="flex items-center gap-1 mt-3">
                    <input type="number" bind:value={formData.max_trades_per_day} class="bg-transparent border-none p-0 text-xl font-black tabular-nums outline-none focus:ring-0 w-full text-center" />
                    <span class="text-[10px] font-black text-muted-foreground/20 absolute right-5 bottom-3.5">SLOTS</span>
                </div>
            </div>
          </div>
        </div>

      {:else if activeSection === "intelligence"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Brain class="w-5 h-5 text-indigo-400" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">MOTOR DE INTELIGÊNCIA</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Automação de Blindagem Comportamental</span>
              </div>
          </div>

          <div class="space-y-4">
            <div class="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between group shadow-lg shadow-indigo-500/5">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner group-hover:scale-105 transition-transform">
                  <ShieldCheck class="w-5 h-5 text-indigo-400" />
                </div>
                <div class="flex flex-col">
                  <h4 class="text-[11px] font-black uppercase tracking-tight text-foreground">{$t("risk.rules.advanced.title")}</h4>
                  <p class="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-40">GOVERNANÇA ALGORÍTMICA</p>
                </div>
              </div>
              <Switch class="scale-100 origin-right" bind:checked={formData.use_advanced_rules} />
            </div>

            {#if formData.use_advanced_rules}
              <div transition:slide class="pt-2 animate-in fade-in zoom-in-95 duration-500">
                <Tabs.Root value="rules" class="w-full">
                  <Tabs.List class="grid grid-cols-2 bg-black/40 border border-white/10 rounded-xl h-11 p-1 shadow-inner">
                    <Tabs.Trigger value="rules" class="text-[10px] font-black uppercase py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all">{$t("risk.ruleBuilder.title")}</Tabs.Trigger>
                    <Tabs.Trigger value="desk" class="text-[10px] font-black uppercase py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all">{$t("risk.rules.desk.title")}</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="rules" class="mt-4 pb-4">
                    <RiskRulesSection bind:rules={() => formData.risk_rules ?? [], (v) => formData.risk_rules = v} assetRiskProfiles={riskSettingsStore.assetRiskProfiles} />
                  </Tabs.Content>
                  <Tabs.Content value="desk" class="mt-4 pb-4">
                    <DeskConfigSection bind:config={formData.desk_config} availableAssetProfiles={riskSettingsStore.assetRiskProfiles} />
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            {/if}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 rounded-2xl border bg-black/20 border-white/10 space-y-3 hover:bg-white/[0.04] transition-all group">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-3">
                     <div class="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Brain class="w-4 h-4 text-purple-400" />
                     </div>
                     <span class="text-[10px] font-black uppercase text-purple-400 tracking-widest">Adaptativo</span>
                   </div>
                   <Switch class="scale-90 origin-right" bind:checked={formData.psychological_coupling_enabled} />
                </div>
                <p class="text-[8px] text-muted-foreground uppercase font-black leading-tight opacity-40">{$t("risk.rules.adaptation.psychological.desc")}</p>
              </div>

               <div class="p-4 rounded-2xl border bg-black/20 border-white/10 space-y-3 hover:bg-white/[0.04] transition-all group">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-3">
                     <div class="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-center">
                        <Activity class="w-4 h-4 text-cyan-400" />
                     </div>
                     <span class="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Regressão</span>
                   </div>
                   <Switch class="scale-90 origin-right" bind:checked={formData.outlier_regression_enabled} />
                </div>
                <p class="text-[8px] text-muted-foreground uppercase font-black leading-tight opacity-40">{$t("risk.rules.adaptation.outliers.desc")}</p>
              </div>
            </div>
          </div>
        </div>

      {:else if activeSection === "ecosystem"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Network class="w-5 h-5 text-primary" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">ECOSSISTEMA INTEGRADO</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Conectividade e Evolução de Conta</span>
              </div>
          </div>

          <div class="space-y-4">
            <div class="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4 group shadow-lg shadow-primary/5 transition-all hover:bg-primary/[0.08]">
               <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <TrendingUp class="w-4 h-4 text-primary" />
                    </div>
                    <h4 class="text-[11px] font-black uppercase text-foreground">Plano de Evolução Ativo</h4>
                </div>
                {#if formData.growth_plan_id && formData.growth_plan_id !== 'none'}
                    <Badge class="bg-emerald-500/20 text-emerald-500 border-0 text-[8px] h-4 font-black uppercase tracking-widest px-2">OVERRIDE ACTIVE</Badge>
                {/if}
              </div>
              <Select.Root 
                type="single" 
                value={formData.growth_plan_id ?? "none"} 
                onValueChange={(val: string) => formData.growth_plan_id = (val === 'none' ? undefined : val)}
              >
                <Select.Trigger class="w-full h-11 bg-black/40 border-white/10 shadow-none font-black text-xs px-4 rounded-xl mt-0 flex items-center justify-between">
                   <span>{riskSettingsStore.growthPlans.find(p => p.id === (formData.growth_plan_id && !formData.growth_plan_id.includes(':') ? `growth_plan:⟨${formData.growth_plan_id}⟩` : formData.growth_plan_id))?.name ?? $t("risk.growthPlan.none")}</span>
                   <ChevronRight class="w-4 h-4 opacity-40 rotate-90" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="none">{$t("risk.growthPlan.none")}</Select.Item>
                  {#each riskSettingsStore.growthPlans as plan}
                    <Select.Item value={plan.id} class="text-xs uppercase font-black">{plan.name}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="p-5 rounded-2xl border bg-black/20 border-white/10 space-y-4 shadow-inner">
               <div class="flex justify-between items-center px-1">
                 <div class="flex flex-col">
                    <h4 class="text-[10px] font-black uppercase text-foreground">VÍNCULOS DE ATIVOS</h4>
                    <p class="text-[7px] font-black uppercase text-muted-foreground/30 tracking-widest mt-0.5 opacity-80">GERENCIAMENTO POR TICKET</p>
                 </div>
                 <Badge variant="outline" class="h-4 text-[9px] font-black bg-primary/10 border-primary/20 text-primary px-2 rounded-lg">
                    {formData.linked_asset_risk_profile_ids?.length || 0} SLOTS
                 </Badge>
               </div>
               
               <Select.Root type="single" onValueChange={(val: string) => { 
                if (val && !formData.linked_asset_risk_profile_ids?.includes(val)) {
                  formData.linked_asset_risk_profile_ids = [...(formData.linked_asset_risk_profile_ids || []), val]; 
                }
               }}>
                  <Select.Trigger class="w-full h-10 bg-white/5 border-none font-black text-xs rounded-xl px-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <span class="opacity-40 italic">CONECTAR PERFIL DE ATIVO...</span>
                    <ChevronRight class="w-4 h-4 opacity-40 rotate-90" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each riskSettingsStore.assetRiskProfiles.filter(p => p.id && !formData.linked_asset_risk_profile_ids?.includes(p.id)) as ap}
                      <Select.Item value={ap.id!} class="text-xs uppercase font-black">{ap.name}</Select.Item>
                    {/each}
                  </Select.Content>
               </Select.Root>

               <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                 {#each (formData.linked_asset_risk_profile_ids || []) as apId}
                   {@const profile = riskSettingsStore.assetRiskProfiles.find(p => p.id === apId)}
                   {#if profile}
                     <div class="flex items-center justify-between p-2 pl-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-primary/40 transition-all shadow-sm">
                       <span class="text-[9px] font-black uppercase truncate tracking-tight">{profile.name}</span>
                       <Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-lg" onclick={() => {
                         formData.linked_asset_risk_profile_ids = (formData.linked_asset_risk_profile_ids || []).filter(id => id !== apId);
                       }}>
                         <Trash2 class="w-3.5 h-3.5" />
                       </Button>
                     </div>
                   {/if}
                 {/each}
               </div>

               {#if (formData.linked_asset_risk_profile_ids?.length || 0) > 0}
                 <div class="pt-2 animate-in fade-in slide-in-from-bottom-2">
                   <CombinedRulesSection 
                    bind:rules={() => formData.combined_rules ?? [], (v) => formData.combined_rules = v} 
                    assetRiskProfiles={riskSettingsStore.assetRiskProfiles.filter(ap => ap.id && (formData.linked_asset_risk_profile_ids || []).includes(ap.id))} 
                   />
                 </div>
               {/if}
            </div>
          </div>
        </div>

      {:else if activeSection === "status"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Activity class="w-5 h-5 text-primary" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">AUDITORIA DE INTEGRIDADE</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Score de Segurança e Bloqueios</span>
              </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="p-5 rounded-2xl border border-white/10 bg-black/20 space-y-1 text-center shadow-inner">
              <span class="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] leading-none mb-2 block">BLOQUEIOS</span>
              <p class="text-3xl font-black {validation.errors.length > 0 ? 'text-rose-500' : 'text-emerald-500'} leading-none tracking-tighter tabular-nums">{validation.errors.length}</p>
            </div>
            <div class="p-5 rounded-2xl border border-white/10 bg-black/20 space-y-1 text-center shadow-inner">
              <span class="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] leading-none mb-2 block">ALERTAS</span>
               <p class="text-3xl font-black {validation.warnings.length > 0 ? 'text-amber-500' : 'text-emerald-500'} leading-none tracking-tighter tabular-nums">{validation.warnings.length}</p>
            </div>
          </div>

          <div class="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
            {#if validation.errors.length > 0}
              <div class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2 px-1 tracking-[0.15em]">
                  <AlertCircle class="w-4 h-4" /> BARREIRAS CRÍTICAS
                </h4>
                <div class="space-y-1.5">
                  {#each validation.errors as err}
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 animate-in slide-in-from-left-2 shadow-sm">
                      <div class="p-1 rounded-full bg-rose-500/10 mt-0.5"><AlertTriangle class="w-3 h-3 text-rose-500" /></div>
                      <p class="text-[10px] font-black text-rose-500/80 leading-tight uppercase tracking-tight">{$t(err.message)}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if validation.warnings.length > 0}
              <div class="space-y-2">
                 <h4 class="text-[10px] font-black uppercase text-amber-500 flex items-center gap-2 px-1 tracking-[0.15em]">
                  <Info class="w-4 h-4" /> RECOMENDAÇÕES ENGINE
                </h4>
                <div class="space-y-1.5">
                  {#each validation.warnings as warn}
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 animate-in slide-in-from-left-2 shadow-sm">
                      <div class="p-1 rounded-full bg-amber-500/10 mt-0.5"><Info class="w-3 h-3 text-amber-500" /></div>
                      <p class="text-[10px] font-black text-amber-500/80 leading-tight uppercase tracking-tight">{$t(warn.message)}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if validation.errors.length === 0 && validation.warnings.length === 0}
              <div class="p-12 border border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-inner">
                <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 class="w-8 h-8 text-emerald-500/40" />
                </div>
                <div class="space-y-1">
                  <h4 class="text-xs font-black uppercase text-emerald-500 tracking-[0.2em] opacity-80">ESTADO ZERO-FAULT</h4>
                  <p class="text-[9px] text-muted-foreground uppercase font-black tracking-tight opacity-40">Todas as diretrizes de governança foram validadas.</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else if activeSection === "summary"}
        <div in:fade={{ duration: 150 }} class="space-y-6 animate-in zoom-in-95">
           <div class="flex items-center gap-4">
              <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                  <Info class="w-5 h-5 text-primary" />
              </div>
              <div class="flex flex-col">
                  <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">VISUALIZAÇÃO TERMINAL</h3>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Prévia do Perfil em Tempo Real</span>
              </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
            <RiskProfileDetails profile={{ ...$state.snapshot(formData), id: initialData?.id ?? 'preview' }} />
          </div>
          
          <div class="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4 group">
             <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                 <AlertCircle class="w-4 h-4 text-primary" />
             </div>
             <div class="space-y-1">
                <p class="text-[11px] font-black uppercase text-primary tracking-widest">Contexto de Auditoria</p>
                <p class="text-[9px] text-muted-foreground uppercase font-medium leading-relaxed opacity-60">A engine está operando sob modo de simulação para este resumo. Limites dinâmicos e overrides de Planos de Crescimento estão sendo processados pela Engine v4.1.</p>
             </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- FOOTER (CONTROL) - Emerald Solid Pattern -->
    <footer class="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 backdrop-blur-xl">
      <Button 
        variant="ghost" 
        class="h-9 px-5 font-black uppercase text-[10px] tracking-[0.1em] text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all" 
        onclick={onCancel}
      >
        {$t("risk.actions.cancel")}
      </Button>

      <div class="flex items-center gap-4">
        {#if !validation.isValid}
          <div class="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 animate-in fade-in transition-all">
             <AlertTriangle class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
             <span class="text-[9px] font-black uppercase text-rose-500 tracking-[0.1em]">
               {validation.errors.length} BLOQUEIOS
             </span>
          </div>
        {/if}

        <Button
          class="h-9 px-10 font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all duration-300 rounded-xl active:scale-[0.97]
            {validation.isValid ? 'bg-[#10b981] hover:bg-[#059669] text-black shadow-emerald-500/20' : 'bg-white/5 text-muted-foreground/30 border border-white/5 cursor-not-allowed shadow-none'}"
          disabled={!validation.isValid}
          onclick={save}
        >
          {initialData ? $t("risk.actions.save") : $t("risk.plan.new")}
          {#if validation.isValid}
            <ShieldCheck class="w-4 h-4 ml-2" />
          {:else}
            <Lock class="w-4 h-4 ml-2 opacity-30" />
          {/if}
        </Button>
      </div>
    </footer>
  </main>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.2); }
</style>
