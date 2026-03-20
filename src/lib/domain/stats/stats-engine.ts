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
  // Novos campos do Dashboard Fase 3
  weekResult: number;
  weekPositiveDays: number;
  weekNegativeDays: number;
  insights: string[];
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
      insights: ["Adicione seu primeiro trade para gerar insights."],
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

  // Lógica Semanal
  let weekRes = 0;
  const weekDailyResults: Record<string, number> = {};
  
  // Encontrar o início da semana atual (Assumindo segunda-feira = início)
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  // Re-lap over trades to find current week data accurately
  trades.forEach(t => {
    try {
      const tDate = parseISO(t.date);
      const tExitDate = t.exit_date ? parseISO(t.exit_date) : tDate;
      const tTime = tExitDate.getTime();
      
      if (tTime >= startOfWeek.getTime() && tTime <= baseDate.getTime()) {
        const res = convertTradeResult(t);
        weekRes += res;
        const dateKey = format(tExitDate, "yyyy-MM-dd");
        weekDailyResults[dateKey] = (weekDailyResults[dateKey] || 0) + res;
      }
    } catch {}
  });

  let weekPositiveDays = 0;
  let weekNegativeDays = 0;
  Object.values(weekDailyResults).forEach(val => {
    if (val > 0) weekPositiveDays++;
    else if (val < 0) weekNegativeDays++;
  });

  // Insights Generator
  const insights: string[] = [];
  if (tradesToday > 5) {
    insights.push("Você já operou muitas vezes hoje. Cuidado com o overtrading.");
  } else if (tradesToday > 0 && tradesToday <= 3) {
    insights.push("Operações precisas. Bom foco no plano até agora.");
  }

  if (dayRes > 0 && tradesToday > 0) {
    insights.push("Dia positivo! Considere proteger seu lucro e encerrar o terminal.");
  } else if (dayRes < 0) {
    insights.push("Dia negativo. Respire fundo e certifique-se de estar respeitando seu limite diário.");
  }

  if (weekNegativeDays > weekPositiveDays && weekPositiveDays + weekNegativeDays >= 3) {
    insights.push("A semana está mais vendedora. Reavalie o contexto do mercado.");
  } else if (weekPositiveDays > weekNegativeDays && weekPositiveDays >= 2) {
    insights.push("Semana consistente! Continue focando nos setups de maior qualidade.");
  }
  
  // Limita a 3 insights máximo para não poluir
  const finalInsights = insights.slice(0, 3);
  if (finalInsights.length === 0 && tradesToday === 0) {
     finalInsights.push("Terminal sincronizado. Aguardando novos trades.");
  }

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
