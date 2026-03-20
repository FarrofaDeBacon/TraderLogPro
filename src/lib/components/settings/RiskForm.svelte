<script lang="ts">
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
        Brain,
        Target as TargetIcon,
        Link,
    } from "lucide-svelte";
    import { t } from "svelte-i18n";
    import type { RiskProfile } from "$lib/types";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Card from "$lib/components/ui/card";
    import CombinedRulesSection from "./risk/CombinedRulesSection.svelte";
    import DeskConfigSection from "./risk/DeskConfigSection.svelte";
    import RiskRulesSection from "./risk/RiskRulesSection.svelte";

    import { Badge } from "$lib/components/ui/badge";

    let { initialData, onSave, onCancel } = $props<{
        initialData?: RiskProfile;
        onSave: (data: Omit<RiskProfile, "id">) => void;
        onCancel: () => void;
    }>();

    const data = $state.snapshot(initialData);
    let formData = $state<Omit<RiskProfile, "id">>({
        name: data?.name ?? "",
        max_daily_loss: data?.max_daily_loss ?? 0,
        daily_target: data?.daily_target ?? 0,
        max_risk_per_trade_percent: data?.max_risk_per_trade_percent ?? 1.0,
        max_trades_per_day: data?.max_trades_per_day ?? 5,
        min_risk_reward: data?.min_risk_reward ?? 1.5,
        lock_on_loss: data?.lock_on_loss ?? false,
        account_type_applicability: data?.account_type_applicability ?? "All",
        target_type: data?.target_type ?? "Financial",
        capital_source: data?.capital_source ?? "Fixed",
        fixed_capital: data?.fixed_capital ?? 0,
        linked_account_id: data?.linked_account_id ?? null,
        growth_plan_id: data?.growth_plan_id ?? undefined,
        psychological_coupling_enabled: data?.psychological_coupling_enabled ?? false,
        outlier_regression_enabled: data?.outlier_regression_enabled ?? false,
        sniper_mode_enabled: data?.sniper_mode_enabled ?? false,
        sniper_mode_selectivity: data?.sniper_mode_selectivity ?? 3,
        psychological_lookback_count: data?.psychological_lookback_count ?? 10,
        outlier_lookback_count: data?.outlier_lookback_count ?? 20,
        psychological_threshold: data?.psychological_threshold ?? -2,
        lot_reduction_multiplier: data?.lot_reduction_multiplier ?? 0.5,
        psychological_search_strategy: data?.psychological_search_strategy ?? "Strict",
        account_ids: data?.account_ids ?? [],
        active: data?.active ?? false,
        linked_asset_risk_profile_ids: data?.linked_asset_risk_profile_ids ?? [],
        combined_rules: data?.combined_rules ?? [],
        risk_rules: data?.risk_rules ?? [],
    });

    let activeTab = $state("base");



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
                active: fd.active ?? false,
                linked_asset_risk_profile_ids: fd.linked_asset_risk_profile_ids ?? [],
                combined_rules: fd.combined_rules ? [...fd.combined_rules] : [],
                risk_rules: fd.risk_rules ? [...fd.risk_rules] : [],
            };
            
            selectedGrowthPlan = fd.growth_plan_id || "none";
        }
    });

    const accountTypes = $derived([
        {
            value: "All",
            label: $t("settings.risk.accountTypes.All") || "Todas as Contas",
        },
        {
            value: "Prop",
            label: $t("settings.risk.accountTypes.Prop") || "Mesa Proprietária",
        },
        {
            value: "Real",
            label: $t("settings.risk.accountTypes.Real") || "Conta Real",
        },
        {
            value: "Demo",
            label: $t("settings.risk.accountTypes.Demo") || "Conta Demo",
        },
        {
            value: "Specific",
            label:
                $t("settings.risk.accountTypes.Specific") ||
                "Specific Accounts",
        },
    ]);

    const growthPlanOptions = $derived([
        { value: "none", label: "Nenhum plano vinculado (Fixo)" },
        ...settingsStore.growthPlans.map(p => ({ value: p.id, label: p.name }))
    ]);

    import { settingsStore } from "$lib/stores/settings.svelte";



    function applyTemplate(id: string) {
        const template = settingsStore.createRiskProfileTemplate(id);
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
</script>

<div class="space-y-4 py-4">
    {#if !initialData}
        <div class="space-y-2 pb-2 bg-muted/20 p-4 rounded-xl border border-border/50">
            <Label class="text-xs text-muted-foreground uppercase font-bold">
                {$t("settings.risk.management.baseTemplate") || "Modelo Base"}
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
                        {$t("settings.risk.management.startBlank") || "Criar em Branco"}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="blank">
                            {$t("settings.risk.management.startBlank") || "Criar em Branco"}
                        </Select.Item>
                        <Select.Group>
                            <Select.Label>
                                {$t("settings.risk.management.copyOf") || "Cópia de"}
                            </Select.Label>
                            {#each settingsStore.riskProfiles as baseProfile}
                                <Select.Item value={baseProfile.id}>
                                    {baseProfile.name}
                                </Select.Item>
                            {/each}
                        </Select.Group>
                    </Select.Content>
                </Select.Root>
                <span class="text-xs text-muted-foreground max-w-sm">
                    Carrega as configurações principais de um perfil existente. Vínculos de ativos não são transferidos na template.
                </span>
            </div>
        </div>
    {/if}



    <div class="space-y-2">
        <Label>{$t("settings.risk.name")}</Label>
        <Input
            bind:value={formData.name}
            placeholder={$t("settings.risk.namePlaceholder")}
        />
    </div>

    <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List class="flex flex-wrap w-full justify-start sm:justify-center p-1 h-auto gap-1">
            <Tabs.Trigger value="base" class="flex-1 min-w-[120px]"
                >{$t("settings.risk.form.tabs.base") || "Base"}</Tabs.Trigger
            >
            <Tabs.Trigger value="asset-profiles" class="flex-1 min-w-[120px]"
                >{$t("settings.risk.form.tabs.assetProfiles") || "Perfis de Ativo"}</Tabs.Trigger
            >
            <Tabs.Trigger value="rules" class="flex-1 min-w-[120px]"
                >{$t("settings.risk.form.tabs.rules") || "Regras"}</Tabs.Trigger
            >
            <Tabs.Trigger value="motors" class="flex-1 min-w-[120px]"
                >{$t("settings.risk.form.tabs.motors") || "Motor de Crescimento"}</Tabs.Trigger
            >
        </Tabs.List>

        <Tabs.Content value="base" class="space-y-3 pt-2">
            
            <!-- Target Type & Capital Source -->
            <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                <h3 class="flex items-center gap-2 font-bold text-primary">
                    <Target class="w-4 h-4" />
                    Configuração de Capital e Alvo
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Alvo</Label>
                        <Select.Root
                            type="single"
                            bind:value={formData.target_type}
                        >
                            <Select.Trigger class="w-full">
                                {formData.target_type === "Financial" ? "Financeiro ($)" : "Pontos (pts)"}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="Financial">Financeiro ($)</Select.Item>
                                <Select.Item value="Points">Pontos (pts)</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem do Capital</Label>
                        <Select.Root
                            type="single"
                            bind:value={formData.capital_source}
                        >
                            <Select.Trigger class="w-full">
                                {formData.capital_source === "Fixed" ? "Valor Fixo" : "Vincular a Conta"}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="Fixed">Valor Fixo</Select.Item>
                                <Select.Item value="LinkedAccount">Vincular a Conta</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>
                    {#if formData.capital_source === "Fixed"}
                        <div class="space-y-2.5 animate-in fade-in slide-in-from-top-1">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capital Base (Valor Fixo)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                bind:value={formData.fixed_capital}
                                placeholder="ex: 1000.00"
                            />
                        </div>
                    {:else}
                         <div class="space-y-2.5 animate-in fade-in slide-in-from-top-1">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecionar Conta Vinculada</Label>
                            <Select.Root
                                type="single"
                                bind:value={() => formData.linked_account_id || "", (v) => formData.linked_account_id = v || null}
                            >
                                <Select.Trigger class="w-full">
                                    {settingsStore.accounts.find(a => a.id === formData.linked_account_id)?.nickname ?? "Selecione uma Conta"}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each settingsStore.accounts as account}
                                        <Select.Item value={account.id}>{account.nickname}</Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- Downside Protection -->
                <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                    <h3 class="flex items-center gap-2 font-bold text-rose-500">
                        <Shield class="w-4 h-4" />
                        {$t("settings.risk.downside")}
                    </h3>
                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("settings.risk.maxRiskPerTrade")}</Label>
                        <Input
                            type="number"
                            step="0.1"
                            bind:value={formData.max_risk_per_trade_percent}
                        />
                    </div>
                </div>

                <!-- Upside Targets & Sizing -->
                <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                    <h3 class="flex items-center gap-2 font-bold text-emerald-500">
                        <Target class="w-4 h-4" />
                        {$t("settings.risk.upside")} & Sizing
                    </h3>
                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("settings.risk.minRiskReward")}</Label>
                        <Input
                            type="number"
                            step="0.1"
                            bind:value={formData.min_risk_reward}
                        />
                    </div>
                </div>
            </div>

            <!-- Discipline -->
            <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                <h3 class="flex items-center gap-2 font-bold text-muted-foreground">
                    <Lock class="w-4 h-4" />
                    {$t("settings.risk.discipline")}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div class="space-y-2.5">
                        <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("settings.risk.applicability")}</Label>
                        <Select.Root
                            type="single"
                            bind:value={formData.account_type_applicability}
                        >
                            <Select.Trigger>
                                {accountTypes.find(
                                    (t) =>
                                        t.value ===
                                        formData.account_type_applicability,
                                )?.label ?? formData.account_type_applicability}
                            </Select.Trigger>
                            <Select.Content>
                                {#each accountTypes as type}
                                    <Select.Item value={type.value}
                                        >{type.label}</Select.Item
                                    >
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>

                {#if formData.account_type_applicability === "Specific"}
                    <div
                        class="space-y-2 pt-2 border-t animate-in fade-in slide-in-from-top-1"
                    >
                        <Label class="text-xs font-semibold"
                            >{$t("settings.risk.form.accounts.title")}</Label
                        >
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {#each settingsStore.accounts as account}
                                <div
                                    class="flex items-center space-x-2 p-2 rounded border bg-background/50"
                                >
                                    <Switch
                                        id="acc-{account.id}"
                                        checked={formData.account_ids.includes(
                                            account.id,
                                        )}
                                        onCheckedChange={(checked: boolean) => {
                                            if (checked) {
                                                formData.account_ids = [
                                                    ...formData.account_ids,
                                                    account.id,
                                                ];
                                            } else {
                                                formData.account_ids =
                                                    formData.account_ids.filter(
                                                        (id) =>
                                                            id !== account.id,
                                                    );
                                            }
                                        }}
                                    />
                                    <Label
                                        for="acc-{account.id}"
                                        class="text-xs cursor-pointer truncate"
                                    >
                                        {account.nickname}
                                    </Label>
                                </div>
                            {/each}
                        </div>
                        {#if formData.account_ids.length === 0}
                            <p class="text-[10px] text-amber-500 italic">
                                {$t(
                                    "settings.risk.form.accounts.noneSelected",
                                ) ||
                                    "Nenhuma conta selecionada. O perfil não será aplicado a nenhuma conta."}
                            </p>
                        {/if}
                    </div>
                {/if}

                <div class="flex items-center space-x-4 pt-2">
                    <div class="flex items-center space-x-2">
                        <Switch
                            id="lock-mode"
                            bind:checked={formData.lock_on_loss}
                        />
                        <Label for="lock-mode"
                            >{$t("settings.risk.lockOnLoss")}</Label
                        >
                    </div>
                </div>
                {#if formData.lock_on_loss}
                    <p class="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle class="w-3 h-3" />
                        {$t("settings.risk.lockWarning")}
                    </p>
                {/if}
            </div>

        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 2: PERFIS DE ATIVO                             -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="asset-profiles" class="space-y-3 pt-2">
            <div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h3 class="flex items-center gap-2 font-bold text-muted-foreground">
                        <Link class="w-4 h-4" />
                        {$t("risk.management.linkedAssetProfiles") || "Perfis de Ativo Vinculados"}
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
                                {#each settingsStore.assetRiskProfiles.filter((ap) => !formData.linked_asset_risk_profile_ids?.includes(ap.id as string)) as ap}
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
                                {@const profile = settingsStore.assetRiskProfiles.find((p) => p.id === apId)}
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
        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 3: REGRAS DO PLANO                             -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="rules" class="space-y-4 pt-2">

            <!-- SUB-BLOCK B: Configuração da Mesa (Visual/Marcador apenas) -->
            <DeskConfigSection
                bind:config={formData.desk_config}
                availableAssetProfiles={settingsStore.assetRiskProfiles}
            />

            <!-- SUB-BLOCK C: Regras do Plano Builder -->
            <div class="space-y-3 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm">
                <RiskRulesSection
                    bind:rules={() => formData.risk_rules ?? [], (v) => formData.risk_rules = v}
                    assetRiskProfiles={settingsStore.assetRiskProfiles}
                />
            </div>
        </Tabs.Content>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- TAB 4: MOTORES                                     -->
        <!-- ═══════════════════════════════════════════════════ -->
        <Tabs.Content value="motors" class="space-y-4 pt-2">
            {#if activeTab === "motors"}
                <div class="space-y-4">
                    <!-- Plano de Crescimento Vinculado -->
                <div class="space-y-5 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-emerald-500/10"><TrendingUp class="w-5 h-5 text-emerald-400" /></div>
                            <div class="space-y-1">
                                <h4 class="font-bold text-emerald-400 text-sm">
                                    Plano de Crescimento (Growth Plan)
                                </h4>
                                <p class="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold">
                                    Vincular perfil estruturado de avanço de lotes
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="pt-3 border-t border-emerald-500/10">
                        <div class="space-y-2.5">
                            <div class="flex items-center justify-between">
                                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Selecionar Plano Base
                                </Label>
                            </div>
                            
                            <Select.Root
                                type="single"
                                bind:value={selectedGrowthPlan}
                            >
                                <Select.Trigger class="w-full">
                                    {growthPlanOptions.find(o => o.value === selectedGrowthPlan)?.label ?? "Desconhecido"}
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

                <!-- Psychological Coupling -->
                <div class="space-y-5 p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-indigo-500/10"><Brain class="w-5 h-5 text-indigo-400" /></div>
                            <div class="space-y-1">
                                <h4 class="font-bold text-indigo-400 text-sm">
                                    {$t("settings.risk.engine.psychological.title")}
                                </h4>
                                <p class="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold">
                                    {$t(
                                        "settings.risk.engine.psychological.description",
                                        {
                                            values: {
                                                count: formData.psychological_lookback_count,
                                            },
                                        },
                                    )}
                                </p>
                            </div>
                        </div>
                        <Switch
                            bind:checked={formData.psychological_coupling_enabled}
                        />
                    </div>
                    {#if formData.psychological_coupling_enabled}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-indigo-500/10">
                            <div class="space-y-2.5">
                                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("settings.risk.engine.psychological.strategy")}
                                </Label>
                                <Select.Root
                                    type="single"
                                    bind:value={
                                        formData.psychological_search_strategy
                                    }
                                >
                                    <Select.Trigger class="h-8 text-xs">
                                        {formData.psychological_search_strategy ===
                                        "Strict"
                                            ? $t(
                                                  "settings.risk.engine.psychological.strategyStrict",
                                              )
                                            : $t(
                                                  "settings.risk.engine.psychological.strategySequence",
                                              )}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="Strict" class="text-xs"
                                            >{$t(
                                                "settings.risk.engine.psychological.strategyStrict",
                                            )}</Select.Item
                                        >
                                        <Select.Item
                                            value="Sequence"
                                            class="text-xs"
                                            >{$t(
                                                "settings.risk.engine.psychological.strategySequence",
                                            )}</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("settings.risk.engine.psychological.lookback")}
                                </Label>
                                <Input
                                    type="number"
                                    bind:value={
                                        formData.psychological_lookback_count
                                    }
                                    class="h-8 text-xs"
                                />
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("settings.risk.engine.psychological.threshold")}
                                </Label>
                                <Input
                                    type="number"
                                    bind:value={formData.psychological_threshold}
                                    class="h-8 text-xs"
                                />
                            </div>
                            <div class="space-y-2.5">
                                <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {$t("settings.risk.engine.psychological.multiplier")}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    bind:value={formData.lot_reduction_multiplier}
                                    class="h-8 text-xs"
                                />
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Outlier Regression -->
                <div class="space-y-5 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-amber-500/10"><AlertTriangle class="w-5 h-5 text-amber-500" /></div>
                            <div class="space-y-1">
                                <h4 class="font-bold text-amber-500 text-sm">
                                    {$t("settings.risk.engine.outlier.title")}
                                </h4>
                                <p class="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold">
                                    {$t("settings.risk.engine.outlier.description")}
                                </p>
                            </div>
                        </div>
                        <Switch
                            bind:checked={formData.outlier_regression_enabled}
                        />
                    </div>
                    {#if formData.outlier_regression_enabled}
                        <div class="pt-3 border-t border-amber-500/10 space-y-2.5">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {$t("settings.risk.engine.outlier.lookback")}
                            </Label>
                            <Input
                                type="number"
                                bind:value={formData.outlier_lookback_count}
                                class="h-8 text-xs w-24"
                            />
                        </div>
                    {/if}
                </div>

                <!-- Sniper Mode -->
                <div class="space-y-5 p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-blue-500/10"><Zap class="w-5 h-5 text-blue-400" /></div>
                            <div class="space-y-1">
                                <h4 class="font-bold text-blue-400 text-sm">
                                    {$t("settings.risk.engine.sniper.title")}
                                </h4>
                                <p class="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold">
                                    {$t("settings.risk.engine.sniper.description")}
                                </p>
                            </div>
                        </div>
                        <Switch bind:checked={formData.sniper_mode_enabled} />
                    </div>
                    {#if formData.sniper_mode_enabled}
                        <div class="space-y-2.5 pt-3 border-t border-blue-500/10 animate-in fade-in duration-300">
                            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {$t("settings.risk.engine.sniper.selectivity")}
                            </Label>
                            <div class="flex items-center gap-4">
                                <Input
                                    type="number"
                                    bind:value={formData.sniper_mode_selectivity}
                                    class="w-24 h-8 text-sm"
                                />
                                <p class="text-[10px] text-muted-foreground italic">
                                    {$t(
                                        "settings.risk.engine.sniper.selectivityTip",
                                    )}
                                </p>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
            {/if}
        </Tabs.Content>
    </Tabs.Root>

    <div class="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onclick={onCancel}
            >{$t("general.cancel")}</Button
        >
        <Button onclick={save}>{$t("general.save")}</Button>
    </div>
</div>
