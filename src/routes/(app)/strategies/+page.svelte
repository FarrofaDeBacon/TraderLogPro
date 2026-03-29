<script lang="ts">
  import { assetTypesStore } from "$lib/stores/asset-types.svelte";
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import { t } from "svelte-i18n";
    import StrategyPerformanceCard from "$lib/components/strategies/StrategyPerformanceCard.svelte";
    import { Input } from "$lib/components/ui/input";
    import { Search, Filter, Plus } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { Layers } from "lucide-svelte";

    let searchTerm = $state("");
    let selectedType = $state("all");

    // Filter Logic
    let filteredStrategies = $derived(
        workspaceStore.strategies.filter((s) => {
            const matchesSearch = s.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const matchesType =
                selectedType === "all" ||
                s.asset_types.some((typeStr) => {
                    // Check if typeStr is the selected ID
                    if (typeStr === selectedType) return true;
                    // Check if the name of the type matching selectedType matches typeStr
                    const selectedTypeName = assetTypesStore.assetTypes.find(
                        (at) => at.id === selectedType,
                    )?.name;
                    if (selectedTypeName === typeStr) return true;
                    return false;
                });

            return matchesSearch && matchesType;
        }),
    );
</script>

<div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex-1 flex flex-col space-y-8 p-4 md:p-8">
        <!-- Header with Search & actions -->
        {#snippet strategyActions()}
            <div class="flex items-center gap-2 w-full md:w-auto">
                <div class="relative flex-1 md:w-64">
                    <Search
                        class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        placeholder={$t("strategyList.searchPlaceholder")}
                        class="pl-8 h-8 bg-background/50 border-border/40 focus:bg-background/80 transition-all"
                        bind:value={searchTerm}
                    />
                </div>

                <Select.Root type="single" bind:value={selectedType}>
                    <Select.Trigger class="w-[180px] h-8 bg-background/50 border-border/40">
                        <Filter class="w-3.5 h-3.5 mr-2 opacity-60" />
                        <span class="text-[10px] font-bold uppercase tracking-tight">
                            {assetTypesStore.assetTypes.find(
                                (t) => t.id === selectedType,
                            )?.name || $t("trades.placeholders.all_types")}
                        </span>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="all" class="text-[10px] uppercase font-bold"
                            >{$t("trades.placeholders.all_types")}</Select.Item
                        >
                        {#each assetTypesStore.assetTypes as type}
                            <Select.Item value={type.id} class="text-[10px] uppercase font-bold">{type.name}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
        {/snippet}

        <SystemCard status="primary" class="p-3 mb-6 bg-primary/5">
            <SystemHeader 
                title={$t("strategyList.title")}
                subtitle={$t("strategyList.description")}
                icon={Layers}
                variant="page"
                class="mb-0"
                actions={strategyActions}
            />
        </SystemCard>

        <Separator />

        <!-- Grid Layout -->
        {#if filteredStrategies.length > 0}
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {#each filteredStrategies as strategy (strategy.id)}
                    <StrategyPerformanceCard
                        {strategy}
                        stats={tradesStore.getStrategyStats(
                            strategy.id,
                            accountsStore.accounts,
                            currenciesStore.currencies,
                            userProfileStore.userProfile,
                            "main",
                        )}
                    />
                {/each}
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg border-muted text-center h-[400px]"
            >
                <div class="p-4 bg-muted/50 rounded-full mb-4">
                    <Search class="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 class="text-lg font-semibold">
                    {$t("strategyList.notFound.title")}
                </h3>
                <p class="text-muted-foreground max-w-sm mt-2">
                    {$t("strategyList.notFound.description")}
                </p>
                <Button href="/settings/strategies" variant="link" class="mt-4">
                    {$t("strategyList.notFound.action")}
                </Button>
            </div>
        {/if}
    </div>
</div>
