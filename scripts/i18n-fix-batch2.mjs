/**
 * i18n Fix Script - Risk & Strategy keys (batch 2)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'src', 'lib', 'i18n', 'locales');

const MISSING_KEYS = {
  // === risk.json - cockpit sections ===
  "risk.cockpit.sections.dailyLoss": {
    "pt-BR": "Loss Diário", "en-US": "Daily Loss", "es-ES": "Pérdida Diaria", "fr-FR": "Perte Journalière"
  },
  "risk.cockpit.sections.drawdown": {
    "pt-BR": "Drawdown", "en-US": "Drawdown", "es-ES": "Drawdown", "fr-FR": "Drawdown"
  },
  "risk.cockpit.sections.operationalRules": {
    "pt-BR": "Regras Operacionais", "en-US": "Operational Rules", "es-ES": "Reglas Operacionales", "fr-FR": "Règles Opérationnelles"
  },
  "risk.cockpit.sections.survivalRules": {
    "pt-BR": "Regras de Sobrevivência", "en-US": "Survival Rules", "es-ES": "Reglas de Supervivencia", "fr-FR": "Règles de Survie"
  },
  // === risk.form ===
  "risk.form.labels.capitalBase": {
    "pt-BR": "Capital Base", "en-US": "Base Capital", "es-ES": "Capital Base", "fr-FR": "Capital de Base"
  },
  "risk.form.labels.dailyLoss": {
    "pt-BR": "Loss Diário Máximo", "en-US": "Maximum Daily Loss", "es-ES": "Pérdida Diaria Máxima", "fr-FR": "Perte Journalière Maximum"
  },
  "risk.form.labels.dailyTarget": {
    "pt-BR": "Meta Diária", "en-US": "Daily Target", "es-ES": "Meta Diaria", "fr-FR": "Objectif Journalier"
  },
  "risk.form.labels.profileName": {
    "pt-BR": "Nome do Perfil", "en-US": "Profile Name", "es-ES": "Nombre del Perfil", "fr-FR": "Nom du Profil"
  },
  "risk.form.labels.riskPerTrade": {
    "pt-BR": "Risco por Trade", "en-US": "Risk per Trade", "es-ES": "Riesgo por Operación", "fr-FR": "Risque par Trade"
  },
  // === risk.growth ===
  "risk.growth.addPhase": {
    "pt-BR": "Adicionar Fase", "en-US": "Add Phase", "es-ES": "Añadir Fase", "fr-FR": "Ajouter une Phase"
  },
  "risk.growth.maxLotsLabel": {
    "pt-BR": "Lote Máximo", "en-US": "Max Lots", "es-ES": "Lote Máximo", "fr-FR": "Lot Maximum"
  },
  "risk.growth.metrics.consistency": {
    "pt-BR": "Consistência", "en-US": "Consistency", "es-ES": "Consistencia", "fr-FR": "Constance"
  },
  "risk.growth.metrics.dailyLoss": {
    "pt-BR": "Loss Diário", "en-US": "Daily Loss", "es-ES": "Pérdida Diaria", "fr-FR": "Perte Journalière"
  },
  "risk.growth.metrics.dailyTarget": {
    "pt-BR": "Meta Diária", "en-US": "Daily Target", "es-ES": "Meta Diaria", "fr-FR": "Objectif Journalier"
  },
  "risk.growth.metrics.days": {
    "pt-BR": "Dias", "en-US": "Days", "es-ES": "Días", "fr-FR": "Jours"
  },
  "risk.growth.metrics.drawdown": {
    "pt-BR": "Drawdown", "en-US": "Drawdown", "es-ES": "Drawdown", "fr-FR": "Drawdown"
  },
  "risk.growth.metrics.lossStreak": {
    "pt-BR": "Sequência de Loss", "en-US": "Loss Streak", "es-ES": "Racha de Pérdidas", "fr-FR": "Série de Pertes"
  },
  "risk.growth.metrics.profit": {
    "pt-BR": "Lucro", "en-US": "Profit", "es-ES": "Beneficio", "fr-FR": "Profit"
  },
  "risk.growth.metrics.totalTarget": {
    "pt-BR": "Meta Total", "en-US": "Total Target", "es-ES": "Meta Total", "fr-FR": "Objectif Total"
  },
  "risk.growth.metrics.winRate": {
    "pt-BR": "Taxa de Acerto", "en-US": "Win Rate", "es-ES": "Tasa de Acierto", "fr-FR": "Taux de Réussite"
  },
  "risk.growth.phaseNameLabel": {
    "pt-BR": "Nome da Fase", "en-US": "Phase Name", "es-ES": "Nombre de la Fase", "fr-FR": "Nom de la Phase"
  },
  "risk.growth.phases": {
    "pt-BR": "Fases de Crescimento", "en-US": "Growth Phases", "es-ES": "Fases de Crecimiento", "fr-FR": "Phases de Croissance"
  },
  // === risk.growthPlan ===
  "risk.growthPlan.planNameLabel": {
    "pt-BR": "Nome do Plano", "en-US": "Plan Name", "es-ES": "Nombre del Plan", "fr-FR": "Nom du Plan"
  },
  "risk.growthPlan.drawdownUnit": {
    "pt-BR": "Unidade de Drawdown", "en-US": "Drawdown Unit", "es-ES": "Unidad de Drawdown", "fr-FR": "Unité de Drawdown"
  },
  "risk.growthPlan.financial": {
    "pt-BR": "Financeiro", "en-US": "Financial", "es-ES": "Financiero", "fr-FR": "Financier"
  },
  "risk.growthPlan.points": {
    "pt-BR": "Pontos", "en-US": "Points", "es-ES": "Puntos", "fr-FR": "Points"
  },
  "risk.growthPlan.targetUnit": {
    "pt-BR": "Unidade de Meta", "en-US": "Target Unit", "es-ES": "Unidad de Meta", "fr-FR": "Unité d'Objectif"
  },
  // === risk.growthPlans ===
  "risk.growthPlans.title": {
    "pt-BR": "Planos de Crescimento", "en-US": "Growth Plans", "es-ES": "Planes de Crecimiento", "fr-FR": "Plans de Croissance"
  },
  "risk.growthPlans.description": {
    "pt-BR": "Gerencie seus planos de crescimento progressivo.", "en-US": "Manage your progressive growth plans.", "es-ES": "Gestione sus planes de crecimiento progresivo.", "fr-FR": "Gérez vos plans de croissance progressive."
  },
  "risk.growthPlans.new": {
    "pt-BR": "Novo Plano", "en-US": "New Plan", "es-ES": "Nuevo Plan", "fr-FR": "Nouveau Plan"
  },
  // === risk.management ===
  "risk.management.phases": {
    "pt-BR": "Fases do Plano", "en-US": "Plan Phases", "es-ES": "Fases del Plan", "fr-FR": "Phases du Plan"
  },
  // === risk.messages ===
  "risk.messages.nextPhaseFallback": {
    "pt-BR": "Fase final atingida.", "en-US": "Final phase reached.", "es-ES": "Fase final alcanzada.", "fr-FR": "Phase finale atteinte."
  },
  "risk.messages.removePhase": {
    "pt-BR": "Remover esta fase?", "en-US": "Remove this phase?", "es-ES": "¿Eliminar esta fase?", "fr-FR": "Supprimer cette phase ?"
  },
  "risk.messages.restartSuccess": {
    "pt-BR": "Plano reiniciado com sucesso!", "en-US": "Plan restarted successfully!", "es-ES": "¡Plan reiniciado exitosamente!", "fr-FR": "Plan redémarré avec succès !"
  },
  // === risk.plan ===
  "risk.plan.active": {
    "pt-BR": "Ativo", "en-US": "Active", "es-ES": "Activo", "fr-FR": "Actif"
  },
  "risk.plan.finance.maxDailyLoss": {
    "pt-BR": "Loss Diário Máximo", "en-US": "Maximum Daily Loss", "es-ES": "Pérdida Diaria Máxima", "fr-FR": "Perte Journalière Maximum"
  },
  "risk.plan.new": {
    "pt-BR": "Novo Perfil de Risco", "en-US": "New Risk Profile", "es-ES": "Nuevo Perfil de Riesgo", "fr-FR": "Nouveau Profil de Risque"
  },
  "risk.plan.scope.assets": {
    "pt-BR": "Ativos", "en-US": "Assets", "es-ES": "Activos", "fr-FR": "Actifs"
  },
  // === risk.rules ===
  "risk.rules.active": {
    "pt-BR": "Regra Ativa", "en-US": "Active Rule", "es-ES": "Regla Activa", "fr-FR": "Règle Active"
  },
  "risk.rules.advanced.title": {
    "pt-BR": "Configurações Avançadas", "en-US": "Advanced Settings", "es-ES": "Configuración Avanzada", "fr-FR": "Paramètres Avancés"
  },
  "risk.rules.combined.title": {
    "pt-BR": "Regras Combinadas", "en-US": "Combined Rules", "es-ES": "Reglas Combinadas", "fr-FR": "Règles Combinées"
  },
  "risk.rules.combined.add": {
    "pt-BR": "Adicionar Regra", "en-US": "Add Rule", "es-ES": "Añadir Regla", "fr-FR": "Ajouter une Règle"
  },
  "risk.rules.combined.name": {
    "pt-BR": "Nome da Regra", "en-US": "Rule Name", "es-ES": "Nombre de la Regla", "fr-FR": "Nom de la Règle"
  },
  "risk.rules.combined.namePlaceholder": {
    "pt-BR": "Ex: Regra de Drawdown Semanal", "en-US": "E.g.: Weekly Drawdown Rule", "es-ES": "Ej: Regla de Drawdown Semanal", "fr-FR": "Ex : Règle de Drawdown Hebdomadaire"
  },
  "risk.rules.combined.none": {
    "pt-BR": "Nenhuma regra definida.", "en-US": "No rules defined.", "es-ES": "Ninguna regla definida.", "fr-FR": "Aucune règle définie."
  },
  "risk.rules.combined.linkedProfiles": {
    "pt-BR": "Perfis Vinculados", "en-US": "Linked Profiles", "es-ES": "Perfiles Vinculados", "fr-FR": "Profils Liés"
  },
  "risk.rules.ruleNamePlaceholder": {
    "pt-BR": "Nome da regra...", "en-US": "Rule name...", "es-ES": "Nombre de la regla...", "fr-FR": "Nom de la règle..."
  },
  // === risk.rules.desk ===
  "risk.rules.desk.title": {
    "pt-BR": "Mesa Proprietária", "en-US": "Prop Desk", "es-ES": "Mesa Propietaria", "fr-FR": "Bureau de Trading"
  },
  "risk.rules.desk.desc": {
    "pt-BR": "Configuração de mesa proprietária e regras de progressão.", "en-US": "Prop desk configuration and progression rules.", "es-ES": "Configuración de mesa propietaria y reglas de progresión.", "fr-FR": "Configuration du bureau de trading et règles de progression."
  },
  "risk.rules.desk.enable": {
    "pt-BR": "Ativar Mesa", "en-US": "Enable Desk", "es-ES": "Activar Mesa", "fr-FR": "Activer le Bureau"
  },
  "risk.rules.desk.planName": {
    "pt-BR": "Nome do Plano", "en-US": "Plan Name", "es-ES": "Nombre del Plan", "fr-FR": "Nom du Plan"
  },
  "risk.rules.desk.planNamePlaceholder": {
    "pt-BR": "Ex: Plano Conservador", "en-US": "E.g.: Conservative Plan", "es-ES": "Ej: Plan Conservador", "fr-FR": "Ex : Plan Conservateur"
  },
  "risk.rules.desk.auditTitle": {
    "pt-BR": "Auditoria da Mesa", "en-US": "Desk Audit", "es-ES": "Auditoría de la Mesa", "fr-FR": "Audit du Bureau"
  },
  "risk.rules.desk.currentStage": {
    "pt-BR": "Estágio Atual", "en-US": "Current Stage", "es-ES": "Etapa Actual", "fr-FR": "Étape Actuelle"
  },
  "risk.rules.desk.maintenance": {
    "pt-BR": "Manutenção", "en-US": "Maintenance", "es-ES": "Mantenimiento", "fr-FR": "Maintenance"
  },
  "risk.rules.desk.modes.fixed": {
    "pt-BR": "Fixo", "en-US": "Fixed", "es-ES": "Fijo", "fr-FR": "Fixe"
  },
  "risk.rules.desk.modes.percent_of_margin": {
    "pt-BR": "% da Margem", "en-US": "% of Margin", "es-ES": "% del Margen", "fr-FR": "% de la Marge"
  },
  "risk.rules.desk.metrics.totalProfit": {
    "pt-BR": "Lucro Total", "en-US": "Total Profit", "es-ES": "Beneficio Total", "fr-FR": "Profit Total"
  },
  "risk.rules.desk.metrics.operatedDays": {
    "pt-BR": "Dias Operados", "en-US": "Days Operated", "es-ES": "Días Operados", "fr-FR": "Jours Opérés"
  },
  "risk.rules.desk.metrics.positiveDays": {
    "pt-BR": "Dias Positivos", "en-US": "Positive Days", "es-ES": "Días Positivos", "fr-FR": "Jours Positifs"
  },
  "risk.rules.desk.metrics.bestDayShare": {
    "pt-BR": "% Melhor Dia", "en-US": "% Best Day", "es-ES": "% Mejor Día", "fr-FR": "% Meilleur Jour"
  },
  "risk.rules.desk.progression.title": {
    "pt-BR": "Progressão", "en-US": "Progression", "es-ES": "Progresión", "fr-FR": "Progression"
  },
  "risk.rules.desk.progression.current": {
    "pt-BR": "Estágio atual", "en-US": "Current stage", "es-ES": "Etapa actual", "fr-FR": "Étape actuelle"
  },
  "risk.rules.desk.progression.can_advance": {
    "pt-BR": "Pode avançar", "en-US": "Can advance", "es-ES": "Puede avanzar", "fr-FR": "Peut progresser"
  },
  "risk.rules.desk.progression.should_remain": {
    "pt-BR": "Deve permanecer", "en-US": "Should remain", "es-ES": "Debe permanecer", "fr-FR": "Doit rester"
  },
  "risk.rules.desk.status.passed": {
    "pt-BR": "Aprovado", "en-US": "Passed", "es-ES": "Aprobado", "fr-FR": "Approuvé"
  },
  "risk.rules.desk.status.failed": {
    "pt-BR": "Reprovado", "en-US": "Failed", "es-ES": "Reprobado", "fr-FR": "Échoué"
  },
  "risk.rules.desk.status.pending": {
    "pt-BR": "Pendente", "en-US": "Pending", "es-ES": "Pendiente", "fr-FR": "En attente"
  },
  // === risk.actions ===
  "risk.actions.cancel": {
    "pt-BR": "Cancelar", "en-US": "Cancel", "es-ES": "Cancelar", "fr-FR": "Annuler"
  },
  "risk.actions.save": {
    "pt-BR": "Salvar", "en-US": "Save", "es-ES": "Guardar", "fr-FR": "Enregistrer"
  },

  // === strategies.aiCockpit (es-ES/fr-FR missing) ===
  "strategies.aiCockpit.ai.actions.bias": {
    "es-ES": "Sesgo", "fr-FR": "Biais"
  },
  "strategies.aiCockpit.ai.actions.continue": {
    "es-ES": "Continuar", "fr-FR": "Continuer"
  },
  "strategies.aiCockpit.ai.actions.maintain": {
    "es-ES": "Mantener", "fr-FR": "Maintenir"
  },
  "strategies.aiCockpit.ai.actions.reduce": {
    "es-ES": "Reducir", "fr-FR": "Réduire"
  },
  "strategies.aiCockpit.ai.desc": {
    "es-ES": "Análisis inteligente de su estrategia.", "fr-FR": "Analyse intelligente de votre stratégie."
  },
  "strategies.aiCockpit.ai.insufficientVolume": {
    "es-ES": "Volumen insuficiente para análisis.", "fr-FR": "Volume insuffisant pour l'analyse."
  },
  "strategies.aiCockpit.ai.messages.critical": {
    "es-ES": "Desempeño crítico. Considere pausar.", "fr-FR": "Performance critique. Envisagez une pause."
  },
  "strategies.aiCockpit.ai.messages.hot": {
    "es-ES": "Excelente desempeño. Mantenga el ritmo.", "fr-FR": "Excellente performance. Maintenez le rythme."
  },
  "strategies.aiCockpit.ai.messages.maturing": {
    "es-ES": "Estrategia en maduración.", "fr-FR": "Stratégie en maturation."
  },
  "strategies.aiCockpit.ai.title": {
    "es-ES": "IA - Análisis de Estrategia", "fr-FR": "IA - Analyse de Stratégie"
  },
  "strategies.aiCockpit.ctaBtn": {
    "es-ES": "Ver Detalles", "fr-FR": "Voir les Détails"
  },
  "strategies.aiCockpit.health.currentRisk": {
    "es-ES": "Riesgo Actual", "fr-FR": "Risque Actuel"
  },
  "strategies.aiCockpit.health.stability": {
    "es-ES": "Estabilidad", "fr-FR": "Stabilité"
  },
  "strategies.aiCockpit.health.status": {
    "es-ES": "Estado", "fr-FR": "Statut"
  },
  "strategies.aiCockpit.health.title": {
    "es-ES": "Salud de la Estrategia", "fr-FR": "Santé de la Stratégie"
  },
  "strategies.aiCockpit.psychology.infractionRate": {
    "es-ES": "Tasa de Infracciones", "fr-FR": "Taux d'Infractions"
  },
  "strategies.aiCockpit.psychology.title": {
    "es-ES": "Psicología", "fr-FR": "Psychologie"
  },
  "strategies.aiCockpit.values.winRateShort": {
    "es-ES": "Acierto", "fr-FR": "Réussite"
  },
  "strategies.aiCockpit.xray.bestAsset": {
    "es-ES": "Mejor Activo", "fr-FR": "Meilleur Actif"
  },
  "strategies.aiCockpit.xray.bestSide": {
    "es-ES": "Mejor Lado", "fr-FR": "Meilleur Côté"
  },
  "strategies.aiCockpit.xray.bestTime": {
    "es-ES": "Mejor Hora", "fr-FR": "Meilleure Heure"
  },
  "strategies.aiCockpit.xray.title": {
    "es-ES": "Rayo X", "fr-FR": "Rayon X"
  },
  "strategies.aiCockpit.xray.worstAsset": {
    "es-ES": "Peor Activo", "fr-FR": "Pire Actif"
  },
  "strategies.aiCockpit.xray.worstTime": {
    "es-ES": "Peor Hora", "fr-FR": "Pire Heure"
  },

  // === trades es-ES/fr-FR only ===
  "trades.charts.equity.capital": {
    "es-ES": "Capital Acumulado", "fr-FR": "Capital Accumulé"
  },
  "trades.charts.equity.drawdown": {
    "es-ES": "Drawdown", "fr-FR": "Drawdown"
  },
  "trades.charts.equity.empty": {
    "es-ES": "Sin historial de evolución", "fr-FR": "Aucun historique d'évolution"
  },
  "trades.charts.outcome.gain": {
    "es-ES": "Ganancia", "fr-FR": "Gain"
  },
  "trades.charts.outcome.loss": {
    "es-ES": "Pérdida", "fr-FR": "Perte"
  },
  "trades.kpi.profit_factor": {
    "es-ES": "Factor de Beneficio", "fr-FR": "Facteur de Profit"
  },
  "trades.kpi.risk_reward": {
    "es-ES": "Riesgo/Retorno", "fr-FR": "Risque/Rendement"
  },
  "trades.kpi.summary": {
    "es-ES": "Resumen de Rendimiento", "fr-FR": "Résumé de Performance"
  },
  "trades.kpi.win_rate": {
    "es-ES": "Tasa de Acierto", "fr-FR": "Taux de Réussite"
  },
  "trades.list.table.date": {
    "es-ES": "Fecha", "fr-FR": "Date"
  },
  "trades.messages.invalid_result": {
    "es-ES": "Resultado financiero inválido.", "fr-FR": "Résultat financier invalide."
  },
  "trades.messages.submission_fail": {
    "es-ES": "Error en el envío.", "fr-FR": "Échec de la soumission."
  },
  "trades.quick_edit.asset": { "es-ES": "Activo", "fr-FR": "Actif" },
  "trades.quick_edit.bias": { "es-ES": "Dirección (Sesgo)", "fr-FR": "Direction (Biais)" },
  "trades.quick_edit.date_time": { "es-ES": "Fecha y Hora", "fr-FR": "Date et Heure" },
  "trades.quick_edit.description": { "es-ES": "Ajuste los valores principales.", "fr-FR": "Ajustez les valeurs principales." },
  "trades.quick_edit.full_mode": { "es-ES": "Modo Completo", "fr-FR": "Mode Complet" },
  "trades.quick_edit.result": { "es-ES": "Resultado Financiero (PnL)", "fr-FR": "Résultat Financier (PnL)" },
  "trades.quick_edit.save": { "es-ES": "Guardar Cambios", "fr-FR": "Enregistrer les Modifications" },
  "trades.quick_edit.title": { "es-ES": "Edición Rápida", "fr-FR": "Édition Rapide" },
  "trades.wizard.labels.average": { "es-ES": "Promedio", "fr-FR": "Moyenne" },
  "trades.wizard.messages.rtd_partial_exit": { "es-ES": "Salida Parcial vía RTD", "fr-FR": "Sortie Partielle via RTD" },
  "trades.wizard.messages.rtd_position_addition": { "es-ES": "Aumento de Posición vía RTD", "fr-FR": "Ajout de Position via RTD" },
  "trades.wizard.partials.date_time": { "es-ES": "Fecha/Hora", "fr-FR": "Date/Heure" },
  "trades.wizard.partials.observation": { "es-ES": "Observación", "fr-FR": "Observation" },
  "trades.wizard.partials.price": { "es-ES": "Precio", "fr-FR": "Prix" },
  "trades.wizard.partials.quantity": { "es-ES": "Cant", "fr-FR": "Qté" },
  "trades.wizard.partials.result": { "es-ES": "Resultado", "fr-FR": "Résultat" },
  "trades.wizard.partials.type": { "es-ES": "Tipo", "fr-FR": "Type" },
  "trades.wizard.sections.partial_management.add_partial": { "es-ES": "Añadir Parcial", "fr-FR": "Ajouter une Partielle" },
  "trades.wizard.sections.partial_management.addition": { "es-ES": "Aumento", "fr-FR": "Ajout" },
  "trades.wizard.sections.partial_management.exit": { "es-ES": "Salida", "fr-FR": "Sortie" },
  "trades.wizard.sections.partial_management.no_partials": { "es-ES": "Sin parciales registradas.", "fr-FR": "Aucune partielle enregistrée." },
  "trades.wizard.sections.partial_management.remaining": { "es-ES": "Restante", "fr-FR": "Restant" },
  "trades.wizard.sections.partial_management.volume_executed": { "es-ES": "Volumen Ejecutado", "fr-FR": "Volume Exécuté" },
  "trades.wizard.sections.visual_evidence.description": { "es-ES": "Soporte para PNG, JPG y WEBP.", "fr-FR": "Supporte PNG, JPG et WEBP." },
  "trades.wizard.sections.visual_evidence.drag_drop": { "es-ES": "ARRASTRE Y SUELTE SUS CAPTURAS AQUÍ", "fr-FR": "GLISSEZ-DÉPOSEZ VOS CAPTURES ICI" },
  "trades.wizard.sections.visual_evidence.select_files": { "es-ES": "Seleccionar Archivos", "fr-FR": "Sélectionner des Fichiers" },
  "trades.wizard.summary.cancel": { "es-ES": "Cancelar", "fr-FR": "Annuler" },
  "trades.wizard.summary.net_result": { "es-ES": "Resultado Neto", "fr-FR": "Résultat Net" },
  "trades.wizard.summary.prev": { "es-ES": "Anterior", "fr-FR": "Précédent" },
  "trades.wizard.summary.save_trade": { "es-ES": "Finalizar y Guardar", "fr-FR": "Finaliser et Enregistrer" },
  "trades.wizard.summary.saving": { "es-ES": "Guardando...", "fr-FR": "Enregistrement..." },
  "trades.wizard.timeframe_options.1m": { "es-ES": "1 Minuto", "fr-FR": "1 Minute" },
};

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function getTargetFile(key) {
  const prefix = key.split('.')[0];
  const map = { trades: 'trades.json', risk: 'risk.json', strategies: 'strategies.json', strategyDashboard: 'strategies.json' };
  return map[prefix] || 'common.json';
}

const locales = readdirSync(LOCALES_DIR).filter(d => statSync(join(LOCALES_DIR, d)).isDirectory());
let totalAdded = 0;

for (const locale of locales) {
  const localeDir = join(LOCALES_DIR, locale);
  const filesModified = new Set();
  for (const [fullKey, translations] of Object.entries(MISSING_KEYS)) {
    const value = translations[locale];
    if (!value) continue;
    const targetFile = getTargetFile(fullKey);
    const filePath = join(localeDir, targetFile);
    if (!existsSync(filePath)) continue;
    let json;
    try { json = JSON.parse(readFileSync(filePath, 'utf-8')); } catch { continue; }
    const parts = fullKey.split('.');
    let exists = true, check = json;
    for (const p of parts) { if (!check || !(p in check)) { exists = false; break; } check = check[p]; }
    if (!exists) {
      setNestedKey(json, fullKey, value);
      writeFileSync(filePath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
      filesModified.add(targetFile);
      totalAdded++;
    }
  }
  console.log(`✅ ${locale}: ${filesModified.size} files (${[...filesModified].join(', ')})`);
}
console.log(`\n🎯 Total: ${totalAdded} keys added`);
