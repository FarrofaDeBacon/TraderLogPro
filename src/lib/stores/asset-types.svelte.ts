import { invoke } from "@tauri-apps/api/core";
import type { AssetType } from "$lib/types";
import { compareAssetTypeIds, normalizeAssetTypeId } from "$lib/utils";
import { assetsStore } from "./assets.svelte";

export class AssetTypesStore {
    assetTypes = $state<AssetType[]>([]);

    async saveAssetTypes() {
        for (const assetType of this.assetTypes) {
            try {
                await invoke("save_asset_type", { assetType: $state.snapshot(assetType) });
            } catch (e) {
                console.error("[AssetTypesStore] Error saving asset type:", e);
                alert("[DEBUG] Error saving asset type: " + String(e));
            }
        }
    }

    addAssetType(item: Omit<AssetType, "id">) {
        this.assetTypes.push({ ...item, id: crypto.randomUUID() });
        this.saveAssetTypes();
    }

    updateAssetType(id: string, item: Partial<AssetType>) {
        this.assetTypes = this.assetTypes.map(at => compareAssetTypeIds(at.id, id) ? { ...at, ...item } : at);
        this.saveAssetTypes();
    }

    async deleteAssetType(id: string): Promise<{ success: boolean; error?: string }> {
        // Validation: Block if any asset uses this type
        const isUsed = assetsStore.assets.some(a => compareAssetTypeIds(a.asset_type_id, id));
        if (isUsed) {
            return { success: false, error: "Cannot delete asset type: It is currently used by one or more assets." };
        }

        try {
            await invoke("delete_asset_type", { id: normalizeAssetTypeId(id) });
            this.assetTypes = this.assetTypes.filter(at => !compareAssetTypeIds(at.id, id));
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    getAssetTypeName(id: string): string {
        const item = this.assetTypes.find(at => compareAssetTypeIds(at.id, id));
        return item ? item.name : "N/A";
    }

    clearAssetTypes() {
        this.assetTypes = [];
    }
}

export const assetTypesStore = new AssetTypesStore();
