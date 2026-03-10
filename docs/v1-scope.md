# WME Place Harmonizer ROW Edition — v1 Scope

## 1. Projectdoel

WME Place Harmonizer ROW Edition is een production-grade Tampermonkey userscript voor Waze Map Editor (ROW), gericht op het analyseren, valideren en harmoniseren van Places/POI’s.

De eerste versie is gericht op het ondersteunen van editors en community maintainers met duidelijke diagnose, visuele feedback op de kaart, en handmatig toepasbare wijzigingsvoorstellen. Het script voert nooit automatisch wijzigingen door zonder expliciete actie van de gebruiker.

## 2. Doelgroep

De primaire doelgroepen voor v1 zijn:

- Waze editors die Places onderhouden
- community maintainers die standaarden, chains en uitzonderingen beheren
- script developers die bijdragen aan code, configuratie en documentatie

## 3. Kernprincipes

De volgende principes zijn leidend voor v1:

- config-first architecture
- global-first met lokale overrides
- GitHub-managed configuratie zonder backend
- SDK-first integratie, met WazeWrap als secundaire helperlaag waar nuttig
- manual apply only
- translation-ready UI
- veilige schema-validatie
- last-known-good caching en robuuste fallbacks
- geen custom rollen- of permissiemodel in het script
- modulaire architectuur gericht op onderhoudbaarheid en uitbreidbaarheid

## 4. In scope voor v1

De volgende onderdelen vallen binnen de eerste versie:

### 4.1 Place-analyse
- analyse van de geselecteerde place
- validatie op basis van global/community/country-config
- chain matching op basis van naam, aliases, regex en community-data
- voorstellen voor harmonisatie zonder automatische toepassing

### 4.2 Kaartfeedback
- highlighter voor places in de zichtbare kaartlaag
- kleurcodering voor diagnose, bijvoorbeeld:
  - groen: geen issues
  - oranje/geel: verbeteringen mogelijk
  - rood: ernstige issues
  - blauw: whitelisted
  - grijs: nog niet geanalyseerd of geen bruikbare config

### 4.3 Sidebar UI
- eigen sidebar-paneel/tab in WME
- overzicht van gevonden issues
- weergave van severity
- weergave van huidige versus voorgestelde waarde
- checkbox per wijzigingsvoorstel
- knop om geselecteerde wijzigingen toe te passen
- inzicht in welke config/rule een voorstel veroorzaakt

### 4.4 Configuratie en data
- laden van publieke configuratiebestanden vanuit GitHub
- ondersteuning voor:
  - global config
  - community config
  - country config
- data uit aparte JSON-bestanden voor:
  - config
  - chains
  - exceptions
  - locales
  - schemas
  - manifest

### 4.5 Caching en validatie
- manifest-gestuurde caching
- last-known-good fallback
- validatie van losse JSON-bestanden tegen schema’s
- validatie van gemergede runtime-config tegen runtime-schema

### 4.6 Internationalisatie
- alle user-facing UI-teksten lopen via i18n keys
- ondersteuning voor minimaal:
  - English
  - Dutch
  - German
- fallback naar Engels wanneer vertalingen ontbreken

### 4.7 Whitelist
- lokaal whitelist-systeem via localStorage
- export/import van whitelist-data
- versieerbare whitelist-structuur
- whitelisting van specifieke issues op place/rule/field-niveau

### 4.8 Debug en onderhoud
- debug/info-tab voor maintainers en developers
- inzicht in geladen manifest, config scope, validatiestatus en matchresultaten
- support voor stable en dev channel

## 5. Out of scope voor v1

De volgende onderdelen vallen nadrukkelijk buiten v1:

- automatische wijzigingen zonder expliciete gebruikersactie
- bulk apply op alle places in viewport
- volledige state/region-ondersteuning in runtime-resolutie
- automatische geometry-wijzigingen zoals point naar area of andersom
- complexe opening-hours editorlogica
- backend of externe database buiten GitHub
- custom governance of permissiemodel in het script
- volledige multi-country editing flows voor grensgevallen beyond basic fallback/prompting
- complete parity met bestaande US Place Harmonizer logica

## 6. Eerste functionele focus van rules

Voor v1 richten we ons eerst op de meest waardevolle en beheersbare rulegroepen:

- name normalization
- alias normalization
- brand/chain harmonization
- phone validation and formatting proposals
- URL validation and normalization proposals
- category validation
- lock level recommendation
- residential cleanup checks
- eenvoudige EV- en parking-gerelateerde checks waar data/config beschikbaar is

Rules voor opening hours, adresspecifieke correcties en complexere uitzonderingslogica mogen later volgen.

## 7. Config-resolutie voor v1

De runtime-configuratie wordt in v1 als volgt opgebouwd:

1. global
2. community (optioneel)
3. country
4. user-level tijdelijke override/fallback indien nodig

Voor grensgevallen geldt:

- indien beschikbaar is het land van de place leidend
- anders wordt editor/map-context gebruikt
- indien onvoldoende zekerheid bestaat, mag het script de gebruiker een landkeuze laten maken uit beschikbare configuraties

State/region-config wordt in de architectuur voorbereid, maar nog niet als volwaardige v1-runtime-eis afgedwongen.

## 8. Manual apply model

Het script mag in v1 nooit zelfstandig wijzigingen opslaan.

De flow is altijd:

1. place analyseren
2. issues detecteren
3. voorstellen genereren
4. diff tonen in de sidebar
5. gebruiker selecteert gewenste wijzigingen via checkboxes
6. gebruiker kiest expliciet voor toepassen
7. script probeert alleen de geselecteerde wijzigingen door te voeren

## 9. Technische uitgangspunten

Voor v1 gelden de volgende technische keuzes:

- codebase in TypeScript
- build naar één Tampermonkey userscript
- modulaire structuur
- publieke WME SDK als primaire integratielaag
- WazeWrap alleen achter een adapterlaag en alleen waar nuttig
- publieke GitHub repository voor community-data
- manifest-driven cache invalidation
- schema-validatie met veilige fallbacks

## 10. Definition of Done voor v1-ontwerp

We beschouwen het ontwerp van v1 als voldoende uitgewerkt om te beginnen met bouwen wanneer minimaal het volgende is vastgelegd:

- repo-structuur voor code en data
- v1-scope document
- architectuurdocument op hoofdlijnen
- configmodel
- manifestmodel
- chainmodel
- merge-strategie
- whitelistmodel
- UI-flow
- build- en release-aanpak

## 11. Definition of Done voor eerste werkende build

De eerste werkende build van v1 is bereikt wanneer minimaal het volgende end-to-end werkt:

- userscript laadt in WME
- sidebar-tab wordt getoond
- config kan uit GitHub worden geladen
- minimaal één country/community-config werkt
- minimaal enkele basisrules werken end-to-end
- highlight/scan werkt op zichtbare places
- geselecteerde place toont issues en diff
- gebruiker kan geselecteerde wijzigingen handmatig toepassen
- whitelist werkt lokaal
- debug-tab toont geladen config en validatiestatus

## 12. Versiepositie van v1

v1 is bedoeld als een stabiele, uitbreidbare basis voor de ROW-community.

Het doel van v1 is niet om alle bestaande logica uit andere Place Harmonizer-varianten over te nemen, maar om een nieuw, onderhoudbaar en community-configurable fundament te leggen waarop later extra rules, regio-ondersteuning en complexere workflows kunnen worden gebouwd.