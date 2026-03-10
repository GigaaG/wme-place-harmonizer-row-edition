# WME Place Harmonizer ROW Edition — Architecture Overview

## 1. Doel van dit document

Dit document beschrijft de hoofdarchitectuur van WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen hoe de verschillende onderdelen van het systeem samenwerken, zodat development, configuratiebeheer en toekomstige uitbreidingen op een consistente manier kunnen worden uitgevoerd.

Dit document is een architectuuroverzicht op hoofdlijnen. Gedetailleerde modellen voor configuratie, manifesten, chains, whitelist, UI en build/release flow worden in aparte documenten verder uitgewerkt.

## 2. Architectuurprincipes

De architectuur van het project is gebaseerd op de volgende principes:

- config-first
- global defaults met lokale overrides
- SDK-first integratie
- WazeWrap alleen als secundaire compatibiliteits- of helperlaag
- voorstelgestuurde harmonisatie, nooit automatische wijzigingen
- publieke GitHub-gebaseerde configuratie zonder backend
- veilige schema-validatie
- robuuste caching met last-known-good fallback
- modulaire opzet voor onderhoudbaarheid en testbaarheid
- duidelijke scheiding tussen code en community-data

## 3. Repositories

Het project bestaat uit twee afzonderlijke repositories.

### 3.1 Code-repo

Repository:
`wme-place-harmonizer-row-edition`

Verantwoordelijkheden:
- userscript code
- TypeScript broncode
- build pipeline
- SDK en WazeWrap integratie
- UI
- matching engine
- rule engine
- proposal/apply flow
- whitelist logic
- caching logic
- documentatie voor development, build en release

### 3.2 Data-repo

Repository:
`wme-place-harmonizer-row-data`

Verantwoordelijkheden:
- global config
- community config
- country config
- optionele state config
- chains
- exceptions
- locale files
- JSON schemas
- manifest files
- documentatie voor community maintainers

### 3.3 Waarom twee repositories

Er is bewust gekozen voor één code-repo en één data-repo, omdat dit de beste balans biedt tussen onderhoudbaarheid, flexibiliteit en community-beheer.

Voordelen:
- script-releases blijven losgekoppeld van community-data wijzigingen
- communities kunnen data wijzigen zonder scriptcode te veranderen
- rollback van data is mogelijk zonder nieuwe script-release
- gedeelde standaarden en chains kunnen centraal worden beheerd
- DACH-achtige multi-country communities kunnen via één communityprofiel worden ondersteund
- manifest-gestuurde caching blijft overzichtelijk

## 4. Hoog-niveau systeembestanddelen

Het systeem bestaat uit de volgende hoofdlagen:

1. bootstrap en init
2. editor integration layer
3. config and data layer
4. validation and merge layer
5. matching layer
6. rule engine
7. proposal engine
8. apply layer
9. UI layer
10. cache and persistence layer
11. debug and logging layer

## 5. Runtime flow op hoofdlijnen

De runtime flow is als volgt:

1. userscript initialiseert in WME
2. init guards controleren of WME, SDK en benodigde context beschikbaar zijn
3. script laadt settings, manifest en benodigde configuratiebestanden
4. configuratiebestanden worden gevalideerd
5. runtime-config wordt samengesteld via inheritance en merge-strategieën
6. gebruiker selecteert een place of start een scan
7. place-context wordt opgebouwd
8. chain matching wordt uitgevoerd
9. rules evalueren de place binnen de actieve configuratie
10. issues en voorstellen worden gegenereerd
11. kaart en sidebar worden bijgewerkt
12. gebruiker kiest optioneel welke wijzigingen toegepast mogen worden
13. apply layer voert alleen geselecteerde wijzigingen door
14. UI toont resultaat, eventuele fouten en debug-info

## 6. Integratielaag met WME

### 6.1 SDK-first benadering

De publieke WME SDK is de primaire integratielaag.

De SDK wordt waar mogelijk gebruikt voor:
- selectiecontext
- venue ophalen en bijwerken
- map- en editor-events
- sidebar/tab integratie
- settings/contextinformatie

### 6.2 WazeWrap als secundaire laag

WazeWrap wordt alleen gebruikt:
- waar het praktische helpers biedt
- waar de SDK nog geen handige abstraction biedt
- achter een adapterlaag zodat toekomstige vervanging eenvoudig blijft

Directe business logic mag niet afhankelijk zijn van WazeWrap-specifieke objecten.

## 7. Configuratie-architectuur

### 7.1 Configuratiehiërarchie

De configuratiehiërarchie is:

1. global
2. community
3. country
4. state/region
5. tijdelijke user override/fallback

Voor v1 zijn global, community en country actief vereist. State/region wordt voorbereid maar nog niet volledig benut.

### 7.2 Resolutie van actieve configuratie

De actieve configuratie wordt bepaald op basis van:

1. place country, indien beschikbaar
2. editor/map-context
3. handmatige fallback-keuze bij onvoldoende zekerheid

Community-config kan meerdere landen dekken. Een country-config kan daarom verwijzen naar of erven van een communityprofiel.

### 7.3 Scheiding van datasets

De data-repo bevat gescheiden datasets voor:
- config
- chains
- exceptions
- locales
- schemas
- manifest

Deze datasets worden afzonderlijk geladen, gevalideerd en samengevoegd in runtime.

## 8. Merge-model

Configuratiebestanden ondersteunen inheritance en voorspelbaar mergen.

### 8.1 Basisregels

- primitives: child overschrijft parent
- objects: deep merge
- arrays: expliciete strategie per veld

### 8.2 Array-strategieën

Ondersteunde strategieën:
- replace
- appendUnique
- keyedMerge

De merge-strategie wordt expliciet vastgelegd om onvoorspelbaar gedrag te voorkomen.

## 9. Validatie

Validatie vindt plaats in twee fasen.

### 9.1 Bestandvalidatie

Elk extern JSON-bestand wordt individueel gevalideerd tegen het juiste schema:
- manifest
- config
- chains
- exceptions
- locales

### 9.2 Runtime-validatie

Na merge en resolutie wordt de samengestelde runtime-config opnieuw gevalideerd tegen een runtime-schema.

### 9.3 Fallback-gedrag

Bij ongeldige of ontbrekende data:
- logt het script duidelijke foutinformatie
- gebruikt het script indien mogelijk last-known-good data
- valt het script terug op parent of global config
- crasht het script niet door corrupte data

## 10. Matching engine

De matching engine bepaalt of een place overeenkomt met een bekende chain of community-definitie.

### 10.1 Matchbronnen

Matching kan gebruikmaken van:
- name
- aliases
- regex
- partial word matching
- prefix/infix/suffix patterns
- category hints
- brand hints
- community- of country-scope

### 10.2 Matchdoel

Het doel van matching is:
- herkennen van canonieke chain-identiteit
- bepalen van relevante standaarden
- voeden van harmonisatievoorstellen

### 10.3 Ontwerpkeuze

De matcher is config-driven. Alternatieve schrijfwijzen, synoniemen en uitzonderingen worden in data/config vastgelegd, niet hardcoded in scriptlogica.

## 11. Rule engine

### 11.1 Hoofdfunctie

De rule engine evalueert de geselecteerde of gescande place tegen de actieve runtime-config.

### 11.2 Rule-uitkomst

Een rule mag nooit direct een wijziging committen.

Een rule levert uitsluitend:
- issue metadata
- severity
- message key
- huidige waarde
- voorgestelde waarde
- rationale/context
- whitelistbaarheid
- apply eligibility

### 11.3 Rulegroepen voor v1

De eerste rulegroepen zijn:
- name normalization
- alias normalization
- brand/chain harmonization
- phone validation
- URL validation
- category validation
- lock level recommendation
- residential cleanup
- beperkte EV- en parking-checks

## 12. Proposal engine

### 12.1 Doel

De proposal engine vertaalt issues en rule-uitkomsten naar concrete, door de gebruiker selecteerbare wijzigingsvoorstellen.

### 12.2 Output

Per voorstel bevat het systeem:
- field identifier
- current value
- proposed value
- diff representation
- source rule
- source config scope
- selectable state
- apply constraints

### 12.3 Manual apply only

Alle voorstellen zijn handmatig.
De gebruiker bepaalt via checkboxes welke wijzigingen mogen worden doorgevoerd.

## 13. Apply layer

### 13.1 Verantwoordelijkheid

De apply layer vertaalt geselecteerde voorstellen naar gecontroleerde editor-updates.

### 13.2 Veiligheidsmodel

De apply layer:
- accepteert alleen expliciet geselecteerde voorstellen
- werkt per ondersteund veldtype
- valideert invoer waar nodig opnieuw
- rapporteert successen en fouten per wijziging
- voert geen ongecontroleerde bulkmutaties uit

### 13.3 v1-beperkingen

In v1 ligt de focus op relatief beheersbare veldwijzigingen.
Geometry-wijzigingen en complexere mutaties vallen buiten de eerste versie.

## 14. UI-architectuur

### 14.1 Hoofdonderdelen

De UI bestaat uit een eigen sidebar met tabs:

- Harmonization
- Highlighter / Scan
- Whitelist
- Settings
- Community Debug

### 14.2 Harmonization-tab

Toont:
- gevonden issues
- severity
- chain match informatie
- diff van huidige en voorgestelde waarden
- checkboxes per voorstel
- apply-knop

### 14.3 Highlighter-tab

Toont:
- scanopties
- legenda van highlight-kleuren
- refresh/clear controls

### 14.4 Whitelist-tab

Toont:
- lokale whitelist entries
- import/export
- merge/verwijderacties

### 14.5 Settings-tab

Toont:
- locale instelling
- stable/dev channel
- cache refresh
- debug toggle
- fallback country override

### 14.6 Community Debug-tab

Toont:
- geladen manifest
- actieve config scope
- validatiestatus
- matchdetails
- merge warnings
- runtime info voor maintainers en developers

## 15. Highlighter en scanmodel

De kaartlaag kan places visueel markeren op basis van diagnose-uitkomsten.

Voorgestelde statusgroepen:
- groen: geen issues
- oranje/geel: verbeteringen mogelijk
- rood: ernstige issues
- blauw: whitelisted
- grijs: nog niet geanalyseerd of onvoldoende config

Voor v1 geldt:
- scan van zichtbare places is toegestaan
- apply vindt alleen plaats na expliciete selectie en bevestiging op place-niveau

## 16. Whitelist-architectuur

Whitelisting is lokaal en editor-specifiek.

### 16.1 Opslag

Whitelist-data wordt opgeslagen in localStorage.

### 16.2 Scope

Whitelisting gebeurt op een voldoende specifiek niveau, bijvoorbeeld combinatie van:
- place
- rule
- field

### 16.3 Ondersteuning

De whitelist ondersteunt:
- versieerbare datastructuur
- import/export
- merge bij import
- lokale inspectie en verwijdering

## 17. Caching-architectuur

### 17.1 Manifest-driven loading

Het script laadt eerst een manifest dat beschrijft:
- kanaal
- versie
- commit of build-identiteit
- bekende bestanden
- hashes of vergelijkbare validatiesignalen

### 17.2 Cachebeleid

Per bestand geldt:
- gebruik cache indien geldig en actueel
- fetch opnieuw indien manifest aangeeft dat data gewijzigd is
- gebruik bij fouten last-known-good data
- fallback naar parent/global waar zinvol

### 17.3 Kanalen

Minimaal ondersteunde kanalen:
- stable
- dev

## 18. Internationalisatie

Alle user-facing teksten lopen via translation keys.

### 18.1 Talen voor v1

Minimaal:
- English
- Dutch
- German

### 18.2 Fallback

Bij ontbrekende keys wordt teruggevallen op Engels.

### 18.3 Grenzen

Configuratiebestanden mogen platte teksten bevatten voor community-data, maar UI-teksten en standaardmeldingen zijn i18n-driven.

## 19. Logging en debug

Het systeem bevat een logging- en debuglaag voor:
- foutdiagnose
- validatieproblemen
- merge-conflicten
- cacheproblemen
- matchresultaten
- apply-resultaten

Debug-uitvoer moet bruikbaar zijn voor maintainers en developers, zonder normale editors te overladen.

## 20. Toekomstige uitbreidingen

Deze architectuur is bewust voorbereid op:
- state/region runtime-ondersteuning
- uitgebreidere country bundles
- extra rulegroepen
- complexere opening-hours ondersteuning
- geavanceerdere apply workflows
- uitgebreidere community governance via GitHub processen
- mogelijk aanvullende tooling rondom config-validatie en preview

## 21. Samenvatting

WME Place Harmonizer ROW Edition is ontworpen als een modulaire, veilige en community-configurable oplossing voor harmonisatie van Places op de ROW server.

De kern van de architectuur is:
- één code-repo
- één data-repo
- config-first ontwerp
- SDK-first integratie
- manifest-gestuurde caching
- rule- en proposal-gedreven workflow
- handmatige toepassing van wijzigingen
- robuuste validatie en fallback