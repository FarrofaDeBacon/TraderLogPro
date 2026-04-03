import json
import os

# Estrutura de referência ultra-completa baseada nas capturas de tela e código Svelte
risk_structure_pt = {
    "title": "Gerenciamento de Risco",
    "description": "Defina seus parâmetros, limites e regras de proteção para operar com segurança.",
    "new": "Novo Perfil",
    "edit": "Editar Perfil",
    "profiles": {
        "active": "Ativo",
        "activate": "Ativar Perfil",
        "dailyLoss": "Perda Máxima Diária",
        "dailyTarget": "Meta de Lucro Diária",
        "activate_btn": "Ativar Perfil"
    },
    "accountTypes": {
        "All": "Todas as Contas",
        "Prop": "Mesa Proprietária",
        "Real": "Conta Real",
        "Demo": "Simulador",
        "Specific": "Conta Específica"
    },
    "plan": {
        "name": "Nome do Perfil",
        "namePlaceholder": "Ex: Conservador, Trader Institucional...",
        "hierarchy": {
            "title": "Hierarquia de Execução (Prioridade)",
            "global": "1. PLANO GLOBAL (BASE)",
            "asset": "2. LIMITES POR ATIVO",
            "growth": "3. PLANO DE CRESCIMENTO",
            "rules": "4. REGRAS ADICIONAIS"
        },
        "tabs": {
            "protection": "Proteção",
            "evolution": "Evolução",
            "adaptation": "Adaptação",
            "scope": "Escopo"
        },
        "finance": {
            "title": "Capital e Escala",
            "money": "Capital",
            "points": "Pontos/Ticks",
            "fixedValue": "Valor Fixo",
            "linkAccount": "Vincular à Conta",
            "capitalBase": "Capital Base",
            "referenceAccount": "Conta de Referência",
            "selectAccount": "Selecionar Conta",
            "baseTemplate": "Modelo de Base",
            "startBlank": "Começar do Zero",
            "templateDesc": "Use um perfil existente como ponto de partida.",
            "baseStrategy": "Estratégia de Risco",
            "fixed_capital": "Capital Fixo",
            "linked_account_id": "ID da Conta Vinculada",
            "copyOf": "Cópia de"
        },
        "labels": {
            "dailyLossLimit": "Limite de Perda Diária",
            "dailyGoal": "Meta de Lucro Diária",
            "minRiskReward": "Mínimo R/R",
            "maxRiskPerTrade": "Risco/Trade",
            "platformLock": "Auto Trava de Perda",
            "lockWarning": "A plataforma será bloqueada ao atingir o limite.",
            "maxTradesDay": "Máximo de Operações/Dia"
        },
        "actions": {
            "cancel": "Cancelar",
            "save": "Salvar Dados",
            "restart": "Reiniciar Evolução"
        },
        "applicability": {
            "all": "Todos os Ativos",
            "prop": "Mesas Proprietárias",
            "real": "Mercado Real",
            "demo": "Simulador",
            "specific": "Ativos Específicos"
        }
    },
    "rules": {
        "advancedRules": "Regras Avançadas",
        "advancedRulesDesc": "Habilita proteções granulares e motores de adaptação automática.",
        "disciplineTitle": "Disciplina e Travas",
        "engine": {
            "max_daily_loss": "PERDA MÁXIMA DIÁRIA"
        },
        "adaptation": {
            "multiplier": "Multiplicador de Risco",
            "psychological": {
                "title": "Monitor Psicológico",
                "desc": "Reduz exposição após sequências negativas para proteger o capital.",
                "strategy": "Estratégia",
                "strategyStrict": "Rígida (Strict)",
                "lookback": "Histórico (Trades)",
                "threshold": "Gatilho (Z-Score)",
                "multiplier": "Redução (%)"
            },
            "outliers": {
                "title": "Filtro de Desvios",
                "desc": "Identifica trades atípicos que fogem da média estatística.",
                "lookback": "Amostragem"
            },
            "sniper": {
                "title": "Modo Sniper",
                "desc": "Aumenta a precisão exigindo convergência de múltiplos fatores.",
                "selectivity": "Grau de Seletividade"
            }
        },
        "desk": {
            "title": "Configuração de Mesa",
            "enable": "Habilitar Regras de Mesa Proprietária",
            "desc": "Ative para seguir regras de MDD, consistência e limites de mesa.",
            "planName": "Nome da Jornada",
            "planNamePlaceholder": "Ex: Desafio 100k, Fase 1...",
            "auditTitle": "Auditoria de Performance",
            "currentStage": "Estágio Atual",
            "status": {
                "passed": "Aprovado",
                "failed": "Reprovado",
                "pending": "Em Andamento"
            },
            "metrics": {
                "operatedDays": "Dias Operados",
                "positiveDays": "Dias Verdes",
                "bestDayShare": "Melhor Dia %",
                "totalProfit": "PnL Total"
            },
            "progression": {
                "title": "Evolução de Estágio",
                "current": "Estágio",
                "can_advance": "Pronto para Avançar",
                "should_remain": "Aguardando Requisitos"
            },
            "modes": {
                "fixed": "Limite Fixo",
                "percent_of_margin": "% da Margem"
            },
            "stages": {
                "margin_building": "Construção de Margem",
                "real_phase_1": "Fase 1 (Real)",
                "real_final": "Conta Profissional"
            }
        }
    },
    "evolution": {
        "growthPlan": "Plano de Crescimento",
        "bindDesc": "VINCULAR PLANO DE ESCALONAMENTO DE LOTES"
    },
    "scope": {
        "accountsTitle": "CONTAS VINCULADAS",
        "accounts": "Aplica este perfil apenas às contas selecionadas.",
        "applicability": "APLICABILIDADE",
        "assets": "ATVOS NO ESCOPO"
    },
    "management": {
        "activePlan": "Plano Ativo",
        "phase": "Fase",
        "maxTrades": "Trades/Dia",
        "lockOnLoss": "Trava Loss",
        "duplicate": "Duplicar",
        "linkedAssetProfilesDesc": "Aplica regras globais a perfis específicos de ativos.",
        "assetProfileSelector": "Selecionar Perfil de Ativo...",
        "noLinkedAssetProfiles": "Nenhum vínculo.",
        "removeAssetProfile": "Remover"
    },
    "growthPlan": {
        "title": "Escala de Lotes",
        "planName": "Identificação do Plano",
        "enable": "Ativar Progressão Automática",
        "maxLotsLabel": "Lote Máximo na Fase",
        "howToUseTitle": "Regras de Crescimento",
        "howToUseDesc": "Configure as metas de lucro e drawdown para subir de nível.",
        "actions": {
            "restart": "Reiniciar Plano"
        }
    },
    "growth": {
        "requirements": {
            "profit": "Lucro Retido",
            "winRate": "Taxa de Acerto",
            "days": "Dias Positivos",
            "consistency": "Consistência",
            "drawdown": "Drawdown Máximo",
            "dailyLoss": "Loss Diário",
            "lossStreak": "Seq. Loss Máx"
        },
        "targetsTitle": "Metas de Evolução",
        "dangerZones": "Zonas de Perigo",
        "currentDailyLoss": "Loss do Dia",
        "totalDrawdown": "Drawdown Acumulado",
        "behavioralRestrictions": "Restrições do Plano",
        "allMetMessage": "Todos os requisitos atingidos! Pronto para subir.",
        "actions": {
            "promote": "PROMOVER PARA PRÓXIMA FASE",
            "demote": "REBAIXAR FASE"
        }
    },
    "cockpit": {
        "stats": {
            "currentPhase": "Fase Atual",
            "goal": "Meta",
            "nextPhase": "Próxima Fase",
            "allowedSizing": "Lotes Permitidos"
        }
    },
    "messages": {
        "saveSuccess": "Configurações salvas!",
        "deskAdvanceSuccess": "Promovido para o próximo estágio!"
    }
}

# English, Spanish, French equivalents (will use English as base for all non-PT to fill gaps)
risk_structure_en = {
    "title": "Risk Management",
    "description": "Define your parameters, limits and protection rules to trade safely.",
    "new": "New Profile",
    "edit": "Edit Profile",
    "profiles": {
        "active": "Active",
        "activate": "Activate Profile",
        "dailyLoss": "Max Daily Loss",
        "dailyTarget": "Daily Profit Goal",
        "activate_btn": "Activate"
    },
    "accountTypes": {
        "All": "All Accounts",
        "Prop": "Prop Firm",
        "Real": "Real Account",
        "Demo": "Simulated",
        "Specific": "Specific Account"
    },
    "plan": {
        "name": "Profile Name",
        "namePlaceholder": "Ex: Conservative, Institutional...",
        "hierarchy": {
            "title": "Execution Hierarchy (Rule Priority)",
            "global": "1. GLOBAL PLAN (BASE)",
            "asset": "2. ASSET LIMITS (OVERRIDES)",
            "growth": "3. GROWTH PLAN (LOT SCALING)",
            "rules": "4. DYNAMIC RULES"
        },
        "tabs": {
            "protection": "Protection",
            "evolution": "Evolution",
            "adaptation": "Adaptation",
            "scope": "Scope"
        },
        "finance": {
            "title": "Capital and Scale",
            "money": "Capital",
            "points": "Points/Ticks",
            "fixedValue": "Fixed Value",
            "linkAccount": "Link Account",
            "capitalBase": "Capital Base",
            "referenceAccount": "Reference Account",
            "selectAccount": "Select Account",
            "baseTemplate": "Base Template",
            "startBlank": "Start Blank",
            "templateDesc": "Use an existing profile as a starting point.",
            "baseStrategy": "Risk Strategy",
            "fixed_capital": "Fixed Capital",
            "linked_account_id": "Linked Account ID",
            "copyOf": "Copy of"
        },
        "labels": {
            "dailyLossLimit": "Daily Loss Limit",
            "dailyGoal": "Daily Profit Goal",
            "minRiskReward": "Min R/R",
            "maxRiskPerTrade": "Risk/Trade",
            "platformLock": "Auto Loss Lock",
            "lockWarning": "Platform will be locked upon reaching the limit.",
            "maxTradesDay": "Max Trades/Day"
        },
        "actions": {
            "cancel": "Cancel",
            "save": "Save Data",
            "restart": "Restart Evolution"
        }
    },
    "rules": {
        "advancedRules": "Advanced Rules",
        "advancedRulesDesc": "Enable granular protections and auto-adaptation engines.",
        "disciplineTitle": "Discipline and Locks",
        "engine": {
            "max_daily_loss": "MAX DAILY LOSS"
        }
    },
    "evolution": {
        "growthPlan": "Growth Plan",
        "bindDesc": "BIND LOT SCALING PLAN"
    },
    "scope": {
        "accountsTitle": "LINKED ACCOUNTS",
        "accounts": "Apply this profile only to selected accounts.",
        "applicability": "APPLICABILITY",
        "assets": "ASSETS IN SCOPE"
    },
    "management": {
        "activePlan": "Active Plan",
        "phase": "Phase",
        "maxTrades": "Trades/Day",
        "lockOnLoss": "Loss Lock",
        "duplicate": "Duplicate",
        "linkedAssetProfilesDesc": "Apply global rules to specific asset profiles.",
        "assetProfileSelector": "Select Asset Profile...",
        "noLinkedAssetProfiles": "No links.",
        "removeAssetProfile": "Remove"
    },
    "growthPlan": {
        "title": "Lot Scaling",
        "planName": "Plan Identification",
        "enable": "Enable Auto Progression",
        "maxLotsLabel": "Max Lots in Phase",
        "howToUseTitle": "Growth Rules",
        "howToUseDesc": "Configure profit and drawdown targets to level up.",
        "actions": {
            "restart": "Restart Plan"
        }
    },
    "growth": {
        "requirements": {
            "profit": "Retained Profit",
            "winRate": "Win Rate",
            "days": "Positive Sessions",
            "consistency": "Consistency",
            "drawdown": "Max Drawdown",
            "dailyLoss": "Daily Loss",
            "lossStreak": "Max Loss Streak"
        },
        "targetsTitle": "Evolution Targets",
        "dangerZones": "Danger Zones",
        "currentDailyLoss": "Daily Loss",
        "totalDrawdown": "Total Drawdown",
        "actions": {
            "promote": "PROMOTE TO NEXT PHASE",
            "demote": "DEMOTE PHASE"
        }
    }
}

languages = {
    "pt-BR": risk_structure_pt,
    "en-US": risk_structure_en,
    "es-ES": risk_structure_en, # Using EN as fallback for missing translations
    "fr-FR": risk_structure_en  # Using EN as fallback for missing translations
}

for lang, struct in languages.items():
    path = f"src/lib/i18n/locales/{lang}/risk.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            prev = json.load(f)
        
        # Merge struct into prev["risk"]
        if "risk" not in prev:
            prev["risk"] = {}
        
        # Super-deep merge
        def deep_merge(target, source):
            for k, v in source.items():
                if isinstance(v, dict) and k in target and isinstance(target[k], dict):
                    deep_merge(target[k], v)
                else:
                    target[k] = v
        
        deep_merge(prev["risk"], struct)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(prev, f, ensure_ascii=False, indent=4)
        print(f"Patched {lang}/risk.json")
