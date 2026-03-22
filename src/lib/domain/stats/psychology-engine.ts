import type { Trade, JournalEntry, EmotionalState } from "$lib/types";

export interface EmotionMatrixRow {
    emotionId: string;
    emotionName: string;
    impact: 'Positive' | 'Negative' | 'Neutral';
    tradeCount: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnL: number;
    avgPnL: number;
}

export interface PsychologyDiagnosis {
    conclusions: string[];
    recommendations: string[];
    killerEmotion: EmotionMatrixRow | null;
    saviorEmotion: EmotionMatrixRow | null;
    matrix: EmotionMatrixRow[];
    lossesInNegativeStatePercent: number | null;
    totalLosses: number;
    psychoScore: number;
}

/**
 * Função O(n) que gera todos os dados do Psycho Dashboard
 */
export function analyzePsychology(
    trades: Trade[],
    reviews: JournalEntry[],
    emotionalStates: EmotionalState[],
    getTradeResult: (t: Trade) => number
): PsychologyDiagnosis {
    const matrixMap = new Map<string, EmotionMatrixRow>();

    // Inicializa a matriz para emoções que pelo menos existem no banco para evitar checks nulos complexos
    emotionalStates.forEach(state => {
        matrixMap.set(state.id, {
            emotionId: state.id,
            emotionName: state.name,
            impact: state.impact,
            tradeCount: 0,
            winCount: 0,
            lossCount: 0,
            winRate: 0,
            totalPnL: 0,
            avgPnL: 0
        });
    });

    let totalLosingTrades = 0;
    let lossesInNegativeStates = 0;

    // Aggregation O(n) sobre os trades
    trades.forEach(t => {
        const res = getTradeResult(t);
        const emotionId = t.entry_emotional_state_id;

        if (res < 0) totalLosingTrades++;

        if (emotionId) {
            const row = matrixMap.get(emotionId);
            if (row) {
                row.tradeCount++;
                row.totalPnL += res;
                if (res > 0) row.winCount++;
                else if (res < 0) {
                    row.lossCount++;
                    if (row.impact === 'Negative') {
                        lossesInNegativeStates++;
                    }
                }
            }
        }
    });

    // Finalizar cálculos da Matriz (Médias e WR)
    const activeMatrix: EmotionMatrixRow[] = [];
    matrixMap.forEach(row => {
        if (row.tradeCount > 0) {
            row.winRate = row.winCount / row.tradeCount;
            row.avgPnL = row.totalPnL / row.tradeCount;
            activeMatrix.push(row);
        }
    });

    // Ordenar matriz por PnL (maior para menor)
    activeMatrix.sort((a, b) => b.totalPnL - a.totalPnL);

    let saviorEmotion = null;
    let killerEmotion = null;

    if (activeMatrix.length > 0) {
        // Savior é o que tem PnL Positivo mais alto (se houver lucro)
        const best = activeMatrix[0];
        if (best.totalPnL > 0) saviorEmotion = best;

        // Killer é o que tem o PnL Negativo mais fundo
        const worst = activeMatrix[activeMatrix.length - 1];
        if (worst.totalPnL < 0) killerEmotion = worst;
    }

    // Calcula % de prejuízo atrelado diretamente a estados negativos
    let lossesInNegativeStatePercent = null;
    if (totalLosingTrades >= 3) {
        lossesInNegativeStatePercent = lossesInNegativeStates / totalLosingTrades;
    }

    // --- DIAGNÓSTICO (1 a 3 conclusões) ---
    const conclusions: string[] = [];
    
    if (killerEmotion) {
        conclusions.push(`O estado de "${killerEmotion.emotionName}" é seu ofensor primário, custando ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(killerEmotion.totalPnL))}.`);
    }

    if (saviorEmotion) {
        conclusions.push(`A emoção "${saviorEmotion.emotionName}" se prova sua zona de edge matemático, com Win Rate de ${(saviorEmotion.winRate * 100).toFixed(0)}%.`);
    }

    if (lossesInNegativeStatePercent !== null && lossesInNegativeStatePercent > 0.6) {
        conclusions.push(`Alerta: ${(lossesInNegativeStatePercent * 100).toFixed(0)}% das suas perdas acontecem sob efeitos emocionais adversos. O viés comportamental está sobrepondo a técnica.`);
    } else if (conclusions.length < 3 && trades.length > 10) {
        conclusions.push("Sem grandes discrepâncias matemáticas entre emoções e resultado. Flutuação mecânica normal.");
    }
    
    // --- RECOMENDAÇÕES (Decision Layer) ---
    const recommendations: string[] = [];

    // Baseado no ofensor
    if (killerEmotion) {
        if (killerEmotion.lossCount > killerEmotion.winCount) {
            recommendations.push(`NÃO OPERAR caso detecte o sentimento de ${killerEmotion.emotionName} antes do pregão.`);
        } else {
            recommendations.push(`Reduzir tamanho do lote pela metade ao operar sentindo ${killerEmotion.emotionName}.`);
        }
    }

    // Baseado na salvação
    if (saviorEmotion && saviorEmotion.tradeCount > 3) {
        recommendations.push(`Aumentar a confiança e expor risco normal (ou superior) ao engatilhar operações sob ${saviorEmotion.emotionName}.`);
    }

    // Fallback se faltar recomendação
    if (recommendations.length < 2) {
        if (reviews.length < Math.floor(trades.length / 3)) {
            recommendations.push("Aumentar o volume de registro de Daily Reviews para treinar a IA na leitura do seu sentimento diário.");
        } else {
            recommendations.push("Manter o plano rigoroso. Padrões emocionais atuais estão domados.");
        }
    }

    // Calcular um Psycho Score rústico local baseado no volume de trades em flow vs tilt
    let totalPositiveWeight = 0;
    let totalNegativeWeight = 0;
    let totalWeight = 0;

    activeMatrix.forEach(row => {
        const weight = row.tradeCount;
        totalWeight += weight;
        if (row.impact === 'Positive') totalPositiveWeight += weight;
        if (row.impact === 'Negative') totalNegativeWeight += weight;
    });

    let psychoScore = 50; // default neutro
    if (totalWeight > 0) {
        const balance = (totalPositiveWeight - totalNegativeWeight) / totalWeight; // vai de -1 a 1
        psychoScore = Math.max(0, Math.min(100, 50 + (balance * 50)));
        // Se a WR sob estados negativos for péssima, penaliza o score
        if (killerEmotion && killerEmotion.impact === 'Negative' && killerEmotion.totalPnL < 0) {
            psychoScore -= 10;
        }
    } else {
        psychoScore = 0; // Se não tem dados
    }

    return {
        matrix: activeMatrix,
        conclusions: conclusions.slice(0, 3),
        recommendations: recommendations.slice(0, 3),
        killerEmotion,
        saviorEmotion,
        lossesInNegativeStatePercent,
        totalLosses: totalLosingTrades,
        psychoScore: Math.round(Math.max(0, psychoScore))
    };
}
