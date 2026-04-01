<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import {
        Shield,
        Target,
        Lock,
        AlertTriangle,
        TrendingUp,
        Plus,
        Trash2,
        Zap,
        Target as TargetIcon,
        Link,
        ChevronRight,
        ShieldCheck,
        Grid3X3,
        Brain,
    } from "lucide-svelte";
    import { t, locale } from "svelte-i18n";
    import type { RiskProfile } from "$lib/types";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Card from "$lib/components/ui/card";
    import { slide } from "svelte/transition";
    import CombinedRulesSection from "./risk/CombinedRulesSection.svelte";
    import DeskConfigSection from "./risk/DeskConfigSection.svelte";
    import RiskRulesSection from "./risk/RiskRulesSection.svelte";

    import { Badge as UI_Badge } from "$lib/components/ui/badge";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";

    let { initialData, onSave, onCancel } = $props<{
        initialData?: RiskProfile;
        onSave: (data: Omit<RiskProfile, "id">) => void;
        onCancel: () => void;
    }>();

    const initial = $derived($state.snapshot(initialData));
    
    // Initialize with a clean object, let $effect handle the data loading
    let formData = $state<Omit<RiskProfile, "id">>({
        name: "",
        max_daily_loss: 0,
        daily_target: 0,
        max_risk_per_trade_percent: 1.0,
        max_trades_per_day: 5,
        min_risk_reward: 1.5,
        lock_on_loss: false,
        account_type_applicability: "All",
        target_type: "Financial",
        capital_source: "Fixed",
        fixed_capital: 0,
        linked_account_id: null,
        growth_plan_id: undefined,
        psychological_coupling_enabled: false,
        outlier_regression_enabled: false,
        sniper_mode_enabled: false,
        sniper_mode_selectivity: 3,
        psychological_lookback_count: 10,
        outlier_lookback_count: 20,
        psychological_threshold: -2,
        lot_reduction_multiplier: 0.5,
        psychological_search_strategy: "Strict",
        account_ids: [],
        active: false,
        use_advanced_rules: false,
        linked_asset_risk_profile_ids: [],
        combined_rules: [],
        risk_rules: [],
    });

    let activeTab = $state("protection");
    
    let selectedLinkedAccount = $state("");

    $effect(() => {
        if (initialData?.linked_account_id) {
            selectedLinkedAccount = initialData.linked_account_id;
        }
    });

    $effect(() => {
        if (selectedLinkedAccount) {
            formData.linked_account_id = selectedLinkedAccount;
        } else {
            formData.linked_account_id = null;
        }
    });


    $effect(() => {
        // Only update if initialData changes significantly or logic requires it.
        // For simple forms, often only init is enough, but keeping existing pattern.
        if (initialData) {
            let fd = { ...initialData };
            formData = {
                name: fd.name,
                max_daily_loss: fd.max_daily_loss,
                daily_target: fd.daily_target,
                max_risk_per_trade_percent: fd.max_risk_per_trade_percent,
                max_trades_per_day: fd.max_trades_per_day,
                min_risk_reward: fd.min_risk_reward,
                lock_on_loss: fd.lock_on_loss,
                account_type_applicability: fd.account_type_applicability,
                target_type: fd.target_type ?? "Financial",
                capital_source: fd.capital_source ?? "Fixed",
                fixed_capital: fd.fixed_capital ?? 0,
                linked_account_id: fd.linked_account_id ?? null,
                growth_plan_id: fd.growth_plan_id ?? undefined,
                psychological_coupling_enabled:
                    fd.psychological_coupling_enabled ?? false,
                outlier_regression_enabled:
                    fd.outlier_regression_enabled ?? false,
                sniper_mode_enabled: fd.sniper_mode_enabled ?? false,
                sniper_mode_selectivity: fd.sniper_mode_selectivity ?? 3,
                psychological_lookback_count:
                    fd.psychological_lookback_count ?? 10,
                outlier_lookback_count: fd.outlier_lookback_count ?? 20,
                psychological_threshold: fd.psychological_threshold ?? -2,
                lot_reduction_multiplier: fd.lot_reduction_multiplier ?? 0.5,
                psychological_search_strategy:
                    fd.psychological_search_strategy ?? "Strict",
                account_ids: fd.account_ids ?? [],
                active: fd.active,
                use_advanced_rules: fd.use_advanced_rules ?? false,
                linked_asset_risk_profile_ids: fd.linked_asset_risk_profile_ids || [],
                combined_rules: fd.combined_rules || [],
                risk_rules: fd.risk_rules || [],
            };
            
            selectedGrowthPlan = fd.growth_plan_id || "none";
        }
    });

    const accountTypes = $derived([
        {
            value: "All",
            label: $t("risk.plan.applicability.all"),
        },
        {
            value: "Prop",
            label: $t("risk.plan.applicability.prop"),
        },
        {
            value: "Real",
            label: $t("risk.plan.applicability.real"),
        },
        {
            value: "Demo",
            label: $t("risk.plan.applicability.demo"),
        },
        {
            value: "Specific",
            label: $t("risk.plan.applicability.specific"),
        },
    ]);

    const growthPlanOptions = $derived([
        { value: "none", label: $t("risk.growthPlan.none") },
        ...riskSettingsStore.growthPlans.map(p => ({ value: p.id, label: p.name }))
    ]);

    import { appStore } from "$lib/stores/app.svelte";



    function applyTemplate(id: string) {
        const template = riskSettingsStore.createRiskProfileTemplate(id);
        if (template) {
            formData = template;
        }
    }

    // Safe local state for Growth Plan
    let selectedGrowthPlan = $state("none");

    function save() {
        const payload = { ...formData };
        if (selectedGrowthPlan === "none") {
            payload.growth_plan_id = undefined;
        } else {
            payload.growth_plan_id = selectedGrowthPlan;
        }
        
        onSave(payload);
    }

    // Dynamic capital estimation
    const effectiveCapital = $derived.by(() => {
        if (formData.capital_source === "Fixed") return formData.fixed_capital || 0;
        if (formData.capital_source === "LinkedAccount" && selectedLinkedAccount) {
            const acc = accountsStore.accounts.find(a => a.id === selectedLinkedAccount);
            return acc?.balance || 0;
        }
        return 0;
    });

    const getCapitalSourceName = (source: string) => {
        if (source === 'Fixed') return $t('risk.plan.finance.fixedValue');
        if (source === 'LinkedAccount') return $t('risk.plan.finance.linkAccount');
        return source;
    };

    const currencyCode = $derived(
        formData.linked_account_id
        ? accountsStore.accounts.find(a => a.id === formData.linked_account_id)?.currency || 'BRL'
        : userProfileStore.userProfile.main_currency || 'BRL'
    );

    const estimatedRiskPerTrade = $derived((effectiveCapital * (formData.max_risk_per_trade_percent || 0)) / 100);
</script>

<div class="space-y-4 py-4">
    {#if !initialData}
        <div class="space-y-2 pb-2 bg-muted/20 p-4 rounded-xl border border-border/50">
            <Label class="text-xs text-muted-foreground uppercase font-bold">
                {$t("risk.plan.finance.baseTemplate")}
            </Label>
            <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Select.Root
                    type="single"
                    onValueChange={(value: string) => {
                        if (!value) return;
                        if (value === "blank") {
                            // nothing
                        } else {
                            applyTemplate(value);
                        }
                    }}
                >
                    <Select.Trigger class="w-full md:w-[350px] bg-background">
                        {$t("risk.plan.finance.startBlank")}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="blank">
                            {$t("risk.plan.finance.startBlank")}
                        </Select.Item>
                        <Select.Group>
                            <Select.Label>
                                {$t("risk.plan.finance.copyOf")}
                            </Select.Label>
                            {#each riskSettingsStore.riskProfiles as baseProfile}
                                <Select.Item value={baseProfile.id}>
                                    {baseProfile.name}
                                </Select.Item>
                            {/each}
                        </Select.Group>
                    </Select.Content>
                </Select.Root>
                <span class="text-xs text-muted-foreground max-w-sm">
                    {$t("risk.plan.finance.templateDesc")}
                </span>
            </div>
        </div>
    {/if}



    <div class="space-y-4">
        <!-- Guia de Hierarquia (Visual Aid) -->
        <div class="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div class="p-3 rounded-lg bg-primary/10 text-primary">
                <Shield class="w-6 h-6" />
            </div>
            <div class="space-y-1">
                <h4 class="text-sm font-bold text-primary flex items-center gap-2">
                    {$t("risk.plan.hierarchy.title")}
                </h4>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                    <span class="flex items-center gap-1"><UI_Badge variant="outline" class="h-4 px-1 text-[8px]">1</UI_Badge> {$t("risk.plan.hierarchy.global")}</span>
                    <ChevronRight class="w-3 h-3 text-muted-foreground/50" />
                    <span class="flex items-center gap-1"><UI_Badge variant="outline" class="h-4 px-1 text-[8px]">2</UI_Badge> {$t("risk.plan.hierarchy.asset")}</span>
                    <ChevronRight class="w-3 h-3 text-muted-foreground/50" />
                    <span class="flex items-center gap-1"><UI_Badge variant="outline" class="h-4 px-1 text-[8px]">3</UI_Badge> {$t("risk.plan.hierarchy.growth")}</span>
                    <ChevronRight class="w-3 h-3 text-muted-foreground/50" />
                    <span class="flex items-center gap-1 text-primary"><UI_Badge variant="outline" class="h-4 px-1 text-[8px] border-primary/30 text-primary">4</UI_Badge> {$t("risk.plan.hierarchy.rules")}</span>
                </div>
            </div>
        </div>

        <div class="space-y-2">
            <Label>{$t("risk.plan.name")}</Label>
            <Input
                bind:value={formData.name}
                placeholder={$t("risk.plan.namePlaceholder")}
            />
        </div>
    </div>

    <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List class="flex flex-wrap w-full justify-start sm:justify-center p-1 h-auto gap-1">
            <Tabs.Trigger value="protection" class="flex-1 min-w-[120px]"
                >{$t("risk.plan.tabs.protection")}</Tabs.Trigger
            >
            <Tabs.Trigger value="evolution" class="flex-1 min-w-[120px]"
                >{$t("risk.plan.tabs.evolution")}</Tabs.Trigger
            >
            <Tabs.Trigger value="adaptation" class="flex-1 min-w-[120px]"
                >{$t("risk.plan.tabs.adaptation")}</Tabs.Trigger
            >
            <Tabs.Trigger value="scope" class="flex-1 min-w-[120px]"
                >{$t("risk.plan.tabs.scope")}</Tabs.Trigger
            >
        </Tabs.List>

        <Tabs.Content value="protection" class="space-y-6 pt-2">
            <!-- 1. CAMADA FINANCEIRA E CAPITAL (NOVO) -->
            <div class="space-y-5 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h3 class="flex items-center gap-2 font-bold text-emerald-500">
                        <Target class="w-4 h-4" />
                        {$t("risk.plan.finance.title")}
                    </h3>
                    <div class="flex items-center gap-2">
                        <UI_Badge variant="outline" class="border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                            {$t("risk.growthPlan.maxLotsLabel")}
                        </UI_Badge>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.plan.finance.money")}</Label>
                        <Select.Root
                            type="single"
                            bind:value={formData.target_type}
                        >
                            <Select.Trigger class="w-full">
                                {formData.target_type === "Financial" ? $t("risk.plan.finance.money") : $t("risk.plan.finance.points")}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="Financial">{$t("risk.plan.finance.money")}</Select.Item>
                                <Select.Item value="Points">{$t("risk.plan.finance.points")}</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.plan.finance.linkAccount")}</Label>
                        <Select.Root
                            type="single"
                            bind:value={formData.capital_source}
                        >
                            <Select.Trigger class="w-full">
                                {formData.capital_source === "Fixed" ? $t("risk.plan.finance.fixedValue") : $t("risk.plan.finance.linkAccount")}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="Fixed">{$t("risk.plan.finance.fixedValue")}</Select.Item>
                                <Select.Item value="LinkedAccount">{$t("risk.plan.finance.linkAccount")}</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    {#if formData.capital_source === "Fixed"}
                        <div class="space-y-2.5 animate-in fade-in slide-in-from-top-1">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.plan.finance.capitalBase")}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                bind:value={formData.fixed_capital}
                                placeholder="ex: 1000.00"
                            />
                        </div>
                    {:else}
                         <div class="space-y-2.5 animate-in fade-in slide-in-from-top-1">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.plan.finance.referenceAccount")}</Label>
                            <Select.Root
                                type="single"
                                bind:value={selectedLinkedAccount}
                            >
                                <Select.Trigger class="w-full">
                                    {accountsStore.accounts.find(a => a.id === selectedLinkedAccount)?.nickname ?? $t("risk.plan.finance.selectAccount")}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each accountsStore.accounts as account}
                                        <Select.Item value={account.id}>{account.nickname}</Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 2. MODO AVANÇADO TOGGLE -->
            <div class="space-y-4 p-5 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <h3 class="font-bold text-primary flex items-center gap-2">
                            <Zap class="w-4 h-4" />
                            {$t("risk.rules.advancedRules")}
                        </h3>
                        <p class="text-xs text-muted-foreground max-w-xl">
                            {$t("risk.rules.advancedRulesDesc")}
                        </p>
                    </div>
                    <Switch bind:checked={formData.use_advanced_rules} />
                </div>
            </div>

            <!-- 3. LIMITES DIÁRIOS (BASE) -->
            {#if !formData.use_advanced_rules}
                <div transition:slide={{ duration: 400 }} class="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden">
                    <div class="space-y-5 p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <h3 class="flex items-center gap-2 font-bold text-rose-500">
                                <Shield class="w-4 h-4" />
                                {$t("risk.rules.engine.max_daily_loss")}
                            </h3>
                            <div class="text-right">
                                <span class="text-[10px] uppercase font-bold text-muted-foreground block leading-none">{$t("risk.cockpit.stats.allowedSizing")}</span>
                                <span class="text-sm font-mono font-bold text-rose-500">
                                    {formData.target_type === 'Financial' ? (currencyCode === 'BRL' ? 'R$ ' : '$ ') : ''}
                                    {estimatedRiskPerTrade.toLocaleString($locale || 'pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("risk.plan.labels.dailyLossLimit")} ({formData.target_type === 'Financial' ? '$' : 'pts'})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    bind:value={formData.max_daily_loss}
                                />
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("risk.rules.adaptation.psychological.multiplier")} (%)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    class="font-bold text-rose-500"
                                    bind:value={formData.max_risk_per_trade_percent}
                                />
                            </div>
                        </div>
                    </div>

                    <div class="space-y-5 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                        <h3 class="flex items-center gap-2 font-bold text-emerald-500">
                            <TargetIcon class="w-4 h-4" />
                            {$t("risk.plan.labels.dailyGoal")}
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("risk.plan.labels.dailyGoal")} ({formData.target_type === 'Financial' ? '$' : 'pts'})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    bind:value={formData.daily_target}
                                />
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("risk.plan.labels.minRiskReward")}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    class="font-bold text-emerald-500"
                                    bind:value={formData.min_risk_reward}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- 4. CONFIGURAÇÃO DE MESA (DESK) + REGRAS (ADVANCED) -->
            {#if formData.use_advanced_rules}
                <div transition:slide={{ duration: 400 }} class="space-y-6 overflow-hidden pt-2">
                    <!-- Estratégia de Base (Configurações Globais no Modo Avançado) -->
                    <div class="p-5 rounded-xl border border-primary/20 bg-black/20 shadow-sm">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xs font-bold uppercase tracking-widest text-primary/70">{$t("risk.plan.finance.baseStrategy")}</h3>
                            <div class="text-right">
                                <span class="text-[10px] uppercase font-bold text-muted-foreground block leading-none">{$t("risk.cockpit.stats.allowedSizing")}</span>
                                <span class="text-sm font-mono font-bold text-primary">
                                    {formData.target_type === 'Financial' ? (currencyCode === 'BRL' ? 'R$ ' : '$ ') : ''}
                                    {estimatedRiskPerTrade.toLocaleString($locale || 'pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.rules.adaptation.multiplier")} (%)</Label>
                                <div class="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        class="font-bold border-primary/20"
                                        bind:value={formData.max_risk_per_trade_percent}
                                    />
                                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/40">%</span>
                                </div>
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{$t("risk.cockpit.criteria.win_rate")}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    class="font-bold border-primary/20"
                                    bind:value={formData.min_risk_reward}
                                />
                            </div>
                        </div>
                    </div>
                    <DeskConfigSection
                        bind:config={formData.desk_config}
                        availableAssetProfiles={riskSettingsStore.assetRiskProfiles}
                    />

                    <RiskRulesSection
                        bind:rules={() => formData.risk_rules ?? [], (v) => formData.risk_rules = v}
                        assetRiskProfiles={riskSettingsStore.assetRiskProfiles}
                    />
                </div>
            {/if}

            <!-- 5. DISCIPLINA E TRAVAS -->
            <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                <h3 class="flex items-center gap-2 font-bold text-muted-foreground">
                    <Lock class="w-4 h-4" />
                    {$t("risk.rules.disciplineTitle")}
                </h3>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <Switch
                            id="lock-mode"
                            bind:checked={formData.lock_on_loss}
                        />
                        <Label for="lock-mode">{$t("risk.plan.labels.platformLock")}</Label>
                    </div>
                </div>
                {#if formData.lock_on_loss}
                    <p class="text-xs text-rose-400 flex items-center gap-1">
                        <AlertTriangle class="w-3 h-3" />
                        {$t("risk.plan.labels.lockWarning")}
                    </p>
                {/if}
            </div>
        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 3: ADAPTAÇÃO (MOTORES)                         -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="adaptation" class="space-y-4 pt-2">
            {#if activeTab === "adaptation"}
                <div class="space-y-4">
                    <section class="space-y-4 p-4 rounded-xl border bg-background/30">
                        <div class="flex items-center gap-2 text-primary">
                            <Brain class="w-4 h-4" />
                            <h4 class="text-xs font-bold uppercase tracking-widest">
                                {$t("risk.rules.adaptation.psychological.title")}
                            </h4>
                        </div>
                        <p class="text-[10px] text-muted-foreground leading-relaxed">
                            {$t("risk.rules.adaptation.psychological.desc")}
                        </p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.psychological.strategy")}</Label>
                                <Select.Root type="single" value="strict">
                                    <Select.Trigger class="h-8 text-xs">
                                        {$t("risk.rules.adaptation.psychological.strategyStrict")}
                                    </Select.Trigger>
                                </Select.Root>
                            </div>
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.psychological.lookback")}</Label>
                                <Input type="number" class="h-8 text-xs" value={20} />
                            </div>
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.psychological.threshold")}</Label>
                                <Input type="number" step="0.1" class="h-8 text-xs" value={1.5} />
                            </div>
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.psychological.multiplier")}</Label>
                                <Input type="number" step="0.1" class="h-8 text-xs" value={0.5} />
                            </div>
                        </div>
                    </section>

                    <section class="space-y-4 p-4 rounded-xl border bg-background/30">
                        <div class="flex items-center gap-2 text-primary">
                            <Zap class="w-4 h-4" />
                            <h4 class="text-xs font-bold uppercase tracking-widest">
                                {$t("risk.rules.adaptation.outliers.title")}
                            </h4>
                        </div>
                        <p class="text-[10px] text-muted-foreground leading-relaxed">
                            {$t("risk.rules.adaptation.outliers.desc")}
                        </p>
                        <div class="space-y-2">
                            <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.outliers.lookback")}</Label>
                            <Input type="number" class="h-8 text-xs" value={50} />
                        </div>
                    </section>

                    <section class="space-y-4 p-4 rounded-xl border bg-background/30">
                        <div class="flex items-center gap-2 text-primary">
                            <Target class="w-4 h-4" />
                            <h4 class="text-xs font-bold uppercase tracking-widest">
                                {$t("risk.rules.adaptation.sniper.title")}
                            </h4>
                        </div>
                        <p class="text-[10px] text-muted-foreground leading-relaxed">
                            {$t("risk.rules.adaptation.sniper.desc")}
                        </p>
                        <div class="space-y-2">
                            <Label class="text-[10px] uppercase font-bold text-muted-foreground">{$t("risk.rules.adaptation.sniper.selectivity")}</Label>
                            <Input type="number" step="0.1" class="h-8 text-xs" value={2.0} />
                        </div>
                    </section>
                </div>
            {/if}
        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 4: ESCOPO E VÍNCULOS                           -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="scope" class="space-y-6 pt-2">
            {#if activeTab === "scope"}
                <!-- Applicability (Accounts) -->
                <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                    <div class="space-y-6">
                        <section class="space-y-4">
                            <h4 class="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-wider">
                                <ShieldCheck class="w-4 h-4" />
                                {$t("risk.scope.accountsTitle")}
                            </h4>
                            <div class="p-4 rounded-lg border bg-background/50">
                                <p class="text-xs text-muted-foreground">{$t("risk.scope.accounts")}</p>
                            </div>
                        </section>
                        <section class="space-y-4">
                            <h4 class="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-wider">
                                <Grid3X3 class="w-4 h-4" />
                                {$t("risk.scope.applicability")}
                            </h4>
                            <div class="p-4 rounded-lg border bg-background/50">
                                <p class="text-xs text-muted-foreground">{$t("risk.accountTypes.All")}</p>
                            </div>
                        </section>
                    </div>
                </div>

                <!-- Asset Profiles Links -->
                <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                    <div class="flex items-center justify-between">
                        <h3 class="flex items-center gap-2 font-bold text-muted-foreground">
                            <TargetIcon class="w-4 h-4" />
                            {$t("risk.scope.assets")}
                        </h3>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        {$t("risk.management.linkedAssetProfilesDesc") || "Aplica as regras globais de risco a perfis de negociação específicos de um ativo."}
                    </p>

                    <div class="space-y-3 pt-2">
                        <div class="flex gap-2">
                            <Select.Root
                                type="single"
                                onValueChange={(val: string) => {
                                    if (val && !formData.linked_asset_risk_profile_ids?.includes(val)) {
                                        formData.linked_asset_risk_profile_ids = [...(formData.linked_asset_risk_profile_ids || []), val];
                                    }
                                }}
                            >
                                <Select.Trigger class="w-full md:w-[350px]">
                                    {$t("risk.management.assetProfileSelector") || "Selecione um Perfil de Ativo..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each riskSettingsStore.assetRiskProfiles.filter((ap) => !formData.linked_asset_risk_profile_ids?.includes(ap.id as string)) as ap}
                                        <Select.Item value={ap.id as string}>{ap.name}</Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            {#if !formData.linked_asset_risk_profile_ids || formData.linked_asset_risk_profile_ids.length === 0}
                                <div class="col-span-1 md:col-span-2 p-3 text-center border border-dashed rounded text-sm text-muted-foreground">
                                    {$t("risk.management.noLinkedAssetProfiles") || "Nenhum perfil de ativo vinculado."}
                                </div>
                            {:else}
                                {#each formData.linked_asset_risk_profile_ids as apId}
                                    {@const profile = riskSettingsStore.assetRiskProfiles.find((p) => p.id === apId)}
                                    {#if profile}
                                        <div class="flex items-center justify-between p-2 rounded border bg-background/50 text-sm">
                                            <span class="font-medium truncate">{profile.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-8 text-destructive hover:bg-destructive/10"
                                                onclick={() => {
                                                    formData.linked_asset_risk_profile_ids = formData.linked_asset_risk_profile_ids?.filter((id) => id !== apId);
                                                }}
                                            >
                                                <Trash2 class="w-4 h-4 mr-2" />
                                                {$t("risk.management.removeAssetProfile") || "Remover"}
                                            </Button>
                                        </div>
                                    {/if}
                                {/each}
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 2: EVOLUÇÃO (GROWTH)                           -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="evolution" class="space-y-4 pt-2">
            <div class="space-y-5 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-emerald-500/10"><TrendingUp class="w-5 h-5 text-emerald-400" /></div>
                        <div class="space-y-1">
                            <h4 class="font-bold text-emerald-400 text-sm">
                                {$t("risk.evolution.growthPlan")}
                            </h4>
                            <p class="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold">
                                {$t("risk.evolution.bindDesc")}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="pt-3 border-t border-emerald-500/10">
                    <div class="space-y-2.5">
                        <Select.Root
                            type="single"
                            bind:value={selectedGrowthPlan}
                        >
                            <Select.Trigger class="w-full">
                                {growthPlanOptions.find(o => o.value === selectedGrowthPlan)?.label ?? $t("risk.status_list.insufficient_data")}
                            </Select.Trigger>
                            <Select.Content>
                                {#each growthPlanOptions as opt}
                                    <Select.Item value={opt.value}>{opt.label}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </div>
        </Tabs.Content>
    </Tabs.Root>

    <div class="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onclick={onCancel}
            >{$t("risk.plan.actions.cancel")}</Button
        >
        <Button onclick={save}>{$t("risk.plan.actions.save")}</Button>
    </div>
</div>
