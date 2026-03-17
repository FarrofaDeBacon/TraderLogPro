import { describe, it, expect } from 'vitest';
import { calculatePositionSizing, type PositionSizingInput } from './position-sizing-engine';

describe('Position Sizing Engine', () => {

    it('calculates the basic sizing correctly', () => {
        const input: PositionSizingInput = {
            capital: 5000,
            riskPerTradePercent: 0.5,
            stopPoints: 100,
            pointValue: 0.20
        };

        const result = calculatePositionSizing(input);

        expect(result.isValid).toBe(true);
        expect(result.reasons).toEqual([]);
        expect(result.allowedRisk).toBe(25); // 5000 * (0.5/100)
        expect(result.riskPerContract).toBe(20); // 100 * 0.20
        expect(result.allowedContracts).toBe(1); // floor(25 / 20)
    });

    it('respects growth phase maxContracts limits', () => {
        const input: PositionSizingInput = {
            capital: 10000,
            riskPerTradePercent: 1.0,  // R$ 100 de risco permitido
            stopPoints: 100,
            pointValue: 0.20,          // R$ 20 por contrato no stop
            maxContractsPhase: 2       // Mas a fase limita a 2 contratos max
        };

        const result = calculatePositionSizing(input);

        // Teoricamente aguentava 5 contratos (100 / 20), mas a fase capou em 2.
        expect(result.isValid).toBe(true);
        expect(result.allowedContracts).toBe(2);
        expect(result.reasons).toContain("Limitado pelo máximo de contratos da Fase de Crescimento (2).");
    });

    it('respects asset direct max_contracts limits overrides phase', () => {
        const input: PositionSizingInput = {
            capital: 10000,
            riskPerTradePercent: 1.0,
            stopPoints: 100,
            pointValue: 0.20,
            maxContractsPhase: 5,     // Fase permite 5
            maxContracts: 1           // Ativo é muito volátil, admin capou o ativo em 1
        };

        const result = calculatePositionSizing(input);

        expect(result.isValid).toBe(true);
        expect(result.allowedContracts).toBe(1);
        expect(result.reasons).toContain("Limitado pelo máximo de contratos permitido pelo Ativo (1).");
    });

    it('fails when risk cannot even afford the min_contracts of the asset', () => {
        const input: PositionSizingInput = {
            capital: 1000,
            riskPerTradePercent: 0.5, // R$ 5 de risco permitido
            stopPoints: 100,
            pointValue: 0.20,         // R$ 20 de risco por contrato
            minContracts: 1
        };

        const result = calculatePositionSizing(input);

        expect(result.isValid).toBe(false);
        expect(result.allowedContracts).toBe(0);
        expect(result.reasons).toContain("Risco financeiro permitido (5.00) é insuficiente para cobrir o lote mínimo do Ativo (1 contratos = 20.00).");
    });

    it('adjusts upwards to min_contracts if the risk is sufficient but fractions evaluate to zero', () => {
        // Exemplo: não é tão comum em day-trade BR (onde o mínimo é 1 e o lotSize é 1), mas pode ocorrer se o chão truncar.
        // O engine garante que se o lote mínimo exige X, e o cara aguenta suportar X de risco, fica lá.
        const input: PositionSizingInput = {
            capital: 1000,
            riskPerTradePercent: 10.0, // R$ 100 permitido
            stopPoints: 200,
            pointValue: 0.20,         // R$ 40 por contrato longo
            minContracts: 2           // Exige 2 para operar (ex: Forex Standard Lot limits)
        };

        const result = calculatePositionSizing(input);
        
        // Teoricamente suportaria 2.5 contratos (floor = 2). Se não feriu `minContracts=2`, bate 2.
        expect(result.isValid).toBe(true);
        expect(result.allowedContracts).toBe(2);
    });

    it('returns invalid state smoothly if capital is 0 or invalid', () => {
        const input: PositionSizingInput = {
            capital: 0,
            riskPerTradePercent: 1.0,
            stopPoints: 100,
            pointValue: 0.20
        };

        const result = calculatePositionSizing(input);
        expect(result.isValid).toBe(false);
        expect(result.allowedContracts).toBe(0);
        expect(result.reasons).toContain("Capital inválido ou zerado.");
    });

    it('returns invalid state if pointValue is missing/zero', () => {
        const input: PositionSizingInput = {
            capital: 1000,
            riskPerTradePercent: 1.0,
            stopPoints: 100,
            pointValue: 0
        };

        const result = calculatePositionSizing(input);
        expect(result.isValid).toBe(false);
        expect(result.allowedContracts).toBe(0);
        expect(result.reasons).toContain("Valor do Ponto (pointValue) do ativo não configurado.");
    });

    it('returns invalid state if stopPoints is missing/zero', () => {
        const input: PositionSizingInput = {
            capital: 1000,
            riskPerTradePercent: 1.0,
            stopPoints: 0,
            pointValue: 0.20
        };

        const result = calculatePositionSizing(input);
        expect(result.isValid).toBe(false);
        expect(result.allowedContracts).toBe(0);
        expect(result.reasons).toContain("Distância do Stop (stopPoints) deve ser maior que zero.");
    });
});
