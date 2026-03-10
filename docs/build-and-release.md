# WME Place Harmonizer ROW Edition — Build and Release

## 1. Doel van dit document

Dit document beschrijft hoe WME Place Harmonizer ROW Edition gebouwd, getest, gereleased en gepubliceerd wordt.

Het doel is om vast te leggen:

- welke technische stack wordt gebruikt
- hoe development builds werken
- hoe production builds werken
- hoe het userscript wordt gegenereerd
- hoe stable en dev releasekanalen zich gedragen
- hoe script- en datareleases samenwerken
- hoe publicatie en rollback verlopen
- welke minimale documentatie voor contributors vereist is

Dit document is leidend voor de technische setup van de code-repository.

---

## 2. Build-principes

De build- en releaseaanpak is gebaseerd op de volgende principes:

- TypeScript als primaire codebase
- één gebundeld userscript als runtime-output
- reproduceerbare builds
- duidelijke scheiding tussen development en production
- minimale handmatige release-stappen
- goed documenteerbare workflow voor maintainers
- compatibel met publieke GitHub-hosting
- voorbereid op CI/CD, maar ook handmatig uitvoerbaar

---

## 3. Doeloutput

De uiteindelijke runtime-output van de code-repo is:

- één Tampermonkey userscript-bestand

Voorbeeld:

```text
dist/wme-place-harmonizer-row-edition.user.js

Dit bestand is de distributie-output die gebruikers installeren.

## 4. Technische stack

Voor v1 gebruiken we:

- TypeScript
- Node.js
- npm
- een bundler
- linting
- testbare modulaire bronstructuur

### 4.1 Aanbevolen bundler

Voor dit project is een moderne bundler gewenst die:

- TypeScript goed ondersteunt
- één outputbestand kan genereren
- userscript metadata kan verwerken
- geschikt is voor kleine modulaire builds

De voorkeursrichting voor v1 is:

- Vite als bundlerbasis
- Eventueel aangevuld met een userscript-plugin of een eigen buildscript voor metadata injectie.

### 4.2 Waarom TypeScript

TypeScript is hier wenselijk vanwege:

- modulaire architectuur
- veel configuratie- en datamodellen
- duidelijke types voor rules, proposals, config en runtime-state
- betere onderhoudbaarheid
- veiligere refactors

## 5. Repository-opbouw voor build

De code-repo bevat minimaal deze relevante delen:

- `src/`
- `docs/`
- `scripts/`
- `tests/`
- `dist/`
- `.github/workflows/`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`

### 5.1 src/

Bevat alle TypeScript-broncode.

### 5.2 scripts/

Bevat hulpscripts voor:

- userscript metadata genereren
- release-handelingen
- eventueel version syncing

### 5.3 dist/

Bevat build-output.
Deze map wordt gegenereerd en is geen bronmap.

### 5.4 tests/

Bevat unit- en eventueel integratietests voor logica die buiten WME te testen is.

## 6. Buildvarianten

Voor v1 onderscheiden we minimaal twee buildvarianten:

- development build
- production build

### 6.1 Development build

Doel:

- lokale ontwikkeling
- snelle iteratie
- testen van nieuwe functionaliteit
- debugvriendelijke output

Kenmerken:

- sourcemaps toegestaan
- minder agressieve minificatie
- dev metadata mogelijk
- gericht op lokale validatie

### 6.2 Production build

Doel:

- publiceerbaar userscript
- bedoeld voor normale gebruikers of stable testing

Kenmerken:

- schone distributie-output
- stabiele versie-informatie
- correcte userscript metadata
- geen onnodige debugartefacten

## 7. Userscript metadata

Het gebundelde script moet een correcte userscript header bevatten.

### 7.1 Doel

De metadata bepaalt onder andere:

- scriptnaam
- namespace
- versie
- beschrijving
- match/include regels
- update URL
- download URL
- vereiste permissies
- eventuele externe requires

### 7.2 Richtlijn

De metadata moet bij voorkeur uit een centrale bron worden opgebouwd, zodat:

- versie consistent blijft
- stable/dev varianten mogelijk zijn
- build en release minder foutgevoelig worden

### 7.3 Aanpak

Voor v1 is het aanbevolen om metadata te genereren vanuit:

- `package.json`
- build-variabele
- eventueel apart metadata-template

## 8. Aanbevolen npm scripts

De code-repo moet minimaal de volgende npm scripts ondersteunen:

- `dev`
- `build`
- `build:dev`
- `build:prod`
- `lint`
- `test`
- `release:dev`
- `release:stable`

### 8.1 Betekenis

- `npm run dev`: Start development workflow of watch/build modus voor lokale iteratie.
- `npm run build`: Genereert standaard een distributiebare build.
- `npm run build:dev`: Genereert expliciet een dev build.
- `npm run build:prod`: Genereert expliciet een production build.
- `npm run lint`: Voert statische codecontrole uit.
- `npm run test`: Voert testset uit.
- `npm run release:dev`: Voert releaseflow uit voor dev-kanaal.
- `npm run release:stable`: Voert releaseflow uit voor stable-kanaal.

## 9. Releasekanalen

Het project kent twee releasekanalen:

- dev
- stable

### 9.1 Dev

Doelgroep:

- maintainers
- developers
- testers

Kenmerken:

- snellere iteratie
- experimentele functionaliteit mogelijk
- kan gekoppeld zijn aan data-manifest dev

### 9.2 Stable

Doelgroep:

- normale gebruikers
- communities die een gecontroleerde versie willen gebruiken

Kenmerken:

- geteste build
- lagere kans op regressies
- gekoppeld aan data-manifest stable

## 10. Relatie tussen script-channel en data-channel

### 10.1 Basisprincipe

Script en data hebben elk hun eigen releasecyclus, maar moeten logisch op elkaar aansluiten.

### 10.2 Verwachte koppeling

- stable script gebruikt standaard stable data
- dev script gebruikt standaard dev data
- gebruiker of maintainer kan dit in runtime-settings aanpassen, tenzij later bewust beperkt

### 10.3 Richtlijn

De standaardcombinatie moet zijn:

- stable script → stable manifest
- dev script → dev manifest
## 11. Versiebeheer

### 11.1 Scriptversie

De scriptversie wordt beheerd in de code-repo en moet zichtbaar zijn in:

- `package.json`
- userscript metadata
- release artifacts
- debug info in runtime

### 11.2 Dataversie

De dataversie wordt beheerd in de data-repo via:

- `manifest/stable.json`
- `manifest/dev.json`

### 11.3 Richtlijn

Scriptversie en dataversie hoeven niet gelijk te lopen, maar moeten wel samen bruikbaar blijven.

## 12. Lokale ontwikkelworkflow

De aanbevolen lokale workflow voor developers is:

1. clone code-repo
2. install dependencies
3. run development build
4. laad lokaal userscript in Tampermonkey
5. test in WME
6. wijzig code
7. rebuild
8. herhaal

### 12.1 Minimale setupstappen

De README moet later minimaal beschrijven:

- vereiste Node.js versie
- installatie van dependencies
- buildcommando’s
- waar de output staat
- hoe het script in Tampermonkey geladen wordt

## 13. Handmatige releaseflow

Voor v1 moet de releaseflow ook zonder volledige CI/CD uitvoerbaar zijn.

### 13.1 Dev release

Aanbevolen flow:

1. werk op development branch
2. voer lint en tests uit
3. bouw dev build
4. controleer output
5. commit release-relevante wijzigingen
6. tag of publiceer dev artifact
7. zorg dat dev script standaard naar dev manifest wijst

### 13.2 Stable release

Aanbevolen flow:

1. merge geteste wijzigingen naar main
2. voer lint en tests uit
3. bouw production build
4. controleer output
5. bump versie
6. maak release tag
7. publiceer artifact
8. zorg dat stable script standaard naar stable manifest wijst

## 14. CI/CD voorbereiding

Voor v1 hoeft CI/CD nog niet volledig ingericht te zijn, maar de repository moet daarop voorbereid zijn.

Later kan CI bijvoorbeeld:

- lint uitvoeren
- tests uitvoeren
- build maken
- release artifacts genereren
- manifestcompatibiliteit checken
- GitHub Release publiceren

De map hiervoor is:

`.github/workflows/`
## 15. Release artifacts

Per release is minimaal gewenst:

- gebundeld `.user.js` bestand
- versie-informatie
- changelog of releasenotitie

Voorbeeld:

`dist/wme-place-harmonizer-row-edition.user.js`

Optioneel later:

- checksum
- debug build
- source archive

## 16. Publicatie-opties

Voor v1 zijn de volgende publicatiekanalen logisch:

- GitHub Releases
- eventueel later GreasyFork

### 16.1 GitHub Releases

Voordelen:

- eenvoudig
- transparant
- versieerbaar
- direct passend bij open projectbeheer

### 16.2 GreasyFork

Kan later overwogen worden als distributiekanaal voor bredere gebruikersgroep.

Voor het fundament van v1 is GitHub Releases voldoende.

## 17. Rollback-strategie

Rollback moet mogelijk zijn voor zowel script als data.

### 17.1 Script rollback

Bij scriptproblemen moet een eerdere release opnieuw bruikbaar zijn via:

- eerdere GitHub release
- eerdere `.user.js` artifact
- eerdere tag

### 17.2 Data rollback

Bij dataproblemen moet een eerdere dataset bruikbaar zijn via:

- vorige manifestversie
- last-known-good cache
- herstel van eerdere datarepo-commit

### 17.3 Richtlijn

Script en data moeten onafhankelijk rollbackbaar blijven.

## 18. README-verplichtingen

De README van de code-repo moet later minimaal uitleg geven over:

- projectdoel
- vereisten
- installatie van dependencies
- development workflow
- buildcommando’s
- outputlocatie
- hoe te testen in Tampermonkey
- hoe een nieuwe versie gereleased wordt
- hoe stable/dev werken
- waar de data-repo zich bevindt

Dit is expliciet belangrijk voor jouw wens dat nieuwe versies later duidelijk gebouwd en gepubliceerd kunnen worden.

## 19. Minimale releasechecklist

Voor elke release is het aanbevolen om minimaal te controleren:

- versienummer klopt
- userscript metadata klopt
- juiste default channel is ingesteld
- build slaagt zonder fouten
- lint slaagt
- tests slagen
- outputbestand wordt gegenereerd
- changelog of releasenotitie is bijgewerkt
- runtime test in WME is uitgevoerd

## 20. Wat v1 nog niet volledig vereist

De volgende onderdelen zijn wenselijk, maar nog geen harde v1-eis:

- volledig automatische releases
- automatische publicatie naar GreasyFork
- automatisch gegenereerde changelog
- compatibiliteitsblokkades tussen script- en dataversies
- multi-environment deployment matrix
- ondertekende artifacts

## 21. Samenvatting

De build- en releaseaanpak van WME Place Harmonizer ROW Edition is ontworpen om:

- lokaal eenvoudig uitvoerbaar te zijn
- later opschaalbaar te zijn naar CI/CD
- één distributiebaar userscript op te leveren
- stable en dev duidelijk te scheiden
- script en data los maar samenhangend te beheren

De kern is:

TypeScript source → bundler → single userscript output → release artifact

met duidelijke documentatie voor developers en maintainers.