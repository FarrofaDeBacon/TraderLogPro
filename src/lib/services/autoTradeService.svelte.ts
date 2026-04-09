import { accountsStore } from "$lib/stores/accounts.svelte";
import { rtdStore, type RTDTradeEvent } from "$lib/stores/rtd.svelte";
import { appStore } from "$lib/stores/app.svelte";
import { tradesStore } from "$lib/stores/trades.svelte";

export interface PendingTrade {
    symbol: string;
    price: number;
    sheet?: string;
    timestamp: Date;
    account_id: string;
    isPartial: boolean;
    type: 'new' | 'partial_entry' | 'partial_exit';
    existingTradeId?: string;
}

class AutoTradeService {
    pendingTrade = $state<PendingTrade | null>(null);
    isDialogOpen = $state(false);

    // Cooldown map: symbol -> timestamp of last dismissal
    private dismissedSymbols = new Map<string, number>();
    private readonly COOLDOWN_MS = 30_000; // 30 seconds

    constructor() {
        if (typeof window !== 'undefined') {
            rtdStore.onTradeExecuted((event) => this.handleDetection(event));
        }
    }

    private handleDetection(event: RTDTradeEvent) {
        const { quote, type, isPartial } = event;
        
        // SANITY CHECK: Ignore detections with zero or negative price
        if (quote.last <= 0) {
            console.log("[AutoTradeService] Ignoring detection due to invalid price:", quote.symbol, quote.last);
            return;
        }

        // GUARD: Don't reopen if dialog is already showing
        if (this.isDialogOpen) {
            return;
        }

        // COOLDOWN GUARD: Don't reopen the same symbol within 30 seconds of dismissal
        const lastDismissed = this.dismissedSymbols.get(quote.symbol.toUpperCase());
        if (lastDismissed && (Date.now() - lastDismissed) < this.COOLDOWN_MS) {
            return;
        }

        console.log("[AutoTradeService] DETECTION RECEIVED:", quote.symbol, "Price:", quote.last, "Type:", type, "Sheet:", quote.sheet);

        // Smart Account Detection
        let accountId = "";
        if (quote.sheet) {
            const sheetMatch = accountsStore.accounts.find(a =>
                a.nickname.toLowerCase().includes(quote.sheet!.toLowerCase()) ||
                a.account_type.toLowerCase().includes(quote.sheet!.toLowerCase())
            );
            if (sheetMatch) accountId = sheetMatch.id;
        }

        if (!accountId && accountsStore.accounts.length > 0) {
            accountId = accountsStore.accounts[0].id;
        }

        // Search for existing trade to link if partial
        let existingId = undefined;
        if (isPartial) {
            const openTrade = tradesStore.trades.find(t => 
                (t.asset_symbol.toUpperCase() === quote.symbol.toUpperCase() || 
                 quote.symbol.toUpperCase().startsWith(t.asset_symbol.toUpperCase())) && 
                t.exit_price === null
            );
            existingId = openTrade?.id;
        }

        this.pendingTrade = {
            symbol: quote.symbol,
            price: quote.last,
            sheet: quote.sheet,
            timestamp: new Date(),
            account_id: accountId,
            isPartial: isPartial,
            type: type,
            existingTradeId: existingId
        };

        // Temporarily disabled auto-popup based on user request
        // this.isDialogOpen = true;
    }

    clear() {
        // Register dismissal time for this symbol so it doesn't reopen immediately
        if (this.pendingTrade?.symbol) {
            this.dismissedSymbols.set(this.pendingTrade.symbol.toUpperCase(), Date.now());
        }
        this.pendingTrade = null;
        this.isDialogOpen = false;
    }
}

export const autoTradeService = new AutoTradeService();
