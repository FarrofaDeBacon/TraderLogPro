<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Card from "$lib/components/ui/card";
    import GrowthPhasesEditor from "$lib/components/settings/GrowthPhasesEditor.svelte";
    import type { GrowthPlan } from "$lib/types";
    import { t } from "svelte-i18n";

    let {
        initialData,
        onSave,
        onCancel,
    } = $props<{
        initialData?: GrowthPlan;
        onSave: (data: Omit<GrowthPlan, "id">) => void;
        onCancel: () => void;
    }>();

    let formData = $state<Omit<GrowthPlan, "id">>({
        name: "",
        enabled: true,
        current_phase_index: 0,
        phases: [],
    });

    $effect(() => {
        if (initialData) {
            formData = { ...initialData };
        }
    });

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        onSave($state.snapshot(formData));
    }
</script>

<form onsubmit={handleSubmit} class="space-y-6 pt-4 pb-2">
    <div class="space-y-4">
        <div class="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-sm">
            <div class="p-1.5 rounded-full bg-primary/20 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-primary" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <div class="space-y-1">
                <p class="font-bold text-primary">{$t("settings.risk.growthPlan.infoTitle") || "Como usar este Plano?"}</p>
                <p class="text-muted-foreground">
                    Isto é apenas o <strong>motor</strong>. Para que esta progressão de lotes funcione na sua conta real, você precisa criar (ou editar) um <strong>Perfil de Risco</strong> na Aba de Riscos e vincular este Plano lá.
                </p>
            </div>
        </div>

        <!-- Basic Settings -->
        <Card.Root class="border-border/10 bg-black/5">
            <Card.Content class="pt-6 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <Label class="text-base font-semibold">{$t("settings.risk.growthPlan.enable") || "Ativar Plano de Crescimento"}</Label>
                        <p class="text-sm text-muted-foreground">
                            Ativa a progressão automática com base nas regras de cada fase.
                        </p>
                    </div>
                    <Switch bind:checked={formData.enabled} />
                </div>
                
                <div class="space-y-2">
                    <Label for="plan-name">Nome do Plano</Label>
                    <Input
                        id="plan-name"
                        bind:value={formData.name}
                        placeholder="Ex: Fase de Teste, Plano Principal..."
                        required
                    />
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Phases Editor -->
        <div class="p-4 border rounded-xl bg-card">
            <GrowthPhasesEditor bind:phases={formData.phases} simpleMode={false} />
        </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" type="button" onclick={onCancel}>
            {$t("general.cancel")}
        </Button>
        <Button type="submit">
            {$t("general.save")}
        </Button>
    </div>
</form>
