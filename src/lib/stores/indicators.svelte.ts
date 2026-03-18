import { invoke } from "@tauri-apps/api/core";
import type { Indicator } from "$lib/types";

export class IndicatorsStore {
    indicators = $state<Indicator[]>([]);

    async saveIndicators() {
        for (const indicator of this.indicators) {
            try {
                await invoke("save_indicator", { indicator: $state.snapshot(indicator) });
            } catch (e) {
                console.error("[IndicatorsStore] Error saving indicator:", e);
            }
        }
    }

    addIndicator(item: Omit<Indicator, "id">) {
        this.indicators.push({ ...item, id: crypto.randomUUID() });
        this.saveIndicators();
    }

    updateIndicator(id: string, item: Partial<Indicator>) {
        this.indicators = this.indicators.map(i => i.id === id ? { ...i, ...item } : i);
        this.saveIndicators();
    }

    async deleteIndicator(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_indicator", { id });
            this.indicators = this.indicators.filter(i => i.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    clearIndicators() {
        this.indicators = [];
    }
}

export const indicatorsStore = new IndicatorsStore();
