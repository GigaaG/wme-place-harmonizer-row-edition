# WME Place Harmonizer ROW Edition — UI Flow

## 1. Doel van dit document

Dit document beschrijft de UI-flow van WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- hoe de sidebar functioneel is opgebouwd
- welke tabs beschikbaar zijn
- hoe gebruikers een place analyseren
- hoe issues en voorstellen worden gepresenteerd
- hoe wijzigingen handmatig geselecteerd en toegepast worden
- hoe scan, whitelist, settings en debug zich in de interface gedragen

Dit document beschrijft de functionele UX- en UI-flow. Het is geen visueel design-document, maar een gedrags- en structuurdocument.

---

## 2. Algemene UI-principes

De UI van v1 is gebaseerd op de volgende principes:

- duidelijk boven compact
- diagnose eerst, actie daarna
- geen automatische wijzigingen
- wijzigingen altijd uitlegbaar tonen
- diff-gebaseerde presentatie
- minimale cognitieve belasting voor editors
- debug-informatie beschikbaar zonder normale gebruikers te overladen
- alle user-facing tekst via i18n

---

## 3. Hoofdlocatie van de UI

De primaire UI van het script bevindt zich in een eigen sidebar-paneel binnen Waze Map Editor.

De sidebar is de centrale plek voor:

- analyse van geselecteerde places
- weergave van issues
- weergave van harmonisatievoorstellen
- handmatige selectie van wijzigingen
- scan- en highlighterfuncties
- whitelistbeheer
- settings
- debug-info

---

## 4. Hoofdstructuur van de sidebar

De sidebar bevat in v1 de volgende tabs:

- Harmonization
- Highlighter / Scan
- Whitelist
- Settings
- Community Debug

Deze tabs vormen samen de primaire gebruikerservaring.

---

## 5. Harmonization-tab

### 5.1 Doel

De Harmonization-tab is de hoofdtab voor analyse van een geselecteerde place.

Deze tab toont:

- huidige selectiecontext
- chain match informatie
- gevonden issues
- voorgestelde wijzigingen
- diff-weergave
- selectie van wijzigingen
- apply-resultaten

### 5.2 Verwachte flow

De basisflow is:

1. gebruiker selecteert een place in WME
2. script detecteert selectie
3. place wordt geanalyseerd
4. sidebar wordt gevuld met resultaten
5. gebruiker bekijkt issues en voorstellen
6. gebruiker vinkt gewenste wijzigingen aan
7. gebruiker kiest expliciet voor toepassen
8. script voert alleen geselecteerde wijzigingen uit
9. UI toont resultaat

### 5.3 Lege toestand

Wanneer geen place is geselecteerd, toont de tab een lege status zoals:

- geen geselecteerde place
- instructie om een place te selecteren
- optioneel korte uitleg over wat de tool doet

### 5.4 Analyse-header

Bovenaan de tab wordt context getoond, bijvoorbeeld:

- place name
- place id
- country/config scope
- gevonden chain match
- laatst uitgevoerde analyse-status

### 5.5 Issue-lijst

Issues worden weergegeven in een lijst of gegroepeerde secties.

Per issue moet minimaal zichtbaar zijn:

- severity
- titel of korte beschrijving
- betrokken veld
- waarom het issue is gevonden
- of het whitelisted is
- of er een voorstel beschikbaar is

### 5.6 Voorstellenlijst

Voorstellen worden alleen getoond wanneer een issue tot een zinvol voorstel leidt.

Per voorstel moet zichtbaar zijn:

- veldnaam
- huidige waarde
- voorgestelde waarde
- diff of vergelijking
- bronrule
- bron van standaard of policy
- checkbox om de wijziging te selecteren

### 5.7 Diff-presentatie

De diff-presentatie moet helder en praktisch zijn.

Minimaal tonen:

- Current
- Proposed

Optioneel later uitbreidbaar met visuele inline diff.

Voor v1 is een side-by-side of stacked compare voldoende, zolang dit duidelijk is.

### 5.8 Checkbox-model

Elke wijziging krijgt een eigen checkbox.

Daarmee bepaalt de gebruiker precies welke wijzigingen worden toegepast.

Gedrag:

- standaard kunnen voorstellen vooraf geselecteerd of niet geselecteerd zijn
- de gebruiker moet individuele wijzigingen kunnen aan- of uitzetten
- er mag later een "select all / clear all" functie bijkomen, maar dat is geen harde v1-eis

### 5.9 Apply-knop

De apply-knop wordt alleen actief wanneer minstens één wijziging geselecteerd is.

Bij klikken:

- UI schakelt naar applying state
- script probeert geselecteerde wijzigingen door te voeren
- UI toont per wijziging succes, fout of overgeslagen resultaat

### 5.10 Post-apply gedrag

Na apply moet de gebruiker duidelijk kunnen zien:

- welke wijzigingen gelukt zijn
- welke wijzigingen mislukt zijn
- welke wijzigingen niet geselecteerd waren
- of een heranalyse nodig of uitgevoerd is

---

## 6. Highlighter / Scan-tab

### 6.1 Doel

De Highlighter / Scan-tab biedt diagnose op kaartniveau.

De gebruiker kan hiermee places in de zichtbare kaartlaag visueel laten markeren op basis van status.

### 6.2 Functionaliteit in v1

Minimaal ondersteunt deze tab:

- scan van zichtbare places
- refresh van de scan
- clear van highlighterresultaten
- legenda van kleuren en statussen

### 6.3 Statuslegenda

De tab toont de betekenis van highlight-statussen, bijvoorbeeld:

- green = no issues
- orange = improvements available
- red = critical issues
- blue = whitelisted
- gray = not analyzed / insufficient config

### 6.4 Scan-flow

De scan-flow is:

1. gebruiker kiest scan
2. script analyseert zichtbare places
3. script berekent status per place
4. kaartlaag wordt geüpdatet
5. gebruiker kan vervolgens een specifieke place selecteren voor detailanalyse in Harmonization-tab

### 6.5 v1-beperking

Apply vanuit scanresultaten is geen v1-doel.
Scan ondersteunt diagnose, niet bulkbewerking.

---

## 7. Whitelist-tab

### 7.1 Doel

De Whitelist-tab geeft de gebruiker inzicht in lokaal onderdrukte issues en biedt beheerfunctionaliteit.

### 7.2 Functionaliteit in v1

Minimaal ondersteunt deze tab:

- lijst van whitelist-entries
- inspectie van place/rule/field combinatie
- individuele verwijdering
- export van whitelist
- import van whitelist

### 7.3 Weergave per entry

Per whitelist-entry is minimaal zichtbaar:

- placeId
- ruleId
- field
- createdAt
- reason

### 7.4 Import-flow

De gebruiker kan een JSON-bestand importeren.

Bij import:

- valideert het script de structuur
- merge het script geldige entries
- toont de UI aantal toegevoegde, overgeslagen of ongeldige entries
- blijft bestaande data behouden bij fouten

### 7.5 Export-flow

De gebruiker kan de huidige whitelist exporteren als JSON-bestand.

### 7.6 Link met Harmonization-tab

Vanuit een issue of voorstel in de Harmonization-tab moet later whitelisten eenvoudig te starten zijn.

Voor v1 is dit idealiter beschikbaar als actie op issue- of voorstel-niveau.

---

## 8. Settings-tab

### 8.1 Doel

De Settings-tab bevat scriptinstellingen die lokaal per gebruiker gelden.

### 8.2 Functionaliteit in v1

Minimaal ondersteunt deze tab:

- keuze van locale
- keuze van channel: stable of dev
- handmatige cache refresh
- debug toggle
- fallback country override

### 8.3 Locale-keuze

De gebruiker kan de UI-taal kiezen.

Resolutievolgorde blijft:

1. expliciete user setting
2. country/community default
3. English fallback

### 8.4 Channel-keuze

De gebruiker kan wisselen tussen:

- stable
- dev

Na wissel moet duidelijk zijn dat data opnieuw geladen of ververst wordt.

### 8.5 Cache refresh

De gebruiker moet handmatig kunnen forceren dat manifest en data opnieuw worden geladen.

### 8.6 Fallback country override

Voor grensgevallen of onduidelijke context mag de gebruiker tijdelijk een fallback-land kiezen.

Deze instelling is bedoeld als runtime-hulp, niet als vervanging van correcte place-country detectie.

---

## 9. Community Debug-tab

### 9.1 Doel

De Community Debug-tab is bedoeld voor maintainers en developers.

### 9.2 Functionaliteit in v1

Minimaal toont deze tab:

- actief channel
- geladen manifestversie
- dataRevision
- actieve config chain
- actieve locale
- chain match resultaat
- suppressie via exceptions
- suppressie via whitelist
- validatiefouten of warnings
- merge warnings

### 9.3 Richtlijn

De debug-tab mag technisch zijn, maar moet nog steeds leesbaar genoeg zijn om community maintainers te helpen.

---

## 10. UI-states

De UI moet meerdere states goed ondersteunen.

### 10.1 Algemene states

- idle
- loading
- ready
- empty
- applying
- success
- warning
- error

### 10.2 Voorbeelden

#### Loading
Wanneer config, analyse of scan nog bezig is.

#### Empty
Wanneer geen place is geselecteerd of geen bruikbare data beschikbaar is.

#### Applying
Wanneer geselecteerde wijzigingen worden doorgevoerd.

#### Error
Wanneer laden, analyse of apply mislukt.

### 10.3 Richtlijn

Elke state moet duidelijke visuele feedback geven.

---

## 11. Gebruikersflow — geselecteerde place

De hoofdflow voor v1 is:

1. gebruiker selecteert place
2. script laadt context
3. script bepaalt actieve config
4. script voert chain matching uit
5. script evalueert rules
6. script past exceptions en whitelist toe
7. script toont issues en voorstellen
8. gebruiker selecteert gewenste wijzigingen
9. gebruiker klikt apply
10. script voert wijzigingen uit
11. UI toont resultaat
12. script kan optioneel heranalyseren

---

## 12. Gebruikersflow — scanmodus

De ondersteunende scanflow is:

1. gebruiker opent Highlighter / Scan-tab
2. gebruiker start scan
3. script analyseert zichtbare places
4. script markeert places op de kaart
5. gebruiker selecteert een place met opvallende status
6. detailanalyse gebeurt in Harmonization-tab

---

## 13. Gebruikersflow — whitelistbeheer

De whitelistflow is:

1. gebruiker ziet een issue of voorstel dat lokaal genegeerd moet worden
2. gebruiker whitelists dit item
3. runtime slaat entry lokaal op
4. volgende analyses onderdrukken dit issue
5. gebruiker kan later entry bekijken, exporteren of verwijderen

---

## 14. Feedback en meldingen

De UI moet op meerdere momenten feedback geven.

### 14.1 Voorbeelden

- config geladen
- manifest vernieuwd
- scan voltooid
- geen issues gevonden
- wijzigingen toegepast
- sommige wijzigingen mislukt
- invalid importbestand
- fallback naar cache gebruikt

### 14.2 Richtlijn

Feedback moet kort, duidelijk en contextueel zijn.

---

## 15. Error handling in UI

Veelvoorkomende foutgevallen moeten bruikbaar afgehandeld worden.

Voorbeelden:

- configbestand niet bereikbaar
- manifest ongeldig
- place niet ondersteund
- apply mislukt voor één veld
- locale key ontbreekt
- importbestand corrupt

De UI moet:

- duidelijke foutmelding geven
- waar mogelijk doorgaan met gedegradeerde functionaliteit
- debug-info beschikbaar maken zonder normale flow te blokkeren

---

## 16. Informatiehiërarchie

De belangrijkste informatie moet bovenaan zichtbaar zijn.

Aanbevolen volgorde in de Harmonization-tab:

1. selectiecontext
2. globale status/banner
3. chain match samenvatting
4. issues
5. voorstellen/diffs
6. apply controls
7. extra debug of detailinformatie

Hierdoor ziet de gebruiker eerst wat er aan de hand is, en pas daarna hoe het opgelost kan worden.

---

## 17. Interactieprincipes

Voor v1 gelden de volgende interactieregels:

- geen automatische apply
- elke wijziging expliciet selecteerbaar
- acties moeten omkeerbaar of opnieuw analyseerbaar zijn
- UI moet duidelijk maken welke data uit config, chain of exception komt
- complexe acties moeten opgesplitst blijven in begrijpelijke kleine voorstellen

---

## 18. Toegankelijkheid en begrijpelijkheid

Ook al is dit een technisch script, de UI moet zoveel mogelijk begrijpelijk blijven.

Richtlijnen:

- gebruik consistente termen
- gebruik severity-labels duidelijk
- vermijd overmatig technische tekst in hoofdweergave
- zet onderhoudsdetails in debug, niet in standaardweergave
- gebruik i18n voor alle zichtbare UI-teksten

---

## 19. Wat v1 nog niet volledig vereist

De volgende onderdelen mogen later uitgebreider worden, maar zijn geen harde v1-eis:

- inline diff highlighting op tekenniveau
- drag-and-drop whitelistbeheer
- bulk select all / clear all UX-verfijningen
- complex filteren of sorteren van issues
- multi-place batch apply UI
- visuele analytics of dashboards
- uitgebreide history van apply-acties

---

## 20. Samenvatting

De UI-flow van WME Place Harmonizer ROW Edition is ontworpen rond één hoofdprincipe:

diagnose → voorstel → handmatige selectie → expliciete toepassing

De sidebar bestaat in v1 uit vijf functionele tabs:

- Harmonization
- Highlighter / Scan
- Whitelist
- Settings
- Community Debug

Deze opzet zorgt ervoor dat:
- editors snel kunnen zien wat er mis is
- wijzigingen uitlegbaar blijven
- voorstellen gecontroleerd toegepast worden
- scan en detailanalyse logisch samenwerken
- maintainers voldoende inzicht krijgen zonder gewone editors te overladen