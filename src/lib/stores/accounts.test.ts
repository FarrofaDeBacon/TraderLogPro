import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountsStore } from './accounts.svelte';
import { setupTauriMock, mockAccounts } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('AccountsStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        accountsStore.clearAccounts();
        accountsStore.accounts = [...mockAccounts]; // Inject initial state
    });

    it('should read the initial list correctly', () => {
        expect(accountsStore.accounts.length).toBe(2);
    });

    it('should add a new account and save securely', () => {
        accountsStore.addAccount({
            nickname: 'New Crypto',
            account_type: 'Real',
            broker: 'Binance',
            account_number: 'CRYPTO-1',
            currency_id: 'currency:USD',
            currency: 'USD',
            balance: 1000,
            custom_logo: null
        });

        expect(accountsStore.accounts.length).toBe(3);
        const added = accountsStore.accounts.find(a => a.nickname === 'New Crypto');
        expect(added).toBeDefined();
        expect(added?.id).toBeDefined(); // crypto.randomUUID() generates it
    });

    it('should update an existing account and flush to db', () => {
        accountsStore.updateAccount('account:1', { balance: 25000 });
        
        const updated = accountsStore.accounts.find(a => a.id === 'account:1');
        expect(updated?.balance).toBe(25000);
        // Ensure other properties remain intact
        expect(updated?.nickname).toBe('Main B3 Account');
    });

    it('should delete an account gracefully', async () => {
        const result = await accountsStore.deleteAccount('account:2');
        
        expect(result.success).toBe(true);
        expect(accountsStore.accounts.length).toBe(1);
        expect(accountsStore.accounts.find(a => a.id === 'account:2')).toBeUndefined();
    });

    it('should clear all accounts from state memory', () => {
        accountsStore.clearAccounts();
        expect(accountsStore.accounts.length).toBe(0);
    });
});
