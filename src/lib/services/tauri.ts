/**
 * TAURI INFRASTRUCTURE SERVICE
 * Centralized environment detection and resilient IPC (Inter-Process Communication).
 */

/**
 * Detects if the application is running within the Tauri native environment.
 * Uses window.__TAURI_INTERNALS__ as the definitive source of truth for Tauri v2.
 */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

/**
 * Executes a Tauri invoke command with safe environment detection and timeout.
 * If running in a standard browser (non-Tauri), it returns mock data to prevent crashes.
 * 
 * @param command The Rust command name
 * @param args Arguments for the command
 * @param timeoutMs Maximum time to wait for the response
 */
export async function safeInvoke<T>(
    command: string, 
    args?: any, 
    timeoutMs: number = 8000
): Promise<T | null> {
    
    if (!isTauri()) {
        console.warn(`[WebResilience] Mocking native command: ${command}`);
        
        // MOCKS DE CENÁRIO PARA AUDITORIA (Fase 4 - Escopos de Risco)
        if (command === 'get_asset_types') {
            return [
                { id: 'futu', name: 'Índices B3', code: 'FUTU' },
                { id: 'crypto', name: 'Criptoativos', code: 'CRYPTO' }
            ] as unknown as T;
        }

        if (command === 'get_assets') {
            return [
                { id: 'asset-win', symbol: 'WIN', name: 'Mini Índice', asset_type_id: 'futu' },
                { id: 'asset-wdo', symbol: 'WDO', name: 'Mini Dólar', asset_type_id: 'futu' },
                { id: 'asset-btc', symbol: 'BTC', name: 'Bitcoin', asset_type_id: 'crypto' }
            ] as unknown as T;
        }

        if (command === 'get_risk_profiles') {
            return [{
                id: 'profile-main',
                name: 'Perfil Institucional',
                active: true,
                target_type: 'Financial',
                max_daily_loss: 500,
                daily_target: 1000,
                account_type_applicability: 'All',
                linked_asset_risk_profile_ids: ['scope-futuros'], // Vínculo com o escopo
                growth_plan_id: 'plan-growth',
                risk_rules: []
            }] as unknown as T;
        }

        if (command === 'get_asset_risk_profiles') {
            return [
                {
                    id: 'scope-futuros',
                    name: 'FUTUROS', 
                    asset_ids: ['asset-win', 'asset-wdo'], 
                    asset_type_id: 'futu',
                    current_phase_index: 0,
                    growth_override_enabled: false
                }
            ] as unknown as T;
        }

        if (command === 'get_growth_plans') {
            return [{
                id: 'plan-growth',
                name: 'Growth Consistência',
                enabled: true,
                current_phase_index: 1,
                phases: [
                    { 
                        name: 'Estágio 1', 
                        lot_size: 1, 
                        conditions_to_advance: [
                            { metric: 'profit_target', operator: '>=', value: 400 },
                            { metric: 'max_daily_loss', operator: '<=', value: 100 }
                        ],
                        conditions_to_demote: []
                    },
                    { 
                        name: 'Estágio 2', 
                        lot_size: 2, 
                        conditions_to_advance: [
                            { metric: 'profit_target', operator: '>=', value: 800 },
                            { metric: 'max_daily_loss', operator: '<=', value: 200 }
                        ],
                        conditions_to_demote: [
                            { metric: 'max_drawdown', operator: '>=', value: 300 }
                        ]
                    },
                    { 
                        name: 'Estágio 3', 
                        lot_size: 5, 
                        conditions_to_advance: [],
                        conditions_to_demote: [
                            { metric: 'max_drawdown', operator: '>=', value: 1000 }
                        ]
                    }
                ]
            }] as unknown as T;
        }

        if (command === 'get_user_profile') {
            return {
                name: 'Trader Audit',
                email: 'audit@traderlog.pro',
                main_currency: 'BRL',
                onboarding_completed: true // Pula o wizard no browser
            } as unknown as T;
        }
        
        // Comandos de listagem (get_*) padrão retornam array vazio
        if (command.startsWith('get_')) {
            return [] as unknown as T;
        }
        
        // Comandos de ação retornam null/void
        return null;
    }

    try {
        // Importação dinâmica para evitar quebra de parse em navegadores comuns
        const { invoke } = await import("@tauri-apps/api/core");
        
        // Data Sanitization: CRITICAL to solve "Serialization error: invalid type: enum"
        // and deep Proxy recursion in Svelte 5.
        const sanitizedArgs = args ? JSON.parse(JSON.stringify(args)) : undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout invoking '${command}' after ${timeoutMs}ms`)), timeoutMs);
        });

        const result = await Promise.race([
            invoke(command, sanitizedArgs) as Promise<T>,
            timeoutPromise
        ]);

        return result;
    } catch (e) {
        // Manutenção do erro verdadeiro em ambiente Tauri (Condição 4 do usuário)
        console.error(`[NativeError] Failure in ${command}:`, e);
        throw e;
    }
}
