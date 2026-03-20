import { invoke } from "@tauri-apps/api/core";

import type { ApiConfig } from "$lib/types";

class IntegrationsStore {
    apiConfigs = $state<ApiConfig[]>([]);
    psychologyApiId = $state<string>("none");
    marketDataApiId = $state<string>("none");
    rtdEnabled = $state<boolean>(false);
    rtdExcelPath = $state<string>("");

    constructor() {
        this.rtdEnabled = typeof window !== "undefined" && localStorage.getItem("rtd_enabled") === "true";
        this.rtdExcelPath = typeof window !== "undefined" && localStorage.getItem("rtd_excel_path") || "";
    }

    async loadData() {
        try {
            console.log("[IntegrationsStore] Loading data...");
            const apiConfigsRes = await invoke<ApiConfig[]>("get_api_configs").catch(() => null);
            if (apiConfigsRes) this.apiConfigs = apiConfigsRes;

            if (typeof window !== "undefined") {
                const savedBindings = localStorage.getItem("service_api_bindings");
                if (savedBindings) {
                    const parsed = JSON.parse(savedBindings);
                    this.psychologyApiId = parsed.psychology || "mock";
                    this.marketDataApiId = parsed.market_data || "mock";
                }
            }

            if (this.rtdEnabled) {
                invoke("start_rtd_monitor_cmd", { excelPath: this.rtdExcelPath || null }).catch(e => console.error(e));
            }

            console.log("[IntegrationsStore] Data loaded.");
        } catch (e) {
            console.error("[IntegrationsStore] ERROR loading integrations data:", e);
        }
    }

    addApiConfig(item: Omit<ApiConfig, "id">) {
        this.apiConfigs.push({ ...item, id: crypto.randomUUID() });
        this.saveApiConfigs();
    }
    updateApiConfig(id: string, item: Partial<ApiConfig>) {
        this.apiConfigs = this.apiConfigs.map(a => a.id === id ? { ...a, ...item } : a);
        this.saveApiConfigs();
    }
    async deleteApiConfig(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_api_config", { id });
        this.apiConfigs = this.apiConfigs.filter(a => a.id !== id);
        return { success: true };
    }
    private async saveApiConfigs() {
        for (const config of this.apiConfigs) {
            try {
                await invoke("save_api_config", { config: $state.snapshot(config) });
            } catch (e) {
                console.error("[IntegrationsStore] Error saving api config:", e);
            }
        }
    }

    bindServiceApi(serviceData: { psychology: string, market_data: string }) {
        this.psychologyApiId = serviceData.psychology;
        this.marketDataApiId = serviceData.market_data;
        if (typeof window !== "undefined") {
            localStorage.setItem("service_api_bindings", JSON.stringify(serviceData));
        }
    }
}

export const integrationsStore = new IntegrationsStore();
