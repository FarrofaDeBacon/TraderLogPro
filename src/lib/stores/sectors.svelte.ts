import { safeInvoke } from "$lib/services/tauri";
import type { Sector, Subsector } from "$lib/types";

export class SectorsStore {
    sectors = $state<Sector[]>([]);
    subsectors = $state<Subsector[]>([]);
    isLoading = $state(false);

    async loadData(): Promise<void> {
        this.isLoading = true;
        try {
            const [sectorsRes, subsectorsRes] = await Promise.all([
                safeInvoke<Sector[]>("get_sectors") || Promise.resolve([]),
                safeInvoke<Subsector[]>("get_subsectors") || Promise.resolve([])
            ]);
            this.sectors = sectorsRes || [];
            this.subsectors = subsectorsRes || [];
        } catch (e) {
            console.error("[SectorsStore] ERROR loading economic data:", e);
        } finally {
            this.isLoading = false;
        }
    }

    async loadSectors(): Promise<void> {
        await this.loadData();
    }

    // --- Sectors ---
    async saveSector(sector: Partial<Sector>) {
        try {
            await safeInvoke("save_sector", { sector });
            await this.loadData();
        } catch (e) {
            console.error("[SectorsStore] ERROR saving Sector:", e);
            throw e;
        }
    }

    async deleteSector(id: string) {
        try {
            await safeInvoke("delete_sector", { id });
            await this.loadData();
        } catch (e) {
            console.error("[SectorsStore] ERROR deleting Sector:", e);
            throw e;
        }
    }

    // --- Subsectors ---
    async saveSubsector(subsector: Partial<Subsector>) {
        try {
            await safeInvoke("save_subsector", { subsector });
            await this.loadData();
        } catch (e) {
            console.error("[SectorsStore] ERROR saving Subsector:", e);
            throw e;
        }
    }

    async deleteSubsector(id: string) {
        try {
            await safeInvoke("delete_subsector", { id });
            await this.loadData();
        } catch (e) {
            console.error("[SectorsStore] ERROR deleting Subsector:", e);
            throw e;
        }
    }

    /**
     * Tenta encontrar um setor pelo nome. Se não existir, cria um novo.
     */
    async ensureSectorExists(name: string): Promise<string> {
        if (!name) return "";
        const cleanName = name.trim();
        const existing = this.sectors.find(s => s.name.toLowerCase() === cleanName.toLowerCase());
        
        if (existing) return existing.id;

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

    getSectorIcon(id?: string): string {
        if (!id) return "Building2";
        return this.sectors.find(s => s.id === id)?.icon || "Building2";
    }

    getSectorColor(id?: string): string {
        if (!id) return "emerald";
        return this.sectors.find(s => s.id === id)?.color || "emerald";
    }

    getSubsectorName(id?: string): string {
        if (!id) return "---";
        return this.subsectors.find(s => s.id === id)?.name || "---";
    }

    getSubsectorsBySector(sectorId: string): Subsector[] {
        return this.subsectors.filter(s => s.sector_id === sectorId);
    }
}

export const sectorsStore = new SectorsStore();
