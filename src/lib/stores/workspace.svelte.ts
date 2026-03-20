import { invoke } from "@tauri-apps/api/core";

import type { Strategy, JournalEntry, EmotionalState, Tag } from "$lib/types";

class WorkspaceStore {
    strategies = $state<Strategy[]>([]);
    emotionalStates = $state<EmotionalState[]>([]);
    tags = $state<Tag[]>([]);
    journalEntries = $state<JournalEntry[]>([]);

    async loadData() {
        try {
            console.log("[WorkspaceStore] Loading data...");

            const [strategiesRes, emotionalStatesRes, tagsRes, journalEntriesRes] = await Promise.all([
                invoke("get_strategies").catch(() => null) as Promise<Strategy[] | null>,
                invoke("get_emotional_states").catch(() => null) as Promise<EmotionalState[] | null>,
                invoke("get_tags").catch(() => null) as Promise<Tag[] | null>,
                invoke("get_journal_entries").catch(() => null) as Promise<JournalEntry[] | null>
            ]);

            if (strategiesRes) this.strategies = strategiesRes;
            if (emotionalStatesRes) this.emotionalStates = emotionalStatesRes;
            if (tagsRes) this.tags = tagsRes;
            if (journalEntriesRes) {
                this.journalEntries = journalEntriesRes;
                await this.deduplicateJournalEntries();
            }

            console.log("[WorkspaceStore] Data loaded.");
        } catch (e) {
            console.error("[WorkspaceStore] ERROR loading data:", e);
        }
    }

    // --- Strategies ---
    addStrategy(item: Omit<Strategy, "id">) {
        this.strategies.push({ ...item, id: crypto.randomUUID() });
        this.saveStrategies();
    }
    updateStrategy(id: string, item: Partial<Strategy>) {
        this.strategies = this.strategies.map(s => s.id === id ? { ...s, ...item } : s);
        this.saveStrategies();
    }
    async deleteStrategy(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_strategy", { id });
        this.strategies = this.strategies.filter(s => s.id !== id);
        return { success: true };
    }
    private async saveStrategies() {
        for (const strategy of this.strategies) {
            try {
                await invoke("save_strategy", { strategy: $state.snapshot(strategy) });
            } catch (e) {
                console.error("[WorkspaceStore] Error saving strategy:", e);
            }
        }
    }

    // --- Emotional States ---
    addEmotionalState(item: Omit<EmotionalState, "id">) {
        this.emotionalStates.push({ ...item, id: crypto.randomUUID() });
        this.saveEmotionalStates();
    }
    updateEmotionalState(id: string, item: Partial<EmotionalState>) {
        this.emotionalStates = this.emotionalStates.map(e => e.id === id ? { ...e, ...item } : e);
        this.saveEmotionalStates();
    }
    async deleteEmotionalState(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_emotional_state", { id });
        this.emotionalStates = this.emotionalStates.filter(e => e.id !== id);
        return { success: true };
    }
    private async saveEmotionalStates() {
        for (const item of this.emotionalStates) {
            try {
                await invoke("save_emotional_state", { state: $state.snapshot(item) });
            } catch (e) {
                console.error("[WorkspaceStore] Error saving emotional state:", e);
            }
        }
    }

    // --- Tags ---
    addTag(item: Omit<Tag, "id">) {
        this.tags.push({ ...item, id: crypto.randomUUID() });
        this.saveTags();
    }
    updateTag(id: string, item: Partial<Tag>) {
        this.tags = this.tags.map(t => t.id === id ? { ...t, ...item } : t);
        this.saveTags();
    }
    async deleteTag(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_tag", { id });
        this.tags = this.tags.filter(t => t.id !== id);
        return { success: true };
    }
    private async saveTags() {
        for (const item of this.tags) {
            try {
                await invoke("save_tag", { tag: $state.snapshot(item) });
            } catch (e) {
                console.error("[WorkspaceStore] Error saving tag:", e);
            }
        }
    }

    // --- Journal Entries ---
    addJournalEntry(item: Omit<JournalEntry, "id">) {
        this.journalEntries.push({ ...item, id: crypto.randomUUID() });
        this.deduplicateJournalEntries();
    }
    updateJournalEntry(id: string, item: Partial<JournalEntry>) {
        this.journalEntries = this.journalEntries.map(j => j.id === id ? { ...j, ...item } : j);
        this.deduplicateJournalEntries();
    }
    async deleteJournalEntry(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_journal_entry", { id });
        this.journalEntries = this.journalEntries.filter(j => j.id !== id);
        return { success: true };
    }
    private async saveJournalEntries() {
        for (const entry of this.journalEntries) {
            try {
                await invoke("save_journal_entry", { entry: $state.snapshot(entry) });
            } catch (e) {
                console.error("[WorkspaceStore] Error saving journal entry:", e);
            }
        }
    }
    private async deduplicateJournalEntries() {
        const uniqueEntries = new Map<string, JournalEntry>();
        for (const entry of this.journalEntries) {
            const key = `${entry.date.split('T')[0]}_${entry.emotional_state_id}_${entry.intensity}`;
            if (!uniqueEntries.has(key) || entry.id === this.journalEntries[this.journalEntries.length - 1].id) {
                uniqueEntries.set(key, entry);
            }
        }
        
        let shouldSave = uniqueEntries.size !== this.journalEntries.length;
        this.journalEntries = Array.from(uniqueEntries.values());
        
        if (shouldSave) {
            await this.saveJournalEntries();
        }
    }

    getJournalEntryByDate(date: string) {
        console.log("[WorkspaceStore] getJournalEntryByDate checking:", date);
        const searchDate = date.split('T')[0];

        const match = this.journalEntries.find(e => {
            if (!e.date) return false;
            return e.date.split('T')[0] === searchDate;
        });

        if (match) console.log("  found match!", match.id);
        else console.log("  no match found.");
        return match;
    }

    clearWorkspace() {
        this.strategies = [];
        this.emotionalStates = [];
        this.tags = [];
        this.journalEntries = [];
    }
}

export const workspaceStore = new WorkspaceStore();
