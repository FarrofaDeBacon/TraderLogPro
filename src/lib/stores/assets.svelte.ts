import { invoke } from "@tauri-apps/api/core";
import type { Asset, AssetType, Strategy } from "$lib/types";

export class AssetsStore {
    assets = $state<Asset[]>([]);

    async loadAssets(): Promise<void> {
        try {
            const assetsRes = await invoke("get_assets") as Asset[];
            if (assetsRes) {
                this.assets = assetsRes.map(a => ({
                    ...a,
                    tax_profile_id: a.tax_profile_id ?? undefined,
                    root_id: a.root_id ?? undefined
                }));
            }
        } catch (e) {
            console.error("[AssetsStore] ERROR loading Assets:", e);
        }
    }

    async saveAssets() {
        console.log(`[AssetsStore] saveAssets: Saving ${this.assets.length} assets...`);
        let successCount = 0;
        let failCount = 0;

        for (const asset of this.assets) {
            try {
                await invoke("save_asset", { asset: $state.snapshot(asset) });
                successCount++;
            } catch (e) {
                failCount++;
                console.error(`[AssetsStore] FATAL Error saving asset ${asset.symbol}:`, e);
            }
        }
        console.log(`[AssetsStore] saveAssets complete. Success: ${successCount}, Failed: ${failCount}`);
    }

    async addAsset(item: Omit<Asset, "id">, autoSave: boolean = true) {
        this.assets.push({ 
            ...item, 
            id: crypto.randomUUID(),
            is_root: item.is_root ?? false,
            root_id: item.root_id ?? undefined 
        });
        if (autoSave) await this.saveAssets();
    }

    updateAsset(id: string, item: Partial<Asset>) {
        this.assets = this.assets.map(a => a.id === id ? { ...a, ...item } : a);
        this.saveAssets();
    }

    clearAssets() {
        this.assets = [];
    }

    async deleteAsset(id: string, strategies: Strategy[]): Promise<{ success: boolean; error?: string }> {
        const asset = this.assets.find(a => a.id === id);
        if (asset && strategies.some(s => s.specific_assets.includes(asset.symbol))) {
            return { success: false, error: "This Asset is specifically referenced in Strategies." };
        }
        try {
            await invoke("delete_asset", { id });
            this.assets = this.assets.filter(a => a.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    ensureAssetExists(symbol: string, forceTypeId: string | undefined, assetTypes: AssetType[]) {
        if (!symbol) return;
        const sym = symbol.toUpperCase();
        const existing = this.assets.find(a => a.symbol === sym);
        if (existing) {
            if (forceTypeId && existing.asset_type_id !== forceTypeId) {
                this.updateAsset(existing.id, { asset_type_id: forceTypeId });
            }
            return;
        }

        let typeId = forceTypeId || "";
        let name = sym;

        if (sym.startsWith("WIN") || sym.startsWith("WDO") || sym.startsWith("IND") || sym.startsWith("DOL") || sym.startsWith("BIT")) {
            const type = assetTypes.find(at => at.name.toLowerCase().includes("futuro") || at.code.toLowerCase().includes("index"));
            typeId = type?.id || assetTypes[0]?.id || "";
            name = sym.startsWith("WIN") ? "Mini Index" :
                sym.startsWith("WDO") ? "Mini Dollar" :
                    sym.startsWith("IND") ? "Bovespa Index" :
                        sym.startsWith("DOL") ? "Full Dollar" :
                            sym.startsWith("BIT") ? "Mini Bitcoin" : sym;
        } else if (sym.length === 6 && !sym.match(/\d/)) {
            const type = assetTypes.find(at => at.name.toLowerCase().includes("forex") || at.code.toLowerCase().includes("fx"));
            typeId = type?.id || assetTypes[0]?.id || "";
        } else if (sym.length >= 5 && (sym.endsWith("11") || sym.endsWith("3") || sym.endsWith("4"))) {
            const type = assetTypes.find(at => at.name.toLowerCase().includes("stock") || at.name.toLowerCase().includes("ação") || at.code.toLowerCase().includes("stk"));
            typeId = type?.id || assetTypes[0]?.id || "";
        } else {
            typeId = assetTypes[0]?.id || "";
        }

        let pv = 1.0;
        if (sym.startsWith("WDO") || sym.startsWith("DOL")) pv = 10.0;
        else if (sym.startsWith("WIN") || sym.startsWith("IND")) pv = 0.20;
        else if (sym.startsWith("BIT")) pv = 0.1;

        // Auto-link to root if possible
        let rootId: string | null = null;
        if (sym.length >= 3) {
            const prefix = sym.substring(0, 3);
            const root = this.assets.find(a => a.is_root && a.symbol === prefix);
            if (root) rootId = root.id;
        }

        this.addAsset({
            symbol: sym,
            name: `${name} (Auto)`,
            asset_type_id: typeId,
            point_value: pv,
            default_fee_id: "",
            is_root: false,
            root_id: rootId ?? undefined
        });
    }
}

export const assetsStore = new AssetsStore();
