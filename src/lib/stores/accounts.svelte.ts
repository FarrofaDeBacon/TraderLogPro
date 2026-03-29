import { safeInvoke } from "$lib/services/tauri";
import { type Account } from "$lib/types";

export class AccountsStore {
    accounts = $state<Account[]>([]);

    async saveAccounts() {
        for (const account of this.accounts) {
            try {
                await safeInvoke("save_account", { account: $state.snapshot(account) });
            } catch (e) {
                console.error("[AccountsStore] Error saving account:", e);
            }
        }
    }

    addAccount(item: Omit<Account, "id">) {
        this.accounts.push({ ...item, id: crypto.randomUUID() });
        this.saveAccounts();
    }

    updateAccount(id: string, item: Partial<Account>) {
        this.accounts = this.accounts.map(a => a.id === id ? { ...a, ...item } : a);
        this.saveAccounts();
    }

    async deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await safeInvoke("delete_account", { id });
            this.accounts = this.accounts.filter(a => a.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    async deduplicateAccounts() {
        const seenNicks = new Set<string>();
        const toKeep: Account[] = [];
        for (const acc of this.accounts) {
            if (!seenNicks.has(acc.nickname)) {
                seenNicks.add(acc.nickname);
                toKeep.push(acc);
            } else {
                await safeInvoke("delete_account", { id: acc.id }).catch(e => console.error(e));
            }
        }
        this.accounts = toKeep;
    }

    clearAccounts() {
        this.accounts = [];
    }
}

export const accountsStore = new AccountsStore();
