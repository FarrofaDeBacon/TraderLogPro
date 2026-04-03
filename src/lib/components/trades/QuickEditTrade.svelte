<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { t } from "svelte-i18n";
    import * as Dialog from "$lib/components/ui/dialog";
    import { TrendingUp, TrendingDown, Loader2 } from "lucide-svelte";
    import { toast } from "svelte-sonner";

    let { open = $bindable(false), trade, onsave, onadvanced } = $props<{
        open: boolean;
        trade: any;
        onsave: () => void;
        onadvanced: () => void;
    }>();

    let asset = $state("");
    let direction = $state<"Buy"|"Sell">("Buy");
    let resultInput = $state("");
    let dateInput = $state("");
    let isSubmitting = $state(false);

    $effect(() => {
        if (open && trade) {
            asset = trade.asset_symbol || "";
            direction = trade.direction || "Buy";
            resultInput = trade.result?.toString() || "0";
            dateInput = trade.date ? trade.date.slice(0, 16) : new Date().toISOString().slice(0,16);
        }
    });

    async function handleSave() {
        if (!trade || !asset || !resultInput || !dateInput) return;
        const resParsed = parseFloat(resultInput.replace(",", "."));
        if (isNaN(resParsed)) {
            toast.error($t("trades.quick_edit.invalid_result"));
            return;
        }
        
        isSubmitting = true;
        
        try {
            const updatedTrade = {
                ...trade,
                asset_symbol: asset.toUpperCase(),
                direction,
                result: resParsed,
                date: dateInput,
                exit_date: dateInput 
            };
            
            const res = await tradesStore.updateTrade(trade.id, updatedTrade);
            if (res.success) {
                toast.success($t("trades.quick_edit.save_success"));
                open = false;
                onsave();
            } else {
                toast.error($t("trades.quick_edit.save_error") + res.error);
            }
        } catch(e) {
            toast.error($t("trades.quick_edit.network_fail"));
        } finally {
            isSubmitting = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-sm glass border-white/10 text-white p-6 shadow-2xl">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <span class="p-1 bg-emerald-500/10 text-emerald-500 rounded"><TrendingUp class="w-4 h-4" /></span>
                {$t("trades.quick_edit.title")}
            </Dialog.Title>
            <Dialog.Description class="text-muted-foreground text-xs pt-1">
                {$t("trades.quick_edit.description")}
            </Dialog.Description>
        </Dialog.Header>

        {#if trade}
            <div class="space-y-4 mt-2">
                <div class="space-y-1.5 relative">
                    <span class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1 block mb-1">{$t("trades.quick_edit.date_time")}</span>
                    <Input type="datetime-local" bind:value={dateInput} class="bg-zinc-900/50 border-dashed border-border/30 h-10 text-xs font-mono" />
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5 relative">
                        <span class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1 block mb-1">{$t("trades.quick_edit.asset")}</span>
                        <Input bind:value={asset} class="bg-zinc-900/50 border-dashed border-border/30 uppercase font-mono font-bold h-10" />
                    </div>
                    
                    <div class="space-y-1.5 relative">
                        <span class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1 block mb-1">{$t("trades.quick_edit.bias")}</span>
                        <div class="flex items-center bg-zinc-900/50 p-1 rounded-md border border-border/10">
                            <button onclick={() => direction = "Buy"} class="flex-1 flex justify-center py-[5px] rounded transition-all {direction === 'Buy' ? 'bg-blue-500/10 text-blue-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'}"><TrendingUp class="w-3.5 h-3.5"/></button>
                            <button onclick={() => direction = "Sell"} class="flex-1 flex justify-center py-[5px] rounded transition-all {direction === 'Sell' ? 'bg-orange-500/10 text-orange-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'}"><TrendingDown class="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                </div>

                <div class="space-y-1.5 relative">
                    <span class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1 block mb-1">{$t("trades.quick_edit.result")}</span>
                    <Input bind:value={resultInput} class="bg-zinc-900/50 border-solid border-border/30 font-mono font-black h-12 text-lg {resultInput.startsWith('-') ? 'text-rose-500' : 'text-emerald-500'}" />
                </div>

                <div class="flex items-center justify-between pt-4 mt-2 border-t border-border/10">
                    <Button variant="ghost" class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white h-8" onclick={() => { open = false; onadvanced(); }}>
                        {$t("trades.quick_edit.full_mode")}
                    </Button>
                    <Button disabled={isSubmitting} variant="default" class="bg-primary text-primary-foreground font-black tracking-widest uppercase text-[10px] h-8 px-4" onclick={handleSave}>
                        {#if isSubmitting} <Loader2 class="w-4 h-4 animate-spin" /> {:else} {$t("trades.quick_edit.save")} {/if}
                    </Button>
                </div>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
