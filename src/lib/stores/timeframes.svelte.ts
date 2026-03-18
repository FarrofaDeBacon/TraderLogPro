import { invoke } from "@tauri-apps/api/core";
import type { Timeframe } from "$lib/types";

export class TimeframesStore {
    timeframes = $state<Timeframe[]>([]);

    async saveTimeframes() {
        for (const timeframe of this.timeframes) {
            try {
                await invoke("save_timeframe", { timeframe: $state.snapshot(timeframe) });
            } catch (e) {
                console.error("[TimeframesStore] Error saving timeframe:", e);
            }
        }
    }

    addTimeframe(item: Omit<Timeframe, "id">) {
        this.timeframes.push({ ...item, id: crypto.randomUUID() });
        this.saveTimeframes();
    }

    updateTimeframe(id: string, item: Partial<Timeframe>) {
        this.timeframes = this.timeframes.map(t => t.id === id ? { ...t, ...item } : t);
        this.saveTimeframes();
    }

    async deleteTimeframe(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_timeframe", { id });
            this.timeframes = this.timeframes.filter(t => t.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    clearTimeframes() {
        this.timeframes = [];
    }
}

export const timeframesStore = new TimeframesStore();
