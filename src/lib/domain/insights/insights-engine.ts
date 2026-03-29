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

export interface LiveIntervention {
    id: string;
    type: 'warning' | 'danger';
    message: string;
    action?: string;
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

    // Cache baseDate bounds for fast day checks
    const baseTimeStart = new Date(baseDate).setHours(0,0,0,0);
    const baseTimeEnd = new Date(baseDate).setHours(23,59,59,999);

    // 1. Filtrar trades de hoje usando timestamp pré-processado ou date string
    const todaysTrades = trades.filter(t => {
        const tTime = t.processed_timestamp || (t.date ? new Date(t.date).getTime() : 0);
        return tTime >= baseTimeStart && tTime <= baseTimeEnd;
    }).sort((a, b) => {
        const timeA = a.processed_timestamp || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.processed_timestamp || (b.date ? new Date(b.date).getTime() : 0);
        return timeA - timeB;
    });

    const todaysResults = todaysTrades.map(t => convertTradeResult(t));
    const tradesToday = todaysResults.length;

    // --- ALGORITMO 1: REVENGE TRADING / TILT (Danger) ---
    if (tradesToday >= 3) {
        let consecutiveLosses = 0;
        let maxConsecutiveLosses = 0;
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
                weight: 100
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
    let morningWin = 0; let morningLoss = 0;
    let afternoonWin = 0; let afternoonLoss = 0;

    // Otimizado: loop linear usando processed_timestamp e pré-convertendo apenas o necessário
    trades.forEach(t => {
        const tTime = t.processed_timestamp || 0;
        const d = new Date(tTime);
        const hour = d.getHours();
        const res = convertTradeResult(t);

        if (hour >= 9 && hour < 12) {
            if (res > 0) morningWin += res; else morningLoss += Math.abs(res);
        } else if (hour >= 12 && hour < 18) {
            if (res > 0) afternoonWin += res; else afternoonLoss += Math.abs(res);
        }
    });

    const morningNet = morningWin - morningLoss;
    const afternoonNet = afternoonWin - afternoonLoss;
    const totalNetHistorical = morningNet + afternoonNet;

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

    insights.sort((a, b) => b.weight - a.weight);

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

export function getLiveIntervention(
    trades: any[],
    baseDate: Date,
    convertTradeResult: TradeConverter,
    riskCockpitState?: any
): LiveIntervention | null {
    if (!trades || trades.length === 0) return null;

    const baseTimeStart = new Date(baseDate).setHours(0,0,0,0);
    const baseTimeEnd = new Date(baseDate).setHours(23,59,59,999);

    const todaysTrades = trades.filter(t => {
        const tTime = t.processed_timestamp || (t.date ? new Date(t.date).getTime() : 0);
        return tTime >= baseTimeStart && tTime <= baseTimeEnd;
    }).sort((a, b) => {
        const timeA = a.processed_timestamp || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.processed_timestamp || (b.date ? new Date(b.date).getTime() : 0);
        return timeA - timeB;
    });

    if (todaysTrades.length === 0) return null;

    const todaysResults = todaysTrades.map(t => convertTradeResult(t));
    const dayResult = todaysResults.reduce((acc, val) => acc + val, 0);

    const dailyLossLimit = riskCockpitState?.dailyRiskStatus?.effectiveMaxDailyLoss || riskCockpitState?.dailyLossLimit || 0;

    if (dailyLossLimit > 0) {
        if (dayResult < 0 && Math.abs(dayResult) >= dailyLossLimit * 0.8) {
            return {
                id: 'daily_limit_danger',
                type: 'danger',
                message: `Loss Diário Crítico: Você atingiu ${(Math.abs(dayResult) / dailyLossLimit * 100).toFixed(0)}% do limite máximo.`,
                action: 'PARE DE OPERAR'
            };
        }
    }

    let consecutiveLosses = 0;
    for (let i = todaysResults.length - 1; i >= 0; i--) {
        if (todaysResults[i] < 0) {
            consecutiveLosses++;
        } else if (todaysResults[i] > 0) {
            break;
        }
    }

    if (consecutiveLosses >= 3) {
        return {
            id: 'tilt_imminent',
            type: 'danger',
            message: `${consecutiveLosses} perdas seguidas detectadas. Risco altíssimo de Tilt.`,
            action: 'Respire fundo'
        };
    } else if (consecutiveLosses === 2) {
        return {
            id: 'consecutive_losses_2',
            type: 'warning',
            message: '2 perdas seguidas. Reduza o lote ou faça uma pausa na próxima entrada.',
        };
    }

    return null;
}
