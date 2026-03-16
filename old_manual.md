# Manual do Usu├írio - TraderLog Pro v1.1

## 1. Vis├úo Geral e Conceitos Fundamentais

O **TraderLog Pro** n├úo ├® apenas um di├írio de trades; ├® uma esta├º├úo de intelig├¬ncia financeira desenhada para profissionalizar o trader pessoa f├¡sica. Nossa filosofia baseia-se na centraliza├º├úo de dados para transformar "sentimento" em estat├¡stica acion├ível.

### 1.1. Os Tr├¬s Pilares do Sucesso
Para atingir a consist├¬ncia, o software atua simultaneamente em tr├¬s frentes:
1.  **Pilar Operacional (The Engine)**: Automa├º├úo completa do journaling via RTD. Voc├¬ opera, n├│s registramos, calculamos e classificamos em tempo real.
2.  **Pilar Psicol├│gico (The Mind)**: Onde a matem├ítica encontra a emo├º├úo. Rastreamos seu estado mental para identificar se suas perdas s├úo t├®cnicas ou comportamentais.
3.  **Pilar Fiscal (The Compliance)**: Seguran├ºa jur├¡dica e tribut├íria. Geramos suas DARFs e controlamos isen├º├Áes automaticamente, eliminando o medo da malha fina.

### 1.2. Arquitetura Local-First (Privacidade por Design)
Diferente de plataformas web, o TraderLog Pro opera sob o modelo **Local-First**:
- **Privacidade Total**: Seus dados financeiros e estrat├®gias nunca saem da sua m├íquina. N├úo existem servidores centrais que possam ser invadidos ou que vendam seus dados.
- **Criptografia de Elite**: Tudo ├® armazenado no **SurrealDB** local, protegido por criptografia **AES-256**.
- **Performance Offline**: O app funciona 100% sem internet para consulta e an├ílise de dados hist├│ricos.

### 1.3. Integra├º├úo Real-Time (RTD Bridge)
A pe├ºa central da nossa automa├º├úo ├® a **PowerShell Bridge**. Ela atua como um tradutor universal que escuta sua plataforma (ProfitChart, MetaTrader, etc) e alimenta o TraderLog Pro em milissegundos, eliminando o erro humano e a pregui├ºa de preencher planilhas.

### 1.3. Setup Engine (Guia de 9 Passos)
Ao iniciar pela primeira vez, o assistente guiar├í voc├¬ por:
1. **Prefer├¬ncias Visuais**: Idioma e Tema.
![Passo 1: Prefer├¬ncias Visuais](./assets/setup/setup_step_1.png)
2. **Perfil e Seguran├ºa**: Cria├º├úo de senha criptogr├ífica.
![Passo 2: Perfil](./assets/setup/setup_step_2.png)
3. **Master Key**: Gere e guarde sua chave de 24 palavras.
![Passo 3: Master Key](./assets/setup/setup_step_3.png)
4. **Licen├ºa**: Ative seu acesso Premium.
![Passo 4: Licen├ºa](./assets/setup/setup_step_4.png)
5. **Moeda Base**: Defina a moeda da sua vida financeira.
![Passo 5: Moeda Base](./assets/setup/setup_step_5.png)
6. **Mercados**: Selecione onde voc├¬ opera.
![Passo 6: Mercados](./assets/setup/setup_step_6.png)
7. **Tipos de Ativos**: A├º├Áes, Futuros, Op├º├Áes.
![Passo 7: Tipos de Ativos](./assets/setup/setup_step_7.png)
8. **Conex├úo RTD**: Ative o monitoramento autom├ítico.
![Passo 8: Conex├úo RTD](./assets/setup/setup_step_8.png)
9. **Finaliza├º├úo**: In├¡cio da jornada.
![Passo 9: Finaliza├º├úo](./assets/setup/setup_step_9.png)

---

## 2. Configura├º├Áes do Sistema (Fluxo P├│s-In├¡cio)

A ├írea de Configura├º├Áes est├í dividida em se├º├Áes l├│gicas para facilitar o gerenciamento. Acesse pelo ├¡cone de engrenagem no rodap├® do menu lateral.

### 2.1. GERAL

#### 2.1.1. Perfil
Gerencie informa├º├Áes pessoais (Nome, CPF) e prefer├¬ncias de idioma e fuso hor├írio.
![Perfil do Usu├írio](./assets/settings/profile/view.png)

#### 2.1.2. Licen├ºa
Acompanhe o status e validade da sua assinatura.
![Licenciamento](./assets/settings/license/view.png)

### 2.2. CADASTROS

#### 2.2.1. Contas
Cadastre suas corretoras ou mesas propriet├írias. **Obrigat├│rio para registrar trades.**

**Como adicionar:**
1. Clique no bot├úo **"Novo"** no topo da lista.
2. Preencha o nome da corretora, n├║mero da conta e selecione a moeda.
3. Clique em **"Salvar"**.

![Lista de Contas](./assets/settings/accounts/list.png)
![Formul├írio de Conta](./assets/settings/accounts/modal_add.png)

#### 2.2.2. Moedas
Gerencie moedas e taxas de c├ómbio contra sua moeda base.

**Como adicionar:**
1. Clique em **"Novo"**.
2. Defina o c├│digo (Ex: USD, EUR), nome e a taxa de convers├úo atual.
3. Clique em **"Salvar"**.

![Lista de Moedas](./assets/settings/currencies/list.png)
![Formul├írio de Moeda](./assets/settings/currencies/modal_add.png)

#### 2.2.3. Mercados
Defina fuso hor├írio e janelas de preg├úo (B3, NYSE, etc).

**Como adicionar:**
1. Clique em **"Novo"**.
2. Informe o nome (Ex: B3), fuso hor├írio e os hor├írios de abertura e fechamento.
3. Clique em **"Salvar"**.

![Lista de Mercados](./assets/settings/markets/list.png)
![Formul├írio de Mercado](./assets/settings/markets/modal_add.png)

#### 2.2.4. Tipos de Ativos
Categorize os pap├®is e defina se o PnL ser├í em financeiro ou pontos.

**Como adicionar:**
1. Clique em **"Novo Tipo"** no topo da lista.
2. Defina o nome (Ex: A├º├Áes, ├ìndice), o mercado e como o resultado deve ser exibido (Financeiro ou Pontos).
3. Clique em **"Salvar"**.

![Lista de Tipos de Ativos](./assets/settings/asset-types/list.png)
![Formul├írio de Tipo de Ativo](./assets/settings/asset-types/modal_add.png)

#### 2.2.5. Ativos
Cadastre tickers individuais (PETR4, WDO) e defina o peso do ponto.

**Como adicionar:**
1. Clique em **"Novo Ativo"** no topo da lista.
2. Informe o S├¡mbolo (Ticker), Nome amig├ível e selecione o Tipo de Ativo.
3. Configure o Valor do Ponto (necess├írio para c├ílculo de PnL em contratos).
4. Clique em **"Salvar"**.

![Lista de Ativos](./assets/settings/assets/list.png)
![Formul├írio de Ativo](./assets/settings/assets/modal_add.png)

#### 2.2.6. Taxas & Emolumentos
Configure custos de corretagem e emolumentos da bolsa.

**Como adicionar:**
1. Clique em **"Nova Taxa"**.
2. Defina um nome para o perfil de taxas.
3. Informe os valores de corretagem (por ordem ou contrato) e as al├¡quotas de emolumentos e ISS.
4. Clique em **"Salvar"**.

![Lista de Taxas](./assets/settings/fees/list.png)
![Formul├írio de Taxas](./assets/settings/fees/modal_add.png)

### 2.3. FISCAL

#### 2.3.1. Regras Fiscais
Defina al├¡quotas (Day Trade 20%, Swing 15%) e limites de isen├º├úo.

**Como adicionar:**
1. Clique em **"Nova Regra"**.
2. Escolha o Mercado e o Tipo de Ativo.
3. Defina as al├¡quotas de Day Trade e Swing Trade.
4. Informe o c├│digo de receita (DARF) e limites de isen├º├úo se houver.
5. Clique em **"Salvar"**.

![Lista de Regras Fiscais](./assets/settings/fiscal/rules/list.png)
![Formul├írio de Regra Fiscal](./assets/settings/fiscal/rules/modal_add.png)

#### 2.3.2. Perfis Fiscais
Agrupe regras em perfis (Ex: "Padr├úo Brasil").

**Como adicionar:**
1. Clique em **"Novo Perfil"**.
2. Defina um nome (Ex: Swing Trade A├º├Áes).
3. Selecione as regras fiscais que comp├Áem este perfil.
4. Clique em **"Salvar"**.

![Perfis Fiscais](./assets/settings/fiscal/profiles/list.png)
![Formul├írio de Perfil Fiscal](./assets/settings/fiscal/profiles/modal.png)

#### 2.3.3. Atribui├º├Áes
Vincule perfis fiscais a contas ou tipos de ativos espec├¡ficos.

![Atribui├º├Áes Fiscais](./assets/settings/fiscal/assignments/list.png)

### 2.4. OPERACIONAL

#### 2.4.1. Perfil de Risco
Defina Stop Loss Di├írio, Metas e o **Growth Plan** (Plano de Crescimento) para proteger seu capital.

**Como adicionar:**
1. Clique em **"Novo Perfil"** na tela de Perfis de Risco.
2. No formul├írio, preencha as configura├º├Áes divididas em tr├¬s abas: Geral, Motor de Risco e Crescimento.
3. Clique em **"Salvar"** para aplicar as regras.

![Lista de Perfis de Risco](./assets/settings/risk/view.png)

**Aba: Geral**  
Configura├º├Áes b├ísicas de limites e objetivos.

*   **Limite de Perda Di├íria:** Valor m├íximo que voc├¬ aceita perder no dia. Ao atingir, a plataforma pode travar novas opera├º├Áes.
*   **Meta Di├íria:** Objetivo de ganho para o dia.
*   **Risco M├íximo por Opera├º├úo (%):** Limite de perda aceit├ível em uma ├║nica entrada.
*   **Quantidade M├íxima de Trades:** Limite de opera├º├Áes por dia para evitar overtrading.
*   **Travar ao Atingir Perda:** Se ativado, impede a abertura de novas ordens ap├│s o stop di├írio.

![Formul├írio de Risco - Geral](./assets/settings/risk/modal_add_general.png)

***

**Aba: Motor de Risco**  
Recursos avan├ºados de intelig├¬ncia e disciplina.

*   **Acoplamento Psicol├│gico:** Reduz o tamanho da m├úo automaticamente se detectar uma sequ├¬ncia de perdas ou comportamento err├ítico.
*   **Regress├úo de Outliers:** Identifica ganhos fora do comum que podem gerar excesso de confian├ºa e ajusta o risco.
*   **Modo Sniper:** Aumenta a seletividade exigida para novas entradas com base no seu hist├│rico.

![Formul├írio de Risco - Motor](./assets/settings/risk/modal_add_engine.png)

***

**Aba: Plano de Crescimento**  
Escale seus lotes de forma matem├ítica e segura.

*   **Habilitar Plano:** Ativa a progress├úo autom├ítica de lotes.
*   **Fases:** Defina quantos contratos/lotes operar em cada n├¡vel e quais as regras para subir ou descer de fase (Ex: 5 dias positivos para subir).

![Formul├írio de Risco - Crescimento](./assets/settings/risk/modal_add_growth.png)

#### 2.4.2. Modalidades
Categorize o tempo das opera├º├Áes (Scalping, Swing, DT). **Vital para o c├ílculo fiscal.**

**Como adicionar:**
1. Clique em **"Nova Modalidade"**.
2. Informe o nome (Ex: Scalping, Day Trade).
3. Selecione o tipo de c├ílculo fiscal correspondente.
4. Clique em **"Salvar"**.

![Lista de Modalidades](./assets/settings/modalities/list.png)
![Formul├írio de Modalidade](./assets/settings/modalities/modal_add.png)

### 2.5. AN├üLISE

#### 2.5.1. Estados Emocionais
Mapeie seu humor (Foco, Ansiedade, Vingan├ºa) e o peso no seu resultado.

**Como adicionar:**
1. Clique em **"Novo Estado"**.
2. D├¬ um nome ao estado emocional.
3. Defina um ├¡cone e o impacto (Positivo, Neutro ou Negativo).
4. Clique em **"Salvar"**.

![Estados Emocionais](./assets/settings/emotional-states/list.png)
![Formul├írio de Estado Emocional](./assets/settings/emotional-states/modal_add.png)

#### 2.5.2. Tags
Etiquetas livres para contexto (Not├¡cia, Erro Operacional).

**Como adicionar:**
1. Clique em **"Nova Tag"**.
2. Informe o nome da tag.
3. Escolha uma cor para identifica├º├úo visual.
4. Clique em **"Salvar"**.

![Tags](./assets/settings/tags/list.png)
![Formul├írio de Tag](./assets/settings/tags/modal_add.png)

#### 2.5.3. Indicadores
Documente as ferramentas t├®cnicas (VWAP, M├®dias) usadas nos setups.

**Como adicionar:**
1. Clique em **"Novo Indicador"**.
2. Nomeie o indicador t├®cnico.
3. (Opcional) Adicione uma breve descri├º├úo t├®cnica.
4. Clique em **"Salvar"**.

![Indicadores](./assets/settings/indicators/list.png)
![Formul├írio de Indicador](./assets/settings/indicators/modal_add.png)

#### 2.5.4. Timeframes
Defina os tempos gr├íficos (1min, 5min, 60min).

**Como adicionar:**
1. Clique em **"Novo Timeframe"**.
2. Defina o valor num├®rico e a unidade (Minutos, Horas, Dias).
3. Clique em **"Salvar"**.

![Timeframes](./assets/settings/timeframes/list.png)
![Formul├írio de Timeframe](./assets/settings/timeframes/modal_add.png)

#### 2.5.5. Tipos de Gr├ífico
Escolha a forma de leitura de pre├ºo (Candle, Renko, Fluxo).

**Como adicionar:**
1. Clique em **"Novo Tipo"**.
2. Nomeie o estilo de gr├ífico (Ex: Renko 10R).
3. Clique em **"Salvar"**.

![Tipos de Gr├ífico](./assets/settings/chart-types/list.png)
![Formul├írio de Tipo de Gr├ífico](./assets/settings/chart-types/modal_add.png)

#### 2.5.6. Estrat├®gias
Documente seus setups com gatilhos, checklists e exemplos visuais para manter a consist├¬ncia operacional.

**Como adicionar:**
1. Clique em **"Nova Estrat├®gia"**.
2. Defina o nome do operacional (Ex: Rompimento de Pivot, Revers├úo de M├®dias).
3. Preencha o checklist de entrada e as regras de sa├¡da (Gain/Loss).
4. (Opcional) Anexe uma imagem de exemplo do setup ideal.
5. Clique em **"Salvar"**.

![Lista de Estrat├®gias](./assets/settings/strategies/list.png)
![Formul├írio de Estrat├®gia](./assets/settings/strategies/modal_add.png)

### 2.6. SISTEMA

#### 2.6.1. Integra├º├Áes
Configure chaves de API para dados externos.
![Integra├º├Áes de API - Lista](./assets/settings/api-integrations/list.png)

#### 2.6.2. Banco de Dados
Gest├úo e backup dos dados locais criptografados.
![Gest├úo de Banco de Dados - Lista](./assets/settings/database/list.png)

---

## 3. Navega├º├úo e Interface (O Cockpit)

### 3.1. Dashboard (Painel Principal)
Vis├úo 360┬║ da sua sa├║de financeira. Inclui Equity Curve, Calend├írio Semaf├│rico e os 4 Kash Cards (Saldo, Net PnL, Win Rate e Disciplina).
![Vis├úo Geral do Dashboard](./assets/page_dashboard.png)

### 3.2. Sidebar (Menu Lateral)
Navega├º├úo dividida entre N├║cleo Operacional (Trades/Mente), Tesouraria (Bancos/Ativos), Malha Fina (Fiscal) e Casa de M├íquinas (Configura├º├Áes).

---

## 4. Ecossistema Operacional (Uso Di├írio)

### 4.1. Negocia├º├Áes (Trades)
A ├írvore cronol├│gica onde o Auto-Journaling centraliza suas opera├º├Áes importadas via RTD.
![P├ígina de Negocia├º├Áes](./assets/page_trades.png)

### 4.2. Estrat├®gias Hub
Onde voc├¬ analisa estatisticamente qual setup paga suas contas atrav├®s de checklists de disciplina.
![P├ígina de Estrat├®gias](./assets/page_strategies.png)

### 4.3. Hub Financeiro (Tesouraria)
Gest├úo de entradas, sa├¡das e controle de margem entre bancos e corretoras.
![Hub Financeiro](./assets/page_finance.png)

### 4.4. Psicologia (Mente)
O cruzamento matem├ítico entre seus estados emocionais e seu PnL real.
![Psicologia](./assets/page_psicologia.png)

### 4.5. Fiscal (O Motor Fiscal B3)
Gera├º├úo autom├ítica de DARFs, controle de isen├º├úo de 20k e relat├│rios mensais/anuais.
![M├│dulo Fiscal](./assets/page_fiscal.png)

---
*(Fim do Manual - v1.1 - Padronizado)*
