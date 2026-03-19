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
        <!-- Basic Settings -->
        <Card.Root class="border-primary/10 bg-primary/5">
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
