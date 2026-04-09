import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDeviceIdentity, computeLegacyCustomerId, validateLicenseKey } from './license';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

describe('License Utilities', () => {

    describe('computeDeviceIdentity', () => {
        it('should generate a consistent 12-char hash for an HWID', async () => {
            const hwid = 'TEST-DEVICE-123';
            const id1 = await computeDeviceIdentity(hwid);
            const id2 = await computeDeviceIdentity(hwid);
            
            expect(id1).toBe(id2);
            expect(id1.length).toBe(12);
            expect(id1).toMatch(/^[0-9A-F]+$/);
        });

        it('should handle undefined HWID with a fallback', async () => {
            const id = await computeDeviceIdentity(undefined);
            expect(id.length).toBe(12);
            expect(id).toBeDefined();
        });
    });

    describe('computeLegacyCustomerId', () => {
        it('should generate a hash based on identity details', async () => {
            const data = {
                name: 'Joao Silva',
                cpf: '123.456.789-00',
                birthDate: '1990-01-01',
                hardwareId: 'HWID-1'
            };
            const id1 = await computeLegacyCustomerId(data);
            const id2 = await computeLegacyCustomerId(data);
            
            expect(id1).toBe(id2);
            expect(id1.length).toBe(12);
        });

        it('should return error string if missing fields', async () => {
            const id = await computeLegacyCustomerId({ name: '', cpf: '', birthDate: '' });
            expect(id).toBe('IDENTIDADE_NAO_PREENCHIDA');
        });
    });

    describe('validateLicenseKey', () => {
        it('should succeed if backend returns valid', async () => {
            (invoke as any).mockResolvedValue({
                valid: true,
                plan: 'Pro',
                expiration: '2025-12-31'
            });

            const result = await validateLicenseKey('KEY-123', 'CID-123');
            
            expect(result.valid).toBe(true);
            expect(result.plan).toBe('Pro');
            expect(result.expiration).toBe('2025-12-31');
        });

        it('should fail if backend returns invalid', async () => {
            (invoke as any).mockResolvedValue({
                valid: false,
                error: 'Key expired'
            });

            const result = await validateLicenseKey('EXPIRED-KEY');
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Key expired');
        });

        it('should handle communication errors gracefully', async () => {
            (invoke as any).mockRejectedValue(new Error('Network panic'));

            const result = await validateLicenseKey('KEY');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Erro de comunicação');
        });
    });
});
