const browser = typeof window !== "undefined";
import type { BehavioralInsight } from "$lib/domain/insights/insights-engine";
import { format } from "date-fns";

export interface HistoricalInsight extends BehavioralInsight {
    date: string; // ISO date 'YYYY-MM-DD'
    id: string;
}

class EvolutionStore {
    history = $state<HistoricalInsight[]>([]);

    constructor() {
        if (browser) {
            const saved = localStorage.getItem('trader_evolution_history');
            if (saved) {
                try {
                    this.history = JSON.parse(saved);
                } catch(e) {
                    console.error("Failed to parse evolution history", e);
                }
            }
        }
    }

    saveSnapshot(insights: BehavioralInsight[], date: Date) {
        if (!browser) return;
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Remove os do mesmo dia para não duplicar se rodar múltiplas vezes, mantendo o mais "recente" do dia
        const filtered = this.history.filter(h => h.date !== dateStr);
        
        const newHistorical = insights.map(i => ({ ...i, date: dateStr }));
        this.history = [...filtered, ...newHistorical];
        
        // Ordena do mais recente para o mais antigo
        this.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        localStorage.setItem('trader_evolution_history', JSON.stringify(this.history));
    }

    // Calcula a pontuação disciplinar do trader baseado no histórico
    get traderScore() {
        let base = 100;
        this.history.forEach(h => {
            if (h.type === 'danger') base -= 8;
            if (h.type === 'warning') base -= 3;
            if (h.type === 'positive') base += 2;
        });
        return Math.max(0, Math.min(base, 100)); // Limita entre 0 e 100
    }

    // Retorna a frequência de cada infração/acerto
    get insightFrequencies() {
        const freqs: Record<string, { count: number, type: 'positive' | 'warning' | 'danger', title: string }> = {};
        this.history.forEach(h => {
            if (!freqs[h.id]) {
                freqs[h.id] = { count: 0, type: h.type, title: h.title };
            }
            freqs[h.id].count++;
        });
        return Object.values(freqs).sort((a, b) => b.count - a.count);
    }
}

export const evolutionStore = new EvolutionStore();
