import { parseISO, isSameDay, startOfMonth, format } from "date-fns";
import { parseSafeDate } from "$lib/utils";
import { generateTraderInsights, type BehavioralInsight } from "../insights/insights-engine";

export interface DashboardStats {
  net: number;
  winRate: number;
  profitFactor: number;
  payoff: number;
  equity: number[][]; // [timestamp, value][]
  monthResult: number;
  dayResult: number;
  discipline: number; // percentage (0-100)
  drawdown: number; // maximum drawdown percentage
  tradesToday: number;
  avgRFactor: number;
  // Novos campos do Dashboard Fase 3
  weekResult: number;
  weekPositiveDays: number;
  weekNegativeDays: number;
  insights: BehavioralInsight[];
}

export interface TradeConverter {
  (trade: any): number; // Converts a trade's result into the base currency
}

/**
 * Calcula todas as estatísticas primárias necessárias para o Dashboard e acompanhamento.
 * Retirado do Svelte root page e tornado puro.
 */
export function getDashboardStats(
  trades: any[],
  baseDate: Date,
  convertTradeResult: TradeConverter
): DashboardStats {
  const thisMonth = startOfMonth(baseDate);
  const yearMonthStr = format(baseDate, "yyyy-MM");

  if (!trades || trades.length === 0) {
    return {
      net: 0,
      winRate: 0,
      profitFactor: 0,
      payoff: 0,
      equity: [],
      monthResult: 0,
      dayResult: 0,
      discipline: 100,
      drawdown: 0,
      tradesToday: 0,
      avgRFactor: 0,
      weekResult: 0,
      weekPositiveDays: 0,
      weekNegativeDays: 0,
      insights: [{ id: 'empty', type: 'positive', title: 'Terminal Vazio', description: 'Adicione seu primeiro trade para gerar insights.', weight: 0 }],
    };
  }

  // Otimizado Hydra v4: assume que os trades já chegam ordenados (pelo TradesStore)
  const sorted = trades;

  let current = 0,
    totalW = 0,
    totalL = 0,
    wins = 0,
    dayRes = 0,
    monthRes = 0,
    discSum = 0,
    peak = 0,
    maxDD = 0,
    tradesToday = 0,
    rFactorSum = 0,
    rFactorCount = 0;

  // Cache baseDate bounds for fast day/month checks
  const baseTimeStart = new Date(baseDate).setHours(0,0,0,0);
  const baseTimeEnd = new Date(baseDate).setHours(23,59,59,999);
  const monthStart = startOfMonth(baseDate).getTime();
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const equity = sorted.map((t) => {
    const res = convertTradeResult(t);
    current += res;

    // Drawdown Logic
    if (current > peak) peak = current;
    const dd = peak === 0 ? 0 : ((peak - current) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (res > 0) {
      wins++;
      totalW += res;
    } else if (res < 0) {
      totalL += Math.abs(res);
    }

    const tTime = t.processed_timestamp || 0;
    if (tTime >= baseTimeStart && tTime <= baseTimeEnd) {
      dayRes += res;
      tradesToday++;
    }

    if (tTime >= monthStart && tTime <= monthEnd) {
      monthRes += res;
    }

    discSum += t.followed_plan ? 100 : 0;

    // R-Factor calculation (Reward/Risk)
    if (t.risk_amount && typeof t.risk_amount === 'number' && t.risk_amount > 0) {
      rFactorSum += (t.result || 0) / t.risk_amount;
      rFactorCount++;
    }

    return [tTime, current];
  });

  // Lógica Semanal
  let weekRes = 0;
  const weekDailyResults: Record<string, number> = {};
  
  // Encontrar o início da semana atual (Assumindo segunda-feira = início)
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeekTime = new Date(d.setDate(diff)).setHours(0, 0, 0, 0);

  // Otimizado: Percorre a lista já processada
  trades.forEach(t => {
    const tTime = t.processed_timestamp || 0;
    
    if (tTime >= startOfWeekTime && tTime <= baseTimeEnd) {
      const res = convertTradeResult(t);
      weekRes += res;
      // Key format is still needed for weekDailyResults aggregation
      // but we only do it for trades in the current week
      const dateKey = format(new Date(tTime), "yyyy-MM-dd");
      weekDailyResults[dateKey] = (weekDailyResults[dateKey] || 0) + res;
    }
  });

  let weekPositiveDays = 0;
  let weekNegativeDays = 0;
  Object.values(weekDailyResults).forEach(val => {
    if (val > 0) weekPositiveDays++;
    else if (val < 0) weekNegativeDays++;
  });

  // Insights Generator Fase 5
  const finalInsights = generateTraderInsights(trades, baseDate, convertTradeResult, dayRes, weekPositiveDays, weekNegativeDays);

  const validTradesCount = trades.length || 1;

  return {
    net: current,
    winRate: (wins / validTradesCount) * 100,
    profitFactor: totalL === 0 ? (totalW > 0 ? 99 : 0) : totalW / totalL,
    payoff:
      wins > 0 && trades.length - wins > 0
        ? (totalW / wins) / (totalL / (trades.length - wins))
        : 0,
    equity,
    monthResult: monthRes,
    dayResult: dayRes,
    discipline: validTradesCount > 0 ? discSum / validTradesCount : 100,
    drawdown: maxDD,
    tradesToday,
    avgRFactor: rFactorCount > 0 ? rFactorSum / rFactorCount : 0,
    weekResult: weekRes,
    weekPositiveDays,
    weekNegativeDays,
    insights: finalInsights,
  };
}
