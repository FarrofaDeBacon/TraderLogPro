# GEMINI.md - TraderLogPro (DNA do Projeto)

Este arquivo define o funcionamento, a arquitetura e as regras de ouro para o desenvolvimento do **TraderLogPro**.

---

## 🚀 Tecnologias Core (Stack 2025)

| Camada | Tecnologia | Detalhes |
| :--- | :--- | :--- |
| **Frontend** | Svelte 5 (Runes) | Reatividade moderna, performance extrema |
| **Backend** | Rust (Tauri) | Segurança, velocidade e integração nativa |
| **Banco** | SurrealDB 2.0 | Multi-model, resiliente e escalável |
| **Estilo** | Tailwind CSS v4 | Padrão pílula, Institutional Terminal |
| **Trad.** | Svelte-i18n | Suporte nativo a PT-BR, EN-US, ES-ES, FR-FR |

---

## 🤖 Agentes & Skills Especialistas

Este repositório é orquestrado por agentes especializados. **Sempre leia o .md do agente antes de atuar.**

### Agentes Principais:
- `orchestrator`: Coordenador central de tarefas complexas.
- `backend-specialist`: Mestre em Rust e integração com SurrealDB.
- `frontend-specialist`: Designer de interfaces "Institutional Terminal".
- `BrazilTaxAuditor`: Especialista em B3, IR e cálculos tributários brasileiros.
- `MonitorIsencao20k`: Guardião do limite de isenção mensal de R$ 20k.

### Skills Chave:
- `brazil-tax-auditor`: Regras fiscais e preço médio.
- `clean-code`: Princípios de Robert C. Martin aplicados.
- `nextjs-react-expert`: Otimização de performance Svelte/Vercel.
- `ui-ux-pro-max`: Domínio de design tokens e glassmorphism.

---

## 🎨 Diretrizes de Design (Institutional Terminal)

O TraderLogPro deve parecer uma ferramenta de alta performance para investidores profissionais.

1.  **Visual "Pill"**: Todos os botões, seletores e inputs devem ser `rounded-full` (padrão pílula).
2.  **Labels Superiores**: Nomes de campos sempre ACIMA do componente, em fonte pequena e uppercase.
3.  **Dropdowns Locais**: **MANDATÓRIO** usar `portal={null}` para que menus acompanhem o zoom do app.
4.  **Glassmorphism**: Fundo escuro com blur fino (`backdrop-blur-xl`) e bordas suaves (`border-white/5`).
5.  **Banido**: Cores roxas/violetas (exceto se explicitamente pedido). Prioridade: Emerald, Rose, Slate.

---

## 🛠️ Workflows de Desenvolvimento

Use os comandos de barra para ações rápidas:
- `/create`: Inicia o App Builder para novas funcionalidades.
- `/orchestrate`: Coordena múltiplos agentes para tarefas transversais.
- `/debug`: Ativa o modo de depuração sistemática.
- `/test`: Gera e executa suítes de testes.

---

## ⚠️ Regras de Ouro (Invioláveis)

1.  **I18n Sempre**: Nunca use strings hardcoded no HTML. Use `$t('...')`.
2.  **Resiliência de Banco**: Comandos Rust devem tratar erros de "Invalid revision" e usar `UPSERT`.
3.  **Clean Code**: Funções nomeadas, tipagem rigorosa e zero dívida técnica.
4.  **Svelte Runes**: Use `$state`, `$derived`, `$effect` exclusivamente.

---

*TraderLogPro - Built for Precision. Codified for Growth.*
