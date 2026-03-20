<script lang="ts">
    import { Plus, Pencil, Trash2, TrendingUp, Copy } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Separator } from "$lib/components/ui/separator";
    import { settingsStore } from "$lib/stores/settings.svelte";
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
            settingsStore.updateGrowthPlan(editingItem.id, data);
        } else {
            settingsStore.addGrowthPlan(data);
        }
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await settingsStore.deleteGrowthPlan(deleteId);
            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
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

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each settingsStore.growthPlans as plan}
            <Card.Root
                class="border-l-4 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md border-l-primary"
                onclick={() => openEdit(plan)}
                role="button"
                tabindex={0}
                onkeydown={(e) => e.key === "Enter" && openEdit(plan)}
            >
                <Card.Header class="pb-2">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-2">
                            <div class="p-2 bg-primary/10 rounded-lg">
                                <TrendingUp class="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <Card.Title class="text-base">{plan.name}</Card.Title>
                                    {#if !plan.enabled}
                                        <Badge class="bg-muted text-muted-foreground text-[10px] py-0 h-4">
                                            Inativo
                                        </Badge>
                                    {/if}
                                </div>
                                <Card.Description>
                                    {plan.phases.length} Fases
                                </Card.Description>
                            </div>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="text-sm space-y-2 pb-2">
                    <div class="flex justify-between items-center text-muted-foreground text-xs">
                        <span>Lotes Fase Inicial: {plan.phases[0]?.lot_size || 0}</span>
                        <span>Lotes Fase Alta: {plan.phases[plan.phases.length - 1]?.lot_size || 0}</span>
                    </div>
                </Card.Content>
                <Card.Footer class="justify-end items-center pt-2">
                    <div class="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 hover:bg-muted"
                            title={$t("settings.risk.edit")}
                            onclick={(e) => {
                                e.stopPropagation();
                                openEdit(plan);
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
                                requestDelete(plan.id);
                            }}
                        >
                            <Trash2 class="w-4 h-4" />
                        </Button>
                    </div>
                </Card.Footer>
            </Card.Root>
        {/each}
        {#if settingsStore.growthPlans.length === 0}
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
    <Dialog.Content class="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
