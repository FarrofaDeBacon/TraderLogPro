import { invoke } from "@tauri-apps/api/core";
import type { Market } from "$lib/types";
import { assetTypesStore } from "./asset-types.svelte";

export class MarketsStore {
    markets = $state<Market[]>([]);

    async saveMarkets() {
        for (const market of this.markets) {
            try {
                await invoke("save_market", { market: $state.snapshot(market) });
            } catch (e) {
                console.error("[MarketsStore] Error saving market:", e);
            }
        }
    }

    addMarket(item: Omit<Market, "id">) {
        this.markets.push({ ...item, id: crypto.randomUUID() });
        this.saveMarkets();
    }

    updateMarket(id: string, item: Partial<Market>) {
        this.markets = this.markets.map(m => m.id === id ? { ...m, ...item } : m);
        this.saveMarkets();
    }

    async deleteMarket(id: string): Promise<{ success: boolean; error?: string }> {
        // Validation: Block if any asset type uses this market
        const isUsed = assetTypesStore.assetTypes.some(at => at.market_id === id);
        if (isUsed) {
            return { success: false, error: "Cannot delete market: It is currently used by one or more asset types." };
        }

        try {
            await invoke("delete_market", { id });
            this.markets = this.markets.filter(m => m.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    clearMarkets() {
        this.markets = [];
    }

    getMarketName(id: string): string {
        const item = this.markets.find(m => m.id === id);
        return item ? item.code : "N/A";
    }
}

export const marketsStore = new MarketsStore();
