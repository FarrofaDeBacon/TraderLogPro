/**
 * Gann Analysis Utility Engine
 * Implements W.D. Gann's mathematical and geometric principles.
 */

export interface GannLevel {
    price: number;
    degrees: number;
    label: string;
}

/**
 * Gann Square of Nine Calculation
 * Based on the formula: Price = (sqrt(refPrice) + N/180)^2
 * @param refPrice The reference price (usually a significant high/low or current price)
 * @param levels An array of degrees to calculate (e.g., [45, 90, 180, 360])
 * @param direction 1 for expansion (up), -1 for retracement (down)
 */
export function calculateSquareOfNine(
    refPrice: number,
    degreesList: number[] = [45, 90, 120, 180, 225, 270, 315, 360, 450, 720],
    direction: 1 | -1 = 1
): GannLevel[] {
    if (refPrice <= 0) return [];

    const sqrtPrice = Math.sqrt(refPrice);
    
    return degreesList.map(deg => {
        const result = Math.pow(sqrtPrice + (direction * (deg / 180)), 2);
        return {
            price: Number(result.toFixed(2)),
            degrees: deg,
            label: `${deg}° ${direction > 0 ? 'Exp' : 'Ret'}`
        };
    });
}

/**
 * Get W.D. Gann's "Natural Dates" - Season Changes
 * These are historic windows for Change of Trend (COT)
 */
export function getGannNaturalDates(year: number = new Date().getFullYear()) {
    return [
        { date: new Date(year, 2, 21), label: "Vernal Equinox" },   // March 21
        { date: new Date(year, 5, 21), label: "Summer Solstice" },  // June 21
        { date: new Date(year, 8, 23), label: "Autumnal Equinox" }, // Sept 23
        { date: new Date(year, 11, 21), label: "Winter Solstice" }  // Dec 21
    ];
}

/**
 * Calculate the Cycle Day Count
 * Gann often looked at the 365.25 day circle.
 * Reversals often happen at divisions of the circle (45, 90, 180 days etc)
 */
export function getCycleDayCount(startDate: Date, targetDate: Date = new Date()): number {
    const diffTime = Math.abs(targetDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if the current date is within a "Time Window" of a Gann natural date
 * @param tolerance Days of tolerance (usually 1-3 days)
 */
export function isNearGannVibration(targetDate: Date = new Date(), tolerance: number = 2): { isNear: boolean; label: string } {
    const naturalDates = getGannNaturalDates(targetDate.getFullYear());
    
    for (const item of naturalDates) {
        const diff = Math.abs(getCycleDayCount(item.date, targetDate));
        if (diff <= tolerance || Math.abs(365 - diff) <= tolerance) {
            return { isNear: true, label: item.label };
        }
    }
    
    return { isNear: false, label: "" };
}

/**
 * Strategy Analysis: Vibration Alignment
 * Calculates percentage of wins that occurred near Gann Square of Nine levels.
 */
export function calculateVibrationAlignment(trades: any[], refPrice: number): number {
    if (!trades.length || refPrice <= 0) return 0;
    
    const winningTrades = trades.filter(t => t.result > 0);
    if (!winningTrades.length) return 0;
    
    // Standard Gann levels for alignment check
    const levels = calculateSquareOfNine(refPrice, [45, 90, 180, 270, 360]);
    let alignedCount = 0;
    
    winningTrades.forEach(t => {
        const price = Number(t.entry_price);
        // "Near" defined as 0.5% tolerance
        const isNear = levels.some(lv => Math.abs(lv.price - price) / price <= 0.005);
        if (isNear) alignedCount++;
    });
    
    return (alignedCount / winningTrades.length) * 100;
}

/**
 * Strategy Analysis: Cycle Success Rate
 * Calculates win rate on Gann Natural Dates (COT Windows)
 */
export function calculateCycleSuccessRate(trades: any[]): number {
    const cycleTrades = trades.filter(t => isNearGannVibration(new Date(t.date)).isNear);
    if (!cycleTrades.length) return 0;
    
    const wins = cycleTrades.filter(t => t.result > 0).length;
    return (wins / cycleTrades.length) * 100;
}

/**
 * Strategy Analysis: Angle Adherence
 * Estimates how well the strategy movements align with Gann 1x1 (45deg) principles.
 * This is a simplified heuristic: Gain / Time consistency.
 */
export function calculateAngleAdherence(trades: any[]): number {
    if (trades.length < 5) return 0; // Need sample size
    
    const followPlanWeight = trades.filter(t => t.followed_plan).length / trades.length;
    const wins = trades.filter(t => t.result > 0);
    if (!wins.length) return 0;
    
    // Heuristic: If wins have consistent Reward/Risk and happen in predictable cycles
    // we award higher adherence. 
    // Since we don't have the full chart, we use Plan Adherence as a proxy for 'geometric discipline'
    return followPlanWeight * 100;
}

/**
 * Calculate the average time interval between consecutive trades.
 */
export function calculateAverageTimeBetweenTrades(trades: any[]): number {
    if (trades.length < 2) return 0;
    
    const sorted = [...trades].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let totalDiff = 0;
    let count = 0;

    for (let i = 1; i < sorted.length; i++) {
        const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime();
        // Ignore intervals larger than 24h as they likely represent different sessions
        if (diff > 0 && diff < 1000 * 60 * 60 * 24) {
            totalDiff += diff;
            count++;
        }
    }
    
    return count > 0 ? totalDiff / count : 0;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
    if (ms <= 0) return "---";
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    if (totalDays > 0) return `${totalDays}d ${totalHours % 24}h`;
    if (totalHours > 0) return `${totalHours}h ${totalMinutes % 60}m`;
    if (totalMinutes > 0) return `${totalMinutes}m ${totalSeconds % 60}s`;
    return `${totalSeconds}s`;
}

