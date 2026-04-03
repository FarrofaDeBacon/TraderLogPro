<script lang="ts">
  import { assetsStore } from "$lib/stores/assets.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { assetTypesStore } from "$lib/stores/asset-types.svelte";
  import { Plus, Pencil, Trash2, Search, Layers, FileText, X, Activity } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Select from "$lib/components/ui/select";
  import { appStore } from "$lib/stores/app.svelte";
  import type { RiskScopeProfile as AssetRiskProfile } from "$lib/types";
  import { t } from "svelte-i18n";
  import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
  import { toast } from "svelte-sonner";
  import { Switch } from "$lib/components/ui/switch";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Badge } from "$lib/components/ui/badge";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { cn, compareAssetTypeIds } from "$lib/utils";
  import GrowthPhasesEditor from "$lib/components/settings/GrowthPhasesEditor.svelte";

  let isDialogOpen = $state(false);
  let isCategoryAlertOpen = $state(false);
  let editingId = $state<string | null>(null);

  // Delete Modal State
  let isDeleteOpen = $state(false);
  let deleteId = $state<string | null>(null);

  let formData = $state<Omit<AssetRiskProfile, "id">>({
    name: "",
    asset_ids: [],
    asset_type_id: undefined,
    default_stop_points: 0,
    min_contracts: 1,
    max_contracts: 1,
    notes: "",
    growth_override_enabled: false,
    growth_phases_override: [],
    current_phase_index: 0,
  });

  let tempCategoryToChange = $state<string>("");
  let searchQuery = $state("");
  let selectedAssetId = $state<string | undefined>(undefined);

  // Filtered profiles for list
  let filteredProfiles = $derived(
    [...riskSettingsStore.assetRiskProfiles]
      .filter((p) => {
        const search = searchQuery.toLowerCase();
        const assetTypeName = assetTypesStore.getAssetTypeName(p.asset_type_id || "").toLowerCase();
        const hasMatchingAsset = (p.asset_ids || []).some(aid => 
          assetsStore.assets.find(a => a.id === aid)?.symbol.toLowerCase().includes(search)
        );
        return (
          p.name.toLowerCase().includes(search) ||
          assetTypeName.includes(search) ||
          hasMatchingAsset
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  // Filtered assets for selection Level 2
  let availableAssetsForCategory = $derived(
    formData.asset_type_id 
      ? assetsStore.assets.filter(a => compareAssetTypeIds(a.asset_type_id, formData.asset_type_id))
      : []
  );

  function openNew() {
    editingId = null;
    formData = {
      name: "",
      asset_ids: [],
      asset_type_id: undefined,
      default_stop_points: 0,
      min_contracts: 1,
      max_contracts: 1,
      notes: "",
      growth_override_enabled: false,
      growth_phases_override: [],
      current_phase_index: 0,
    };
    tempCategoryToChange = "";
    selectedAssetId = "";
    isDialogOpen = true;
  }

  function openEdit(item: AssetRiskProfile) {
    editingId = item.id || null;
    formData = { 
      ...item, 
      asset_ids: item.asset_ids || [],
      growth_override_enabled: item.growth_override_enabled ?? false,
      growth_phases_override: item.growth_phases_override ? [...item.growth_phases_override] : [],
      current_phase_index: item.current_phase_index ?? 0
    };
    selectedAssetId = "";
    isDialogOpen = true;
  }

  function handleCategoryChange(newId: string) {
    if (formData.asset_type_id && formData.asset_type_id !== newId && formData.asset_ids.length > 0) {
      tempCategoryToChange = newId;
      isCategoryAlertOpen = true;
    } else {
      formData.asset_type_id = newId;
      selectedAssetId = "";
    }
  }

  function confirmCategoryChange() {
    formData.asset_type_id = tempCategoryToChange;
    formData.asset_ids = [];
    selectedAssetId = "";
    isCategoryAlertOpen = false;
  }

  function addAsset() {
    if (!selectedAssetId) return;
    if (formData.asset_ids.includes(selectedAssetId)) {
      toast.warning("Ativo já está na lista deste escopo.");
      return;
    }

    const otherScope = riskSettingsStore.assetRiskProfiles.find(p => 
      p.id !== editingId && selectedAssetId && (p.asset_ids || []).includes(selectedAssetId)
    );

    if (otherScope) {
      toast.error(`Este ativo já pertence ao escopo "${otherScope.name}". Remova-o de lá primeiro.`);
      return;
    }

    formData.asset_ids.push(selectedAssetId);
    selectedAssetId = "";
  }

  function removeAsset(id: string) {
    formData.asset_ids = formData.asset_ids.filter(aid => aid !== id);
  }

  function confirmDelete(id: string) {
    deleteId = id;
    isDeleteOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    const res = await riskSettingsStore.deleteAssetRiskProfile(deleteId);
    if (res.success) {
      toast.success("Escopo de Risco removido com sucesso.");
    } else {
      toast.error(res.error || "Erro ao remover escopo.");
    }
  }

  function save() {
    if (!formData.name.trim()) {
      toast.error("Nome do escopo é obrigatório.");
      return;
    }
    if (!formData.asset_type_id) {
      toast.error("Selecione uma categoria de ativos.");
      return;
    }
    if (formData.asset_ids.length === 0) {
      toast.error("Adicione pelo menos um ativo ao escopo.");
      return;
    }

    if (editingId) {
      riskSettingsStore.updateAssetRiskProfile(editingId, formData);
    } else {
      riskSettingsStore.addAssetRiskProfile(formData);
    }

    isDialogOpen = false;
    toast.success("Escopo de Risco salvo com sucesso.");
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">Escopos de Risco</h2>
      <p class="text-muted-foreground">Gerencie grupos de ativos e suas regras de risco coletivas.</p>
    </div>
    <Button onclick={openNew} class="gap-2">
      <Plus class="w-4 h-4" /> Novo Escopo
    </Button>
  </div>

  <div class="flex items-center gap-2 max-w-sm">
    <div class="relative flex-1">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input type="search" placeholder="Buscar escopo ou ativo..." class="pl-8" bind:value={searchQuery} />
    </div>
  </div>

  <div class="grid gap-4">
    {#if filteredProfiles.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/20">
        <Layers class="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
        <p class="text-muted-foreground">Nenhum Escopo de Risco encontrado</p>
      </div>
    {:else}
      {#each filteredProfiles as profile}
        <div class="flex items-center justify-between p-4 border rounded-lg hover:border-border/80 transition-colors">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <p class="font-bold text-sm text-foreground flex items-center gap-2">
                {profile.name}
                <Badge variant="outline" class="text-[9px] h-4 py-0 font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                  {assetTypesStore.getAssetTypeName(profile.asset_type_id || "")}
                </Badge>
                {#if (profile.asset_ids?.length || 0) > 1}
                  <Badge variant="secondary" class="text-[9px] h-4 py-0 font-black">
                    +{(profile.asset_ids?.length || 0)} ATIVOS
                  </Badge>
                {/if}
              </p>
              <p class="text-xs text-muted-foreground flex gap-2 mt-0.5">
                <span class="flex items-center gap-1">
                  <Activity class="w-3 h-3 text-emerald-500/50" />
                  {(profile.asset_ids || []).map(aid => assetsStore.assets.find(a => a.id === aid)?.symbol).filter(Boolean).join(", ")}
                </span>
                <span class="text-muted-foreground/30">•</span>
                <span>Stop: {profile.default_stop_points}</span>
                <span class="text-muted-foreground/30">•</span>
                <span>Lotes: {profile.min_contracts}-{profile.max_contracts}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="ghost" size="icon" class="text-muted-foreground" onclick={() => openEdit(profile)}>
              <Pencil class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" class="text-destructive hover:bg-destructive/10" onclick={() => confirmDelete(profile.id!)}>
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<DeleteConfirmationModal
  bind:open={isDeleteOpen}
  onConfirm={handleDeleteConfirm}
  title="Excluir Escopo"
  description="Deseja realmente excluir este escopo de risco? Esta ação não pode ser desfeita."
/>

<Dialog.Root bind:open={isDialogOpen}>
  <Dialog.Content class="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{editingId ? "Editar Escopo de Risco" : "Novo Escopo de Risco"}</Dialog.Title>
      <Dialog.Description>Configure metas e limites para um grupo de ativos da mesma categoria.</Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-6 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Nome <span class="text-destructive">*</span></Label>
        <Input bind:value={formData.name} class="col-span-3" placeholder="Ex: Perfil Futuros, Cripto Swing" />
      </div>

      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Categoria <span class="text-destructive">*</span></Label>
        <div class="col-span-3">
          <Select.Root type="single" value={formData.asset_type_id || ""} onValueChange={handleCategoryChange}>
            <Select.Trigger class="w-full">
              {assetTypesStore.getAssetTypeName(formData.asset_type_id || "") || "Selecione a categoria"}
            </Select.Trigger>
            <Select.Content>
              {#each assetTypesStore.assetTypes as type}
                <Select.Item value={type.id}>{type.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div class={cn("grid grid-cols-4 items-start gap-4 p-4 rounded-xl border border-dashed transition-all", 
        !formData.asset_type_id ? "opacity-50 grayscale pointer-events-none" : "bg-muted/30 border-primary/20")}>
        <Label class="text-right mt-2 text-xs uppercase font-black text-muted-foreground">Ativos</Label>
        <div class="col-span-3 space-y-4">
          <div class="flex gap-2">
            <Select.Root type="single" value={selectedAssetId} onValueChange={(v) => selectedAssetId = v}>
              <Select.Trigger class="flex-1">
                {assetsStore.assets.find(a => a.id === selectedAssetId)?.symbol || "Selecionar ativo..."}
              </Select.Trigger>
              <Select.Content>
                {#each availableAssetsForCategory as asset}
                  {@const otherScope = riskSettingsStore.assetRiskProfiles.find(p => p.id !== editingId && (p.asset_ids || []).includes(asset.id))}
                  <Select.Item value={asset.id} disabled={!!otherScope}>
                    <div class="flex flex-col">
                      <span class={cn(otherScope && "text-muted-foreground line-through")}>{asset.symbol} - {asset.name}</span>
                      {#if otherScope}
                        <span class="text-[9px] text-rose-500 font-bold uppercase tracking-tighter">Em uso: {otherScope.name}</span>
                      {/if}
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Button variant="secondary" size="sm" onclick={addAsset} disabled={!selectedAssetId}>
              <Plus class="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div class="flex flex-wrap gap-2">
            {#if formData.asset_ids.length === 0}
              <p class="text-[10px] text-muted-foreground uppercase font-medium italic">Nenhum ativo adicionado ao grupo</p>
            {:else}
              {#each (formData.asset_ids || []) as aid}
                {@const asset = assetsStore.assets.find(a => a.id === aid)}
                <Badge variant="secondary" class="gap-1 pr-1 pl-2 py-1 bg-background border-primary/10">
                  {asset?.symbol}
                  <button onclick={() => removeAsset(aid)} class="hover:bg-destructive/10 rounded-full p-0.5 text-muted-foreground hover:text-destructive">
                    <X class="w-3 h-3" />
                  </button>
                </Badge>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Stop Padrão</Label>
        <Input type="number" step="0.01" min="0" bind:value={formData.default_stop_points} class="col-span-3" />
      </div>

      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Lotes Mín/Máx</Label>
        <div class="col-span-3 flex gap-2">
          <Input type="number" step="1" min="1" bind:value={formData.min_contracts} placeholder="Mín" />
          <Input type="number" step="1" min="1" bind:value={formData.max_contracts} placeholder="Máx" />
        </div>
      </div>

      <div class="grid grid-cols-4 items-start gap-4">
        <Label class="text-right mt-3">Notas</Label>
        <Textarea bind:value={formData.notes} class="col-span-3" placeholder="Observações opcionais" rows={2} />
      </div>

      <div class="border-t pt-4">
        <button type="button" class="w-full text-left flex items-center justify-between p-3 rounded-lg border border-border/10 bg-amber-500/5 shadow-sm cursor-pointer" onclick={() => formData.growth_override_enabled = !formData.growth_override_enabled}>
          <div class="space-y-0.5">
            <h4 class="font-bold text-sm text-amber-500">Sobrescrita de Crescimento</h4>
            <p class="text-[10px] text-muted-foreground/80 font-medium">Define regras de crescimento ignorando o plano global.</p>
          </div>
          <Switch bind:checked={formData.growth_override_enabled} />
        </button>
        {#if formData.growth_override_enabled}
          <GrowthPhasesEditor bind:phases={formData.growth_phases_override} simpleMode={true} />
        {/if}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => isDialogOpen = false}>Cancelar</Button>
      <Button onclick={save}>Salvar Escopo</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={isCategoryAlertOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Mudar Categoria do Escopo?</AlertDialog.Title>
      <AlertDialog.Description>
        Alterar a categoria removerá os ativos atuais deste grupo, pois eles podem não pertencer à nova categoria. Deseja continuar?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => isCategoryAlertOpen = false}>Voltar</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmCategoryChange} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Troca</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
