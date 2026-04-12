import { safeInvoke } from "$lib/services/tauri";
import type { Sector } from "$lib/types";

export class SectorsStore {
    sectors = $state<Sector[]>([]);
    isLoading = $state(false);

    async loadSectors(): Promise<void> {
        this.isLoading = true;
        try {
            const sectorsRes = await safeInvoke<Sector[]>("get_sectors") || [];
            this.sectors = sectorsRes;
        } catch (e) {
            console.error("[SectorsStore] ERROR loading Sectors:", e);
        } finally {
            this.isLoading = false;
        }
    }

    async saveSector(sector: Partial<Sector>) {
        try {
            await safeInvoke("save_sector", { sector });
            await this.loadSectors();
        } catch (e) {
            console.error("[SectorsStore] ERROR saving Sector:", e);
            throw e;
        }
    }

    async deleteSector(id: string) {
        try {
            await safeInvoke("delete_sector", { id });
            this.sectors = this.sectors.filter(s => s.id !== id);
        } catch (e) {
            console.error("[SectorsStore] ERROR deleting Sector:", e);
            throw e;
        }
    }

    /**
     * Tenta encontrar um setor pelo nome. Se não existir, cria um novo.
     * Útil para importação automática via RTD.
     */
    async ensureSectorExists(name: string): Promise<string> {
        if (!name) return "";
        const cleanName = name.trim();
        const existing = this.sectors.find(s => s.name.toLowerCase() === cleanName.toLowerCase());
        
        if (existing) return existing.id;

        // Se não existir, cria um novo
        const newId = `sector:${crypto.randomUUID()}`;
        try {
            await this.saveSector({ id: newId, name: cleanName });
            return newId;
        } catch (e) {
            console.error(`[SectorsStore] Failed to auto-create sector ${cleanName}:`, e);
            return "";
        }
    }

    getSectorName(id?: string): string {
        if (!id) return "---";
        return this.sectors.find(s => s.id === id)?.name || "---";
    }
}

export const sectorsStore = new SectorsStore();
