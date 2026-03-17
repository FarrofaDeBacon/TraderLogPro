import re

file_path = r'c:\PROJETOS\TraderLogPro\src\routes\(app)\risk-control\+page.svelte'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the derived block
old_block = """    // Compute cockpit data using REAL trades
    let cockpitData = $derived(() => {
        if (!currentProfile) return null;

        // TODO: migrar este trecho para riskStore/riskCockpitState
        const stats = computeRiskStats(tradesStore.trades, currentProfile);
        
        const riskData = riskStore.riskCockpitState;

        const curve = stats.dailyEquityCurve;
        const lastValue = curve[curve.length - 1]?.value ?? 0;
        const isPositive = lastValue >= 0;

        const chartOptions = {
            animation: true,
            backgroundColor: "transparent",
            tooltip: { 
                trigger: 'axis', 
                textStyle: { fontFamily: "Inter", fontSize: 12 },
                formatter: (params: any[]) => {
                    const p = params[0];
                    return `${p.name}<br/>Resultado Acumulado: <b>${Number(p.value).toFixed(2)}</b>`;
                }
            },
            grid: { top: 10, right: 10, bottom: 30, left: 55 },
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                data: curve.map(c => c.day),
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
                axisLabel: { color: "#71717a", fontSize: 10 }
            },
            yAxis: { 
                type: 'value', 
                splitLine: {
                    lineStyle: { color: "rgba(255,255,255,0.1)", type: "dashed" }
                },
                axisLabel: { color: "#71717a", fontSize: 10 }
            },
            series: [{
                data: curve.map(c => c.value),
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 3, color: isPositive ? "#10b981" : "#f43f5e" },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' },
                            { offset: 1, color: "transparent" }
                        ]
                    }
                }
            }]
        };

        return {
            profile: currentProfile,
            // TODO: migrar este trecho para riskStore/riskCockpitState
            stats,
            riskData,
            chartOptions
        };
    });"""

new_block = """    // TODO: migrar este trecho para riskStore/riskCockpitState
    let stats = $derived(currentProfile ? computeRiskStats(tradesStore.trades, currentProfile) : null);
    
    let riskData = $derived(riskStore.riskCockpitState);

    let chartOptions = $derived(() => {
        if (!stats) return null;

        const curve = stats.dailyEquityCurve;
        const lastValue = curve[curve.length - 1]?.value ?? 0;
        const isPositive = lastValue >= 0;

        return {
            animation: true,
            backgroundColor: "transparent",
            tooltip: { 
                trigger: 'axis', 
                textStyle: { fontFamily: "Inter", fontSize: 12 },
                formatter: (params: any[]) => {
                    const p = params[0];
                    return `${p.name}<br/>Resultado Acumulado: <b>${Number(p.value).toFixed(2)}</b>`;
                }
            },
            grid: { top: 10, right: 10, bottom: 30, left: 55 },
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                data: curve.map(c => c.day),
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
                axisLabel: { color: "#71717a", fontSize: 10 }
            },
            yAxis: { 
                type: 'value', 
                splitLine: {
                    lineStyle: { color: "rgba(255,255,255,0.1)", type: "dashed" }
                },
                axisLabel: { color: "#71717a", fontSize: 10 }
            },
            series: [{
                data: curve.map(c => c.value),
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 3, color: isPositive ? "#10b981" : "#f43f5e" },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' },
                            { offset: 1, color: "transparent" }
                        ]
                    }
                }
            }]
        };
    });"""

content = content.replace(old_block, new_block)

# Replace {@const data = cockpitData()} and {#if data}
content = content.replace("        {@const data = cockpitData()}", "")
content = content.replace("        {#if data}", "        {#if currentProfile && stats && riskData && chartOptions()}")

# Replacements for `data.X` inside the template section
content = content.replace("data.profile", "currentProfile")
content = content.replace("data.riskData", "riskData")
content = content.replace("data.stats", "stats")
content = content.replace("data.chartOptions", "chartOptions()")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done.")
