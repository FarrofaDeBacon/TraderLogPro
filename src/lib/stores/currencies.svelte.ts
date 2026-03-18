import { invoke } from "@tauri-apps/api/core";
import type { Currency } from "$lib/types";

export class CurrenciesStore {
    currencies = $state<Currency[]>([]);

    async saveCurrencies() {
        for (const currency of this.currencies) {
            try {
                await invoke("save_currency", { currency: $state.snapshot(currency) });
            } catch (e) {
                console.error("[CurrenciesStore] Error saving currency:", e);
            }
        }
    }

    async syncExchangeRates(customApiUrl?: string | null) {
        const existingCodes = this.currencies.map(c => c.code.toUpperCase()).filter(code => code !== "BRL");
        if (existingCodes.length === 0) return;
        const pairs = existingCodes.map(code => `${code}-BRL`).join(",");
        const baseUrl = customApiUrl || "https://economia.awesomeapi.com.br/last/";
        const url = `${baseUrl}${pairs}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            let updatedCount = 0;
            this.currencies = this.currencies.map(currency => {
                const code = currency.code.toUpperCase();
                const pairKey = `${code}BRL`;
                if (data[pairKey]) {
                    updatedCount++;
                    return { ...currency, exchange_rate: parseFloat(data[pairKey].bid) };
                }
                return currency;
            });
            if (updatedCount > 0) {
                await this.saveCurrencies();
                return { success: true, count: updatedCount };
            }
        } catch (error) {
            console.error("[CurrenciesStore] Failed to sync exchange rates:", error);
            return { success: false, error: String(error) };
        }
    }

    addCurrency(item: Omit<Currency, "id">) {
        this.currencies.push({ ...item, id: crypto.randomUUID() });
        this.saveCurrencies();
    }

    updateCurrency(id: string, item: Partial<Currency>) {
        this.currencies = this.currencies.map(c => c.id === id ? { ...c, ...item } : c);
        this.saveCurrencies();
    }

    async deleteCurrency(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_currency", { id });
            this.currencies = this.currencies.filter(c => c.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    getCurrencySymbol(code: string): string {
        const currency = this.currencies.find(c => c.code.toUpperCase() === (code || "BRL").toUpperCase());
        return currency?.symbol || "R$";
    }

    clearCurrencies() {
        this.currencies = [];
    }
}

export const currenciesStore = new CurrenciesStore();
