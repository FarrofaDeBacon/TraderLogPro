<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { Plus, Pencil, Trash2, ShieldAlert, Copy } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
import type { RiskProfile } from "$lib/types";
    import RiskForm from "$lib/components/settings/RiskForm.svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";
    import { accountsStore } from "$lib/stores/accounts.svelte";

    import RiskProfileDetails from "$lib/components/settings/RiskProfileDetails.svelte";

    let isDialogOpen = $state(false);
    let editingItem = $state<RiskProfile | undefined>(undefined);

    // Details Modal State
    let isDetailsOpen = $state(false);
    let viewingItem = $state<RiskProfile | undefined>(undefined);

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    function openNew() {
        editingItem = undefined;
        isDialogOpen = true;
    }

    function openEdit(item: RiskProfile) {
        editingItem = item;
        isDialogOpen = true;
    }

    function openDetails(item: RiskProfile) {
        viewingItem = item;
        isDetailsOpen = true;
    }

    function save(data: Omit<RiskProfile, "id">) {
        if (editingItem) {
            riskSettingsStore.updateRiskProfile(editingItem.id, data);
        } else {
            riskSettingsStore.addRiskProfile(data);
        }
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await riskSettingsStore.deleteRiskProfile(deleteId);
            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }

    function getEffectiveLimits(profile: RiskProfile) {
        let dailyLoss = profile.max_daily_loss;
        let dailyTarget = profile.daily_target;
        let targetUnit = '$';
        let lossUnit = '$';

        // 1. Prioridade: Plano de Crescimento Ativo
        if (profile.growth_plan_id && profile.growth_plan_id !== 'none') {
            const plan = riskSettingsStore.growthPlans.find(p => p.id === profile.growth_plan_id);
            if (plan && plan.enabled) {
                const phase = plan.phases[plan.current_phase_index];
                if (phase) {
                    const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');

                    const targetCond = phase.conditions_to_advance?.find(c => {
                        const m = normalize(c.metric);
                        return ['profit', 'netpnl', 'profittarget', 'metadelucro', 'meta', 'pnl'].includes(m);
                    });
                    if (targetCond) {
                        dailyTarget = targetCond.value;
                        targetUnit = plan.target_unit === 'points' ? 'pts' : '$';
                    }

                    const lossCond = phase.conditions_to_demote?.find(c => {
                        const m = normalize(c.metric);
                        return ['dailyloss', 'maxdailyloss', 'perdadiaria', 'lossdiario', 'drawdown'].includes(m);
                    });
                    if (lossCond) {
                        dailyLoss = lossCond.value;
                        lossUnit = plan.drawdown_unit === 'points' ? 'pts' : '$';
                    }
                }
                return { dailyLoss, dailyTarget, targetUnit, lossUnit };
            }
        }

        // 2. Fallback: Regras Avançadas
        if (profile.use_advanced_rules && profile.risk_rules) {
            const lossRule = profile.risk_rules.find(r => r.enabled && r.target_type === 'max_daily_loss');
            if (lossRule) dailyLoss = Number(lossRule.value);
            
            const targetRule = profile.risk_rules.find(r => r.enabled && r.target_type === 'profit_target');
            if (targetRule) dailyTarget = Number(targetRule.value);
        }
        
        return { dailyLoss, dailyTarget, targetUnit, lossUnit };
    }

    function getRiskValue(p: RiskProfile) {
        let capital = 0;
        if (p.capital_source === "Fixed") {
            capital = p.fixed_capital;
        } else if (p.capital_source === "LinkedAccount" && p.linked_account_id) {
            const acc = accountsStore.accounts.find((a) => a.id === p.linked_account_id);
            if (acc) capital = acc.balance;
        }

        return (capital * p.max_risk_per_trade_percent) / 100;
    }

    function getPlanInfo(p: RiskProfile) {
        if (!p.growth_plan_id) return null;
        const plan = riskSettingsStore.growthPlans.find(gp => gp.id === p.growth_plan_id);
        if (!plan || !plan.enabled) return null;
        
        return {
            name: plan.name,
            current: Math.min(plan.current_phase_index + 1, plan.phases.length),
            total: plan.phases.length
        };
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div class="space-y-0.5">
            <h3 class="text-lg font-medium">
                {$t("risk.title")}
            </h3>
            <p class="text-sm text-muted-foreground">
                {$t("risk.description")}
            </p>
        </div>
        <Button onclick={openNew}>
            <Plus class="w-4 h-4 mr-2" />
            {$t("risk.new")}
        </Button>
    </div>
    <Separator />

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each riskSettingsStore.riskProfiles as profile}
            <Card.Root
                class="border-l-4 {profile.active
                    ? 'border-l-green-500 shadow-lg'
                    : 'border-l-primary'} hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
                onclick={() => openDetails(profile)}
                role="button"
                tabindex={0}
                onkeydown={(e) => e.key === "Enter" && openDetails(profile)}
            >
                <Card.Header class="pb-2">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-2">
                            <div class="p-2 bg-primary/10 rounded-lg">
                                <ShieldAlert class="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <Card.Title class="text-base"
                                        >{profile.name}</Card.Title
                                    >
                                    {#if profile.active}
                                        <Badge
                                            class="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50 text-[10px] py-0 h-4"
                                        >
                                            {$t(
                                                "risk.profiles.active",
                                            )}
                                        </Badge>
                                    {/if}
                                </div>
                                <Card.Description>
                                    {#if profile.account_type_applicability === "All"}
                                        {$t("risk.accountTypes.All")}
                                    {:else}
                                        {$t(
                                            `risk.accountTypes.${profile.account_type_applicability}`,
                                        )}
                                    {/if}
                                </Card.Description>
                            </div>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="text-sm space-y-2 pb-2">
                    {@const limits = getEffectiveLimits(profile)}
                    {@const riskVal = getRiskValue(profile)}
                    {@const planInfo = getPlanInfo(profile)}

                    <div class="flex justify-between items-center text-red-400">
                        <span>{$t("risk.profiles.dailyLoss")}:</span>
                        <span class="font-bold">
                            {limits.lossUnit === '$' ? 'R$ ' : ''}{limits.dailyLoss.toLocaleString('pt-BR', { minimumFractionDigits: limits.lossUnit === '$' ? 2 : 0 })}{limits.lossUnit === 'pts' ? ' pts' : ''}
                        </span>
                    </div>
                    <div class="flex justify-between items-center text-green-400">
                        <span>{$t("risk.profiles.dailyTarget")}:</span>
                        <span class="font-bold">
                            {limits.targetUnit === '$' ? 'R$ ' : ''}{limits.dailyTarget.toLocaleString('pt-BR', { minimumFractionDigits: limits.targetUnit === '$' ? 2 : 0 })}{limits.targetUnit === 'pts' ? ' pts' : ''}
                        </span>
                    </div>
                    
                    <Separator class="my-2" />
                    
                    <div class="space-y-1.5">
                        <div class="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{$t("risk.management.capitalSource")}:</span>
                            <span class="text-foreground">
                                {profile.capital_source === 'Fixed' ? $t("risk.plan.finance.fixedValue") : $t("risk.plan.finance.money")} (R$ {profile.capital_source === 'Fixed' ? profile.fixed_capital : (accountsStore.accounts.find(a => a.id === profile.linked_account_id)?.balance || 0)})
                            </span>
                        </div>
                        <div class="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{$t("risk.plan.labels.maxRiskPerTrade")}:</span>
                            <span class="font-medium text-foreground">
                                {profile.max_risk_per_trade_percent}% <span class="text-[10px] opacity-70">(R$ {riskVal.toFixed(2)})</span>
                            </span>
                        </div>
                    </div>

                    {#if planInfo}
                        <div class="mt-3 p-2 rounded bg-primary/5 border border-primary/10">
                            <div class="flex justify-between items-center text-[10px] mb-1">
                                <span class="uppercase font-bold text-primary">{$t("risk.management.activePlan")}</span>
                                <span class="text-muted-foreground">{$t("risk.management.phase")} {planInfo.current}/{planInfo.total}</span>
                            </div>
                            <div class="text-[11px] font-medium truncate">{planInfo.name}</div>
                            <div class="mt-1.5 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                                <div class="h-full bg-primary" style="width: {(planInfo.current / planInfo.total) * 100}%"></div>
                            </div>
                        </div>
                    {/if}

                    <div class="flex justify-between items-center text-muted-foreground text-[10px] pt-2">
                        <span>{$t("risk.management.maxTrades")}: {profile.max_trades_per_day}</span>
                        <span>{$t("risk.management.lockOnLoss")}: {profile.lock_on_loss ? $t("general.yes") : $t("general.no")}</span>
                    </div>
                </Card.Content>
                <Card.Footer class="justify-between items-center pt-2">
                    <div>
                        {#if !profile.active || riskSettingsStore.riskProfiles.filter(p => p.active).length > 1}
                            <Button
                                variant={riskSettingsStore.riskProfiles.filter(p => p.active).length > 1 ? "destructive" : "outline"}
                                size="sm"
                                class="h-8 text-xs px-3"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    riskSettingsStore.setActiveRiskProfile(
                                        profile.id,
                                    );
                                }}
                            >
                                {riskSettingsStore.riskProfiles.filter(p => p.active).length > 1 ? "Resolver Conflito (Ativar)" : $t("risk.profiles.activate")}
                            </Button>
                        {/if}
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 hover:bg-muted text-muted-foreground"
                            title={$t("risk.management.duplicate")}
                            onclick={async (e) => {
                                e.stopPropagation();
                                const newId = await riskSettingsStore.duplicateRiskProfile(profile.id);
                                if (newId) toast.success($t("risk.messages.saveSuccess"));
                            }}
                        >
                            <Copy class="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 hover:bg-muted"
                            title={$t("risk.edit")}
                            onclick={(e) => {
                                e.stopPropagation();
                                openEdit(profile);
                            }}
                        >
                            <Pencil class="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={$t("general.delete")}
                            onclick={(e) => {
                                e.stopPropagation();
                                requestDelete(profile.id);
                            }}
                        >
                            <Trash2 class="w-4 h-4" />
                        </Button>
                    </div></Card.Footer
                >
            </Card.Root>
        {/each}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<!-- Edit/New Modal -->
<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto no-scrollbar p-0 bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl">
        <Dialog.Header class="pl-[155px]">
            <Dialog.Title>
                {editingItem
                    ? $t("risk.edit")
                    : $t("risk.new")}
            </Dialog.Title>
        </Dialog.Header>

        <RiskForm
            initialData={editingItem}
            onSave={save}
            onCancel={() => (isDialogOpen = false)}
        />
    </Dialog.Content>
</Dialog.Root>

<!-- Details Modal -->
<Dialog.Root bind:open={isDetailsOpen}>
    <Dialog.Content class="max-w-xl w-[95vw] max-h-[95vh] flex flex-col p-4 bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl">
        {#if viewingItem}
            <div class="flex-1 overflow-y-auto no-scrollbar pr-1">
                <RiskProfileDetails profile={viewingItem} />
            </div>
            
            <div class="flex justify-end gap-2 pt-3 border-t border-white/5 mt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5"
                    onclick={() => (isDetailsOpen = false)}
                >
                    {$t("general.back")}
                </Button>
                <Button
                    size="sm"
                    class="h-8 text-[10px] font-black uppercase tracking-widest px-4"
                    onclick={() => {
                        openEdit(viewingItem!);
                        isDetailsOpen = false;
                    }}
                >
                    <Pencil class="w-3 h-3 mr-2" />
                    {$t("risk.edit")}
                </Button>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
