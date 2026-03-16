# Manuel d'utilisation - TraderLog Pro v1.1

## 1. Présentation et concepts fondamentaux

**TraderLog Pro** n'est pas seulement un journal commercial ; est une station de renseignement financier destinée à professionnaliser les traders individuels. Notre philosophie est basée sur la centralisation des données pour transformer le « sentiment » en statistiques exploitables.

### 1.1. Les trois piliers du succès
Pour assurer la cohérence, le logiciel agit simultanément sur trois fronts :
1. **Pilier opérationnel (le moteur)** : automatisation complète de la journalisation via RTD. Vous opérez, nous enregistrons, calculons et classons en temps réel.
2. **Pilier psychologique (l'esprit)** : Là où les mathématiques rencontrent l'émotion. Nous suivons votre état mental pour identifier si vos pertes sont techniques ou comportementales.
3. **Pilier Fiscal (La Conformité)** : Sécurité juridique et fiscale. Nous générons automatiquement vos DARF et contrôlons les exemptions, éliminant ainsi la crainte du maillage fin.

### 1.2. Architecture locale d'abord (confidentialité dès la conception)
Contrairement aux plateformes Web, TraderLog Pro fonctionne selon le modèle **Local-First** :
- **Confidentialité totale** : Vos données et stratégies financières ne quittent jamais votre machine. Il n’existe aucun serveur central pouvant être piraté ou vendant vos données.
- **Elite Encryption** : tout est stocké dans **SurrealDB** local, protégé par le cryptage **AES-256**.
- **Performances hors ligne** : L'application fonctionne 100 % sans Internet pour consulter et analyser les données historiques.

### 1.3. Intégration en temps réel (RTD Bridge)
La pièce maîtresse de notre automatisation est le **PowerShell Bridge**. Il agit comme un traducteur universel qui écoute votre plateforme (ProfitChart, MetaTrader, etc.) et alimente TraderLog Pro en quelques millisecondes, éliminant ainsi les erreurs humaines et la paresse dans le remplissage des feuilles de calcul.

### 1.3. Moteur de configuration (Guide en 9 étapes)
Lors du premier démarrage, l'assistant vous guidera à travers :
1. **Préférences visuelles** : Langue et Thème.
![Passo 1: Preferências Visuais](./assets/setup/setup_step_1.png)
2. **Profil et sécurité** : Création d'un mot de passe cryptographique.
![Passo 2: Perfil](./assets/setup/setup_step_2.png)
3. **Clé principale** : Générez et enregistrez votre clé de 24 mots.
![Passo 3: Master Key](./assets/setup/setup_step_3.png)
4. **Licence** : Activez votre accès Premium.
![Passo 4: Licença](./assets/setup/setup_step_4.png)
5. **Devise de base** : Définissez la devise de votre vie financière.
![Passo 5: Moeda Base](./assets/setup/setup_step_5.png)
6. **Marchés** : sélectionnez où vous opérez.
![Passo 6: Mercados](./assets/setup/setup_step_6.png)
7. **Types d'actifs** : actions, contrats à terme, options.
![Passo 7: Tipos de Ativos](./assets/setup/setup_step_7.png)
8. **Connexion RTD** : Activer la surveillance automatique.
![Passo 8: Conexão RTD](./assets/setup/setup_step_8.png)
9. **Arrivée** : Début du voyage.
![Passo 9: Finalização](./assets/setup/setup_step_9.png)

---

## 2. Paramètres système (flux post-démarrage)

La zone Paramètres est divisée en sections logiques pour une gestion facile. Accès via l'icône d'engrenage en pied de page du menu latéral.

### 2.1. GÉNÉRAL

#### 2.1.1. Profil
Gérez les informations personnelles (Nom, CPF) et les préférences de langue et de fuseau horaire.
![Perfil do Usuário](./assets/settings/profile/view.png)

#### 2.1.2. Licence
Suivez le statut et la validité de votre abonnement.
![Licenciamento](./assets/settings/license/view.png)

### 2.2. INSCRIPTIONS

#### 2.2.1. Comptes
Enregistrez vos courtiers ou bureaux propriétaires. **Obligatoire pour enregistrer les transactions.**

**Comment ajouter :**
1. Cliquez sur le bouton **"Nouveau"** en haut de la liste.
2. Remplissez le nom du courtier, le numéro de compte et sélectionnez la devise.
3. Cliquez sur **"Enregistrer"**.

![Lista de Contas](./assets/settings/accounts/list.png)
![Formulário de Conta](./assets/settings/accounts/modal_add.png)

#### 2.2.2. Pièces
Gérez les devises et les taux de change par rapport à votre devise de base.

**Comment ajouter :**
1. Cliquez sur **"Nouveau"**.
2. Définissez le code (Ex : USD, EUR), le nom et le taux de conversion actuel.
3. Cliquez sur **"Enregistrer"**.

![Lista de Moedas](./assets/settings/currencies/list.png)
![Formulário de Moeda](./assets/settings/currencies/modal_add.png)

#### 2.2.3. Marchés
Définir le fuseau horaire et les fenêtres de trading (B3, NYSE, etc.).

**Comment ajouter :**
1. Cliquez sur **"Nouveau"**.
2. Saisissez le nom (Ex : B3), le fuseau horaire et les heures d'ouverture et de fermeture.
3. Cliquez sur **"Enregistrer"**.

![Lista de Mercados](./assets/settings/markets/list.png)
![Formulário de Mercado](./assets/settings/markets/modal_add.png)

#### 2.2.4. Types d'actifs
Catégorisez les rôles et définissez si le PnL sera en finance ou en points.

**Comment ajouter :**
1. Cliquez sur **"Nouveau type"** en haut de la liste.
2. Définissez le nom (Ex : Actions, Indice), le marché et comment le résultat doit être affiché (Financial ou Points).
3. Cliquez sur **"Enregistrer"**.

![Lista de Tipos de Ativos](./assets/settings/asset-types/list.png)
![Formulário de Tipo de Ativo](./assets/settings/asset-types/modal_add.png)

#### 2.2.5. Actifs
Enregistrez des tickers individuels (PETR4, WDO) et définissez le poids des points.

**Comment ajouter :**
1. Cliquez sur **"Nouvel élément"** en haut de la liste.
2. Entrez le symbole (ticker), le nom convivial et sélectionnez le type d'actif.
3. Configurez la valeur du point (nécessaire pour calculer le PnL dans les contrats).
4. Cliquez sur **"Enregistrer"**.

![Lista de Ativos](./assets/settings/assets/list.png)
![Formulário de Ativo](./assets/settings/assets/modal_add.png)

#### 2.2.6. Frais et commissions
Mettre en place les frais de courtage et les frais de change.

**Comment ajouter :**
1. Cliquez sur **"Nouveau tarif"**.
2. Définissez un nom pour le profil de tarifs.
3. Saisissez les valeurs de courtage (par commande ou contrat) ainsi que les frais et tarifs ISS.
4. Cliquez sur **"Enregistrer"**.

![Lista de Taxas](./assets/settings/fees/list.png)
![Formulário de Taxas](./assets/settings/fees/modal_add.png)

### 2.3. IMPÔT

#### 2.3.1. Règles fiscales
Définir les taux (Day Trade 20%, Swing 15%) et les limites d'exonération.

**Comment ajouter :**
1. Cliquez sur **"Nouvelle règle"**.
2. Choisissez le marché et le type d'actif.
3. Définissez les taux Day Trade et Swing Trade.
4. Saisissez le code de revenu (DARF) et les limites d'exonération, le cas échéant.
5. Cliquez sur **"Enregistrer"**.

![Formulário de Regra Fiscal](./assets/settings/fiscal/rules/modal_add.png)
#### 2.3.2. Profils fiscaux
Regroupez les règles en profils (Ex : « Brazil Standard »).

**Comment ajouter :**
1. Cliquez sur **"Nouveau profil"**.
2. Définissez un nom (Ex : Swing Trade Shares).
3. Sélectionnez les règles fiscales qui composent ce profil.
4. Cliquez sur **"Enregistrer"**.

![Perfis Fiscais](./assets/settings/fiscal/profiles/list.png)
![Formulário de Perfil Fiscal](./assets/settings/fiscal/profiles/modal.png)

#### 2.3.3. Devoirs
Liez les profils fiscaux à des comptes ou à des types d’actifs spécifiques.

![Atribuições Fiscais](./assets/settings/fiscal/assignments/list.png)

### 2.4. OPÉRATIONNEL

#### 2.4.1. Profil de risque
Définissez un stop loss quotidien, des objectifs et le **Plan de croissance** pour protéger votre capital.

**Comment ajouter :**
1. Cliquez sur **« Nouveau profil »** sur l'écran Profils de risque.
2. Dans le formulaire, renseignez les paramètres répartis en trois onglets : Général, Risk Engine et Growth.
3. Cliquez sur **"Enregistrer"** pour appliquer les règles.

![Lista de Perfis de Risco](./assets/settings/risk/view.png)

**Onglet : Général**
Paramètres de base des limites et des objectifs.

* **Limite de perte quotidienne :** Montant maximum que vous acceptez de perdre ce jour-là. Une fois atteinte, la plate-forme peut interrompre les opérations ultérieures.
* **Objectif quotidien :** Objectif de gain pour la journée.
* **Risque maximum par opération (%) :** Limite de perte acceptable en une seule entrée.
* **Nombre maximum de transactions :** Limite d'opérations par jour pour éviter les transactions excessives.
* **Verrouillage en cas d'atteinte de la perte :** Si activé, empêche l'ouverture de nouvelles commandes après l'arrêt quotidien.

![Formulário de Risco - Geral](./assets/settings/risk/modal_add_general.png)

***

**Onglet : Moteur de risque**
Capacités avancées d’intelligence et de discipline.

* **Couplage psychologique :** Réduit automatiquement la taille de la main s'il détecte une séquence de pertes ou un comportement erratique.
* **Régression des valeurs aberrantes :** Identifie les gains inhabituels qui peuvent générer un excès de confiance et ajuste le risque.
* **Mode Sniper :** Augmente la sélectivité requise pour les nouvelles entrées en fonction de votre historique.

![Formulário de Risco - Motor](./assets/settings/risk/modal_add_engine.png)

***

**Onglet : Plan de croissance**
Faites évoluer vos lots mathématiquement et en toute sécurité.

* **Activer le plan :** Active la progression automatique des lots.
* **Phases :** Définir le nombre de contrats/lots à opérer à chaque niveau et les règles de montée ou de descente par phases (Ex : 5 jours positifs pour monter).

![Formulário de Risco - Crescimento](./assets/settings/risk/modal_add_growth.png)

#### 2.4.2. Modalités
Catégoriser le temps des opérations (Scalping, Swing, DT). **Indispensable pour le calcul des taxes.**

**Comment ajouter :**
1. Cliquez sur **"Nouvelle modalité"**.
2. Saisissez le nom (Ex : Scalping, Day Trade).
3. Sélectionnez le type de calcul de taxe correspondant.
4. Cliquez sur **"Enregistrer"**.

![Lista de Modalidades](./assets/settings/modalities/list.png)
![Formulário de Modalidade](./assets/settings/modalities/modal_add.png)

### 2.5. ANALYSE

#### 2.5.1. États émotionnels
Cartographiez votre humeur (Focus, Anxiété, Vengeance) et le poids de votre résultat.

**Comment ajouter :**
1. Cliquez sur **"Nouveau statut"**.
2. Nommez l’état émotionnel.
3. Définissez une icône et un impact (positif, neutre ou négatif).
4. Cliquez sur **"Enregistrer"**.

![Estados Emocionais](./assets/settings/emotional-states/list.png)
![Formulário de Estado Emocional](./assets/settings/emotional-states/modal_add.png)

#### 2.5.2. Balises
Étiquettes gratuites pour le contexte (Actualités, Erreur opérationnelle).

**Comment ajouter :**
1. Cliquez sur **"Nouvelle balise"**.
2. Saisissez le nom de la balise.
3. Choisissez une couleur pour l'identification visuelle.
4. Cliquez sur **"Enregistrer"**.

![Tags](./assets/settings/tags/list.png)
![Formulário de Tag](./assets/settings/tags/modal_add.png)

#### 2.5.3. Indicateurs
Documenter les outils techniques (VWAP, Moyennes) utilisés dans les configurations.

**Comment ajouter :**
1. Cliquez sur **"Nouvel indicateur"**.
2. Nommez l'indicateur technique.
3. (Facultatif) Ajoutez une brève description technique.
4. Cliquez sur **"Enregistrer"**.

![Indicadores](./assets/settings/indicators/list.png)
![Formulário de Indicador](./assets/settings/indicators/modal_add.png)

#### 2.5.4. Délais
Réglez les temps graphiques (1min, 5min, 60min).

**Comment ajouter :**
1. Cliquez sur **"Nouveau délai"**.
2. Définissez la valeur numérique et l'unité (Minutes, Heures, Jours).
3. Cliquez sur **"Enregistrer"**.

![Timeframes](./assets/settings/timeframes/list.png)
![Formulário de Timeframe](./assets/settings/timeframes/modal_add.png)

#### 2.5.5. Types de graphiques
Choisissez la méthode de lecture des prix (Candle, Renko, Flow).

**Comment ajouter :**
1. Cliquez sur **"Nouveau type"**.
2. Nommez le style de graphique (Ex : Renko 10R).
3. Cliquez sur **"Enregistrer"**.

![Tipos de Gráfico](./assets/settings/chart-types/list.png)
![Formulário de Tipo de Gráfico](./assets/settings/chart-types/modal_add.png)

#### 2.5.6. Stratégies
Documentez vos configurations avec des déclencheurs, des listes de contrôle et des exemples visuels pour maintenir la cohérence opérationnelle.

**Comment ajouter :**
1. Cliquez sur **"Nouvelle stratégie"**.
2. Définissez le **Nom** (Ex : Pivot Break) et une brève **Description**.
3. Sélectionnez les **Marchés**, **Délais**, **Types d'actifs** et **Actifs spécifiques** (facultatif) auxquels la stratégie s'applique.
4. Accédez à l'onglet **Liste de contrôle de validation** et définissez les critères d'entrée, les critères de sortie et les règles de conduite.
5. Si la stratégie a des réalisations partielles, activez l'option **"Autoriser la réalisation partielle"** et décrivez les objectifs.
6. (Facultatif) Dans l'onglet **Exemples visuels**, téléchargez des images de référence (max : 5).
7. Cliquez sur **"Enregistrer"**.

![Lista de Estratégias](./assets/settings/strategies/list.png)
![Formulário de Estratégia](./assets/settings/strategies_modal_1920x1080.png)



---

## 3. Navigation et interface (le cockpit)

### 3.1. Tableau de bord
Vue à 360º de votre santé financière. Comprend la courbe d'équité, le calendrier des feux de circulation et les 4 cartes Kash (solde, PnL net, taux de victoire et discipline).
![Visão Geral do Dashboard](./assets/page_dashboard.png)

### 3.2. Barre latérale
Navigation divisée entre le noyau opérationnel (métiers/esprit), la trésorerie (banques/actifs), le maillage fin (fiscalité) et la salle des machines (paramètres).

---

## 4. Écosystème d'exploitation (utilisation quotidienne)

### 4.1. Négociations (échanges)
L'arborescence chronologique où Auto-Journaling centralise ses opérations importées via RTD ou lancées manuellement.

![Página de Negociações](./assets/page_trades.png)

**Comment ajouter manuellement :**
Sur l'écran Trades, cliquez sur le bouton **"New Trade"** pour ouvrir le formulaire intelligent en 5 étapes :

#### Onglet 1 : Bases (Contexte d'opération)
La première étape définit le « Où, Quoi et Quand » de votre opération. Remplissez les informations essentielles pour que le système puisse calculer et cataloguer le commerce :
* **Compte :** Le courtier ou la banque où l'opération a été exécutée (par exemple XP, BTG).
* **Stratégie :** La configuration opérationnelle qui a motivé l'entrée (par exemple, Average Crossover, Breakout).
* **Graphic Time :** Le temps du graphique (Timeframe) utilisé pour lire l'entrée (ex : 5 m, 60 m, Quotidien).
* **Volatilité :** Votre perception de l'état du marché (Normal, Élevé, Extrême).
* **Type d'actif :** Un filtre rapide pour faciliter la recherche de l'actif (Actions, Futures, Forex).
* **Actif / Contrat :** Le ticker négocié (ex : WINM26, PETR4, EURUSD).
* **Direction :** Si l'opération a été initiée du côté de l'Acheteur (Long) ou du Vendeur (Short).
* **Date et heure :** Le moment exact où l'ordre a été exécuté chez le courtier.
* **Prix d'entrée :** Le prix initial moyen indiqué sur le billet.
* **QTD (Quantité) :** Le nombre d'actions, de mini-contrats ou de lots négociés.
* **Émotionnel :** L'émotion ou le sentiment que vous ressentiez quelques instants avant de cliquer sur le bouton.
* **Modalité :** Le profil de risque fiscal et temporel (Day Trade pour les opérations démarrées et clôturées le même jour, ou Swing Trade).
* **Stop Loss (Facultatif) :** Votre prix de défense maximum positionné chez le courtier.
* **Take Profit (facultatif) :** L'objectif final de gain projeté.

![Formulário de Novo Trade - Aba 1](./assets/modal_add_trade_tab1.png)

#### Onglet 2 : Conduite (Gestion Partielle et Sortie)
La deuxième étape est axée sur la gestion des risques lors de la négociation et du règlement de l'opération. Détaillez comment vous avez géré le poste et fermez l'enregistrement :
* **Volume exécuté/restant :** Surveille combien de contrats/lots de votre position principale ont déjà été clôturés et combien sont encore en attente.
* **Sortie/Ajouter une bascule :** Choisissez le type de partiel que vous souhaitez enregistrer. "Sortie" pour la réalisation de bénéfices (Take Profit partiel) ou la réduction des pertes. "Ajout" pour les augmentations de position (Prix moyen pour ou contre).
* **Bouton + Ajouter partiel :** Ouvre un sous-formulaire pour renseigner la date/heure, le prix, la quantité et les observations de l'étape enregistrée.
* **Tableau partiel :** Historique de la grille répertoriant chronologiquement toutes les étapes de votre opération, calculant votre nouveau prix moyen et le résultat financier individuel de chaque partiel.
* **Bascule d'ouverture/fermeture (données de clôture) :** La clé principale de la transaction. En marquant comme « Fermé », la plateforme liquide tout solde restant dans votre position et affiche les champs de clôture finale :
  * **Date et heure de départ :** Heure du règlement final.
  * **Prix de sortie :** Prix qui réinitialise la position principale.
  * **Coûts/Frais :** Complétion des frais de fonctionnement du courtier/bourse (si votre profil fiscal n'a pas déjà été calculé automatiquement).
* **Carte de résultat net :** Un panneau en temps réel qui consolide les mathématiques de vos entrées, ajouts, sorties partielles et sortie finale, affichant votre profit ou votre perte projeté.

![Formulário de Novo Trade - Aba 2](./assets/modal_add_trade_tab2.png)

#### Onglet 3 : Psychologie (Analyse contextuelle)
Le "Logbook" (Journalisation). Cette étape qualitative est cruciale pour que les algorithmes de croisement comportemental puissent identifier ce qui rapporte de l’argent et ce qui génère des pertes dans vos émotions. Remplir:
* **Justification de la saisie :** Un texte libre expliquant *pourquoi* vous avez décidé d'ouvrir l'opération.
* **Signaux de confirmation :** Détail technique. Quels déclencheurs exacts votre configuration a-t-elle validés ?
* **Contexte du marché/Actualités :** Quel était le sentiment macroéconomique à l'époque ? En faveur de la tendance ? A-t-il été influencé par des nouvelles ?
* **Ce qui a fonctionné / Améliorations :** Une évaluation post-trade de ce qui restait de l'apprentissage pratique de l'exécution.
* **Intensité émotionnelle :** Un curseur d'impact (0 à 10). Quelle était la force de l’émotion (légère, modérée, extrême) que vous avez enregistrée dans l’onglet 1 ? Ex : Le niveau d'anxiété 10 détruira votre patience pour conserver un gain.

![Formulário de Novo Trade - Aba 3](./assets/modal_add_trade_tab3.png)

#### Onglet 4 : Médias (preuves visuelles)
Un référentiel de preuves visuelles de vos opérations. Enregistrez des images pour faciliter les futurs audits et études.
* **Zone de téléchargement (glisser ou cliquer) :** Vous permet d'ajouter jusqu'à 5 mégaoctets (maximum 5 Mo) de captures d'écran. Idéal pour télécharger des impressions ProfitChart ou TradingView indiquant exactement où vous êtes entré, où se trouvait le stop et où vous êtes sorti.

![Formulário de Novo Trade - Aba 4](./assets/modal_add_trade_tab4.png)

#### Onglet 5 : Révision (Résumé final)
La dernière étape agit comme un audit à froid avant de consolider les données dans la base de données source.
* **Tableau récapitulatif :**
  * **Actif / Direction :** Valide le ticker et s'il s'agit d'un Achat/Vente.
  * **Résultat :** Le PnL financier final déjà traité.
  * **Date & Stratégie :** Confirmation du calendrier et de la méthode utilisée.
  * **Images :** Nombre de pièces jointes enregistrées dans l'onglet 4.
  * **Avez-vous suivi le plan ? :** Un contrôle essentiel ! Le système utilise cette variable booléenne (Oui ou Non) pour alimenter les statistiques d'Adhérence et de Discipline du Tableau de Bord Stratégique !
* **Mémoire de calcul :**
  * **Résultat brut par rapport aux frais :** Le système montre combien d'argent est resté sur le marché grâce aux frais d'exploitation par rapport à ce qui a été réellement gagné lors de la modification de l'actif (Solde net = Brut - Frais).
* **Bouton Enregistrer / Terminer :** Complète et insère définitivement l'opération dans votre historique.

![Formulário de Novo Trade - Aba 5](./assets/modal_add_trade_tab5.png)

### 4.2. Stratégies de hub
Le hub central pour l’intelligence de configuration. C'est ici que vous analysez statistiquement quelle configuration paie réellement vos factures, vous permettant ainsi d'éliminer ce qui ne fonctionne pas et d'exploiter ce qui fonctionne.

![Página de Estratégias](./assets/page_strategies.png)

#### Tableau de bord stratégique (analyse approfondie)
En cliquant sur une stratégie spécifique, vous accédez à une radiographie mathématique axée uniquement sur les métriques dérivées des opérations où cette stratégie a été appliquée. L'écran est composé des modules suivants :

* **Graphique des actions (Stratégie) :** La courbe des actions (Equity Curve) générée exclusivement par les exécutions de cette configuration.
* **Graphique de tirage :** Affiche les vallées de perte de la stratégie, aidant à mesurer le risque et le temps de récupération entre les pics de capital.
* **Heat Map (P&L) :** Une matrice heure/jour de la semaine qui révèle exactement à quels moments ou jours la stratégie est statistiquement plus rentable (points verts) ou plus dangereuse (points rouges).
* **Mesures principales (colonne latérale) :**
  * **Résultat net :** Le solde financier total (bénéfice moins pertes et coûts) de la stratégie.
  * **Taux de réussite :** Le pourcentage de fois où la stratégie a généré des bénéfices.
  * **Facteur de profit :** Rapport entre le bénéfice brut et la perte brute. (Les mesures supérieures à 1 indiquent un profit).
  * **Rémunération :** Le gain moyen sur les gains divisé par la perte moyenne sur les pertes.
  * **Attente mathématique :** La valeur financière que vous pouvez projeter statistiquement comme rendement attendu à chaque nouvelle exécution.
  * **Max Drawdown :** Le plus grand retrait financier historique que cette configuration ait jamais subi.
  * **Facteur de récupération :** La rapidité avec laquelle la stratégie récupère le capital après avoir atteint le tirage maximum.
  * **Adhésion au plan :** Qualité de l'exécution du trader. Parmi les fois où cette stratégie a été activée, quel a été le taux de conformité avec la planification initiale (calculée en remplissant l'onglet Psychologie).
* **Indicateurs secondaires (pied de page) :**
  * **Total des transactions / transactions gagnantes :** Volume total de l'échantillon et nombre absolu de gains.
  * **Meilleure transaction / Pire transaction :** Les extrêmes financiers (le plus gros gain et la plus grande perte) de l'échantillon.
  * **Durée moyenne (bénéfice/perte) :** Compare si les opérations gagnantes durent plus longtemps que celles perdantes, indiquant la rétention des bénéfices x l'hésitation à arrêter.
  * **Durée moyenne entre les transactions :** La plage de fréquences pour que cette configuration soit affichée sur le marché.

![Dashboard de Detalhes da Estratégia](./assets/page_strategies_detail.png)

### 4.3. Centre financier (Trésor)
Gestion centralisée du capital qui alimente vos comptes de trading. Contrôle des apports, des retraits et de la marge opérée entre les différents courtiers. L'écran affiche :

* **Mesures principales (principaux KPI) :**
  * **Capitaux totaux (BRL) :** La somme consolidée de tous les capitaux disponibles dans vos comptes, convertie en Reais.
  * **Solde en BRL / Solde en USD :** Le solde disponible séparé par devise.
  * **Résultat du mois :** Résumé des performances financières du mois en cours.
* **Graphique d'évolution :** Affiche une courbe d'évolution des capitaux propres et des cotisations, vous permettant d'appliquer des filtres rapides par courtier (par exemple Itaú, XP, Interactive Brokers) pour isoler la croissance de chaque compte.
* **Relevé de transaction :** Une liste hiérarchique regroupée par mois et semaine avec toutes les transactions, transaction par transaction ou contributions/retraits. Comprend des filtres par compte, type d'entrée (entrée/sortie) et une recherche par description.

![Hub Financeiro](./assets/page_finance.png)

### 4.4. Psychologie (esprit)
Le croisement mathématique entre vos états émotionnels et votre véritable PnL. Comprenez l’impact (positif ou négatif) de vos émotions sur vos résultats financiers.

* **Mesures comportementales :**
  * **Meilleur état mental :** L'émotion dans laquelle votre performance est statistiquement la plus rentable.
  * **Pire état mental :** L'émotion liée à la plus grande accumulation de pertes financières.
  * **Le coût du Tilt :** Le montant exact de vos pertes lorsque vous opérez en dehors de la zone de contrôle ou dominé par des émotions négatives.
  * **Journal Records :** Le nombre total d'évaluations psychologiques réalisées sur la plateforme.
* **Analyse graphique :**
  * **Résultat financier par émotion :** Graphique à barres qui quantifie le solde généré associé à chaque émotion (Ex : Patience vs Anxiété vs Colère).
  * **% d'efficacité :** Graphique en pourcentage montrant la concentration de victoires par état émotionnel.
  * **Corrélation : Émotion x Résultat quotidien :** Graphique combinant la hausse et la baisse de la ligne d'intensité émotionnelle par rapport aux barres de résultat quotidien.
* **Tableaux de surveillance :**
  * **Cartographie comportementale :** Liste regroupée par mois/semaine montrant le *Score* prédominant et l'émotion dominante de la période.
  * **Enregistrements et entrées directes :** Tableau détaillé de chaque enregistrement commercial avec date, état interne, intensité, score d'adhésion (0-10).

![Psicologia](./assets/page_psicologia.png)

### 4.5. Fiscalité (Centre IRPF)
Le moteur fiscal pour le marché brésilien (B3). Suivez et consolidez vos notes et rétentions mensuelles, en séparant le Day Trade et le Swing Trade.

* **Tableau de bord fiscal (KPI) :**
  * **Impôt dû (année) :** Le montant accumulé payable cette année sur la base de votre bénéfice net soumis à l'impôt.
  * **Total payé (année) :** La somme des factures déjà payées.
  * **Guides en attente :** Alerte du nombre de guides en retard ou qui nécessitent notre attention, avec un bouton pour "Vérifier".
  * **Pertes accumulées :** Une rupture de vos soldes impayés actuels (droits à radier dans le futur), séparée uniquement en "Day Trade" ou "Swing Trade".
* **Évolution de la Taxe (Graphique) :** Contrôle visuel mensuel tout au long de l'année superposant l'IR Due au volume payé.
* **Panneau DARFs :** Accès à votre gestion consolidée de factures pour le stockage des reçus (téléchargement et gestion des documents).
* **Historique des collections :** Tableau mensuel des évaluations générées au cours de l'année spécifiée avec statut, recherche textuelle et filtrage.

![Módulo Fiscal](./assets/page_fiscal.png)

---

## 5. Paramètres système

### 5.1. Intégrations
Configurez les clés API pour les données externes.
![Integrações de API - Lista](./assets/settings/api-integrations/list.png)

### 5.2. Base de données
Gestion et sauvegarde des données locales cryptées.
![Gestão de Banco de Dados - Lista](./assets/settings/database/list.png)

---
*(Fin du Manuel - v1.1 - Standardisé)*
