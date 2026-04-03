/**
 * Normaliza uma data para string YYYY-MM-DD local sem desvio de fuso horário.
 * Essencial para motores de risco que rodam no frontend e precisam espelhar o dia civil do trader.
 */
export function toLocalDateStr(date: Date | string | null | undefined): string {
    if (!date) return '0000-00-00';
    
    // Se já for uma string YYYY-MM-DD, retorna o prefixo
    if (typeof date === 'string') {
        const isoMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '0000-00-00';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    
    // Se for objeto Date, usa métodos locais (getFullYear, etc)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Converte uma data para timestamp de início do dia (00:00:00) em tempo local.
 */
export function toLocalStartOfDay(date: Date | string): number {
    const dateStr = toLocalDateStr(date);
    return new Date(`${dateStr}T00:00:00`).getTime();
}
