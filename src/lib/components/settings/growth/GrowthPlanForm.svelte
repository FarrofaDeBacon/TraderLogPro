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
        daily_loss_mode: 'accumulate',
        phase_drawdown_mode: 'accumulate',
        phase_target_mode: 'cumulative'
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
                <p class="font-bold text-primary">{$t("risk.growth.howToUseTitle")}</p>
                <p class="text-muted-foreground">
                    {@html $t("risk.growth.howToUseDesc")}
                </p>
            </div>
        </div>

        <!-- Basic Settings -->
        <Card.Root class="border-border/10 bg-black/5">
            <Card.Content class="pt-6 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <Label class="text-base font-semibold">{$t("risk.growth.enable")}</Label>
                        <p class="text-sm text-muted-foreground">
                            {$t("risk.growth.enableDesc")}
                        </p>
                    </div>
                    <Switch bind:checked={formData.enabled} />
                </div>
                
                <div class="space-y-2 border-b border-white/5 pb-4">
                    <Label for="plan-name">{$t("risk.growth.planName")}</Label>
                    <Input
                        id="plan-name"
                        bind:value={formData.name}
                        placeholder={$t("risk.growth.planNamePlaceholder")}
                        required
                        class="bg-black/20"
                    />
                </div>

                <!-- Advanced Rules / Calculation Modes -->
                <div class="space-y-4 pt-2">
                    <Label class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{$t("risk.growth.calculationModes")}</Label>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Daily Loss Mode -->
                        <div class="flex flex-col justify-between p-4 rounded-xl bg-black/20 border border-white/5 h-full">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growth.dailyLossMode")}</Label>
                                    <Switch 
                                        checked={formData.daily_loss_mode === 'recover'} 
                                        onCheckedChange={(v) => formData.daily_loss_mode = v ? 'recover' : 'accumulate'}
                                    />
                                </div>
                                <p class="text-[10px] text-muted-foreground/50 leading-relaxed italic">
                                    {formData.daily_loss_mode === 'recover' ? $t("risk.growth.helpers.dailyLossRecover") : $t("risk.growth.helpers.dailyLossAccumulate")}
                                </p>
                            </div>
                        </div>

                        <!-- Phase Drawdown Mode -->
                        <div class="flex flex-col justify-between p-4 rounded-xl bg-black/20 border border-white/5 h-full">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growth.phaseDrawdownMode")}</Label>
                                    <Switch 
                                        checked={formData.phase_drawdown_mode === 'recover'} 
                                        onCheckedChange={(v) => formData.phase_drawdown_mode = v ? 'recover' : 'accumulate'}
                                    />
                                </div>
                                <p class="text-[10px] text-muted-foreground/50 leading-relaxed italic">
                                    {formData.phase_drawdown_mode === 'recover' ? $t("risk.growth.helpers.drawdownRecover") : $t("risk.growth.helpers.drawdownAccumulate")}
                                </p>
                            </div>
                        </div>

                        <!-- Phase Target Mode -->
                        <div class="flex flex-col justify-between p-4 rounded-xl bg-black/20 border border-white/5 h-full">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[11px] font-black uppercase tracking-wider text-primary/80">{$t("risk.growth.phaseTargetMode")}</Label>
                                    <Switch 
                                        checked={formData.phase_target_mode === 'reset_each_phase'} 
                                        onCheckedChange={(v) => formData.phase_target_mode = v ? 'reset_each_phase' : 'cumulative'}
                                    />
                                </div>
                                <p class="text-[10px] text-muted-foreground/50 leading-relaxed italic">
                                    {formData.phase_target_mode === 'reset_each_phase' ? $t("risk.growth.helpers.targetReset") : $t("risk.growth.helpers.targetCumulative")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Phases Editor -->
        <div class="p-4 border rounded-xl bg-card">
            <GrowthPhasesEditor bind:phases={formData.phases} simpleMode={false} />
        </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t">
        <div>
            {#if initialData}
                <Button 
                    variant="outline" 
                    type="button"
                    class="border-rose-500/10 text-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                    onclick={() => {
                        if (confirm($t('risk.growth.actions.restartConfirm'))) {
                            formData.current_phase_index = 0;
                        }
                    }}
                >
                    {$t("risk.growth.actions.restart")}
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
