<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { Plus, Pencil, Trash2, TrendingUp, Copy } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
    import type { GrowthPlan } from "$lib/types";
    import GrowthPlanForm from "$lib/components/settings/growth/GrowthPlanForm.svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";

    let isDialogOpen = $state(false);
    let editingItem = $state<GrowthPlan | undefined>(undefined);

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    function openNew() {
        editingItem = undefined;
        isDialogOpen = true;
    }

    function openEdit(item: GrowthPlan) {
        editingItem = item;
        isDialogOpen = true;
    }

    function save(data: Omit<GrowthPlan, "id">) {
        if (editingItem) {
            riskSettingsStore.updateGrowthPlan(editingItem.id, data);
        } else {
            riskSettingsStore.addGrowthPlan(data);
        }
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await riskSettingsStore.deleteGrowthPlan(deleteId);
            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }
    function getConditionValue(conditions: any[], metric: string): string | null {
        const cond = conditions.find(c => c.metric === metric);
        if (!cond) return null;
        
        const value = Number(cond.value);
        if (metric === "win_rate") return `${value}%`;
        if (metric === "profit_target" || metric === "drawdown_limit" || metric === "daily_loss_limit") return `${value.toLocaleString()}`;
        return value.toString();
    }
    
    function getMetricLabel(metric: string): string {
        const labels: Record<string, string> = {
            profit_target: "Meta",
            days_positive: "Dias O.K",
            win_rate: "Win Rate",
            consistency_days: "Consistência",
            drawdown_limit: "Drawdown",
            daily_loss_limit: "Perda Diária",
            max_daily_loss_streak: "D. Loss Seguidos"
        };
        return labels[metric] || metric;
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div class="space-y-0.5">
            <h3 class="text-lg font-medium">
                {$t("settings.nav.growthPlans") || "Planos de Crescimento"}
            </h3>
            <p class="text-sm text-muted-foreground">
                Crie planos com progressão e regressão automática de fases.
            </p>
        </div>
        <Button onclick={openNew}>
            <Plus class="w-4 h-4 mr-2" />
            {$t("general.add")}
        </Button>
    </div>
    
    <Separator />

    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {#each riskSettingsStore.growthPlans as plan}
            <div
                class="group relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-br from-card/40 to-muted/10 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer flex flex-col min-h-[220px]"
                onclick={() => openEdit(plan)}
                role="button"
                tabindex={0}
                onkeydown={(e) => e.key === "Enter" && openEdit(plan)}
            >
                <!-- Glowing Accent -->
                <div class="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-[40px] rounded-full group-hover:bg-primary/20 transition-all"></div>
                
                <div class="p-5 flex-1 space-y-5">
                    <!-- Header -->
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                                <TrendingUp class="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 class="text-base font-bold tracking-tight text-foreground/90">{plan.name}</h4>
                                <p class="text-[10px] uppercase font-bold tracking-[0.1em] text-muted-foreground/40">
                                    {plan.phases.length} Estágios de Evolução
                                </p>
                            </div>
                        </div>
                        
                        <div class="flex flex-col items-end gap-1.5">
                            {#if !plan.enabled}
                                <Badge variant="outline" class="h-5 border-white/10 text-[10px] bg-black/20 text-muted-foreground/60 backdrop-blur-md">
                                    Inativo
                                </Badge>
                            {/if}
                            <div class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full {plan.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted-foreground/30'}"></span>
                                <span class="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/50">
                                    {plan.enabled ? 'Auto Engine' : 'Manual Switch'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Lot Scale -->
                    <div class="relative py-3 px-4 rounded-2xl bg-black/20 border border-white/5 overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
                        <div class="relative flex justify-between items-center">
                            <div class="space-y-1">
                                <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 block">Start</span>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-xl font-black text-foreground tabular-nums leading-none">{plan.phases[0]?.lot_size || 0}</span>
                                    <span class="text-[10px] font-bold text-muted-foreground/40">ctts</span>
                                </div>
                            </div>
                            
                            <div class="h-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-4"></div>
                            
                            <div class="space-y-1 text-right">
                                <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 block">Target</span>
                                <div class="flex items-baseline gap-1 justify-end">
                                    <span class="text-xl font-black text-emerald-500 tabular-nums leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">{plan.phases[plan.phases.length - 1]?.lot_size || 0}</span>
                                    <span class="text-[10px] font-bold text-muted-foreground/40">ctts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Metrics Grid -->
                    {#if plan.phases[0]}
                        <div class="grid grid-cols-1 gap-4">
                            <!-- Advance Section -->
                            <div class="space-y-2">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[8px] font-black uppercase tracking-tighter text-emerald-500/40">Fase 1 - Requisitos</span>
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    {#each plan.phases[0].conditions_to_advance as cond}
                                        <div class="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/10 bg-emerald-500/5 transition-colors group-hover:border-emerald-500/30">
                                            <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
                                            <span class="text-[10px] font-bold text-emerald-500/80 tracking-tight">
                                                {getMetricLabel(cond.metric)}: <span class="text-emerald-500">{getConditionValue(plan.phases[0].conditions_to_advance, cond.metric)}</span>
                                            </span>
                                        </div>
                                    {/each}
                                    {#if plan.phases[0].conditions_to_advance.length === 0}
                                        <div class="text-[9px] font-bold text-muted-foreground/30 uppercase italic tracking-widest">
                                            Aprovação Manual Requerida
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Regress Section -->
                            {#if plan.phases[0].conditions_to_demote.length > 0}
                                <div class="flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    {#each plan.phases[0].conditions_to_demote as cond}
                                        <div class="flex items-center gap-1.5 px-2 py-1 rounded-md border border-rose-500/10 bg-rose-500/5 transition-colors group-hover:border-rose-500/30">
                                            <div class="w-1 h-1 rounded-full bg-rose-500"></div>
                                            <span class="text-[10px] font-bold text-rose-500/80 tracking-tight">
                                                {getMetricLabel(cond.metric)}: <span class="text-rose-500">{getConditionValue(plan.phases[0].conditions_to_demote, cond.metric)}</span>
                                            </span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Footer Actions -->
                <div class="px-5 py-4 flex justify-end gap-3 border-t border-white/5 bg-white/[0.02]">
                    <button
                        class="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/5 transition-colors"
                        onclick={(e) => { e.stopPropagation(); openEdit(plan); }}
                        title="Configurar Plano"
                    >
                        <Pencil class="w-4 h-4" />
                    </button>
                    <button
                        class="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onclick={(e) => { e.stopPropagation(); requestDelete(plan.id); }}
                        title="Excluir Permanente"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            </div>
        {/each}
        {#if riskSettingsStore.growthPlans.length === 0}
            <div class="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border/50 bg-black/5">
                <TrendingUp class="mx-auto w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 class="text-sm font-semibold text-muted-foreground mb-1">Nenhum plano configurado</h3>
                <p class="text-xs text-muted-foreground/80 mb-4 max-w-sm mx-auto">
                    Transfira suas antigas configurações de progressão criando um novo modelo.
                </p>
                <Button variant="outline" size="sm" onclick={openNew}>
                    Criar Plano
                </Button>
            </div>
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<!-- Edit/New Modal -->
<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <Dialog.Header>
            <Dialog.Title>
                {editingItem ? "Editar Plano de Crescimento" : "Novo Plano de Crescimento"}
            </Dialog.Title>
        </Dialog.Header>

        <GrowthPlanForm
            initialData={editingItem}
            onSave={save}
            onCancel={() => (isDialogOpen = false)}
        />
    </Dialog.Content>
</Dialog.Root>
