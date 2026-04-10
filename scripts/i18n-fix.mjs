/**
 * i18n Auto-Fix Script - Phase 2
 * Reads the missing keys from the audit, generates translations, and patches locale files.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const LOCALES_DIR = join(process.cwd(), 'src', 'lib', 'i18n', 'locales');

// ─── Missing translations to add ───────────────────────
// Key -> { "pt-BR": value, "en-US": value, "es-ES": value, "fr-FR": value }
const MISSING_KEYS = {
  // === trades.json ===
  "trades.charts.outcome.be": {
    "pt-BR": "Empate", "en-US": "Break Even", "es-ES": "Empate", "fr-FR": "À l'équilibre"
  },
  "trades.charts.outcome.vazio": {
    "pt-BR": "Sem dados", "en-US": "No data", "es-ES": "Sin datos", "fr-FR": "Pas de données"
  },
  "trades.details.contribution": {
    "pt-BR": "Contribuição", "en-US": "Contribution", "es-ES": "Contribución", "fr-FR": "Contribution"
  },
  "trades.quick_edit.invalid_result": {
    "pt-BR": "Resultado inválido.", "en-US": "Invalid result.", "es-ES": "Resultado inválido.", "fr-FR": "Résultat invalide."
  },
  "trades.quick_edit.network_fail": {
    "pt-BR": "Falha na conexão.", "en-US": "Connection failed.", "es-ES": "Error de conexión.", "fr-FR": "Échec de connexion."
  },
  "trades.quick_edit.save_error": {
    "pt-BR": "Erro ao salvar.", "en-US": "Error saving.", "es-ES": "Error al guardar.", "fr-FR": "Erreur lors de l'enregistrement."
  },
  "trades.quick_edit.save_success": {
    "pt-BR": "Salvo com sucesso!", "en-US": "Saved successfully!", "es-ES": "¡Guardado exitosamente!", "fr-FR": "Enregistré avec succès !"
  },
  "trades.table.buy": {
    "pt-BR": "Compra", "en-US": "Buy", "es-ES": "Compra", "fr-FR": "Achat"
  },
  "trades.table.sell": {
    "pt-BR": "Venda", "en-US": "Sell", "es-ES": "Venta", "fr-FR": "Vente"
  },
  "trades.wizard.auto_detection.title": {
    "pt-BR": "Detecção Automática de Trade", "en-US": "Automatic Trade Detection", "es-ES": "Detección Automática de Operación", "fr-FR": "Détection Automatique de Trade"
  },
  "trades.wizard.auto_detection.source": {
    "pt-BR": "Fonte", "en-US": "Source", "es-ES": "Fuente", "fr-FR": "Source"
  },
  "trades.wizard.auto_detection.register": {
    "pt-BR": "Registrar", "en-US": "Register", "es-ES": "Registrar", "fr-FR": "Enregistrer"
  },
  "trades.wizard.auto_detection.ignore": {
    "pt-BR": "Ignorar", "en-US": "Ignore", "es-ES": "Ignorar", "fr-FR": "Ignorer"
  },
  "trades.wizard.checklist.calm": {
    "pt-BR": "Estou calmo e focado", "en-US": "I am calm and focused", "es-ES": "Estoy tranquilo y enfocado", "fr-FR": "Je suis calme et concentré"
  },
  "trades.wizard.checklist.distraction": {
    "pt-BR": "Sem distrações externas", "en-US": "No external distractions", "es-ES": "Sin distracciones externas", "fr-FR": "Sans distractions externes"
  },
  "trades.wizard.checklist.ideal_condition": {
    "pt-BR": "Condição ideal para operar", "en-US": "Ideal condition to operate", "es-ES": "Condición ideal para operar", "fr-FR": "Condition idéale pour opérer"
  },
  "trades.wizard.checklist.plan": {
    "pt-BR": "Plano operacional definido", "en-US": "Operational plan defined", "es-ES": "Plan operacional definido", "fr-FR": "Plan opérationnel défini"
  },
  "trades.wizard.checklist.ready": {
    "pt-BR": "Pronto para operar", "en-US": "Ready to operate", "es-ES": "Listo para operar", "fr-FR": "Prêt à opérer"
  },
  "trades.wizard.checklist.risk": {
    "pt-BR": "Risco definido e aceitável", "en-US": "Risk defined and acceptable", "es-ES": "Riesgo definido y aceptable", "fr-FR": "Risque défini et acceptable"
  },
  "trades.wizard.checklist.sleep": {
    "pt-BR": "Dormi bem na noite anterior", "en-US": "I slept well last night", "es-ES": "Dormí bien anoche", "fr-FR": "J'ai bien dormi la nuit dernière"
  },
  "trades.wizard.messages.select_asset": {
    "pt-BR": "Selecione um ativo", "en-US": "Select an asset", "es-ES": "Seleccione un activo", "fr-FR": "Sélectionnez un actif"
  },
  "trades.wizard.sections.visual_evidence.attachment": {
    "pt-BR": "Anexo", "en-US": "Attachment", "es-ES": "Adjunto", "fr-FR": "Pièce jointe"
  },
  "trades.wizard.sections.visual_evidence.images_added": {
    "pt-BR": "imagens adicionadas", "en-US": "images added", "es-ES": "imágenes añadidas", "fr-FR": "images ajoutées"
  },
  "trades.wizard.sections.visual_evidence.invalid_image": {
    "pt-BR": "Formato de imagem inválido.", "en-US": "Invalid image format.", "es-ES": "Formato de imagen inválido.", "fr-FR": "Format d'image invalide."
  },
  "trades.wizard.sections.visual_evidence.process_error": {
    "pt-BR": "Erro ao processar imagem.", "en-US": "Error processing image.", "es-ES": "Error al procesar imagen.", "fr-FR": "Erreur lors du traitement de l'image."
  },

  // === fiscal.json ===
  "fiscal.darf.buttons.cancel": {
    "pt-BR": "Cancelar", "en-US": "Cancel", "es-ES": "Cancelar", "fr-FR": "Annuler"
  },
  "fiscal.darf.buttons.confirmPay": {
    "pt-BR": "Confirmar Pagamento", "en-US": "Confirm Payment", "es-ES": "Confirmar Pago", "fr-FR": "Confirmer le Paiement"
  },
  "fiscal.darf.buttons.confirmUnpay": {
    "pt-BR": "Reverter Pagamento", "en-US": "Revert Payment", "es-ES": "Revertir Pago", "fr-FR": "Annuler le Paiement"
  },
  "fiscal.darf.messages.emptyHistory": {
    "pt-BR": "Nenhuma DARF gerada ainda.", "en-US": "No DARF generated yet.", "es-ES": "Ninguna DARF generada todavía.", "fr-FR": "Aucune DARF générée pour le moment."
  },
  "fiscal.darf.modal.delete.title": {
    "pt-BR": "Excluir DARF", "en-US": "Delete DARF", "es-ES": "Eliminar DARF", "fr-FR": "Supprimer la DARF"
  },
  "fiscal.darf.modal.delete.prompt": {
    "pt-BR": "Tem certeza que deseja excluir esta DARF?", "en-US": "Are you sure you want to delete this DARF?", "es-ES": "¿Está seguro de eliminar esta DARF?", "fr-FR": "Êtes-vous sûr de vouloir supprimer cette DARF ?"
  },
  "fiscal.darf.modal.unpay.title": {
    "pt-BR": "Reverter Pagamento", "en-US": "Revert Payment", "es-ES": "Revertir Pago", "fr-FR": "Annuler le Paiement"
  },
  "fiscal.darf.modal.unpay.descriptionLine1": {
    "pt-BR": "Ao reverter, a DARF voltará ao status de pendente.", "en-US": "By reverting, the DARF will return to pending status.", "es-ES": "Al revertir, la DARF volverá al estado pendiente.", "fr-FR": "En annulant, la DARF reviendra au statut en attente."
  },
  "fiscal.darf.modal.unpay.descriptionLine2": {
    "pt-BR": "Você poderá pagar novamente a qualquer momento.", "en-US": "You can pay again at any time.", "es-ES": "Puede pagar nuevamente en cualquier momento.", "fr-FR": "Vous pourrez payer à nouveau à tout moment."
  },
  "fiscal.darf.modal.unpay.descriptionLine3": {
    "pt-BR": "Deseja continuar?", "en-US": "Do you want to continue?", "es-ES": "¿Desea continuar?", "fr-FR": "Souhaitez-vous continuer ?"
  },
  "fiscal.irpf.calculating": {
    "pt-BR": "Calculando imposto...", "en-US": "Calculating tax...", "es-ES": "Calculando impuesto...", "fr-FR": "Calcul de l'impôt..."
  },
  "fiscal.irpf.table.alreadyGenerated": {
    "pt-BR": "DARF já gerada para este mês.", "en-US": "DARF already generated for this month.", "es-ES": "DARF ya generada para este mes.", "fr-FR": "DARF déjà générée pour ce mois."
  },
  "fiscal.irpf.table.cannotDelete": {
    "pt-BR": "Não é possível excluir uma DARF paga.", "en-US": "Cannot delete a paid DARF.", "es-ES": "No se puede eliminar una DARF pagada.", "fr-FR": "Impossible de supprimer une DARF payée."
  },
  "fiscal.irpf.table.generateDarf": {
    "pt-BR": "Gerar DARF", "en-US": "Generate DARF", "es-ES": "Generar DARF", "fr-FR": "Générer la DARF"
  },
  "fiscal.settings.profiles.form.description": {
    "pt-BR": "Descrição do perfil fiscal", "en-US": "Tax profile description", "es-ES": "Descripción del perfil fiscal", "fr-FR": "Description du profil fiscal"
  },
  "fiscal.settings.rules.form.basisHint": {
    "pt-BR": "Base de cálculo do imposto", "en-US": "Tax calculation basis", "es-ES": "Base de cálculo del impuesto", "fr-FR": "Base de calcul de l'impôt"
  },
  "fiscal.settings.rules.form.withholdingBasisHint": {
    "pt-BR": "Base de cálculo da retenção", "en-US": "Withholding calculation basis", "es-ES": "Base de cálculo de la retención", "fr-FR": "Base de calcul de la retenue"
  },

  // === reports.json ===
  "reports.ai.error_no_config": {
    "pt-BR": "Configure a IA nas configurações.", "en-US": "Configure AI in settings.", "es-ES": "Configure la IA en ajustes.", "fr-FR": "Configurez l'IA dans les paramètres."
  },
  "reports.pdf.trades": {
    "pt-BR": "Operações", "en-US": "Trades", "es-ES": "Operaciones", "fr-FR": "Opérations"
  },
  "reports.reflection.extractsTitle": {
    "pt-BR": "Extratos de Reflexão", "en-US": "Reflection Extracts", "es-ES": "Extractos de Reflexión", "fr-FR": "Extraits de Réflexion"
  },
  "reports.reflection.noNotes": {
    "pt-BR": "Sem notas registradas.", "en-US": "No notes recorded.", "es-ES": "Sin notas registradas.", "fr-FR": "Aucune note enregistrée."
  },
  "reports.reflection.noVolume": {
    "pt-BR": "Sem volume de dados.", "en-US": "No data volume.", "es-ES": "Sin volumen de datos.", "fr-FR": "Pas de volume de données."
  },
  "reports.reflection.reviewCountLabel": {
    "pt-BR": "Revisões realizadas", "en-US": "Reviews performed", "es-ES": "Revisiones realizadas", "fr-FR": "Révisions effectuées"
  },
  "reports.reflection.rhythmTitle": {
    "pt-BR": "Ritmo Operacional", "en-US": "Operational Rhythm", "es-ES": "Ritmo Operacional", "fr-FR": "Rythme Opérationnel"
  },

  // === settings.json ===
  "settings.assetTypes.empty": {
    "pt-BR": "Nenhum tipo de ativo cadastrado.", "en-US": "No asset types registered.", "es-ES": "Ningún tipo de activo registrado.", "fr-FR": "Aucun type d'actif enregistré."
  },

  // === strategies.json ===
  "strategyDashboard.tabs.gann": {
    "pt-BR": "Quadrado de Gann", "en-US": "Gann Square", "es-ES": "Cuadrado de Gann", "fr-FR": "Carré de Gann"
  },
  "strategies.aiCockpit.ai.error": {
    "pt-BR": "Erro ao processar IA.", "en-US": "Error processing AI.", "es-ES": "Error al procesar IA.", "fr-FR": "Erreur lors du traitement IA."
  },

  // === finance.json (via common) ===
  "finance.statement.hierarchy": {
    "pt-BR": "Hierarquia", "en-US": "Hierarchy", "es-ES": "Jerarquía", "fr-FR": "Hiérarchie"
  },
};

// ─── Helper: Set nested key in object ──────────────────
function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// ─── Helper: Determine which JSON file a key belongs to ─
function getTargetFile(key) {
  const prefix = key.split('.')[0];
  const fileMap = {
    'trades': 'trades.json',
    'fiscal': 'fiscal.json',
    'reports': 'reports.json',
    'settings': 'settings.json',
    'strategies': 'strategies.json',
    'strategyDashboard': 'strategies.json',
    'risk': 'risk.json',
    'common': 'common.json',
    'general': 'common.json',
    'messages': 'common.json',
    'dashboard': 'dashboard.json',
    'finance': 'fiscal.json',
    'ai': 'ai.json',
    'auth': 'auth.json',
  };
  return fileMap[prefix] || 'common.json';
}

// ─── Main ──────────────────────────────────────────────
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

    if (!existsSync(filePath)) {
      console.log(`  ⚠ File not found: ${locale}/${targetFile}`);
      continue;
    }

    let json;
    try {
      json = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`  ❌ Parse error: ${locale}/${targetFile}`);
      continue;
    }

    // Check if key already exists
    const parts = fullKey.split('.');
    let exists = true;
    let check = json;
    for (const p of parts) {
      if (!check || typeof check !== 'object' || !(p in check)) {
        exists = false;
        break;
      }
      check = check[p];
    }

    if (!exists) {
      setNestedKey(json, fullKey, value);
      writeFileSync(filePath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
      filesModified.add(targetFile);
      totalAdded++;
    }
  }

  console.log(`✅ ${locale}: ${filesModified.size} files updated (${[...filesModified].join(', ')})`);
}

console.log(`\n🎯 Total keys added: ${totalAdded}`);
console.log('Run "node scripts/i18n-audit.mjs" to verify.');
