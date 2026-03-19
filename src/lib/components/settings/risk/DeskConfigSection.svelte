<script lang="ts">
    import { t } from "svelte-i18n";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Select from "$lib/components/ui/select";
    import { Badge } from "$lib/components/ui/badge";
    import type { DeskConfig, AssetRiskProfile } from "$lib/types";

    let { 
        config = $bindable(),
        availableAssetProfiles = []
    } = $props<{
        config: DeskConfig | undefined;
        availableAssetProfiles: AssetRiskProfile[];
    }>();

    // In case the config is completely missing from older DB entries, initialize it when enabled
    function ensureInitialized() {
        if (!config) {
            config = {
                enabled: true,
                plan_name: "",
                allowed_asset_ids: [],
                max_combined_exposure: 0,
                max_total_loss: 0,
                profit_target: 0,
                day_trade_only: true,
                close_before_market_close_minutes: 0,
                consistency_mode: "none",
                max_single_day_profit_share: 0,
                mdr_mode: "none"
            };
            return;
        }
        if (!config.plan_name) config.plan_name = "";
        if (!config.allowed_asset_ids) config.allowed_asset_ids = [];
        if (!config.max_combined_exposure) config.max_combined_exposure = 0;
        if (!config.max_total_loss) config.max_total_loss = 0;
        if (!config.profit_target) config.profit_target = 0;
        if (config.day_trade_only === undefined) config.day_trade_only = true;
        if (!config.close_before_market_close_minutes) config.close_before_market_close_minutes = 0;
        if (!config.consistency_mode) config.consistency_mode = "none";
        if (!config.max_single_day_profit_share) config.max_single_day_profit_share = 0;
        if (!config.mdr_mode) config.mdr_mode = "none";
    }

    $effect(() => {
        if (config.enabled) {
            ensureInitialized();
        }
    });

    function toggleAssetProfile(profileId: string) {
        if (!config.allowed_asset_ids) config.allowed_asset_ids = [];
        if (config.allowed_asset_ids.includes(profileId)) {
            config.allowed_asset_ids = config.allowed_asset_ids.filter((id: string) => id !== profileId);
        } else {
            config.allowed_asset_ids = [...config.allowed_asset_ids, profileId];
        }
    }

</script>

<div class="space-y-6">
    <div class="flex items-center justify-between p-4 rounded-lg border bg-background/50">
        <div class="space-y-0.5">
            <Label class="text-base font-semibold">{$t("risk.management.deskConfig") || "Configuração da Mesa"}</Label>
            <p class="text-sm text-muted-foreground">{$t("risk.management.enableDeskConfig") || "Ativar Configuração da Mesa"}</p>
        </div>
        <Switch checked={config?.enabled ?? false} onCheckedChange={(c) => {
            if (c) {
                ensureInitialized();
                if (config) config.enabled = true;
            } else if (config) {
                config.enabled = false;
            }
        }} />
    </div>

    {#if config?.enabled}
        <div class="p-6 rounded-lg border bg-background/30 space-y-6">
            
                <!-- Nome do Plano -->
                <div class="space-y-2">
                    <Label>{$t("risk.management.planName") || "Nome do plano"}</Label>
                    <Input bind:value={config.plan_name} placeholder="Ex: 5PI Book 4k" />
                </div>

                <!-- MDR Mode -->
                <div class="space-y-2">
                    <Label>{$t("risk.management.mdrMode") || "Modo de MDR"}</Label>
                    <Select.Root
                        type="single"
                        bind:value={config.mdr_mode}
                    >
                        <Select.Trigger>
                            {#if config.mdr_mode === "fixed"}
                                {$t("risk.management.mdrMode_fixed") || "Fixo (Relativo aos Limites de Conta Real)"}
                            {:else if config.mdr_mode === "percent_of_margin"}
                                {$t("risk.management.mdrMode_percent_of_margin") || "% da Margem"}
                            {:else}
                                {$t("risk.management.mdrMode_none") || "Nenhum"}
                            {/if}
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="none">{$t("risk.management.mdrMode_none") || "Nenhum"}</Select.Item>
                            <Select.Item value="fixed">{$t("risk.management.mdrMode_fixed") || "Fixo"}</Select.Item>
                            <Select.Item value="percent_of_margin">{$t("risk.management.mdrMode_percent_of_margin") || "% da Margem"}</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>
    {/if}
</div>
