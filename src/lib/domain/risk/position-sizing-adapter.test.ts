import { describe, it, expect } from 'vitest';
import { adaptPositionSizingInput } from './position-sizing-adapter';
import type { RiskProfile, Asset, GrowthPhase } from '$lib/types';

describe('Position Sizing Adapter', () => {
    
    // Mock base configuration objects
    const baseProfile: Partial<RiskProfile> = {
        max_risk_per_trade_percent: 1.5,
        capital_source: 'Fixed',
        fixed_capital: 10000,
        growth_plan_enabled: true,
        current_phase_index: 0
    };

    const baseAsset: Partial<Asset> = {
        point_value: 0.20,
        min_contracts: 1,
        max_contracts: 100,
        default_stop_points: 150
    };

    const basePhase: Partial<GrowthPhase> = {
        lot_size: 5
    };

    it('extracts input correctly when all configs exist', () => {
        const input = adaptPositionSizingInput(
            baseProfile as RiskProfile, 
            baseAsset as Asset,
            basePhase as GrowthPhase,
            undefined // Account balance overrides
        );

        expect(input).toBeDefined();
        if(!input) return;

        expect(input.capital).toBe(10000);
        expect(input.riskPerTradePercent).toBe(1.5);
        expect(input.stopPoints).toBe(150);
        expect(input.pointValue).toBe(0.20);
        expect(input.minContracts).toBe(1);
        expect(input.maxContracts).toBe(100);
        expect(input.maxContractsPhase).toBe(5);
    });

    it('returns null if profile capital_source is missing override when needed', () => {
        // Linked Account but we didn't pass the linked balance
        const linkProfile = { ...baseProfile, capital_source: 'LinkedAccount', linked_account_id: 'x' };
        
        const input = adaptPositionSizingInput(
            linkProfile as RiskProfile, 
            baseAsset as Asset,
            undefined,
            undefined // Missing parameter from store layer
        );

        expect(input).toBeNull();
    });

    it('accepts balance overrides if capital_source is LinkedAccount', () => {
        const linkProfile = { ...baseProfile, capital_source: 'LinkedAccount', linked_account_id: 'x' };
        
        const input = adaptPositionSizingInput(
            linkProfile as RiskProfile, 
            baseAsset as Asset,
            undefined,
            25000 // Valid external balance
        );

        expect(input).toBeDefined();
        if(!input) return;
        
        expect(input.capital).toBe(25000);
    });

    it('falls back to optional undefined constraints if Asset does not provide them', () => {
        const emptyAsset: Partial<Asset> = {
            point_value: 1.0
            // No min/max/stop limits
        };

        const input = adaptPositionSizingInput(
            baseProfile as RiskProfile, 
            emptyAsset as Asset,
            undefined, 
            undefined 
        );

        expect(input).toBeDefined();
        if(!input) return;

        expect(input.stopPoints).toBe(0); // If undefined, should pass 0 to let engine reject it! Engine handles validity, adapter is dumb mapper.
        expect(input.minContracts).toBeUndefined();
        expect(input.maxContracts).toBeUndefined();
        expect(input.maxContractsPhase).toBeUndefined();
    });
});
