import { parseISO, isSameDay } from "date-fns";
import { parseSafeDate } from "$lib/utils";
import type { TradeConverter } from "../stats/stats-engine";

export interface BehavioralInsight {
    id: string;
    type: 'positive' | 'warning' | 'danger';
    title: string;
    description: string;
    weight: number;
}

export function generateTraderInsights(
    trades: any[],
    baseDate: Date,
    convertTradeResult: TradeConverter,
    dayResult: number,
    weekPositiveDays: number,
    weekNegativeDays: number
): BehavioralInsight[] {
    const insights: BehavioralInsight[] = [];

    if (!trades || trades.length === 0) {
        return [{
            id: 'no_trades',
            type: 'positive',
            title: 'Terminal Vazio',
            description: 'Nenhum trade sincronizado. Faça sua primeira operação para gerar contexto.',
            weight: 0
        }];
    }

    // 1. Filtrar trades de hoje
    const todaysTrades = trades.filter(t => {
        try {
            const tDate = parseISO(t.exit_date || t.date);
            return isSameDay(tDate, baseDate);
        } catch { return false; }
    }).sort((a, b) => {
        const da = parseSafeDate(a.exit_date || a.date).getTime();
        const db = parseSafeDate(b.exit_date || b.date).getTime();
        return da - db;
    });

    const todaysResults = todaysTrades.map(t => convertTradeResult(t));
    const tradesToday = todaysResults.length;

    // --- ALGORITMO 1: REVENGE TRADING / TILT (Danger) ---
    if (tradesToday >= 3) {
        let consecutiveLosses = 0;
        let maxConsecutiveLosses = 0;
        // Looking at the sequence
        for (const res of todaysResults) {
            if (res < 0) {
                consecutiveLosses++;
                if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
            } else if (res > 0) {
                consecutiveLosses = 0;
            }
        }

        if (maxConsecutiveLosses >= 3) {
            insights.push({
                id: 'revenge_trading',
                type: 'danger',
                title: 'Tilt Iminente (Revenge Trading)',
                description: `Você sofreu ${maxConsecutiveLosses} perdas seguidas hoje. O impulso de recuperar logo em seguida destrói contas. Limpe a mente.`,
                weight: 100 // Maior prioridade
            });
        }
    }

    // --- ALGORITMO 2: DEVOLUÇÃO DE LUCROS DA MESA (Warning) ---
    if (tradesToday >= 3 && dayResult > 0) {
        let peakDay = 0;
        let runningDayPnL = 0;
        for (const res of todaysResults) {
            runningDayPnL += res;
            if (runningDayPnL > peakDay) peakDay = runningDayPnL;
        }

        // Se devolveu mais de 40% do pico e o pico foi significante (ex: bateu R$100 e caiu pra R$50)
        if (peakDay > 0 && dayResult < peakDay * 0.6) {
            insights.push({
                id: 'profit_giveback',
                type: 'warning',
                title: 'Devolução de Lucros',
                description: `Você chegou a estar positivo em ${formatCurrencyFallback(peakDay)}, mas já devolveu ${(100 - (dayResult/peakDay)*100).toFixed(0)}% para a mesa. Não deixe o dia virar negativo.`,
                weight: 80
            });
        }
    }

    // --- ALGORITMO 3: EFEITO PARETO / CONCENTRAÇÃO (Warning) ---
    if (tradesToday >= 4 && dayResult > 0) {
        const sortedWins = [...todaysResults].filter(r => r > 0).sort((a, b) => b - a);
        if (sortedWins.length > 0) {
            const bestTradePos = sortedWins[0];
            const sumWins = sortedWins.reduce((acc, val) => acc + val, 0);
            
            if (sumWins > 0 && (bestTradePos / sumWins) > 0.7) {
                insights.push({
                    id: 'pareto_concentration',
                    type: 'warning',
                    title: 'Resultado Concentrado',
                    description: 'Atenção: 1 único trade foi responsável por mais de 70% dos seus ganhos hoje. Isso mascara o risco real das outras operações.',
                    weight: 60
                });
            }
        }
    }

    // --- ALGORITMO 4: TIME-OF-DAY EDGE (Positive) ---
    // Analisaremos o histórico (não só de hoje) para achar onde ele ganha mais
    let morningWin = 0; let morningLoss = 0;
    let afternoonWin = 0; let afternoonLoss = 0;

    trades.forEach(t => {
        try {
            const d = parseSafeDate(t.exit_date || t.date);
            const res = convertTradeResult(t);
            const hour = d.getHours();

            if (hour >= 9 && hour < 12) {
                if (res > 0) morningWin += res; else morningLoss += Math.abs(res);
            } else if (hour >= 12 && hour < 18) {
                if (res > 0) afternoonWin += res; else afternoonLoss += Math.abs(res);
            }
        } catch {}
    });

    const morningNet = morningWin - morningLoss;
    const afternoonNet = afternoonWin - afternoonLoss;
    const totalNetHistorical = morningNet + afternoonNet;

    // Se o trader ganha incrivelmente mais em uma janela de tempo
    if (morningNet > 0 && morningNet > afternoonNet * 2 && (morningNet / (totalNetHistorical || 1)) > 0.7) {
        insights.push({
            id: 'time_edge_morning',
            type: 'positive',
            title: 'Time Edge: Manhã',
            description: 'Matematicamente, você é muito superior operando de manhã (9h-12h). Evite abrir novas posições à tarde.',
            weight: 40
        });
    } else if (afternoonNet > 0 && afternoonNet > morningNet * 2 && (afternoonNet / (totalNetHistorical || 1)) > 0.7) {
        insights.push({
            id: 'time_edge_afternoon',
            type: 'positive',
            title: 'Time Edge: Tarde',
            description: 'Seus melhores reads acontecem após as 12h. Segure a ansiedade pela manhã e espere a sua janela de lucro natural.',
            weight: 40
        });
    }

    // --- ALGORITMO 5: CONSISTÊNCIA PURA (Positive) ---
    if (weekPositiveDays >= 3 && weekNegativeDays === 0) {
        insights.push({
            id: 'week_consistency',
            type: 'positive',
            title: 'Execução de Alta Performance',
            description: 'Você atingiu 3 ou mais dias de gains consecutivos sem nenhum dia de loss na semana. Mantenha os lotes sob controle, não é hora de arriscar a gordura.',
            weight: 50
        });
    } else if (weekNegativeDays >= 3) {
        insights.push({
            id: 'week_drawdown',
            type: 'danger',
            title: 'Semana Vendedora Pesada',
            description: `Você fechou ${weekNegativeDays} dias no vermelho essa semana. Diminua a carga drasticamente para sobreviver ou tire um dia off.`,
            weight: 90
        });
    }

    // Ordenação final
    insights.sort((a, b) => b.weight - a.weight);

    // Se não tiver nenhum, adicionar o default
    if (insights.length === 0) {
        if (tradesToday === 0) {
            insights.push({
                id: 'no_trades_today',
                type: 'positive',
                title: 'Dia em Branco',
                description: 'Nenhuma operação hoje. Lembre-se: não operar, quando o mercado está ruim, também é operar e preservar capital.',
                weight: 10
            });
        } else if (dayResult > 0) {
            insights.push({
                id: 'good_day',
                type: 'positive',
                title: 'Dia Controlado',
                description: 'Você operou e as emoções estão sob controle. Nenhum padrão destrutivo de revenge trading detectado.',
                weight: 10
            });
        }
    }

    return insights.slice(0, 3);
}

function formatCurrencyFallback(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
