import type { RiskCondition } from './types';

/**
 * Extrai o valor de uma métrica de um array de condições de risco,
 * lidando com aliasing e normalização de nomes de campos.
 */
export function extractMetricValue(conditions: RiskCondition[] | undefined, metric: string): number {
    if (!conditions) return 0;
    
    // Normalização: minúscula, remove sufixos comuns e caracteres não-alfabéticos
    const normalize = (s: string) => s.toLowerCase()
        .replace(/_financial|_amount|_target|_limit/g, '')
        .replace(/[^a-z0-9]/g, '');
        
    const searchTarget = normalize(metric);
    
    // 1. Busca exata (Respeita a precisão se houver)
    let cond = conditions.find(c => c.metric === metric);
    
    // 2. Busca por normalização/aliasing
    if (!cond) {
        cond = conditions.find(c => {
            const current = normalize(c.metric || '');
            
            // Matches diretos normalizados ou inclusões mútuas (ex: drawdownmax vs maxdrawdown)
            if (current === searchTarget) return true;
            
            // Verifica se as palavras-chave principais estão presentes em ambas
            const commonKeywords = ['drawdown', 'pnl', 'loss', 'target', 'profit', 'streak'];
            for (const kw of commonKeywords) {
                if (searchTarget.includes(kw) && current.includes(kw)) {
                   // Se ambas mencionam a mesma métrica base, aceitamos se houver 'max' ou 'limit' em comum
                   if ((searchTarget.includes('max') || searchTarget.includes('limit')) && 
                       (current.includes('max') || current.includes('limit'))) return true;
                   
                   // Fallback para nomes simples
                   if (searchTarget === kw || current === kw) return true;
                }
            }

            // Aliases específicos conhecidos
            if (searchTarget === 'profit' && (current === 'target' || current === 'netpnl')) return true;
            if (searchTarget === 'loss' && (current === 'maxdailyloss' || current === 'dailyloss' || current === 'lossdiario')) return true;
            
            return false;
        });
    }
    
    return cond ? cond.value : 0;
}

/**
 * Converte uma data (Date, string ou number) para o formato YYYY-MM-DD local.
 * Essencial para filtragem de trades por dia e consistência de datas no domínio.
 */
export function toLocalDateStr(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}
