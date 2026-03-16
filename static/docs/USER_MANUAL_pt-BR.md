# Manual do Usuário - TraderLog Pro v1.1

## 1. Visão Geral e Conceitos Fundamentais

O **TraderLog Pro** não é apenas um diário de trades; é uma estação de inteligência financeira desenhada para profissionalizar o trader pessoa física. Nossa filosofia baseia-se na centralização de dados para transformar "sentimento" em estatística acionável.

### 1.1. Os Três Pilares do Sucesso
Para atingir a consistência, o software atua simultaneamente em três frentes:
1.  **Pilar Operacional (The Engine)**: Automação completa do journaling via RTD. Você opera, nós registramos, calculamos e classificamos em tempo real.
2.  **Pilar Psicológico (The Mind)**: Onde a matemática encontra a emoção. Rastreamos seu estado mental para identificar se suas perdas são técnicas ou comportamentais.
3.  **Pilar Fiscal (The Compliance)**: Segurança jurídica e tributária. Geramos suas DARFs e controlamos isenções automaticamente, eliminando o medo da malha fina.

### 1.2. Arquitetura Local-First (Privacidade por Design)
Diferente de plataformas web, o TraderLog Pro opera sob o modelo **Local-First**:
- **Privacidade Total**: Seus dados financeiros e estratégias nunca saem da sua máquina. Não existem servidores centrais que possam ser invadidos ou que vendam seus dados.
- **Criptografia de Elite**: Tudo é armazenado no **SurrealDB** local, protegido por criptografia **AES-256**.
- **Performance Offline**: O app funciona 100% sem internet para consulta e análise de dados históricos.

### 1.3. Integração Real-Time (RTD Bridge)
A peça central da nossa automação é a **PowerShell Bridge**. Ela atua como um tradutor universal que escuta sua plataforma (ProfitChart, MetaTrader, etc) e alimenta o TraderLog Pro em milissegundos, eliminando o erro humano e a preguiça de preencher planilhas.

### 1.3. Setup Engine (Guia de 9 Passos)
Ao iniciar pela primeira vez, o assistente guiará você por:
1. **Preferências Visuais**: Idioma e Tema.
![Passo 1: Preferências Visuais](./assets/setup/setup_step_1.png)
2. **Perfil e Segurança**: Criação de senha criptográfica.
![Passo 2: Perfil](./assets/setup/setup_step_2.png)
3. **Master Key**: Gere e guarde sua chave de 24 palavras.
![Passo 3: Master Key](./assets/setup/setup_step_3.png)
4. **Licença**: Ative seu acesso Premium.
![Passo 4: Licença](./assets/setup/setup_step_4.png)
5. **Moeda Base**: Defina a moeda da sua vida financeira.
![Passo 5: Moeda Base](./assets/setup/setup_step_5.png)
6. **Mercados**: Selecione onde você opera.
![Passo 6: Mercados](./assets/setup/setup_step_6.png)
7. **Tipos de Ativos**: Ações, Futuros, Opções.
![Passo 7: Tipos de Ativos](./assets/setup/setup_step_7.png)
8. **Conexão RTD**: Ative o monitoramento automático.
![Passo 8: Conexão RTD](./assets/setup/setup_step_8.png)
9. **Finalização**: Início da jornada.
![Passo 9: Finalização](./assets/setup/setup_step_9.png)

---

## 2. Configurações do Sistema (Fluxo Pós-Início)

A área de Configurações está dividida em seções lógicas para facilitar o gerenciamento. Acesse pelo ícone de engrenagem no rodapé do menu lateral.

### 2.1. GERAL

#### 2.1.1. Perfil
Gerencie informações pessoais (Nome, CPF) e preferências de idioma e fuso horário.
![Perfil do Usuário](./assets/settings/profile/view.png)

#### 2.1.2. Licença
Acompanhe o status e validade da sua assinatura.
![Licenciamento](./assets/settings/license/view.png)

### 2.2. CADASTROS

#### 2.2.1. Contas
Cadastre suas corretoras ou mesas proprietárias. **Obrigatório para registrar trades.**

**Como adicionar:**
1. Clique no botão **"Novo"** no topo da lista.
2. Preencha o nome da corretora, número da conta e selecione a moeda.
3. Clique em **"Salvar"**.

![Lista de Contas](./assets/settings/accounts/list.png)
![Formulário de Conta](./assets/settings/accounts/modal_add.png)

#### 2.2.2. Moedas
Gerencie moedas e taxas de câmbio contra sua moeda base.

**Como adicionar:**
1. Clique em **"Novo"**.
2. Defina o código (Ex: USD, EUR), nome e a taxa de conversão atual.
3. Clique em **"Salvar"**.

![Lista de Moedas](./assets/settings/currencies/list.png)
![Formulário de Moeda](./assets/settings/currencies/modal_add.png)

#### 2.2.3. Mercados
Defina fuso horário e janelas de pregão (B3, NYSE, etc).

**Como adicionar:**
1. Clique em **"Novo"**.
2. Informe o nome (Ex: B3), fuso horário e os horários de abertura e fechamento.
3. Clique em **"Salvar"**.

![Lista de Mercados](./assets/settings/markets/list.png)
![Formulário de Mercado](./assets/settings/markets/modal_add.png)

#### 2.2.4. Tipos de Ativos
Categorize os papéis e defina se o PnL será em financeiro ou pontos.

**Como adicionar:**
1. Clique em **"Novo Tipo"** no topo da lista.
2. Defina o nome (Ex: Ações, Índice), o mercado e como o resultado deve ser exibido (Financeiro ou Pontos).
3. Clique em **"Salvar"**.

![Lista de Tipos de Ativos](./assets/settings/asset-types/list.png)
![Formulário de Tipo de Ativo](./assets/settings/asset-types/modal_add.png)

#### 2.2.5. Ativos
Cadastre tickers individuais (PETR4, WDO) e defina o peso do ponto.

**Como adicionar:**
1. Clique em **"Novo Ativo"** no topo da lista.
2. Informe o Símbolo (Ticker), Nome amigável e selecione o Tipo de Ativo.
3. Configure o Valor do Ponto (necessário para cálculo de PnL em contratos).
4. Clique em **"Salvar"**.

![Lista de Ativos](./assets/settings/assets/list.png)
![Formulário de Ativo](./assets/settings/assets/modal_add.png)

#### 2.2.6. Taxas & Emolumentos
Configure custos de corretagem e emolumentos da bolsa.

**Como adicionar:**
1. Clique em **"Nova Taxa"**.
2. Defina um nome para o perfil de taxas.
3. Informe os valores de corretagem (por ordem ou contrato) e as alíquotas de emolumentos e ISS.
4. Clique em **"Salvar"**.

![Lista de Taxas](./assets/settings/fees/list.png)
![Formulário de Taxas](./assets/settings/fees/modal_add.png)

### 2.3. FISCAL

#### 2.3.1. Regras Fiscais
Defina alíquotas (Day Trade 20%, Swing 15%) e limites de isenção.

**Como adicionar:**
1. Clique em **"Nova Regra"**.
2. Escolha o Mercado e o Tipo de Ativo.
3. Defina as alíquotas de Day Trade e Swing Trade.
4. Informe o código de receita (DARF) e limites de isenção se houver.
5. Clique em **"Salvar"**.

![Formulário de Regra Fiscal](./assets/settings/fiscal/rules/modal_add.png)
#### 2.3.2. Perfis Fiscais
Agrupe regras em perfis (Ex: "Padrão Brasil").

**Como adicionar:**
1. Clique em **"Novo Perfil"**.
2. Defina um nome (Ex: Swing Trade Ações).
3. Selecione as regras fiscais que compõem este perfil.
4. Clique em **"Salvar"**.

![Perfis Fiscais](./assets/settings/fiscal/profiles/list.png)
![Formulário de Perfil Fiscal](./assets/settings/fiscal/profiles/modal.png)

#### 2.3.3. Atribuições
Vincule perfis fiscais a contas ou tipos de ativos específicos.

![Atribuições Fiscais](./assets/settings/fiscal/assignments/list.png)

### 2.4. OPERACIONAL

#### 2.4.1. Perfil de Risco
Defina Stop Loss Diário, Metas e o **Growth Plan** (Plano de Crescimento) para proteger seu capital.

**Como adicionar:**
1. Clique em **"Novo Perfil"** na tela de Perfis de Risco.
2. No formulário, preencha as configurações divididas em três abas: Geral, Motor de Risco e Crescimento.
3. Clique em **"Salvar"** para aplicar as regras.

![Lista de Perfis de Risco](./assets/settings/risk/view.png)

**Aba: Geral**  
Configurações básicas de limites e objetivos.

*   **Limite de Perda Diária:** Valor máximo que você aceita perder no dia. Ao atingir, a plataforma pode travar novas operações.
*   **Meta Diária:** Objetivo de ganho para o dia.
*   **Risco Máximo por Operação (%):** Limite de perda aceitável em uma única entrada.
*   **Quantidade Máxima de Trades:** Limite de operações por dia para evitar overtrading.
*   **Travar ao Atingir Perda:** Se ativado, impede a abertura de novas ordens após o stop diário.

![Formulário de Risco - Geral](./assets/settings/risk/modal_add_general.png)

***

**Aba: Motor de Risco**  
Recursos avançados de inteligência e disciplina.

*   **Acoplamento Psicológico:** Reduz o tamanho da mão automaticamente se detectar uma sequência de perdas ou comportamento errático.
*   **Regressão de Outliers:** Identifica ganhos fora do comum que podem gerar excesso de confiança e ajusta o risco.
*   **Modo Sniper:** Aumenta a seletividade exigida para novas entradas com base no seu histórico.

![Formulário de Risco - Motor](./assets/settings/risk/modal_add_engine.png)

***

**Aba: Plano de Crescimento**  
Escale seus lotes de forma matemática e segura.

*   **Habilitar Plano:** Ativa a progressão automática de lotes.
*   **Fases:** Defina quantos contratos/lotes operar em cada nível e quais as regras para subir ou descer de fase (Ex: 5 dias positivos para subir).

![Formulário de Risco - Crescimento](./assets/settings/risk/modal_add_growth.png)

#### 2.4.2. Modalidades
Categorize o tempo das operações (Scalping, Swing, DT). **Vital para o cálculo fiscal.**

**Como adicionar:**
1. Clique em **"Nova Modalidade"**.
2. Informe o nome (Ex: Scalping, Day Trade).
3. Selecione o tipo de cálculo fiscal correspondente.
4. Clique em **"Salvar"**.

![Lista de Modalidades](./assets/settings/modalities/list.png)
![Formulário de Modalidade](./assets/settings/modalities/modal_add.png)

### 2.5. ANÁLISE

#### 2.5.1. Estados Emocionais
Mapeie seu humor (Foco, Ansiedade, Vingança) e o peso no seu resultado.

**Como adicionar:**
1. Clique em **"Novo Estado"**.
2. Dê um nome ao estado emocional.
3. Defina um ícone e o impacto (Positivo, Neutro ou Negativo).
4. Clique em **"Salvar"**.

![Estados Emocionais](./assets/settings/emotional-states/list.png)
![Formulário de Estado Emocional](./assets/settings/emotional-states/modal_add.png)

#### 2.5.2. Tags
Etiquetas livres para contexto (Notícia, Erro Operacional).

**Como adicionar:**
1. Clique em **"Nova Tag"**.
2. Informe o nome da tag.
3. Escolha uma cor para identificação visual.
4. Clique em **"Salvar"**.

![Tags](./assets/settings/tags/list.png)
![Formulário de Tag](./assets/settings/tags/modal_add.png)

#### 2.5.3. Indicadores
Documente as ferramentas técnicas (VWAP, Médias) usadas nos setups.

**Como adicionar:**
1. Clique em **"Novo Indicador"**.
2. Nomeie o indicador técnico.
3. (Opcional) Adicione uma breve descrição técnica.
4. Clique em **"Salvar"**.

![Indicadores](./assets/settings/indicators/list.png)
![Formulário de Indicador](./assets/settings/indicators/modal_add.png)

#### 2.5.4. Timeframes
Defina os tempos gráficos (1min, 5min, 60min).

**Como adicionar:**
1. Clique em **"Novo Timeframe"**.
2. Defina o valor numérico e a unidade (Minutos, Horas, Dias).
3. Clique em **"Salvar"**.

![Timeframes](./assets/settings/timeframes/list.png)
![Formulário de Timeframe](./assets/settings/timeframes/modal_add.png)

#### 2.5.5. Tipos de Gráfico
Escolha a forma de leitura de preço (Candle, Renko, Fluxo).

**Como adicionar:**
1. Clique em **"Novo Tipo"**.
2. Nomeie o estilo de gráfico (Ex: Renko 10R).
3. Clique em **"Salvar"**.

![Tipos de Gráfico](./assets/settings/chart-types/list.png)
![Formulário de Tipo de Gráfico](./assets/settings/chart-types/modal_add.png)

#### 2.5.6. Estratégias
Documente seus setups com gatilhos, checklists e exemplos visuais para manter a consistência operacional.

**Como adicionar:**
1. Clique em **"Nova Estratégia"**.
2. Defina o **Nome** (Ex: Rompimento de Pivot) e uma breve **Descrição**.
3. Selecione os **Mercados**, **Timeframes**, **Tipos de Ativos** e **Ativos Específicos** (opcional) onde a estratégia se aplica.
4. Vá para a aba **Checklist de Validação** e defina os Critérios de Entrada, Critérios de Saída e Regras de Condução.
5. Se a estratégia possuir realizações parciais, ative a opção **"Permite Realização Parcial"** e descreva as metas.
6. (Opcional) Na aba **Exemplos Visuais**, carregue imagens de referência (máx: 5).
7. Clique em **"Salvar"**.

![Lista de Estratégias](./assets/settings/strategies/list.png)
![Formulário de Estratégia](./assets/settings/strategies_modal_1920x1080.png)



---

## 3. Navegação e Interface (O Cockpit)

### 3.1. Dashboard (Painel Principal)
Visão 360º da sua saúde financeira. Inclui Equity Curve, Calendário Semafórico e os 4 Kash Cards (Saldo, Net PnL, Win Rate e Disciplina).
![Visão Geral do Dashboard](./assets/page_dashboard.png)

### 3.2. Sidebar (Menu Lateral)
Navegação dividida entre Núcleo Operacional (Trades/Mente), Tesouraria (Bancos/Ativos), Malha Fina (Fiscal) e Casa de Máquinas (Configurações).

---

## 4. Ecossistema Operacional (Uso Diário)

### 4.1. Negociações (Trades)
A árvore cronológica onde o Auto-Journaling centraliza suas operações importadas via RTD ou lançadas manualmente.

![Página de Negociações](./assets/page_trades.png)

**Como adicionar manualmente:**
Na tela de Negociações, clique no botão **"Novo Trade"** para abrir o formulário inteligente em 5 etapas:

#### Aba 1: Básico (Contexto da Operação)
O primeiro passo define o "Onde, O que e Quando" da sua operação. Preencha os detalhes fundamentais para que o sistema possa calcular e catalogar o trade:
* **Conta:** A corretora ou banco onde a operação foi executada (ex: XP, BTG).
* **Estratégia:** O setup operacional que motivou a entrada (ex: Cruzamento de Médias, Breakout).
* **Tempo Gráfico:** O tempo do gráfico (Timeframe) utilizado para a leitura da entrada (ex: 5m, 60m, Diário).
* **Volatilidade:** A sua percepção de como estava o mercado (Normal, Alta, Extrema).
* **Tipo de Ativo:** Um filtro rápido para facilitar a busca do ativo (Ações, Futuros, Forex).
* **Ativo / Contrato:** O ticker negociado (ex: WINM26, PETR4, EURUSD). 
* **Direção:** Se a operação foi iniciada na ponta Compradora (Long) ou Vendedora (Short).
* **Data e Hora:** O momento exato em que a ordem foi executada na corretora.
* **Preço de Entrada:** O preço médio inicial preenchido na boleta.
* **QTD (Quantidade):** O número de ações, minicontratos ou lotes negociados.
* **Emocional:** A emoção ou sentimento que você estava experimentando instantes antes de clicar no botão.
* **Modalidade:** O perfil de risco tributário e temporal (Day Trade para operações iniciadas e encerradas no mesmo dia, ou Swing Trade).
* **Stop Loss (Opcional):** O seu preço de defesa máxima posicionado na corretora.
* **Take Profit (Opcional):** O alvo final projetado para ganho.

![Formulário de Novo Trade - Aba 1](./assets/modal_add_trade_tab1.png)

#### Aba 2: Condução (Gestão de Parciais e Saída)
O segundo passo é focado no gerenciamento de risco durante o trade e na liquidação da operação. Detalhe como você lidou com a posição e encerre o registro:
* **Volume Executado / Restantes:** Monitora quantos contratos/lotes da sua posição principal já foram encerrados e quantos continuam pendentes.
* **Toggle Saída / Adição:** Escolha o tipo de parcial que deseja registrar. "Saída" para realizações de lucro (Take Profit parcial) ou redução de perda. "Adição" para aumentos de posição (Preço Médio a favor ou contra).
* **Botão + Adicionar Parcial:** Abre um sub-formulário para preencher a Data/Hora, Preço, Quantidade e Observações da perna registrada.
* **Tabela de Parciais:** Histórico em grade listando cronologicamente todas as pernas da sua operação, calculando o seu Novo Preço Médio e o Resultado financeiro individual de cada parcial.
* **Toggle Aberto / Fechado (Dados de Fechamento):** A chave mestre do trade. Marcando como "Fechado", a plataforma liquida qualquer saldo restante na sua posição e exibe os campos definitivos de fechamento:
  * **Data e Hora de Saída:** Momento da liquidação final.
  * **Preço de Saída:** Preço que zerou a posição principal.
  * **Custos / Taxas:** Preenchimento de taxas operacionais da corretora/bolsa (caso seu Perfil Fiscal já não tenha autocalculado).
* **Card de Resultado Líquido:** Um painel em tempo real que consolida a matemática das suas entradas, adições, saídas parciais e saída final, exibindo seu Lucro ou Prejuízo projetado.

![Formulário de Novo Trade - Aba 2](./assets/modal_add_trade_tab2.png)

#### Aba 3: Psicologia (Análise Contextual)
O "Diário de Bordo" (Journaling). Esta etapa qualitativa é crucial para que os algoritmos de cruzamento comportamental consigam identificar o que dá dinheiro e o que gera perdas nas suas emoções. Preencha:
* **Racional da Entrada:** Um texto livre explicando o *porquê* você decidiu abrir a operação.
* **Sinais de Confirmação:** Detalhe técnico. Quais gatilhos exatos o seu setup validou?
* **Contexto do Mercado / Notícias:** Qual era o sentimento macro no momento? A favor da tendência? Teve influência de alguma notícia? 
* **O que funcionou / Melhorias:** Uma avaliação pós-trade do que sobrou de aprendizado prático da execução.
* **Intensidade Emocional:** Um slider de impacto (0 a 10). O quão forte estava a emoção (Leve, Moderada, Extrema) que você registrou lá na Aba 1? Ex: Uma Ansiedade nível 10 destruirá sua paciência para segurar um gain.

![Formulário de Novo Trade - Aba 3](./assets/modal_add_trade_tab3.png)

#### Aba 4: Mídia (Evidências Visuais)
Um repositório de provas visuais do seu operacional. Registre imagens para facilitar auditorias e estudos no futuro.
* **Área de Upload (Arraste ou Clique):** Permite adicionar até 5 Megabytes (Max 5MB) de capturas de tela. Ideal para upar os prints do ProfitChart ou TradingView demonstrando exatamente onde você entrou, onde estava o stop, e onde saiu.

![Formulário de Novo Trade - Aba 4](./assets/modal_add_trade_tab4.png)

#### Aba 5: Revisão (Resumo Final)
A última etapa atua como uma auditoria fria antes de você consolidar os dados no banco de origem.
* **Quadro de Resumo:**
  * **Ativo / Direção:** Valida o ticker e se foi Compra/Venda.
  * **Resultado:** O PnL financeiro final já processado.
  * **Data & Estratégia:** Confirmação de calendário e método utilizado.
  * **Imagens:** Quantidade de anexos salvos na Aba 4.
  * **Seguiu o Plano?:** Um check vital! O sistema usa essa variável booleana (Sim ou Não) para alimentar as estatísticas de Aderência e Disciplina do Dashboard de Estratégias!
* **Memória de Cálculo:**
  * **Resultado Bruto vs Taxas:** O sistema demonstra quanto dinheiro ficou no mercado através de taxas operacionais frente ao que foi realmente ganho na variação do ativo (Saldo Líquido = Bruto - Taxas).
* **Botão Salvar / Finalizar:** Conclui e insere definitivamente a operação no seu histórico.

![Formulário de Novo Trade - Aba 5](./assets/modal_add_trade_tab5.png)

### 4.2. Estratégias Hub
O hub central de inteligência de setups. É aqui que você analisa estatisticamente qual setup realmente paga suas contas, permitindo descartar o que não funciona e alavancar o que dá resultado.

![Página de Estratégias](./assets/page_strategies.png)

#### Dashboard da Estratégia (Análise Profunda)
Ao clicar em uma estratégia específica, você acessa um Raio-X matemático focado puramente nas métricas derivadas das operações onde esta estratégia foi aplicada. A tela é composta pelos seguintes módulos:

* **Gráfico Capital (Estratégia):** A curva de patrimônio (Equity Curve) gerada exclusivamente pelas execuções desse setup.
* **Gráfico Drawdown:** Exibe os vales de perda da estratégia, auxiliando a medir o risco e o tempo de recuperação entre os topos de capital.
* **Mapa de Calor (P&L):** Uma matriz de Horário vs Dia da Semana que revela exatamente em quais horários ou dias a estratégia é estatisticamente mais lucrativa (pontos verdes) ou mais perigosa (pontos vermelhos).
* **Métricas Principais (Coluna Lateral):**
  * **Resultado Líquido:** O saldo financeiro total (lucro menos perdas e custos) da estratégia.
  * **Taxa de Acerto (Win Rate):** O percentual de vezes que a estratégia fechou no lucro.
  * **Profit Factor:** Razão entre o lucro bruto e o prejuízo bruto. (Métricas acima de 1 indicam lucro).
  * **Payoff:** A média de ganho nas vitórias dividida pela média de perda nas derrotas. 
  * **Expectativa Matemática:** O valor financeiro que você pode estatisticamente projetar como retorno esperado a cada nova execução.
  * **Max Drawdown:** O maior rebaixamento financeiro histórico que este setup já sofreu.
  * **Fator de Recuperação:** O quão rápido a estratégia recupera o capital após atingir o Max Drawdown.
  * **Aderência ao Plano:** Qualidade da execução do trader. Das vezes em que essa estratégia foi acionada, qual a taxa de obediência ao planejamento inicial (calculada a partir do preenchimento da aba Psicologia).
* **Indicadores Secundários (Rodapé):**
  * **Total de Trades / Trades Vencedores:** Volume total de amostra e contagem absoluta de wins.
  * **Melhor Trade / Pior Trade:** Os extremos financeiros (maior gain e maior loss) da amostra.
  * **Duração Média (Lucro / Prejuízo):** Compara se as operações vencedoras duram mais que as perdedoras, indicando retenção de lucro x hesitação em estopar.
  * **Tempo Médio Entre Trades:** O intervalo de frequência de exibição desse setup no mercado.

![Dashboard de Detalhes da Estratégia](./assets/page_strategies_detail.png)

### 4.3. Hub Financeiro (Tesouraria)
A gestão centralizada do capital que alimenta suas contas de trade. Controle de aportes, retiradas e a margem operada entre diferentes corretores. A tela exibe:

* **Métricas Principais (Top KPIs):**
  * **Patrimônio Total (BRL):** A soma consolidada de todo o capital disponível nas suas contas, convertido para Reais.
  * **Saldo em BRL / Saldo em USD:** O saldo disponível segregado por moeda.
  * **Resultado do Mês:** Resumo do desempenho financeiro no mês corrente.
* **Gráfico de Evolução:** Exibe uma curva da Evolução do Patrimônio e Aportes, permitindo aplicar filtros rápidos por corretora (ex: Itaú, XP, Interactive Brokers) para isolar o crescimento de cada conta.
* **Extrato de Movimentações:** Uma listagem hierárquica e agrupada por Mês e Semana com todas as transações, trade a trade ou aportes/retiradas. Inclui filtros por Conta, Tipo de Lançamento (Entrada/Saída), e busca por descrição.

![Hub Financeiro](./assets/page_finance.png)

### 4.4. Psicologia (Mente)
O cruzamento matemático entre seus estados emocionais e seu PnL real. Entenda como suas emoções impactam (positivamente ou negativamente) o seu resultado financeiro.

* **Métricas Comportamentais:**
  * **Melhor Estado Mental:** A emoção na qual seu desempenho é estatisticamente o mais lucrativo.
  * **Pior Estado Mental:** A emoção atrelada ao maior acúmulo de prejuízo financeiro.
  * **O Custo do Tilt:** A soma exata em dinheiro dos seus prejuízos quando operando fora da zona de controle ou dominado por emoções negativas.
  * **Registros de Diário:** O número total de avaliações psicológicas preenchidas na plataforma.
* **Análises Gráficas:**
  * **Resultado Financeiro por Emoção:** Gráfico de barras que quantifica o saldo gerado associado a cada emoção (Ex: Paciência vs Ansiedade vs Raiva).
  * **Eficiência %:** Gráfico percentual mostrando a concentração de vitórias por estado emocional.
  * **Correlação: Emoção x Resultado Diário:** Gráfico combinando o sobe-e-desce da linha de intensidade emocional versus as barras de Resultado Diário.
* **Tabelas de Acompanhamento:**
  * **Mapeamento Comportamental:** Lista agrupada por mês/semana exibindo o *Score* predominante e a Emoção dominante do período.
  * **Registros e Entradas Diretas:** Tabela detalhada de cada registro de trade com Data, Estado Interno, Intensidade, Nota (0-10) de aderência.

![Psicologia](./assets/page_psicologia.png)

### 4.5. Fiscal (Central de IRPF)
O motor tributário para o mercado brasileiro (B3). Acompanhe e consolide suas notas e retenções mensais, separando Day Trade e Swing Trade.

* **Dashboard de Tributos (KPIs):**
  * **Imposto Devido (Ano):** O valor acumulado a pagar neste exercício baseado no seu lucro líquido passível de tributação.
  * **Total Pago (Ano):** O somatório das guias já quitadas.
  * **Guias Pendentes:** Alerta do número de guias em atraso ou que requerem nossa atenção, com botão para "Verificar".
  * **Prejuízos Acumulados:** Uma quebra dos seus saldos devedores atuais (direitos a abater futuramente), separados puramente em "Day Trade" ou "Swing Trade".
* **Evolução Tributária (Gráfico):** Controle visual mensal ao longo de todo o ano sobrepondo o IR Devido versus o volume Quitado.
* **Painel de DARFs:** Acesso à sua gestão de boletos consolidados para armazenamento de comprovantes (upload e gestão de documentos).
* **Histórico de Apurações:** Tabela mensal das apurações geradas no ano especificado com status, busca textual e filtragem.

![Módulo Fiscal](./assets/page_fiscal.png)

---

## 5. Configurações de Sistema

### 5.1. Integrações
Configure chaves de API para dados externos.
![Integrações de API - Lista](./assets/settings/api-integrations/list.png)

### 5.2. Banco de Dados
Gestão e backup dos dados locais criptografados.
![Gestão de Banco de Dados - Lista](./assets/settings/database/list.png)

---
*(Fim do Manual - v1.1 - Padronizado)*
