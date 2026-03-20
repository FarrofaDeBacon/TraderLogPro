import { getLocalDatePart } from "$lib/utils";

export interface TradeFilterParams {
    searchQuery: string;
    status: string; // 'all' | 'open' | 'closed'
    accountId: string; // 'all' | specific id
    strategyId: string; // 'all' | specific id
    assetTypeId: string; // 'all' | specific id
    currency: string; // 'all' | specific code
}

// Helpers que precisam ser injetados para evitar o acoplamento da store no domínio puro
export interface TradeFilterDependencies {
    getStrategyName: (strategyId: string) => string;
    getAccountCurrency: (accountId: string) => string;
}

export function filterTradesContext(
    trades: any[],
    params: TradeFilterParams,
    deps: TradeFilterDependencies
): any[] {
    return trades.filter((t) => {
        // Search filter
        if (params.searchQuery) {
            const q = params.searchQuery.toLowerCase();
            const strategyName = deps.getStrategyName(t.strategy_id).toLowerCase();
            const matchesSearch =
                (t.asset_symbol || "").toLowerCase().includes(q) ||
                strategyName.includes(q);
            if (!matchesSearch) return false;
        }

        // Status filter
        if (params.status !== "all") {
            const isClosed = t.exit_price !== null && t.exit_price !== undefined && t.exit_price !== "";
            if (params.status === "open" && isClosed) return false;
            if (params.status === "closed" && !isClosed) return false;
        }

        // Account filter
        if (params.accountId !== "all" && t.account_id !== params.accountId)
            return false;

        // Strategy filter
        if (params.strategyId !== "all" && t.strategy_id !== params.strategyId)
            return false;

        // Asset Type filter
        if (params.assetTypeId !== "all" && t.asset_type_id !== params.assetTypeId)
            return false;

        // Currency filter
        if (params.currency !== "all") {
            const curr = deps.getAccountCurrency(t.account_id);
            if (curr !== params.currency) return false;
        }

        return true;
    });
}

function getWeekKey(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
}

export interface TradeViewModelMonth {
    key: string;
    label: string; // Precisa injetar a locale function depois
    weeks: TradeViewModelWeek[];
    pnlEntries: { curr: string; val: number }[];
}

export interface TradeViewModelWeek {
    key: string;
    label: string;
    days: TradeViewModelDay[];
    pnlEntries: { curr: string; val: number }[];
}

export interface TradeViewModelDay {
    key: string;
    date: string;
    label: string;
    trades: any[];
    pnlEntries: { curr: string; val: number }[];
}

export interface DateFormattingDependencies {
    formatMonth: (date: Date) => string;
    formatWeek: (mondayDateStr: string) => string;
    formatDay: (date: Date) => string;
}

/**
 * Cria a View Model em hierarquia (Mês > Semana > Dia) requerida puramente pela interface
 */
export function getTradeViewModel(
    trades: any[],
    deps: {
        getAccountCurrency: (accountId: string) => string;
    },
    formatters: DateFormattingDependencies
): TradeViewModelMonth[] {
    const monthsMap: Record<string, any> = {};

    for (const trade of trades) {
        const dateStr = getLocalDatePart(trade.exit_date || trade.date);
        const date = new Date(dateStr + "T12:00:00");
        const monthKey = dateStr.slice(0, 7); // YYYY-MM
        const weekKey = getWeekKey(date);

        // Month Level
        if (!monthsMap[monthKey]) {
            monthsMap[monthKey] = {
                key: monthKey,
                label: formatters.formatMonth(date),
                weeks: {},
                totalPnlByCurrency: {},
                trades: [],
            };
        }
        const month = monthsMap[monthKey];
        month.trades.push(trade);

        // Week Level
        if (!month.weeks[weekKey]) {
            month.weeks[weekKey] = {
                key: weekKey,
                label: formatters.formatWeek(weekKey),
                days: {},
                totalPnlByCurrency: {},
                trades: [],
            };
        }
        const week = month.weeks[weekKey];
        week.trades.push(trade);

        // Day Level
        if (!week.days[dateStr]) {
            week.days[dateStr] = {
                key: dateStr,
                date: dateStr,
                label: formatters.formatDay(date),
                trades: [],
                totalPnlByCurrency: {},
            };
        }
        const day = week.days[dateStr];
        day.trades.push(trade);

        // Calculate PnL across levels
        const curr = deps.getAccountCurrency(trade.account_id) || "BRL";
        const res = trade.result || 0;

        day.totalPnlByCurrency[curr] = (day.totalPnlByCurrency[curr] || 0) + res;
        week.totalPnlByCurrency[curr] = (week.totalPnlByCurrency[curr] || 0) + res;
        month.totalPnlByCurrency[curr] = (month.totalPnlByCurrency[curr] || 0) + res;
    }

    return Object.values(monthsMap)
        .sort((a: any, b: any) => (b.key || "").localeCompare(a.key || ""))
        .map((month: any) => {
            const weeks = Object.values(month.weeks || {})
                .sort((a: any, b: any) =>
                    (b.key || "").localeCompare(a.key || ""),
                )
                .map((week: any) => {
                    const days = Object.values(week.days || {})
                        .sort((a: any, b: any) =>
                            (b.date || "").localeCompare(a.date || ""),
                        )
                        .map((day: any) => ({
                            ...day,
                            pnlEntries: Object.entries(
                                day.totalPnlByCurrency || {},
                            ).map(([curr, val]) => ({ curr, val })),
                        }));

                    return {
                        ...week,
                        days,
                        pnlEntries: Object.entries(
                            week.totalPnlByCurrency || {},
                        ).map(([curr, val]) => ({ curr, val })),
                    };
                });

            return {
                ...month,
                weeks,
                pnlEntries: Object.entries(
                    month.totalPnlByCurrency || {},
                ).map(([curr, val]) => ({ curr, val })),
            };
        });
}
