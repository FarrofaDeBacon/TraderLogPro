import { invoke } from "@tauri-apps/api/core";
import type { ChartType } from "$lib/types";

export class ChartTypesStore {
    chartTypes = $state<ChartType[]>([]);

    async saveChartTypes() {
        for (const chartType of this.chartTypes) {
            try {
                await invoke("save_chart_type", { chartType: $state.snapshot(chartType) });
            } catch (e) {
                console.error("[ChartTypesStore] Error saving chart type:", e);
            }
        }
    }

    addChartType(item: Omit<ChartType, "id">) {
        this.chartTypes.push({ ...item, id: crypto.randomUUID() });
        this.saveChartTypes();
    }

    updateChartType(id: string, item: Partial<ChartType>) {
        this.chartTypes = this.chartTypes.map(c => c.id === id ? { ...c, ...item } : c);
        this.saveChartTypes();
    }

    async deleteChartType(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_chart_type", { id });
            this.chartTypes = this.chartTypes.filter(c => c.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    clearChartTypes() {
        this.chartTypes = [];
    }
}

export const chartTypesStore = new ChartTypesStore();
