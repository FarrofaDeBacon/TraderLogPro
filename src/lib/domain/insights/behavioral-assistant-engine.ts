import type { Trade } from "$lib/types";
import type { GamificationStreaks, ScoreBreakdown } from "../stats/gamification-engine";
import { parseISO, isSameDay } from "date-fns";
import { getLocalDatePart } from "$lib/utils";

export interface ProactiveSignal {
    id: string;
    type: 'warning' | 'reminder' | 'opportunity';
    title: string;
    message: string;
    priority: number; // Maior = Mais urgente
}

export interface AssistantState {
    trades: Trade[];
    breakdown: ScoreBreakdown;
    streaks: GamificationStreaks;
}

export function getProactiveSignals(state: AssistantState): ProactiveSignal[] {
    const signals: ProactiveSignal[] = [];
    const { breakdown, streaks } = state;

    if (!breakdown || !streaks) return [];

    // --- ZONA DE PERIGO (WARNINGS) --- //
    // 1. Master Score Colapsado
    if (breakdown.stats.score < 40) {
        signals.push({
            id: 'critical_score',
            type: 'warning',
            title: 'Desempenho Crítico',
            message: 'Seu Score caiu gravemente. O mercado não perdoa desatenção. Proteja seu capital cortando as mãos ou tirando um tempo off.',
            priority: 100
        });
    }

    // 2. Traços de Tilt Baseado nos Impactos Diretos
    const worstImpact = breakdown.impacts.find(i => i.points <= -15);
    if (worstImpact) {
        signals.push({
            id: 'severe_impact_detected',
            type: 'warning',
            title: worstImpact.title,
            message: `Detectamos uma falha pesada no seu sistema (Penalidade: ${worstImpact.points} pts). Foco total em não repetir esse erro hoje.`,
            priority: 95
        });
    }

    // 3. Emoções Prejudiciais Operando
    const emotionalImpact = breakdown.impacts.find(i => i.id.startsWith('emo_'));
    if (emotionalImpact && streaks.emotionalControlStreak === 0) {
        signals.push({
            id: 'broken_emotional_control',
            type: 'warning',
            title: 'Quebra Emocional Recente',
            message: 'Suas emoções recentemente custaram pontos no Score. Lembre-se: não há lucro sem autodomínio. Respire antes do clique.',
            priority: 90
        });
    }


    // --- ZONA DE REFORÇO / ALERTA GERAL (REMINDERS) --- //
    // 4. Excesso de Lucro (Excesso de Confiança)
    if (streaks.greenStreak >= 3) {
        signals.push({
            id: 'overconfidence_reminder',
            type: 'reminder',
            title: 'Cuidado com a Arrogância',
            message: `Você vem de ${streaks.greenStreak} dias de lucro (Green Streak). O mercado vai tentar tomar de volta. Mantenha os lotes constantes.`,
            priority: 80
        });
    }

    // 5. Disciplina Quebrada
    if (streaks.disciplineStreak === 0 && breakdown.stats.score >= 40 && !worstImpact) {
        signals.push({
            id: 'discipline_rebuild',
            type: 'reminder',
            title: 'Reconstrua a Disciplina',
            message: 'A quebra de disciplina deixa feridas silenciosas. Faça da proteção ao setup sua principal meta de hoje.',
            priority: 75
        });
    }

    // 6. Impactos Médios (Warnings) do Motor Comportamental
    const mediumImpact = breakdown.impacts.find(i => i.type === 'negative' && i.points > -15 && i.points <= -5 && !i.id.startsWith('emo_'));
    if (mediumImpact) {
        signals.push({
            id: 'medium_impact_reminder',
            type: 'reminder',
            title: mediumImpact.title,
            message: mediumImpact.description.substring(0, 100) + '...',
            priority: 70
        });
    }

    // --- ZONA DE EXCELÊNCIA (OPPORTUNITIES) --- //
    // 7. Master em Execução Financeira
    if (breakdown.stats.executionScore >= 80) {
        signals.push({
            id: 'execution_mastery',
            type: 'opportunity',
            title: 'Sistematização Fluindo',
            message: 'Com WR e PF afiados, você encontrou seu Edge matemático. Repita o processo perfeitamente. Nenhuma invenção hoje.',
            priority: 65
        });
    }

    // 8. Domínio Emocional Sustentado
    if (streaks.emotionalControlStreak >= 5) {
        signals.push({
            id: 'emotional_zen',
            type: 'opportunity',
            title: 'Trader Gelado',
            message: `${streaks.emotionalControlStreak} dias mantendo as emoções saudáveis no registro. Você está ganhando blindagem.`,
            priority: 60
        });
    }
    
    // 9. Edge Mapeado (Positivos Menores)
    const positiveImpact = breakdown.impacts.find(i => i.type === 'positive' && i.id.startsWith('pos_'));
    if (positiveImpact) {
        signals.push({
            id: 'positive_edge',
            type: 'opportunity',
            title: 'Oportunidade Mapeada',
            message: positiveImpact.description,
            priority: 55 // Edge is less critical than emotional failure, so lower priority explicitly
        });
    }

    // Se nenhum sinal, adiciona um reminder neutro
    if (signals.length === 0) {
        signals.push({
            id: 'neutral_consistency',
            type: 'reminder',
            title: 'Construção Diária',
            message: 'Seu operacional está equilibrado. Lembre-se de respeitar os limites diários de loss impostos na central de Risco.',
            priority: 10
        });
    }

    // Filtra duplicatas por ID para segurança
    const uniqueSignals = Array.from(new Map(signals.map(s => [s.id, s])).values());

    // Sorting by priority highest to lowest
    const sorted = uniqueSignals.sort((a, b) => b.priority - a.priority);

    // Regra: "máximo 2 sinais ativos"
    return sorted.slice(0, 2);
}
