import { register, init, getLocaleFromNavigator, waitLocale } from 'svelte-i18n';

// Helper: safe merge objects and detect key collisions explicitly
function safeMerge(language: string, ...modules: Record<string, any>[]) {
    const target: Record<string, any> = {};
    for (const module of modules) {
        // Handle Vite's .default JSON export
        const dict = module.default || module;
        for (const [key, value] of Object.entries(dict)) {
            // Collision Detection
            if (key in target) {
                // Determine environment context gracefully
                const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
                
                if (isDev) {
                    console.error(`[i18n CRITICAL] Namespace Collision Detected in ${language}! Top-level key "${key}" already exists. Overwrite prevented in DEV Mode.`);
                }
                
                // Do NOT overwrite existing key, ensuring domains are strictly isolated at root level.
                throw new Error(`i18n Namespace Collision: Key "${key}" duplicated in Language ${language}.`);
            }
            target[key] = value;
        }
    }
    return target;
}

export const setupI18n = async () => {
    // 1. Scalability Prep: Structured Imports
    // Future lazy loading by domain can replace this block using proxies or dynamic imports based on active route
    
    // PT-BR Modules
    register('pt-BR', async () => {
        const modules = await Promise.all([
            import('./locales/pt-BR/common.json'),
            import('./locales/pt-BR/navigation.json'),
            import('./locales/pt-BR/dashboard.json'),
            import('./locales/pt-BR/trades.json'),
            import('./locales/pt-BR/strategies.json'),
            import('./locales/pt-BR/psychology.json'),
            import('./locales/pt-BR/risk.json'),
            import('./locales/pt-BR/reports.json'),
            import('./locales/pt-BR/settings.json'),
            import('./locales/pt-BR/onboarding.json'),
            import('./locales/pt-BR/ai.json'),
            import('./locales/pt-BR/evolution.json'),
            import('./locales/pt-BR/fiscal.json'),
            import('./locales/pt-BR/auth.json')
        ]);
        return safeMerge('pt-BR', ...modules);
    });

    // EN-US Modules
    register('en-US', async () => {
        const modules = await Promise.all([
            import('./locales/en-US/common.json'),
            import('./locales/en-US/navigation.json'),
            import('./locales/en-US/dashboard.json'),
            import('./locales/en-US/trades.json'),
            import('./locales/en-US/strategies.json'),
            import('./locales/en-US/psychology.json'),
            import('./locales/en-US/risk.json'),
            import('./locales/en-US/reports.json'),
            import('./locales/en-US/settings.json'),
            import('./locales/en-US/onboarding.json'),
            import('./locales/en-US/ai.json'),
            import('./locales/en-US/evolution.json'),
            import('./locales/en-US/fiscal.json'),
            import('./locales/en-US/auth.json')
        ]);
        return safeMerge('en-US', ...modules);
    });

    // ES-ES Modules
    register('es-ES', async () => {
        const modules = await Promise.all([
            import('./locales/es-ES/common.json'),
            import('./locales/es-ES/navigation.json'),
            import('./locales/es-ES/dashboard.json'),
            import('./locales/es-ES/trades.json'),
            import('./locales/es-ES/strategies.json'),
            import('./locales/es-ES/psychology.json'),
            import('./locales/es-ES/risk.json'),
            import('./locales/es-ES/reports.json'),
            import('./locales/es-ES/settings.json'),
            import('./locales/es-ES/onboarding.json'),
            import('./locales/es-ES/ai.json'),
            import('./locales/es-ES/evolution.json'),
            import('./locales/es-ES/fiscal.json'),
            import('./locales/es-ES/auth.json')
        ]);
        return safeMerge('es-ES', ...modules);
    });

    // FR-FR Modules
    register('fr-FR', async () => {
        const modules = await Promise.all([
            import('./locales/fr-FR/common.json'),
            import('./locales/fr-FR/navigation.json'),
            import('./locales/fr-FR/dashboard.json'),
            import('./locales/fr-FR/trades.json'),
            import('./locales/fr-FR/strategies.json'),
            import('./locales/fr-FR/psychology.json'),
            import('./locales/fr-FR/risk.json'),
            import('./locales/fr-FR/reports.json'),
            import('./locales/fr-FR/settings.json'),
            import('./locales/fr-FR/onboarding.json'),
            import('./locales/fr-FR/ai.json'),
            import('./locales/fr-FR/evolution.json'),
            import('./locales/fr-FR/fiscal.json'),
            import('./locales/fr-FR/auth.json')
        ]);
        return safeMerge('fr-FR', ...modules);
    });

    const browser = typeof window !== 'undefined';
    const rawLocale = browser
        ? window.localStorage.getItem('locale') || getLocaleFromNavigator() || 'pt-BR'
        : 'pt-BR';
    
    // Compatibility Fix: map old 'en' to 'en-US'
    const initialLocale = rawLocale === 'en' ? 'en-US' : rawLocale;

    init({
        fallbackLocale: 'pt-BR',
        initialLocale,
    });

    if (browser) {
        await waitLocale();
    }
};
