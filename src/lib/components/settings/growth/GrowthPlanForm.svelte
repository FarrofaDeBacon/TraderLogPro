<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Card from "$lib/components/ui/card";
    import { TrendingUp, Zap, Brain, RotateCcw } from "lucide-svelte";
    import { slide } from "svelte/transition";
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
        daily_loss_mode: 'accumulate',
        phase_drawdown_mode: 'accumulate',
        phase_target_mode: 'cumulative'
    });

    $effect(() => {
        if (initialData) {
            formData = { ...initialData };
        }
    });

    function resetPlan() {
        formData.current_phase_index = 0;
        // Opcionalmente podemos resetar datas aqui se houver persistência de histórico por fase
    }

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
                <p class="font-bold text-primary">{$t("risk.growthPlan.howToUseTitle")}</p>
                <div class="text-xs text-muted-foreground/60 space-y-1.5 leading-relaxed pr-8">
                    {@html $t("risk.growthPlan.howToUseDesc")}
                </div>
            </div>
        </div>

        <Card.Root class="border-border/10 bg-black/5">
            <Card.Content class="pt-6 space-y-4">
            <div class="flex items-center justify-between p-4 rounded-xl border bg-card/30">
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                        <TrendingUp class="w-4 h-4 text-primary" />
                        <Label class="text-base font-semibold">{$t("risk.growthPlan.enable")}</Label>
                    </div>
                    <p class="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                        {$t("risk.growthPlan.enableDesc")}
                    </p>
                </div>
                <Switch bind:checked={formData.enabled} />
            </div>

            {#if formData.enabled}
                <div transition:slide={{ duration: 400 }} class="space-y-6 pt-2 pb-4 overflow-hidden">
                    <div class="space-y-2">
                        <Label for="plan-name">{$t("risk.growthPlan.planName")}</Label>
                        <Input 
                            id="plan-name" 
                            bind:value={formData.name} 
                            placeholder={$t("risk.growthPlan.planNamePlaceholder")} 
                            class="bg-background-soft font-bold"
                        />
                    </div>

                    <div class="space-y-4">
                        <Label class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{$t("risk.growthPlan.calculationModes")}</Label>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="p-3.5 rounded-xl border bg-card/30 space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="p-1.5 rounded-lg bg-primary/10">
                                        <TrendingUp class="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growthPlan.dailyLossMode")}</Label>
                                    <Switch checked={formData.daily_loss_mode === 'recover'} onCheckedChange={(v) => formData.daily_loss_mode = v ? 'recover' : 'accumulate'} />
                                </div>
                                <div class="min-h-[24px]">
                                    <p class="text-[10px] font-medium text-muted-foreground/60 leading-tight">
                                    {formData.daily_loss_mode === 'recover' ? $t("risk.growthPlan.helpers.dailyLossRecover") : $t("risk.growthPlan.helpers.dailyLossAccumulate")}
                                    </p>
                                </div>
                            </div>

                            <div class="p-3.5 rounded-xl border bg-card/30 space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="p-1.5 rounded-lg bg-primary/10">
                                        <Zap class="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growthPlan.phaseDrawdownMode")}</Label>
                                    <Switch checked={formData.phase_drawdown_mode === 'recover'} onCheckedChange={(v) => formData.phase_drawdown_mode = v ? 'recover' : 'accumulate'} />
                                </div>
                                <div class="min-h-[24px]">
                                    <p class="text-[10px] font-medium text-muted-foreground/60 leading-tight">
                                    {formData.phase_drawdown_mode === 'recover' ? $t("risk.growthPlan.helpers.drawdownRecover") : $t("risk.growthPlan.helpers.drawdownAccumulate")}
                                    </p>
                                </div>
                            </div>

                            <div class="p-3.5 rounded-xl border bg-card/30 space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="p-1.5 rounded-lg bg-primary/10">
                                        <Brain class="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growthPlan.phaseTargetMode")}</Label>
                                    <Switch checked={formData.phase_target_mode === 'reset_each_phase'} onCheckedChange={(v) => formData.phase_target_mode = v ? 'reset_each_phase' : 'cumulative'} />
                                </div>
                                <div class="min-h-[24px]">
                                    <p class="text-[10px] font-medium text-muted-foreground/60 leading-tight">
                                    {formData.phase_target_mode === 'reset_each_phase' ? $t("risk.growthPlan.helpers.targetReset") : $t("risk.growthPlan.helpers.targetCumulative")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
            </Card.Content>
        </Card.Root>

        <div class="p-4 border rounded-xl bg-card">
            <GrowthPhasesEditor bind:phases={formData.phases} simpleMode={false} />
        </div>
    </div>

    <div class="flex justify-between items-center pt-4 border-t">
        <div class="flex items-center gap-3">
            {#if initialData}
                <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-8 border-destructive/20 text-destructive hover:bg-destructive/5 font-bold"
                    onclick={() => {
                        if (confirm($t('risk.growthPlan.actions.restartConfirm'))) {
                            resetPlan();
                        }
                    }}
                >
                    <RotateCcw class="w-3.5 h-3.5 mr-2" />
                    {$t("risk.growthPlan.actions.restart")}
                </Button>
            {/if}
        </div>
        <div class="flex gap-2">
            <Button variant="outline" type="button" onclick={onCancel}>
                {$t("risk.plan.actions.cancel")}
            </Button>
            <Button type="submit">
                {$t("risk.plan.actions.save")}
            </Button>
        </div>
    </div>
</form>
