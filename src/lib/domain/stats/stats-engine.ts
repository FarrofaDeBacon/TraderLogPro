import { parseISO, isSameDay, startOfMonth, format } from "date-fns";
import { parseSafeDate } from "$lib/utils";

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
    };
  }

  // Ordenação do mais antigo para o mais novo para calcular a curva de capital exata
  const sorted = [...trades].sort((a, b) => {
    const da = parseSafeDate(a.date).getTime();
    const db = parseSafeDate(b.date).getTime();
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

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

    try {
      const tDate = parseISO(t.date);
      const tExitDate = t.exit_date ? parseISO(t.exit_date) : tDate;

      if (isSameDay(tExitDate, baseDate)) {
        dayRes += res;
        tradesToday++;
      }

      const tMonthStr = format(tExitDate, "yyyy-MM");
      if (tMonthStr === yearMonthStr) {
        monthRes += res;
      }
    } catch (e) {
      // Ignora datas incorretamente preenchidas (graceful degradation)
    }

    discSum += t.followed_plan ? 100 : 0;

    // R-Factor calculation (Reward/Risk)
    if (t.risk_amount && typeof t.risk_amount === 'number' && t.risk_amount > 0) {
      rFactorSum += (t.result || 0) / t.risk_amount;
      rFactorCount++;
    }

    return [parseSafeDate(t.date).getTime(), current];
  });

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
    discipline: discSum / validTradesCount,
    drawdown: maxDD,
    tradesToday,
    avgRFactor: rFactorCount > 0 ? rFactorSum / rFactorCount : 0,
  };
}
