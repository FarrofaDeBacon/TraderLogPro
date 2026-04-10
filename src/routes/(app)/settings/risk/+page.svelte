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
    <div class="flex items-center justify-between gap-6 mb-8">
        <div class="flex flex-col">
            <span class="text-[10px] text-primary/60 font-black uppercase tracking-[0.3em] mb-1">{$t("risk.description").toUpperCase()}</span>
            <h1 class="text-4xl font-black uppercase tracking-tighter text-white">
                {$t("risk.title")}
            </h1>
        </div>
        <div class="flex items-center gap-3">
            <Button onclick={openNew} class="rounded-full px-6 bg-indigo-500 hover:bg-indigo-400 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-500/10 transition-all active:scale-95">
                <Plus class="w-4 h-4 mr-2" />
                {$t("risk.new")}
            </Button>
        </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {#each riskSettingsStore.riskProfiles as profile}
            <div
                class="group relative bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 transition-all duration-300 hover:border-indigo-500/30 hover:bg-[#0c0c0e]/90 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-pointer ring-1 ring-white/5 overflow-hidden"
                onclick={() => openDetails(profile)}
                role="button"
                tabindex={0}
                onkeydown={(e) => e.key === "Enter" && openDetails(profile)}
            >
                <!-- Selection State Indicator -->
                <div class="absolute inset-x-0 top-0 h-1 transition-all duration-500 {profile.active ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-white/10'}"></div>
                
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-transform group-hover:rotate-3">
                            <ShieldAlert class="w-6 h-6 {profile.active ? 'text-emerald-400' : 'text-muted-foreground/40'}" />
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="text-lg font-black uppercase tracking-tight text-white/90 group-hover:text-white transition-colors">{profile.name}</h4>
                                {#if profile.active}
                                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                {/if}
                            </div>
                            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                                {#if profile.account_type_applicability === "All"}
                                    {$t("risk.accountTypes.All")}
                                {:else}
                                    {$t(`risk.accountTypes.${profile.account_type_applicability}`)}
                                {/if}
                            </span>
                        </div>
                    </div>

                    {#if profile.active}
                        <Badge class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                            {$t("risk.profiles.active")}
                        </Badge>
                    {/if}
                </div>

                <div class="space-y-4 mb-6">
                    {@const limits = getEffectiveLimits(profile)}
                    {@const riskVal = getRiskValue(profile)}
                    {@const planInfo = getPlanInfo(profile)}

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <p class="text-[8px] font-black text-rose-500/60 uppercase tracking-widest leading-none">{$t("risk.profiles.dailyLoss")}</p>
                            <p class="text-lg font-black font-mono text-rose-500 tracking-tighter">
                                {limits.lossUnit === '$' ? 'R$ ' : ''}{limits.dailyLoss.toLocaleString('pt-BR', { minimumFractionDigits: limits.lossUnit === '$' ? 2 : 0 })}{limits.lossUnit === 'pts' ? ' pts' : ''}
                            </p>
                        </div>
                        <div class="space-y-1 text-right">
                            <p class="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest leading-none">{$t("risk.profiles.dailyTarget")}</p>
                            <p class="text-lg font-black font-mono text-emerald-500 tracking-tighter">
                                {limits.targetUnit === '$' ? 'R$ ' : ''}{limits.dailyTarget.toLocaleString('pt-BR', { minimumFractionDigits: limits.targetUnit === '$' ? 2 : 0 })}{limits.targetUnit === 'pts' ? ' pts' : ''}
                            </p>
                        </div>
                    </div>

                    <div class="h-px bg-white/5 w-full"></div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex flex-col">
                            <span class="text-[7px] font-black uppercase text-muted-foreground/30 tracking-widest mb-1">{$t("risk.management.capitalSource")}</span>
                            <span class="text-[10px] font-bold text-white/50 truncate">
                                {profile.capital_source === 'Fixed' ? $t("risk.plan.finance.fixedValue") : $t("risk.plan.finance.money")} (R$ {profile.capital_source === 'Fixed' ? profile.fixed_capital : (accountsStore.accounts.find(a => a.id === profile.linked_account_id)?.balance || 0)})
                            </span>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[7px] font-black uppercase text-muted-foreground/30 tracking-widest mb-1">{$t("risk.plan.labels.maxRiskPerTrade")}</span>
                            <span class="text-[10px] font-bold text-white/50">
                                {profile.max_risk_per_trade_percent}% <span class="opacity-40">(R$ {riskVal.toFixed(2)})</span>
                            </span>
                        </div>
                    </div>

                    {#if planInfo}
                        <div class="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
                            <div class="absolute right-0 top-0 opacity-10 rotate-12 -mr-2 -mt-2">
                                <TrendingUp class="w-12 h-12 text-indigo-400" />
                            </div>
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-[8px] font-black uppercase text-indigo-400 tracking-widest leading-none">{$t("risk.management.activePlan")}</span>
                                <span class="text-[9px] font-black text-indigo-300">PHASE {planInfo.current}/{planInfo.total}</span>
                            </div>
                            <div class="text-[10px] font-black uppercase tracking-tight text-white/80 mb-2 truncate">{planInfo.name}</div>
                            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-500 rounded-full" style="width: {(planInfo.current / planInfo.total) * 100}% transition: width 1s"></div>
                            </div>
                        </div>
                    {/if}
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-white/5">
                    <div class="flex gap-4">
                        <div class="flex flex-col">
                            <span class="text-[7px] font-black text-muted-foreground/40 uppercase mb-0.5">ORDENS DIÁRIAS</span>
                            <span class="text-[10px] font-bold text-white/70">{profile.max_trades_per_day}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[7px] font-black text-muted-foreground/40 uppercase mb-0.5">TRAVA LOSS</span>
                            <span class="text-[10px] font-bold {profile.lock_on_loss ? 'text-emerald-400' : 'text-rose-400/60'} uppercase">{profile.lock_on_loss ? $t("general.yes") : $t("general.no")}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1">
                        {#if !profile.active || riskSettingsStore.riskProfiles.filter(p => p.active).length > 1}
                            <Button
                                variant="ghost"
                                size="sm"
                                class="h-8 rounded-full px-4 text-[9px] font-black uppercase tracking-widest {riskSettingsStore.riskProfiles.filter(p => p.active).length > 1 ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    riskSettingsStore.setActiveRiskProfile(profile.id);
                                }}
                            >
                                {riskSettingsStore.riskProfiles.filter(p => p.active).length > 1 ? "Fix Conflict" : $t("risk.profiles.activate")}
                            </Button>
                        {/if}
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 rounded-full text-muted-foreground hover:bg-white/5 hover:text-white transition-all"
                            onclick={(e) => { e.stopPropagation(); riskSettingsStore.duplicateRiskProfile(profile.id); toast.success($t("risk.messages.saveSuccess")); }}
                        >
                            <Copy class="w-3.5 h-3.5" />
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 rounded-full text-muted-foreground hover:bg-white/5 hover:text-indigo-400 transition-all"
                            onclick={(e) => { e.stopPropagation(); openEdit(profile); }}
                        >
                            <Pencil class="w-3.5 h-3.5" />
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 rounded-full text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                            onclick={(e) => { e.stopPropagation(); requestDelete(profile.id); }}
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
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
