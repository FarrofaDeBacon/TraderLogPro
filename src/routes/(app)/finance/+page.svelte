<script lang="ts">
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import {
        Wallet,
        Plus,
        Calculator,
        ArrowRightLeft,
        TrendingUp,
        Landmark,
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Separator } from "$lib/components/ui/separator";
    import { toast } from "svelte-sonner";
    import * as Card from "$lib/components/ui/card";
    import StatementTable from "$lib/components/finance/StatementTable.svelte";
    import DailyClosureWizard from "$lib/components/finance/DailyClosureWizard.svelte";
    import TransactionDialog from "$lib/components/finance/TransactionDialog.svelte";
    import TransferDialog from "$lib/components/finance/TransferDialog.svelte";
    import AccountCard from "$lib/components/finance/AccountCard.svelte";
    import AccountEvolutionChart from "$lib/components/finance/AccountEvolutionChart.svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { t, locale } from "svelte-i18n";
    import { cn, formatCurrency } from "$lib/utils";
    import { SystemCard, SystemHeader, SystemMetric } from "$lib/components/ui/system";

    let showTransactionDialog = $state(false);
    let showTransferDialog = $state(false);
    let showClosureWizard = $state(false);
    let isSyncing = $state(false);

    let selectedChartCurrency = $state(
        userProfileStore.userProfile?.main_currency || "BRL",
    );
    let selectedAccountId = $state<string>("all");

    let showBreakdown = $state(false);
    let breakdownCurrency = $state<string | null>(null);
    // Group accounts by currency for consolidated view
    let accountsByCurrency = $derived.by(() => {
        const groups: Record<string, { total: number; accounts: any[] }> = {};
        accountsStore.accounts.forEach((acc) => {
            const currency = acc.currency || userProfileStore.userProfile?.main_currency || "BRL";
            if (!groups[currency]) {
                groups[currency] = { total: 0, accounts: [] };
            }
            groups[currency].accounts.push(acc);
            groups[currency].total += acc.balance;
        });
        return groups;
    });

    let breakdownData = $derived(
        breakdownCurrency ? accountsByCurrency[breakdownCurrency] : null,
    );

    function handleBreakdown(currency: string) {
        breakdownCurrency = currency;
        showBreakdown = true;
    }

    let totalBalanceBRL = $derived(
        tradesStore.getTotalBalanceBRL(
            accountsStore.accounts,
            currenciesStore.currencies,
        ),
    );

    const today = new Date();
    const currentMonthStr =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0"); // "YYYY-MM" local

    let monthResultBRL = $derived(
        tradesStore.getMonthlyTradeResult(
            currentMonthStr,
            accountsStore.accounts,
            currenciesStore.currencies,
        ),
    );

    async function handleSync() {
        isSyncing = true;
        const result = await currenciesStore.syncExchangeRates();
        if (result?.success) {
            toast.success($t("settings.api.integrations.currency.success"));
        } else if (result) {
            toast.error(
                result.error || $t("settings.api.integrations.currency.error"),
            );
        }
        isSyncing = false;
    }

    const currencyColors: Record<string, string> = {
        BRL: "border-l-emerald-500",
        USD: "border-l-blue-500",
        EUR: "border-l-indigo-500",
        BTC: "border-l-orange-500",
        ETH: "border-l-purple-500",
        USDT: "border-l-cyan-500",
    };

    const currencyTextColors: Record<string, string> = {
        BRL: "text-emerald-500",
        USD: "text-blue-500",
        EUR: "text-indigo-500",
        BTC: "text-orange-500",
        ETH: "text-purple-500",
        USDT: "text-cyan-500",
    };

    function getCurrencyColor(curr: string) {
        return currencyColors[curr] || "border-l-primary";
    }

    function getCurrencyTextColor(curr: string) {
        return currencyTextColors[curr] || "text-primary";
    }
</script>

<div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex-1 flex flex-col space-y-8 p-4 md:p-8">
        {#snippet actions()}
            <div class="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    onclick={() => (showClosureWizard = true)}
                    class="bg-background/40 hover:bg-background/60 border border-border/40 text-[9px] font-black h-8 uppercase tracking-widest px-3"
                >
                    <Calculator class="w-3.5 h-3.5 mr-2" />
                    {$t("finance.dailyClosure")}
                </Button>

                <Button
                    variant="outline"
                    onclick={handleSync}
                    disabled={isSyncing}
                    class="bg-background/40 hover:bg-background/60 border border-border/40 text-[9px] font-black h-8 uppercase tracking-widest px-3"
                >
                    <ArrowRightLeft
                        class={cn("w-3.5 h-3.5 mr-2", isSyncing && "animate-spin")}
                    />
                    {isSyncing
                        ? $t("settings.api.integrations.currency.syncing")
                        : $t("settings.api.integrations.currency.syncNow")}
                </Button>
                <Button onclick={() => (showTransactionDialog = true)} class="bg-primary hover:bg-primary/90 text-[10px] font-black h-8 uppercase tracking-widest px-4 shadow-lg shadow-primary/20">
                    <Plus class="w-3.5 h-3.5 mr-2" />
                    {$t("finance.newTransaction")}
                </Button>
            </div>
        {/snippet}

        <SystemCard status="primary" class="p-3 mb-6 bg-primary/5">
            <SystemHeader 
                title={$t("finance.title")}
                subtitle={$t("finance.description")}
                icon={Wallet}
                variant="page"
                class="mb-0"
                {actions}
            />
        </SystemCard>

        <!-- Consolidated Balances by Currency -->
        <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
            <!-- Main Converted Balance -->
            <SystemCard status="success" class="p-4 overflow-hidden relative group">
                <div class="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12"><Wallet class="w-20 h-20"/></div>
                <SystemMetric 
                    label={$t("finance.quickStats.totalEquity") + " (BRL)"}
                    value={formatCurrency(totalBalanceBRL, "BRL", $locale || "pt-BR")}
                    status="success"
                    subvalue={$t("finance.quickStats.consolidated")}
                    weight="black"
                />
            </SystemCard>

            {#each Object.entries(accountsByCurrency) as [currency, data]}
                <button
                    type="button"
                    onclick={() => handleBreakdown(currency)}
                    class="text-left w-full h-full"
                >
                    <SystemCard hover={true} class="p-4 overflow-hidden relative h-full">
                        <div class="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12"><Landmark class={cn("w-20 h-20", getCurrencyTextColor(currency))}/></div>
                        <SystemMetric 
                            label={$t("finance.quickStats.balanceIn", { values: { currency } })}
                            value={formatCurrency(data.total, currency, $locale || "pt-BR")}
                            subvalue={$t("finance.quickStats.viewBreakdown")}
                            weight="bold"
                        />
                    </SystemCard>
                </button>
            {/each}

            <SystemCard 
                status={monthResultBRL >= 0 ? "success" : "danger"}
                class="p-4 overflow-hidden relative"
            >
                <div class="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12"><TrendingUp class={cn("w-20 h-20", monthResultBRL >= 0 ? "text-emerald-500" : "text-rose-500")}/></div>
                <SystemMetric 
                    label={$t("finance.quickStats.monthlyResult")}
                    value={formatCurrency(monthResultBRL, "BRL", $locale || "pt-BR")}
                    status={monthResultBRL >= 0 ? "success" : "danger"}
                    subvalue={$t("finance.quickStats.monthlyResultDesc")}
                    weight="black"
                />
            </SystemCard>
        </div>

        <!-- (Suas Contas section removed) -->

        <!-- Evolution Chart -->
        <Card.Root class="card-glass">
            <Card.Header class="pb-2">
                <div class="flex flex-row items-center justify-between w-full">
                    <div>
                        <Card.Title
                            class="text-base font-bold tracking-tight flex items-center gap-2"
                        >
                            <TrendingUp class="w-4 h-4 text-primary" />
                            {$t("finance.charts.evolution")}
                        </Card.Title>
                        <Card.Description class="text-xs text-muted-foreground"
                            >{$t("finance.charts.evolutionSubtitle", {
                                values: { currency: selectedChartCurrency },
                            })}</Card.Description
                        >
                    </div>
                </div>

                <!-- Account Filter Badges -->
                <div
                    class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-1 mt-4"
                >
                    <button
                        type="button"
                        class={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0",
                            selectedAccountId === "all"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted",
                        )}
                        onclick={() => (selectedAccountId = "all")}
                    >
                        {$t("finance.statement.allAccounts")}
                    </button>
                    {#each accountsStore.accounts as acc}
                        <button
                            type="button"
                            class={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0 flex items-center gap-1.5",
                                selectedAccountId === acc.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted",
                            )}
                            onclick={() => (selectedAccountId = acc.id)}
                        >
                            <div
                                class="w-1.5 h-1.5 rounded-full bg-current opacity-50"
                            ></div>
                            {acc.nickname}
                        </button>
                    {/each}
                </div>
            </Card.Header>
            <Card.Content>
                {#key selectedAccountId + selectedChartCurrency}
                    <AccountEvolutionChart
                        bind:accountId={selectedAccountId}
                        bind:currency={selectedChartCurrency}
                    />
                {/key}
            </Card.Content>
        </Card.Root>

        <Separator class="bg-zinc-800/50" />

        <!-- Statement Section -->
        <div class="space-y-4">
            <StatementTable />
        </div>
    </div>
</div>

<DailyClosureWizard bind:open={showClosureWizard} />
<TransactionDialog bind:open={showTransactionDialog} />
<TransferDialog bind:open={showTransferDialog} />

<Dialog.Root bind:open={showBreakdown}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title
                >{$t("finance.quickStats.breakdownTitle", {
                    values: { currency: breakdownCurrency },
                })}</Dialog.Title
            >
            <Dialog.Description>
                {$t("finance.quickStats.breakdownDesc", {
                    values: { currency: breakdownCurrency },
                })}
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            {#if breakdownData && breakdownCurrency}
                {#each breakdownData.accounts as account}
                    <div
                        class={cn(
                            "flex items-center justify-between p-1.5 px-2.5 rounded-lg border border-l-2 bg-muted/50",
                            getCurrencyColor(breakdownCurrency),
                        )}
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="w-8 h-8 rounded-lg bg-background border flex items-center justify-center"
                            >
                                <Landmark
                                    class={cn(
                                        "w-4 h-4",
                                        getCurrencyTextColor(breakdownCurrency),
                                    )}
                                />
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-bold"
                                    >{account.nickname}</span
                                >
                                <span
                                    class="text-[10px] text-muted-foreground uppercase"
                                    >{account.broker}</span
                                >
                            </div>
                        </div>
                        <div class="text-right">
                            <div
                                class="text-sm font-mono font-bold tabular-nums tracking-tight"
                            >
                                {formatCurrency(
                                    account.balance,
                                    breakdownCurrency,
                                    $locale || "pt-BR",
                                )}
                            </div>
                            <span
                                class="text-[9px] font-mono font-medium text-muted-foreground"
                                >{account.account_number ||
                                    $t("finance.statement.noNumber")}</span
                            >
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => (showBreakdown = false)}
                >{$t("general.close")}</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
