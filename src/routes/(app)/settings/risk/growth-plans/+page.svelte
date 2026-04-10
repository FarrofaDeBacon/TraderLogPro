<script lang="ts">
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { Plus, Trophy, Trash2, ArrowRight } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";
  import { t } from "svelte-i18n";
  import { toast } from "svelte-sonner";
  import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";

  let isDeleteOpen = $state(false);
  let deleteId = $state<string | null>(null);

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
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="space-y-0.5">
      <h3 class="text-lg font-medium">{$t("risk.growthPlans.title") || "Planos de Crescimento"}</h3>
      <p class="text-sm text-muted-foreground">
        {$t("risk.growthPlans.description") || "Gerencie seus planos de evolução de lote e metas automáticas."}
      </p>
    </div>
    <Button variant="outline" class="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10">
      <Plus class="w-4 h-4 mr-2" />
      {$t("risk.growthPlans.new") || "Novo Plano"}
    </Button>
  </div>
  
  <Separator />

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each riskSettingsStore.growthPlans as plan}
      <Card.Root class="bg-background/40 backdrop-blur-md border-white/5 hover:border-indigo-500/30 transition-all group">
        <Card.Header class="pb-2">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-500/10 rounded-lg">
                <Trophy class="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <Card.Title class="text-base">{plan.name}</Card.Title>
                <Card.Description class="text-[10px] uppercase font-bold tracking-widest opacity-60">
                    {plan.phases.length} {$t("risk.management.phases") || "Fases"}
                </Card.Description>
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Content class="pb-2">
            <div class="space-y-3">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-muted-foreground">Fase Atual:</span>
                    <Badge variant="outline" class="bg-indigo-500/5 border-indigo-500/20 text-indigo-400">
                        {plan.current_phase_index + 1} / {plan.phases.length}
                    </Badge>
                </div>
                
                <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-indigo-500 transition-all duration-500" 
                        style="width: {((plan.current_phase_index + 1) / plan.phases.length) * 100}%"
                    ></div>
                </div>

                <div class="flex items-center gap-2 text-[10px] text-muted-foreground bg-white/5 p-2 rounded border border-white/5">
                    <span class="font-bold text-indigo-400 uppercase tracking-tighter">PRÓXIMA:</span>
                    <span class="truncate">{plan.phases[plan.current_phase_index + 1]?.name || "Modo Manutenção"}</span>
                </div>
            </div>
        </Card.Content>
        <Card.Footer class="justify-between pt-2 border-t border-white/5">
            <Button variant="ghost" size="sm" class="h-8 text-[10px] font-bold uppercase hover:bg-white/5">
                Editar
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onclick={() => requestDelete(plan.id)}
            >
                <Trash2 class="w-4 h-4" />
            </Button>
        </Card.Footer>
      </Card.Root>
    {/each}

    {#if riskSettingsStore.growthPlans.length === 0}
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-40 border-2 border-dashed border-white/5 rounded-2xl">
            <Trophy class="w-12 h-12 mb-4" />
            <p class="text-sm font-medium">Nenhum plano de crescimento encontrado.</p>
            <p class="text-xs">Crie seu primeiro plano para automatizar sua evolução.</p>
        </div>
    {/if}
  </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />
