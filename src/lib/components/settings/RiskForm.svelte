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
    CheckCircle2, Info, AlertCircle, Network
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
  const allSections = [
    { id: "foundation", icon: Shield, label: $t("risk.form.sections.foundation") },
    { id: "operational", icon: Zap, label: $t("risk.form.sections.operational") },
    { id: "intelligence", icon: Brain, label: $t("risk.form.sections.intelligence") },
    { id: "ecosystem", icon: Network, label: $t("risk.form.sections.ecosystem") },
    { id: "status", icon: Activity, label: $t("risk.form.sections.status") },
    { id: "summary", icon: Info, label: "Resumo" }
  ] as const;

  const sections = $derived(
    allSections.filter(s => s.id !== 'operational' || !formData.growth_plan_id)
  );

  $effect(() => {
    if (formData.growth_plan_id && activeSection === 'operational') {
      activeSection = 'foundation';
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
        // Direct assignment in Svelte 5
        formData.name = template.name;
        formData.max_daily_loss = template.max_daily_loss;
        formData.daily_target = template.daily_target;
        formData.max_risk_per_trade_percent = template.max_risk_per_trade_percent;
        formData.risk_rules = template.risk_rules || [];
    }
  }
</script>

<div class="flex flex-col md:flex-row h-[520px] bg-background/40 backdrop-blur-md rounded-xl overflow-hidden border border-white/5 shadow-2xl">
  <!-- SIDEBAR (LEFT) -->
  <aside class="w-full md:w-[155px] bg-muted/20 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
    <div class="p-2 border-b border-white/5 overflow-hidden">
      <h2 class="text-[8px] font-black uppercase tracking-[0.05em] text-primary truncate opacity-80">{$t("risk.plan.title")}</h2>
      <p class="text-[6px] text-muted-foreground font-black uppercase tracking-tighter opacity-30 leading-none">Engine v4.1</p>
    </div>

    <nav class="p-1 space-y-0.5 overflow-x-auto md:overflow-x-visible flex md:flex-col gap-0.5 md:gap-0.5">
      {#each sections as section}
        <button
          onclick={() => activeSection = section.id}
          class="flex-1 md:w-full flex items-center justify-between py-1 px-2 rounded-lg transition-all group shrink-0
            {activeSection === section.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}"
        >
          <div class="flex items-center gap-2">
            <section.icon class="w-3 h-3 {activeSection === section.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}" />
            <span class="text-[8px] font-black uppercase tracking-tight {activeSection === section.id ? 'text-primary' : 'text-muted-foreground font-bold'}">
              {section.label}
            </span>
          </div>
          
          <div class="flex gap-0.5 ml-1.5">
            {#if (validation.sectionStatus as any)[section.id]?.errors > 0}
              <div class="w-1 h-1 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            {:else if (validation.sectionStatus as any)[section.id]?.warnings > 0}
              <div class="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            {:else if section.id !== 'status'}
              <CheckCircle2 class="w-2 h-2 text-emerald-500/40" />
            {/if}
          </div>
        </button>
      {/each}
    </nav>
    <div class="flex-1"></div>
    <div class="p-1.5 bg-muted/10 border-t border-white/5 hidden md:block">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">Integridade</span>
        <Badge variant={validation.isValid ? "outline" : "destructive"} class="h-3.5 text-[7px] font-black px-1 leading-none">
          {validation.isValid ? "OK" : "BLOQ"}
        </Badge>
      </div>
      <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div class="h-full bg-primary transition-all duration-500" style="width: {validation.isValid ? '100%' : '30%'}"></div>
      </div>
    </div>
  </aside>

  <!-- CONTENT (RIGHT) -->
  <main class="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-background/5 to-transparent">
    <div class="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
      {#if activeSection === "foundation"}
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0">
            <h3 class="text-[10px] font-black uppercase text-foreground leading-none">{$t("risk.form.sections.foundation")}</h3>
            <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-40 tracking-tight">Parâmetros estruturais do perfil.</p>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1.5 p-3 rounded-xl border bg-card/20 border-white/5 focus-within:border-primary/20 transition-all">
              <Label class="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">{$t("risk.form.labels.profileName")}</Label>
              <Input bind:value={formData.name} class="h-7 font-black text-xs border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none mt-0" placeholder="Ex: Hedge Institucional" />
            </div>

            <div class="space-y-1.5 p-3 rounded-xl border bg-card/20 border-white/5">
              <Label class="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">Origem do Capital</Label>
              <Select.Root type="single" bind:value={formData.capital_source}>
                <Select.Trigger class="h-7 bg-transparent border-0 p-0 font-black text-[10px] shadow-none mt-0">
                  {formData.capital_source === "Fixed" ? $t("risk.plan.finance.fixedValue") : $t("risk.plan.finance.linkAccount")}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="Fixed">{$t("risk.plan.finance.fixedValue")}</Select.Item>
                  <Select.Item value="LinkedAccount">{$t("risk.plan.finance.linkAccount")}</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {#if formData.capital_source === "Fixed"}
            <div class="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1 transition-all">
              <Label class="text-[8px] font-black uppercase text-primary/60">{$t("risk.form.labels.capitalBase")}</Label>
              <div class="flex items-center gap-2">
                <span class="text-base font-black text-primary/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.fixed_capital} class="text-xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-primary w-full" />
              </div>
            </div>
          {:else}
             <div class="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1 transition-all">
              <Label class="text-[8px] font-black uppercase text-primary/60">{$t("risk.plan.finance.referenceAccount")}</Label>
              <Select.Root type="single" bind:value={formData.linked_account_id as any}>
                <Select.Trigger class="h-7 bg-transparent border-0 p-0 font-black text-[10px] shadow-none text-primary mt-0">
                  {accountsStore.accounts.find(a => a.id === formData.linked_account_id)?.nickname ?? $t("risk.plan.finance.selectAccount")}
                </Select.Trigger>
                <Select.Content>
                  {#each accountsStore.accounts as acc}
                    <Select.Item value={acc.id}>{acc.nickname}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          {/if}
          
          {#if !initialData}
            <div class="p-3 rounded-xl border border-dashed border-white/5 flex flex-col gap-2">
               <Label class="text-[8px] font-black uppercase text-muted-foreground/30">Usar Template</Label>
               <Select.Root type="single" onValueChange={applyTemplate}>
                  <Select.Trigger class="h-7 bg-white/5 border-0 text-[10px] font-black px-3 rounded-lg">
                      SELECIONAR MODELO...
                  </Select.Trigger>
                  <Select.Content>
                      {#each riskSettingsStore.riskProfiles as p}
                          <Select.Item value={p.id}>{p.name}</Select.Item>
                      {/each}
                  </Select.Content>
               </Select.Root>
            </div>
          {/if}
        </div>

      {:else if activeSection === "operational"}
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0.5">
            <h3 class="text-xs font-black uppercase text-foreground">{$t("risk.form.sections.operational")}</h3>
            <p class="text-[9px] text-muted-foreground uppercase font-bold opacity-60">Blindagem financeira diária.</p>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 space-y-2 transition-all">
              <Label class="text-[9px] font-black uppercase text-rose-500/60">{$t("risk.form.labels.dailyLoss")}</Label>
              <div class="flex items-baseline gap-1.5">
                <span class="text-sm font-black text-rose-500/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.max_daily_loss} class="text-2xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-rose-500 w-full" />
              </div>
            </div>

            <div class="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 space-y-2 transition-all">
              <Label class="text-[9px] font-black uppercase text-emerald-500/60">{$t("risk.form.labels.dailyTarget")}</Label>
              <div class="flex items-baseline gap-1.5">
                <span class="text-sm font-black text-emerald-500/30">{currencyCode}</span>
                <Input type="number" bind:value={formData.daily_target} class="text-2xl font-black bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-emerald-500 w-full" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="p-3 balanced-p-3 rounded-xl border bg-card/10 border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-[9px] font-black uppercase text-muted-foreground/40">Risk per Trade (%)</Label>
                <Badge class="bg-primary/10 text-primary border-0 font-black text-[8px] h-3.5 px-1">R$ {estimatedRiskPerTrade.toFixed(0)}</Badge>
              </div>
              <Input type="number" step="0.1" bind:value={formData.max_risk_per_trade_percent} class="text-xl font-black bg-background/30 border-white/5 rounded-lg text-center h-9" />
            </div>

            <div class="p-3 balanced-p-3 rounded-xl border bg-card/10 border-white/5 space-y-2">
              <Label class="text-[9px] font-black uppercase text-muted-foreground/40 block text-center">Máximo de Ordens / Dia</Label>
              <Input type="number" bind:value={formData.max_trades_per_day} class="text-xl font-black bg-background/30 border-white/5 rounded-lg text-center h-9" />
            </div>
          </div>
        </div>

      {:else if activeSection === "intelligence"}
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0.5">
            <h3 class="text-xs font-black uppercase text-foreground">{$t("risk.form.sections.intelligence")}</h3>
            <p class="text-[9px] text-muted-foreground uppercase font-bold opacity-60">Governança algorítmica e proteção comportamental.</p>
          </header>

          <div class="space-y-3">
            <div class="p-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 rounded-lg bg-indigo-500/10"><ShieldCheck class="w-4 h-4 text-indigo-400/70" /></div>
                <div class="space-y-0 text-left">
                  <h4 class="text-[10px] font-black uppercase text-indigo-400/80">{$t("risk.rules.advanced.title")}</h4>
                  <p class="text-[8px] text-muted-foreground uppercase font-bold opacity-50">Condições granulares e limites de mesa.</p>
                </div>
              </div>
              <div class="scale-75 origin-right">
                <Switch bind:checked={formData.use_advanced_rules} />
              </div>
            </div>

            {#if formData.use_advanced_rules}
              <div transition:slide class="pt-1">
                <Tabs.Root value="rules" class="w-full">
                  <Tabs.List class="grid grid-cols-2 bg-white/5 rounded-lg h-8 p-0.5">
                    <Tabs.Trigger value="rules" class="text-[9px] font-black uppercase py-1 data-[state=active]:bg-primary/20">{$t("risk.ruleBuilder.title")}</Tabs.Trigger>
                    <Tabs.Trigger value="desk" class="text-[9px] font-black uppercase py-1 data-[state=active]:bg-primary/20">{$t("risk.rules.desk.title")}</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="rules" class="mt-3">
                    <RiskRulesSection bind:rules={() => formData.risk_rules ?? [], (v) => formData.risk_rules = v} assetRiskProfiles={riskSettingsStore.assetRiskProfiles} />
                  </Tabs.Content>
                  <Tabs.Content value="desk" class="mt-3">
                    <DeskConfigSection bind:config={formData.desk_config} availableAssetProfiles={riskSettingsStore.assetRiskProfiles} />
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            {/if}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="p-3 rounded-xl border bg-card/10 border-white/5 space-y-2">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-2">
                     <Brain class="w-3 h-3 text-purple-400" />
                     <span class="text-[9px] font-black uppercase text-purple-400">Adaptativo</span>
                   </div>
                   <div class="scale-75 origin-right">
                    <Switch bind:checked={formData.psychological_coupling_enabled} />
                   </div>
                </div>
                <p class="text-[8px] text-muted-foreground uppercase font-bold leading-tight opacity-40">{$t("risk.rules.adaptation.psychological.desc")}</p>
              </div>

               <div class="p-3 rounded-xl border bg-card/10 border-white/5 space-y-2">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-2">
                     <Activity class="w-3 h-3 text-cyan-400" />
                     <span class="text-[9px] font-black uppercase text-cyan-400">Regressão</span>
                   </div>
                   <div class="scale-75 origin-right">
                    <Switch bind:checked={formData.outlier_regression_enabled} />
                   </div>
                </div>
                <p class="text-[8px] text-muted-foreground uppercase font-bold leading-tight opacity-40">{$t("risk.rules.adaptation.outliers.desc")}</p>
              </div>
            </div>
          </div>
        </div>

      {:else if activeSection === "ecosystem"}
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0.5">
            <h3 class="text-xs font-black uppercase text-foreground">{$t("risk.form.sections.ecosystem")}</h3>
            <p class="text-[9px] text-muted-foreground uppercase font-bold opacity-60">Escalabilidade e conectividade operacional.</p>
          </header>

          <div class="space-y-3">
            <div class="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-2 group shadow-sm transition-all hover:bg-primary/[0.07]">
               <div class="flex items-center gap-2 px-1">
                <TrendingUp class="w-3.5 h-3.5 text-primary" />
                <h4 class="text-[10px] font-black uppercase text-primary">Plano de Evolução</h4>
              </div>
              <Select.Root type="single" value={(formData.growth_plan_id as string) ?? "none"} onValueChange={(val: string) => formData.growth_plan_id = (val === 'none' ? undefined : val)}>
                <Select.Trigger class="w-full h-9 bg-background/40 border-0 shadow-none font-black text-[10px] px-3 rounded-lg mt-0">
                  <div class="flex items-center justify-between w-full">
                    <span>{riskSettingsStore.growthPlans.find(p => p.id === formData.growth_plan_id)?.name ?? $t("risk.growthPlan.none")}</span>
                    {#if formData.growth_plan_id && formData.growth_plan_id !== 'none'}
                      <Badge class="ml-2 bg-emerald-500/20 text-emerald-500 border-0 text-[7px] h-3.5 font-black uppercase">Engine Override Active</Badge>
                    {/if}
                  </div>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="none">{$t("risk.growthPlan.none")}</Select.Item>
                  {#each riskSettingsStore.growthPlans as plan}
                    <Select.Item value={plan.id}>{plan.name}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="p-4 rounded-xl border bg-card/10 border-white/5 space-y-3">
               <div class="flex justify-between items-center px-1">
                 <h4 class="text-[10px] font-black uppercase text-muted-foreground/60">Ativos Vinculados</h4>
                 <Badge variant="outline" class="h-3.5 text-[8px] font-black bg-primary/10 border-primary/20 text-primary">
                    {formData.linked_asset_risk_profile_ids?.length || 0}
                 </Badge>
               </div>
               
               <Select.Root type="single" onValueChange={(val: string) => { 
                if (val && !formData.linked_asset_risk_profile_ids?.includes(val)) {
                  formData.linked_asset_risk_profile_ids = [...(formData.linked_asset_risk_profile_ids || []), val]; 
                }
               }}>
                  <Select.Trigger class="w-full h-8 bg-background/20 border-0 font-bold text-[10px] rounded-lg px-3">
                    {$t("risk.management.assetProfileSelector")}
                  </Select.Trigger>
                  <Select.Content>
                    {#each riskSettingsStore.assetRiskProfiles.filter(p => p.id && !formData.linked_asset_risk_profile_ids?.includes(p.id)) as ap}
                      <Select.Item value={ap.id!}>{ap.name}</Select.Item>
                    {/each}
                  </Select.Content>
               </Select.Root>

               <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                 {#each (formData.linked_asset_risk_profile_ids || []) as apId}
                   {@const profile = riskSettingsStore.assetRiskProfiles.find(p => p.id === apId)}
                   {#if profile}
                     <div class="flex items-center justify-between p-1.5 pl-3 rounded-lg bg-background/40 border border-white/5 group hover:border-primary/20 transition-all">
                       <span class="text-[9px] font-black uppercase truncate">{profile.name}</span>
                       <Button variant="ghost" size="icon" class="h-5 w-5 text-muted-foreground/20 hover:text-destructive transition-colors" onclick={() => {
                         formData.linked_asset_risk_profile_ids = (formData.linked_asset_risk_profile_ids || []).filter(id => id !== apId);
                       }}>
                         <Trash2 class="w-3 h-3" />
                       </Button>
                     </div>
                   {/if}
                 {/each}
               </div>

               {#if (formData.linked_asset_risk_profile_ids?.length || 0) > 0}
                 <div class="pt-1">
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
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0.5">
            <h3 class="text-xs font-black uppercase text-foreground">{$t("risk.form.sections.status")}</h3>
            <p class="text-[9px] text-muted-foreground uppercase font-bold opacity-60">Audit de integridade sistêmica.</p>
          </header>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-xl border border-white/5 bg-card/10 space-y-0.5 text-center">
              <span class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest leading-none">Bloqueios</span>
              <p class="text-xl font-black {validation.errors.length > 0 ? 'text-rose-500' : 'text-emerald-500'} leading-none">{validation.errors.length}</p>
            </div>
            <div class="p-3 rounded-xl border border-white/5 bg-card/10 space-y-0.5 text-center">
              <span class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest leading-none">Alertas</span>
              <p class="text-xl font-black {validation.warnings.length > 0 ? 'text-amber-500' : 'text-emerald-500'} leading-none">{validation.warnings.length}</p>
            </div>
          </div>

          <div class="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
            {#if validation.errors.length > 0}
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-rose-500/70 flex items-center gap-1.5 px-1 tracking-wider">
                  <AlertCircle class="w-3 h-3" /> Bloqueios Críticos
                </h4>
                <div class="space-y-1">
                  {#each validation.errors as err}
                    <div class="flex items-start gap-2.5 p-2 rounded-lg bg-destructive/5 border border-destructive/10 animate-in slide-in-from-left-1">
                      <div class="p-1 rounded-full bg-destructive/10 mt-0"><AlertTriangle class="w-2.5 h-2.5 text-destructive" /></div>
                      <p class="text-[10px] font-bold text-destructive/80 leading-tight uppercase tracking-tight">{$t(err.message)}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if validation.warnings.length > 0}
              <div class="space-y-1.5">
                 <h4 class="text-[9px] font-black uppercase text-amber-500/70 flex items-center gap-1.5 px-1 tracking-wider">
                  <Info class="w-3 h-3" /> Recomendações
                </h4>
                <div class="space-y-1">
                  {#each validation.warnings as warn}
                    <div class="flex items-start gap-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 animate-in slide-in-from-left-1">
                      <div class="p-1 rounded-full bg-amber-500/10 mt-0"><Info class="w-2.5 h-2.5 text-amber-500" /></div>
                      <p class="text-[10px] font-bold text-amber-500/80 leading-tight uppercase tracking-tight">{$t(warn.message)}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if validation.errors.length === 0 && validation.warnings.length === 0}
              <div class="p-10 border border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex flex-col items-center text-center space-y-3 opacity-60">
                <CheckCircle2 class="w-10 h-10 text-emerald-500/30" />
                <div class="space-y-0.5">
                  <h4 class="text-xs font-black uppercase text-emerald-500">Perfil Zero-Fault</h4>
                  <p class="text-[9px] text-muted-foreground uppercase font-bold">Todas as diretrizes operacionais foram validadas.</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else if activeSection === "summary"}
        <div in:fade={{ duration: 150 }} class="space-y-4">
          <header class="space-y-0.5">
            <h3 class="text-xs font-black uppercase text-foreground">Prévia Institucional</h3>
            <p class="text-[9px] text-muted-foreground uppercase font-bold opacity-60">Visualização do perfil no terminal.</p>
          </header>

          <div class="rounded-xl border border-white/5 bg-background/20 p-4">
            <RiskProfileDetails profile={{ ...$state.snapshot(formData), id: initialData?.id ?? 'preview' }} />
          </div>
          
          <div class="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
             <AlertCircle class="w-4 h-4 text-primary mt-0.5" />
             <div class="space-y-1">
                <p class="text-[10px] font-black uppercase text-primary">Modo de Visualização</p>
                <p class="text-[9px] text-muted-foreground uppercase font-medium leading-tight">Este resumo reflete as alterações atuais, incluindo limites dinâmicos de planos de crescimento vinculados.</p>
             </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- FOOTER (CONTROL) -->
    <footer class="p-3 border-t border-white/5 bg-background/40 flex items-center justify-between shrink-0">
      <Button variant="ghost" class="h-8 px-4 font-black uppercase text-[9px] tracking-[0.1em] text-muted-foreground hover:text-foreground" onclick={onCancel}>
        {$t("risk.actions.cancel")}
      </Button>

      <div class="flex items-center gap-3">
        {#if !validation.isValid}
          <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/5 border border-destructive/10 animate-in fade-in">
             <AlertTriangle class="w-3 h-3 text-destructive animate-pulse" />
             <span class="text-[8px] font-black uppercase text-destructive tracking-widest">
               {validation.errors.length} Bloqueios
             </span>
          </div>
        {/if}

        <Button
          class="h-9 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all duration-300
            {validation.isValid ? 'bg-primary hover:bg-primary/90 shadow-primary/20' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-40'}"
          disabled={!validation.isValid}
          onclick={save}
        >
          {initialData ? $t("risk.actions.save") : $t("risk.plan.new")}
          <ShieldCheck class="w-3.5 h-3.5 ml-1.5" />
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
