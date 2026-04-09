import '@testing-library/jest-dom';
import { vi } from 'vitest';

// SvelteKit Mocks
vi.mock('$app/environment', () => ({
    browser: true,
    dev: true,
    building: false,
    version: 'mock'
}));

vi.mock('$app/navigation', () => ({
    goto: vi.fn(),
    invalidate: vi.fn(),
    prefetch: vi.fn(),
    beforeNavigate: vi.fn(),
    afterNavigate: vi.fn()
}));
