# Manual de usuario - TraderLog Pro v1.1

## 1. Descripción general y conceptos fundamentales

**TraderLog Pro** no es sólo una revista comercial; es una estación de inteligencia financiera diseñada para profesionalizar a los comerciantes individuales. Nuestra filosofía se basa en centralizar datos para transformar el "sentimiento" en estadísticas procesables.

### 1.1. Los tres pilares del éxito
Para lograr coherencia, el software trabaja simultáneamente en tres frentes:
1. **Pilar Operacional (El Motor)**: Automatización completa del registro mediante RTD. Tú operas, nosotros registramos, calculamos y clasificamos en tiempo real.
2. **Pilar Psicológico (La Mente)**: Donde las matemáticas se encuentran con la emoción. Realizamos un seguimiento de su estado mental para identificar si sus pérdidas son técnicas o de comportamiento.
3. **Pilar Fiscal (El Cumplimiento)**: Seguridad jurídica y tributaria. Generamos tus DARF y controlamos las exenciones automáticamente, eliminando el miedo a la malla fina.

### 1.2. Arquitectura local primero (privacidad por diseño)
A diferencia de las plataformas web, TraderLog Pro opera bajo el modelo **Local-First**:
- **Privacidad total**: Tus datos y estrategias financieras nunca salen de tu máquina. No existen servidores centrales que puedan ser pirateados o que vendan tus datos.
- **Elite Encryption**: Todo se almacena en **SurrealDB** local, protegido por cifrado **AES-256**.
- **Rendimiento Offline**: La aplicación funciona 100% sin internet para consultar y analizar datos históricos.

### 1.3. Integración en tiempo real (puente RTD)
La pieza central de nuestra automatización es el **PowerShell Bridge**. Actúa como un traductor universal que escucha su plataforma (ProfitChart, MetaTrader, etc.) y alimenta TraderLog Pro en milisegundos, eliminando el error humano y la pereza al completar hojas de cálculo.

### 1.3. Motor de configuración (guía de 9 pasos)
Al iniciar por primera vez, el asistente le guiará a través de:
1. **Preferencias visuales**: Idioma y tema.
![Passo 1: Preferências Visuais](./assets/setup/setup_step_1.png)
2. **Perfil y Seguridad**: Creación de una contraseña criptográfica.
![Passo 2: Perfil](./assets/setup/setup_step_2.png)
3. **Clave maestra**: genera y guarda tu clave de 24 palabras.
![Passo 3: Master Key](./assets/setup/setup_step_3.png)
4. **Licencia**: Activa tu acceso Premium.
![Passo 4: Licença](./assets/setup/setup_step_4.png)
5. **Moneda base**: Defina la moneda de su vida financiera.
![Passo 5: Moeda Base](./assets/setup/setup_step_5.png)
6. **Mercados**: Selecciona dónde operas.
![Passo 6: Mercados](./assets/setup/setup_step_6.png)
7. **Tipos de Activos**: Acciones, Futuros, Opciones.
![Passo 7: Tipos de Ativos](./assets/setup/setup_step_7.png)
8. **Conexión RTD**: Habilite el monitoreo automático.
![Passo 8: Conexão RTD](./assets/setup/setup_step_8.png)
9. **Finalización**: Inicio del recorrido.
![Passo 9: Finalização](./assets/setup/setup_step_9.png)

---

## 2. Configuración del sistema (flujo posterior al inicio)

El área de Configuración está dividida en secciones lógicas para una fácil administración. Accede a través del icono de ajustes en el pie de página del menú lateral.

### 2.1. GENERAL

#### 2.1.1. Perfil
Gestionar información personal (Nombre, CPF) y preferencias de idioma y zona horaria.
![Perfil do Usuário](./assets/settings/profile/view.png)

#### 2.1.2. Licencia
Realice un seguimiento del estado y la validez de su suscripción.
![Licenciamento](./assets/settings/license/view.png)

### 2.2. INSCRIPCIONES

#### 2.2.1. Cuentas
Registre sus brokers o escritorios propietarios. **Requerido para registrar operaciones.**

**Cómo agregar:**
1. Haga clic en el botón **"Nuevo"** en la parte superior de la lista.
2. Complete el nombre del corredor, el número de cuenta y seleccione la moneda.
3. Haga clic en **"Guardar"**.

![Lista de Contas](./assets/settings/accounts/list.png)
![Formulário de Conta](./assets/settings/accounts/modal_add.png)

#### 2.2.2. monedas
Administre monedas y tipos de cambio con respecto a su moneda base.

**Cómo agregar:**
1. Haga clic en **"Nuevo"**.
2. Establezca el código (Ej.: USD, EUR), el nombre y la tasa de conversión actual.
3. Haga clic en **"Guardar"**.

![Lista de Moedas](./assets/settings/currencies/list.png)
![Formulário de Moeda](./assets/settings/currencies/modal_add.png)

#### 2.2.3. Mercados
Definir zona horaria y ventanas de negociación (B3, NYSE, etc.).

**Cómo agregar:**
1. Haga clic en **"Nuevo"**.
2. Introduzca el nombre (Ej: B3), zona horaria y horarios de apertura y cierre.
3. Haga clic en **"Guardar"**.

![Lista de Mercados](./assets/settings/markets/list.png)
![Formulário de Mercado](./assets/settings/markets/modal_add.png)

#### 2.2.4. Tipos de activos
Categoriza los roles y define si el PnL será en finanzas o puntos.

**Cómo agregar:**
1. Haga clic en **"Nuevo tipo"** en la parte superior de la lista.
2. Defina el nombre (Ej: Acciones, Índice), el mercado y cómo se debe mostrar el resultado (Financiero o Puntos).
3. Haga clic en **"Guardar"**.

![Lista de Tipos de Ativos](./assets/settings/asset-types/list.png)
![Formulário de Tipo de Ativo](./assets/settings/asset-types/modal_add.png)

#### 2.2.5. Activos
Registre tickers individuales (PETR4, WDO) y defina el peso de los puntos.

**Cómo agregar:**
1. Haga clic en **"Nuevo activo"** en la parte superior de la lista.
2. Ingrese el símbolo (Ticker), el nombre descriptivo y seleccione el tipo de activo.
3. Configure el Valor de puntos (necesario para calcular PnL en contratos).
4. Haga clic en **"Guardar"**.

![Lista de Ativos](./assets/settings/assets/list.png)
![Formulário de Ativo](./assets/settings/assets/modal_add.png)

#### 2.2.6. Tarifas y tarifas
Configure los costos de corretaje y las tarifas de cambio.

**Cómo agregar:**
1. Haga clic en **"Nueva tarifa"**.
2. Defina un nombre para el perfil de tarifas.
3. Ingrese los valores de corretaje (por orden o contrato) y las tarifas y tarifas del ISS.
4. Haga clic en **"Guardar"**.

![Lista de Taxas](./assets/settings/fees/list.png)
![Formulário de Taxas](./assets/settings/fees/modal_add.png)

### 2.3. IMPUESTO

#### 2.3.1. Reglas fiscales
Defina tasas (Day Trade 20%, Swing 15%) y límites de exención.

**Cómo agregar:**
1. Haga clic en **"Nueva regla"**.
2. Elija el mercado y el tipo de activo.
3. Defina las tasas de Day Trade y Swing Trade.
4. Ingrese el código de ingresos (DARF) y los límites de exención, si los hubiera.
5. Haga clic en **"Guardar"**.

![Formulário de Regra Fiscal](./assets/settings/fiscal/rules/modal_add.png)
#### 2.3.2. Perfiles fiscales
Agrupar reglas en perfiles (Ej: "Estándar de Brasil").

**Cómo agregar:**
1. Haga clic en **"Nuevo perfil"**.
2. Defina un nombre (Ej.: Acciones Swing Trade).
3. Seleccione las reglas tributarias que componen este perfil.
4. Haga clic en **"Guardar"**.

![Perfis Fiscais](./assets/settings/fiscal/profiles/list.png)
![Formulário de Perfil Fiscal](./assets/settings/fiscal/profiles/modal.png)

#### 2.3.3. Deberes
Vincule perfiles fiscales a cuentas o tipos de activos específicos.

![Atribuições Fiscais](./assets/settings/fiscal/assignments/list.png)

### 2.4. OPERACIONAL

#### 2.4.1. Perfil de riesgo
Establezca límites diarios de pérdidas, objetivos y el **Plan de crecimiento** para proteger su capital.

**Cómo agregar:**
1. Haga clic en **"Nuevo perfil"** en la pantalla Perfiles de riesgo.
2. En el formulario, complete la configuración dividida en tres pestañas: General, Motor de Riesgo y Crecimiento.
3. Haga clic en **"Guardar"** para aplicar las reglas.

![Lista de Perfis de Risco](./assets/settings/risk/view.png)

**Pestaña: General**
Configuración básica de límites y objetivos.

* **Límite de pérdida diaria:** Monto máximo que aceptas perder en el día. Cuando se alcance la plataforma, es posible que se detengan más operaciones.
* **Meta diaria:** Objetivo de ganancias del día.
* **Riesgo Máximo por Operación (%):** Límite de pérdida aceptable en una sola entrada.
* **Número Máximo de Operaciones:** Límite de operaciones por día para evitar overtrading.
* **Bloqueo al alcanzar la pérdida:** Si está activado, evita que se abran nuevas órdenes después de la parada diaria.

![Formulário de Risco - Geral](./assets/settings/risk/modal_add_general.png)

***

**Pestaña: Motor de riesgos**
Capacidades avanzadas de inteligencia y disciplina.

* **Acoplamiento Psicológico:** Reduce el tamaño de la mano automáticamente si detecta una secuencia de pérdidas o comportamiento errático.
* **Regresión de valores atípicos:** Identifica ganancias inusuales que pueden generar exceso de confianza y ajusta el riesgo.
* **Modo francotirador:** Aumenta la selectividad requerida para nuevas entradas según tu historial.

![Formulário de Risco - Motor](./assets/settings/risk/modal_add_engine.png)

***

**Pestaña: Plan de crecimiento**
Escale sus lotes de forma matemática y segura.

* **Habilitar plan:** Activa la progresión automática por lotes.
* **Fases:** Define cuántos contratos/lotes operar en cada nivel y las reglas para subir o bajar en fases (Ej: 5 días positivos para subir).

![Formulário de Risco - Crescimento](./assets/settings/risk/modal_add_growth.png)

#### 2.4.2. Modalidades
Categorizar el tiempo de las operaciones (Scalping, Swing, DT). **Vital para el cálculo de impuestos.**

**Cómo agregar:**
1. Haga clic en **"Nueva Modalidad"**.
2. Ingrese el nombre (Ej.: Scalping, Day Trade).
3. Seleccione el tipo de cálculo de impuestos correspondiente.
4. Haga clic en **"Guardar"**.

![Lista de Modalidades](./assets/settings/modalities/list.png)
![Formulário de Modalidade](./assets/settings/modalities/modal_add.png)

### 2.5. ANÁLISIS

#### 2.5.1. Estados emocionales
Mapee su estado de ánimo (enfoque, ansiedad, venganza) y el peso en su resultado.

**Cómo agregar:**
1. Haga clic en **"Nuevo estado"**.
2. Nombra el estado emocional.
3. Defina un ícono y un impacto (Positivo, Neutral o Negativo).
4. Haga clic en **"Guardar"**.

![Estados Emocionais](./assets/settings/emotional-states/list.png)
![Formulário de Estado Emocional](./assets/settings/emotional-states/modal_add.png)

#### 2.5.2. Etiquetas
Etiquetas gratuitas para contexto (Noticias, Error operativo).

**Cómo agregar:**
1. Haga clic en **"Nueva etiqueta"**.
2. Ingrese el nombre de la etiqueta.
3. Elija un color para la identificación visual.
4. Haga clic en **"Guardar"**.

![Tags](./assets/settings/tags/list.png)
![Formulário de Tag](./assets/settings/tags/modal_add.png)

#### 2.5.3. Indicadores
Documentar las herramientas técnicas (VWAP, Promedios) utilizadas en los montajes.

**Cómo agregar:**
1. Haga clic en **"Nuevo indicador"**.
2. Nombra el indicador técnico.
3. (Opcional) Agregue una breve descripción técnica.
4. Haga clic en **"Guardar"**.

![Indicadores](./assets/settings/indicators/list.png)
![Formulário de Indicador](./assets/settings/indicators/modal_add.png)

#### 2.5.4. Plazos
Establece los tiempos gráficos (1min, 5min, 60min).

**Cómo agregar:**
1. Haga clic en **"Nuevo período de tiempo"**.
2. Establezca el valor numérico y la unidad (Minutos, Horas, Días).
3. Haga clic en **"Guardar"**.

![Timeframes](./assets/settings/timeframes/list.png)
![Formulário de Timeframe](./assets/settings/timeframes/modal_add.png)

#### 2.5.5. Tipos de gráficos
Elija el método de lectura de precios (Candle, Renko, Flow).

**Cómo agregar:**
1. Haga clic en **"Nuevo tipo"**.
2. Asigne un nombre al estilo del gráfico (Ej.: Renko 10R).
3. Haga clic en **"Guardar"**.

![Tipos de Gráfico](./assets/settings/chart-types/list.png)
![Formulário de Tipo de Gráfico](./assets/settings/chart-types/modal_add.png)

#### 2.5.6. Estrategias
Documente sus configuraciones con activadores, listas de verificación y ejemplos visuales para mantener la coherencia operativa.

**Cómo agregar:**
1. Haga clic en **"Nueva estrategia"**.
2. Defina el **Nombre** (Ej: Pivot Break) y una breve **Descripción**.
3. Seleccione los **Mercados**, **Plazos de tiempo**, **Tipos de activos** y **Activos específicos** (opcional) donde se aplica la estrategia.
4. Vaya a la pestaña **Lista de verificación de validación** y defina los Criterios de entrada, los Criterios de salida y las Reglas de conducción.
5. Si la estrategia tiene logros parciales, active la opción **"Permitir realización parcial"** y describa las metas.
6. (Opcional) En la pestaña **Ejemplos visuales**, cargue imágenes de referencia (máximo: 5).
7. Haga clic en **"Guardar"**.

![Lista de Estratégias](./assets/settings/strategies/list.png)
![Formulário de Estratégia](./assets/settings/strategies_modal_1920x1080.png)



---

## 3. Navegación e interfaz (la cabina)

### 3.1. Panel
Vista 360º de tu salud financiera. Incluye Curva de Equidad, Calendario de Semáforo y las 4 Tarjetas Kash (Saldo, PnL Neto, Tasa de Ganancias y Disciplina).
![Visão Geral do Dashboard](./assets/page_dashboard.png)

### 3.2. Barra lateral
Navegación dividida entre Núcleo Operacional (Oficios/Mente), Tesorería (Bancos/Activos), Malla Fina (Impuestos) y Sala de Máquinas (Configuración).

---

## 4. Ecosistema operativo (uso diario)

### 4.1. Negociaciones (Comercios)
El árbol cronológico donde Auto-Journaling centraliza sus operaciones importadas vía RTD o lanzadas manualmente.

![Página de Negociações](./assets/page_trades.png)

**Cómo agregar manualmente:**
En la pantalla Operaciones, haga clic en el botón **"Nueva Operación"** para abrir el formulario inteligente en 5 pasos:

#### Pestaña 1: Conceptos básicos (contexto de operación)
El primer paso define el "Dónde, Qué y Cuándo" de su operación. Complete los datos imprescindibles para que el sistema pueda calcular y catalogar el comercio:
* **Cuenta:** El broker o banco donde se ejecutó la operación (p. ej. XP, BTG).
* **Estrategia:** La configuración operativa que motivó la entrada (por ejemplo, cruce promedio, ruptura).
* **Tiempo del gráfico:** El tiempo del gráfico (período de tiempo) utilizado para leer la entrada (por ejemplo, 5 m, 60 m, diario).
* **Volatilidad:** Tu percepción de cómo estaba el mercado (Normal, Alta, Extrema).
* **Tipo de Activo:** Un filtro rápido para facilitar la búsqueda del activo (Acciones, Futuros, Forex).
* **Activo/Contrato:** El ticker negociado (por ejemplo: WINM26, PETR4, EURUSD).
* **Dirección:** Si la operación se inició en el extremo Comprador (Largo) o Vendedor (Corto).
* **Fecha y Hora:** El momento exacto en que se ejecutó la orden en el broker.
* **Precio de Entrada:** El precio inicial promedio ingresado en el boleto.
* **QTD (Cantidad):** El número de acciones, minicontratos o lotes negociados.
* **Emocional:** La emoción o sentimiento que estabas experimentando momentos antes de hacer clic en el botón.
* **Modalidad:** El perfil de riesgo fiscal y temporal (Day Trade para operaciones iniciadas y cerradas el mismo día, o Swing Trade).
* **Stop Loss (Opcional):** Su precio máximo de defensa posicionado en el corredor.
* **Take Profit (Opcional):** El objetivo final de ganancia proyectado.

![Formulário de Novo Trade - Aba 1](./assets/modal_add_trade_tab1.png)

#### Pestaña 2: Conducción (Gestión parcial y de salida)
El segundo paso se centra en la gestión de riesgos durante la negociación y liquidación de la operación. Detalle cómo manejó el puesto y cierre el expediente:
* **Volumen ejecutado/restante:** Monitorea cuántos contratos/lotes de su posición principal ya se han cerrado y cuántos aún están pendientes.
* **Alternar salida/agregar:** Elija el tipo de parcial que desea grabar. "Salida" para la realización de beneficios (Take Profit parcial) o reducción de pérdidas. "Adición" por incrementos de posición (Precio Promedio a favor o en contra).
* **Botón + Agregar Parcial:** Abre un subformulario para completar la Fecha/Hora, Precio, Cantidad y Observaciones del tramo registrado.
* **Tabla Parcial:** Grid histórico que enumera cronológicamente todos los tramos de su operación, calculando su Nuevo Precio Promedio y el resultado financiero individual de cada parcial.
* **Alternar Abrir/Cerrar (Datos de Cierre):** La llave maestra de la operación. Al marcar como "Cerrado", la plataforma liquida cualquier saldo restante en su posición y muestra los campos de cierre final:
  * **Fecha y Hora de Salida:** Hora de liquidación final.
  * **Precio de Salida:** Precio que resetea la posición principal.
  * **Costos/Tarifas:** Finalización de las tarifas operativas del corredor/bolsa (si su perfil fiscal aún no se ha calculado automáticamente).
* **Tarjeta de Resultado Neto:** Un panel en tiempo real que consolida las matemáticas de tus entradas, adiciones, salidas parciales y salida final, mostrando tu Ganancia o Pérdida proyectada.

![Formulário de Novo Trade - Aba 2](./assets/modal_add_trade_tab2.png)

#### Pestaña 3: Psicología (Análisis Contextual)
El "Diario" (Diario). Este paso cualitativo es crucial para que los algoritmos de cruce de comportamiento puedan identificar qué genera dinero y qué genera pérdidas en tus emociones. Llenar:
* **Justificación del ingreso:** Un texto libre que explique *por qué* decidió abrir la operación.
* **Señales de Confirmación:** Detalle técnico. ¿Qué desencadenantes exactos validó su configuración?
* **Contexto del mercado/Noticias:** ¿Cuál era el sentimiento macroeconómico en ese momento? ¿A favor de la tendencia? ¿Fue influenciado por alguna noticia?
* **Qué funcionó/Mejoras:** Una evaluación posterior a la negociación de lo que quedó del aprendizaje práctico de la ejecución.
* **Intensidad emocional:** Un control deslizante de impacto (0 a 10). ¿Qué tan fuerte fue la emoción (Leve, Moderada, Extrema) que registró en la Pestaña 1? Ej: el nivel de ansiedad 10 destruirá tu paciencia para obtener una ganancia.

![Formulário de Novo Trade - Aba 3](./assets/modal_add_trade_tab3.png)

#### Pestaña 4: Medios (evidencia visual)
Un repositorio de evidencia visual de sus operaciones. Grabar imágenes para facilitar futuras auditorías y estudios.
* **Área de carga (arrastrar o hacer clic):** Le permite agregar hasta 5 megabytes (máximo 5 MB) de capturas de pantalla. Ideal para cargar impresiones de ProfitChart o TradingView que muestren exactamente dónde entró, dónde estuvo la parada y dónde salió.

![Formulário de Novo Trade - Aba 4](./assets/modal_add_trade_tab4.png)

#### Pestaña 5: Revisión (Resumen final)
El último paso actúa como una auditoría en frío antes de consolidar los datos en la base de datos de origen.
* **Tabla resumen:**
  * **Activo/Dirección:** Valida el ticker y si fue Compra/Venta.
  * **Resultado:** El PnL financiero final ya procesado.
  * **Fecha y estrategia:** Confirmación del calendario y método utilizado.
  * **Imágenes:** Número de archivos adjuntos guardados en la pestaña 4.
  * **¿Seguiste el Plan?:** ¡Un cheque vital! ¡El sistema utiliza esta variable booleana (Sí o No) para alimentar las estadísticas de Adherencia y Disciplina del Panel de Estrategia!
* **Memoria de cálculo:**
  * **Resultado Bruto vs Comisiones:** El sistema muestra cuánto dinero quedó en el mercado a través de comisiones operativas en comparación con lo que realmente se ganó en el cambio del activo (Saldo Neto = Bruto - Comisiones).
* **Botón Guardar / Finalizar:** Completa e inserta definitivamente la operación en tu historial.

![Formulário de Novo Trade - Aba 5](./assets/modal_add_trade_tab5.png)

### 4.2. Estrategias centrales
El centro central para la inteligencia de configuración. Aquí es donde analizas estadísticamente qué configuración realmente paga tus facturas, permitiéndote descartar lo que no funciona y aprovechar lo que sí funciona.

![Página de Estratégias](./assets/page_strategies.png)

#### Panel de estrategia (análisis profundo)
Al hacer clic en una estrategia específica, se accede a una Radiografía matemática centrada puramente en las métricas derivadas de las operaciones donde se aplicó dicha estrategia. La pantalla está compuesta por los siguientes módulos:

* **Gráfico de Equity (Estrategia):** La curva de capital (Equity Curve) generada exclusivamente por las ejecuciones de esta configuración.
* **Gráfico de reducción:** Muestra los valles de pérdidas de la estrategia, lo que ayuda a medir el riesgo y el tiempo de recuperación entre picos de capital.
* **Mapa de calor (P&L):** Una matriz de tiempo versus día de la semana que revela exactamente en qué momentos o días la estrategia es estadísticamente más rentable (puntos verdes) o más peligrosa (puntos rojos).
* **Métricas principales (columna lateral):**
  * **Resultado Neto:** El saldo financiero total (beneficio menos pérdidas y costos) de la estrategia.
  * **Tasa de ganancias:** El porcentaje de veces que la estrategia cerró con ganancias.
  * **Factor de Beneficio:** Relación entre ganancia bruta y pérdida bruta. (Las métricas superiores a 1 indican ganancias).
  * **Recompensa:** La ganancia promedio de las victorias dividida por la pérdida promedio de las pérdidas.
  * **Expectativa matemática:** El valor financiero que puedes proyectar estadísticamente como el rendimiento esperado en cada nueva ejecución.
  * **Reducción máxima:** La mayor reducción financiera histórica que haya sufrido esta configuración.
  * **Factor de recuperación:** Qué tan rápido la estrategia recupera el capital después de alcanzar el Max Drawdown.
  * **Adhesión al Plan:** Calidad de la ejecución del trader. De las veces que se activó esta estrategia, ¿cuál fue el índice de cumplimiento de la planificación inicial (calculado llenando la pestaña de Psicología)?
* **Indicadores secundarios (pie de página):**
  * **Operaciones totales/Operaciones ganadoras:** Volumen total de muestra y recuento absoluto de ganancias.
  * **Mejor operación/peor operación:** Los extremos financieros (mayor ganancia y mayor pérdida) de la muestra.
  * **Duración promedio (ganancias/pérdidas):** Compara si las operaciones ganadoras duran más que las perdedoras, lo que indica retención de ganancias x vacilación para detenerse.
  * **Tiempo promedio entre operaciones:** El rango de frecuencia para que esta configuración se muestre en el mercado.

![Dashboard de Detalhes da Estratégia](./assets/page_strategies_detail.png)

### 4.3. Centro Financiero (Tesorería)
Gestión centralizada del capital que alimenta sus cuentas comerciales. Control de aportaciones, retiros y margen operado entre diferentes brokers. La pantalla muestra:

* **Métricas principales (KPI principales):**
  * **Patrimonio total (BRL):** La suma consolidada de todo el capital disponible en sus cuentas, convertida a reales.
  * **Saldo en BRL / Saldo en USD:** El saldo disponible segregado por moneda.
  * **Resultado del mes:** Resumen del desempeño financiero del mes actual.
* **Gráfico de Evolución:** Muestra una curva de la Evolución del Patrimonio y de las Contribuciones, permitiendo aplicar filtros rápidos por broker (ej. Itaú, XP, Interactive Brokers) para aislar el crecimiento de cada cuenta.
* **Estado de cuenta de transacciones:** Una lista jerárquica agrupada por mes y semana con todas las transacciones, operación por operación o contribuciones/retiros. Incluye filtros por Cuenta, Tipo de Entrada (Entrada/Salida) y búsqueda por descripción.

![Hub Financeiro](./assets/page_finance.png)

### 4.4. Psicología (Mente)
El cruce matemático entre tus estados emocionales y tu PnL real. Comprenda cómo sus emociones impactan (positiva o negativamente) sus resultados financieros.

* **Métricas de comportamiento:**
  * **Mejor Estado Mental:** La emoción en la que tu desempeño es estadísticamente más rentable.
  * **Peor Estado Mental:** La emoción ligada a la mayor acumulación de pérdidas económicas.
  * **El costo de la inclinación:** El monto exacto en dólares de sus pérdidas cuando opera fuera de la zona de control o está dominado por emociones negativas.
  * **Registros del diario:** El número total de evaluaciones psicológicas completadas en la plataforma.
* **Análisis gráfico:**
  * **Resultado Financiero por Emoción:** Gráfico de barras que cuantifica el saldo generado asociado a cada emoción (Ej: Paciencia vs Ansiedad vs Ira).
  * **Eficiencia %:** Gráfico porcentual que muestra la concentración de victorias por estado emocional.
  * **Correlación: Emoción x Resultado Diario:** Gráfico que combina la subida y bajada de la línea de intensidad emocional versus las barras de Resultado Diario.
* **Mesas de Monitoreo:**
  * **Mapeo de Comportamiento:** Lista agrupada por mes/semana que muestra la *Puntuación* predominante y la Emoción dominante del período.
  * **Registros y Entradas Directas:** Tabla detallada de cada registro comercial con Fecha, Estado Interno, Intensidad, Puntaje de Adherencia (0-10).

![Psicologia](./assets/page_psicologia.png)

### 4.5. Impuestos (Centro IRPF)
El motor fiscal del mercado brasileño (B3). Realice un seguimiento y consolide sus notas y retenciones mensuales, separando Day Trade y Swing Trade.

* **Panel de control fiscal (KPI):**
  * **Impuesto adeudado (año):** El monto acumulado pagadero este año en función de su beneficio neto sujeto a impuestos.
  * **Total Pagado (Año):** La suma de las facturas ya pagadas.
  * **Guías Pendientes:** Alerta del número de guías que están vencidas o que requieren nuestra atención, con un botón para "Consultar".
  * **Pérdidas acumuladas:** Una interrupción en sus saldos pendientes actuales (derechos que se cancelarán en el futuro), separados exclusivamente en "Day Trade" o "Swing Trade".
* **Evolución Tributaria (Gráfico):** Control visual mensual durante todo el año superponiendo el IR Vencido versus el volumen pagado.
* **Panel DARFs:** Acceso a tu gestión de facturas consolidadas para almacenamiento de recibos (carga y gestión documental).
* **Historial de Cobranzas:** Tabla mensual de valoraciones generadas en el año especificado con estado, búsqueda textual y filtrado.

![Módulo Fiscal](./assets/page_fiscal.png)

---

## 5. Configuración del sistema

### 5.1. Integraciones
Configure claves API para datos externos.
![Integrações de API - Lista](./assets/settings/api-integrations/list.png)

### 5.2. Base de datos
Gestión y respaldo de datos locales cifrados.
![Gestão de Banco de Dados - Lista](./assets/settings/database/list.png)

---
*(Fin del Manual - v1.1 - Estandarizado)*
