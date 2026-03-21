import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modalitiesStore } from './modalities.svelte';
import { setupTauriMock, mockModalities } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('ModalitiesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        modalitiesStore.clearModalities();
        modalitiesStore.modalities = [...mockModalities]; // Inject initial state
    });

    it('should initialize and read the modalities accurately', () => {
        expect(modalitiesStore.modalities.length).toBe(2);
        expect(modalitiesStore.modalities[1].name).toBe('Swing Trade');
    });

    
    it('should add a newly defined modality successfully', () => {
        modalitiesStore.addModality({
            name: 'Position Trade',
            description: 'Meses a anos'
        });

        expect(modalitiesStore.modalities.length).toBe(3);
        const added = modalitiesStore.modalities.find(m => m.name === 'Position Trade');
        expect(added?.name).toBe('Position Trade');
        expect(added?.id).toBeDefined();
    });

    it('should perform partial property updates', () => {
        modalitiesStore.updateModality('modality:swing', { name: 'Swing Trading' });
        
        const updated = modalitiesStore.modalities.find(m => m.id === 'modality:swing');
        expect(updated?.name).toBe('Swing Trading');
    });

    it('should execute raw deletion accurately', async () => {
        const result = await modalitiesStore.deleteModality('modality:daytrade');
        
        expect(result.success).toBe(true);
        expect(modalitiesStore.modalities.length).toBe(1);
    });

    it('should flush all state bindings during cleanup procedures', () => {
        modalitiesStore.clearModalities();
        expect(modalitiesStore.modalities.length).toBe(0);
    });
});

