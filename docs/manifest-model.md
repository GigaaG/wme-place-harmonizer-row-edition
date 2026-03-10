# WME Place Harmonizer ROW Edition — Manifest Model

## 1. Doel van dit document

Dit document beschrijft het manifestmodel voor WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- Hoe manifestbestanden zijn opgebouwd
- Welke informatie het script uit het manifest haalt
- Hoe stable en dev channel worden ondersteund
- Hoe cache invalidatie werkt
- Hoe last-known-good fallback zich verhoudt tot manifest loading
- Hoe het model voorbereid wordt op latere compatibiliteitscontrole tussen script en data

Het manifest is het eerste bestand dat het userscript gebruikt om de rest van de community-data veilig en voorspelbaar te laden.

---

## 2. Rol van het manifest

Het manifest is de publieke ingang voor een data-channel.

Voor v1 zijn minimaal twee channels voorzien:

- `stable`
- `dev`

Het script gebruikt het manifest om te bepalen:

- Welke data-channel actief is
- Welke data-versie wordt aangeboden
- Welke bestanden bekend zijn
- Welke bestanden verplicht zijn
- Of cache vernieuwd moet worden
- Welke fallbackstrategie mogelijk is

Het manifest bevat dus geen volledige configuratie, maar beschrijft welke configuratiebestanden onderdeel zijn van een geldige datasetpublicatie.

---

## 3. Bestandslocaties

Manifestbestanden worden opgeslagen in:

```text
manifest/stable.json
manifest/dev.json
```

Deze bestanden worden direct door het userscript opgevraagd.

## 4. Basisprincipes

Het manifestmodel is gebaseerd op de volgende principes:

- Klein en snel te laden
- Stabiel formaat
- Geschikt als cache-ingang
- Kanaalgericht
- Voorbereid op hashes en compatibiliteitschecks
- Veilig bruikbaar zonder backend
- Bruikbaar voor last-known-good fallback

## 5. Verplichte top-level velden

Voor v1 bevat elk manifest minimaal de volgende top-level velden:

- `channel`
- `version`
- `generatedAt`
- `dataRevision`
- `files`

### 5.1 channel

Geeft aan voor welk kanaal het manifest geldt.

**Toegestane waarden voor v1:**

- `stable`
- `dev`

**Voorbeeld:**

```json
{
  "channel": "stable"
}
```

### 5.2 version

Menselijk leesbare datasetversie.

**Voorbeeld:**

```json
{
  "version": "0.1.0"
}
```

Voor dev mag dit bijvoorbeeld zijn:

```json
{
  "version": "0.1.0-dev"
}
```

### 5.3 generatedAt

ISO timestamp waarop het manifest is gegenereerd of gepubliceerd.

**Voorbeeld:**

```json
{
  "generatedAt": "2026-03-10T00:00:00Z"
}
```

### 5.4 dataRevision

Een stabiele identifier voor de inhoudsrevisie van de dataset.

Voor v1 mag dit nog een eenvoudige string zijn.

**Voorbeeld:**

```json
{
  "dataRevision": "initial"
}
```

Later kan dit bijvoorbeeld een commit SHA of build-ID worden.

### 5.5 files

Object met bekende bestanden binnen de publicatie.

**Voorbeeld:**

```json
{
  "files": {
    "config/global.json": {
      "required": true
    }
  }
}
```

## 6. Bestandvermelding in files

### 6.1 Doel

De files map beschrijft welke bestanden deel uitmaken van een geldige datasetpublicatie.

### 6.2 Sleutel

De sleutel is het repository-relatieve pad van het bestand.

**Voorbeeld:**

```json
{
  "files": {
    "config/global.json": {
      "required": true
    },
    "config/countries/nl.json": {
      "required": false
    }
  }
}
```

### 6.3 Minimale file entry voor v1

Voor v1 is het minimale model:

- `required`

**Voorbeeld:**

```json
{
  "required": true
}
```

### 6.4 Later uitbreidbare file entry

Het model wordt voorbereid op latere uitbreiding, bijvoorbeeld met:

- `hash`
- `size`
- `schema`
- `version`
- `optional`
- `scope`
- `lastModified`

Deze velden zijn nog geen harde v1-eis.

## 7. Vereiste bestanden in v1

Voor v1 moet een datasetpublicatie minimaal deze globale basis kunnen beschrijven:

- `config/global.json`
- `chains/global.json`
- `exceptions/global.json`
- `locales/en.json`

Andere bestanden mogen optioneel zijn, afhankelijk van beschikbare communities en landen.

**Voorbeeld:**

```json
{
  "files": {
    "config/global.json": { "required": true },
    "chains/global.json": { "required": true },
    "exceptions/global.json": { "required": true },
    "locales/en.json": { "required": true },
    "config/communities/dach.json": { "required": false },
    "config/countries/nl.json": { "required": false }
  }
}
```

## 8. Stable en dev channel

### 8.1 Doel

Het script moet verschillende publicatiekanalen kunnen gebruiken zonder codewijziging.

### 8.2 Stable

`stable` is het standaardkanaal voor reguliere gebruikers.

Kenmerken:

- Gecontroleerde publicatie
- Bedoeld voor algemeen gebruik
- Lagere kans op instabiele data

### 8.3 Dev

`dev` is bedoeld voor maintainers en developers.

Kenmerken:

- Snellere iteratie
- Experimentele of testdata mogelijk
- Geschikt voor validatie van nieuwe config of chains

### 8.4 Richtlijn

Het script kiest standaard stable, tenzij de gebruiker of maintainer expliciet dev selecteert in de settings.

## 9. Cache invalidatie

### 9.1 Doel

Het manifest bepaalt of eerder gecachte data nog bruikbaar is of opnieuw geladen moet worden.

### 9.2 Basisprincipe voor v1

De cache wordt ongeldig wanneer minimaal één van de volgende signalen verandert:

- `channel`
- `version`
- `dataRevision`

### 9.3 Praktisch gedrag

Indien het nieuw geladen manifest dezelfde combinatie heeft van relevante revisiesignalen, mag de runtime bestaande cache hergebruiken.

Indien de signalen verschillen, moet het script relevante bestanden opnieuw proberen op te halen.

### 9.4 Toekomstige uitbreiding

Later kan cache invalidatie verfijnd worden per bestand, bijvoorbeeld via hashes of bestandsspecifieke revisievelden.

## 10. Last-known-good fallback

### 10.1 Doel

Het script moet bruikbaar blijven wanneer het netwerk faalt of wanneer nieuwe data ongeldig blijkt te zijn.

### 10.2 Werking

De runtime mag een eerder succesvol gevalideerde combinatie van:

- `manifest`
- `config`
- `chains`
- `exceptions`
- `locales`

opslaan als last-known-good.

### 10.3 Fallbackvolgorde

Bij problemen geldt de volgende voorkeursvolgorde:

1. Nieuw manifest + nieuw bestand, indien succesvol gevalideerd
2. Nieuw manifest + last-known-good bestand, indien nieuw bestand ongeldig of onbereikbaar is
3. Last-known-good manifest + last-known-good bestanden
4. Minimale globale defaults in script, indien echt niets bruikbaar is

### 10.4 Richtlijn

Een corrupt of onvolledig manifest mag het script niet laten crashen.

## 11. Verwachte runtime-flow

De manifestflow in runtime is als volgt:

1. Bepaal actief kanaal
2. Laad bijbehorend manifest
3. Valideer manifeststructuur
4. Vergelijk revisiesignalen met cache
5. Bepaal welke bestanden opnieuw geladen moeten worden
6. Laad vereiste bestanden
7. Valideer bestanden
8. Sla geldige resultaten op als cache en last-known-good
9. Ga verder met config-resolutie en runtime-merge

## 12. Voorbeeld stable manifest

```json
{
  "channel": "stable",
  "version": "0.1.0",
  "generatedAt": "2026-03-10T00:00:00Z",
  "dataRevision": "initial",
  "files": {
    "config/global.json": {
      "required": true
    },
    "config/communities/dach.json": {
      "required": false
    },
    "config/countries/nl.json": {
      "required": false
    },
    "chains/global.json": {
      "required": true
    },
    "exceptions/global.json": {
      "required": true
    },
    "locales/en.json": {
      "required": true
    }
  }
}
```

## 13. Voorbeeld dev manifest

```json
{
  "channel": "dev",
  "version": "0.1.0-dev",
  "generatedAt": "2026-03-10T00:00:00Z",
  "dataRevision": "initial-dev",
  "files": {
    "config/global.json": {
      "required": true
    },
    "config/communities/dach.json": {
      "required": false
    },
    "config/countries/nl.json": {
      "required": false
    },
    "chains/global.json": {
      "required": true
    },
    "exceptions/global.json": {
      "required": true
    },
    "locales/en.json": {
      "required": true
    }
  }
}
```

## 14. Voorbereiding op compatibiliteit tussen script en data

Voor v1 is compatibiliteit nog functioneel eenvoudig gehouden, maar het manifestmodel moet voorbereid zijn op uitbreiding.

Later kunnen bijvoorbeeld de volgende velden worden toegevoegd:

- `schemaVersion`
- `minScriptVersion`
- `maxScriptVersion`
- `requiredFeatures`
- `deprecatedFeatures`

Voorbeeld van een mogelijke latere uitbreiding:

```json
{
  "schemaVersion": 1,
  "minScriptVersion": "0.1.0"
}
```

Deze velden zijn nog geen harde v1-eis, maar het ontwerp moet ze niet blokkeren.

## 15. Validatievereisten

Een geldig manifest voor v1 moet minimaal voldoen aan:

- Geldige channel waarde
- Niet-lege version
- Geldige ISO timestamp in generatedAt
- Niet-lege dataRevision
- Aanwezig files object
- Per file entry minimaal een boolean required

Indien een manifest hier niet aan voldoet, moet de runtime dit zien als ongeldig.

## 16. Fouten en degradatiegedrag

Bij manifestproblemen moet de runtime duidelijk en veilig degraderen.

### 16.1 Voorbeelden van fouten

- Manifest niet bereikbaar
- JSON corrupt
- Ontbrekende verplichte velden
- Ongeldig kanaal
- Files map ontbreekt

### 16.2 Verwacht gedrag

In zulke gevallen moet het script:

- Fout loggen
- Debug-info beschikbaar maken
- Last-known-good proberen
- Zo nodig minimale globale fallback gebruiken
- Niet crashen

## 17. Richtlijnen voor maintainers

Bij het aanpassen van manifesten gelden de volgende regels:

- Houd het manifest klein
- Wijzig dataRevision wanneer de publiceerde dataset inhoudelijk verandert
- Gebruik stable alleen voor gecontroleerde publicaties
- Gebruik dev voor experimentele of testdata
- Markeer alleen echt noodzakelijke bestanden als required
- Verwijder entries niet stilzwijgend zonder te controleren wat runtime verwacht

## 18. Wat v1 nog niet volledig vereist

Deze onderdelen zijn voorbereid maar nog geen harde v1-verplichting:

- Hashes per bestand
- Automatische gegenereerde manifesten via CI
-Compatibiliteitsblokkades tussen script- en data-versies
- Content signatures
- Per-file cache TTL
-Differentiële updates

## 19. Samenvatting

Het manifestmodel van WME Place Harmonizer ROW Edition is ontworpen als een klein, stabiel en veilig laadpunt voor publieke community-data.

De kern van het manifest is:

- Kanaalidentiteit
- Datasetversie
- Revisiesignaal
- Bekende bestanden
- Required versus optional bestanden

Voor v1 ondersteunt dit model:

- Stable/dev channel switching
- Basis cache invalidatie
- Last-known-good fallback
- Veilige public GitHub loading
- Voorbereiding op latere hashes en compatibiliteitscontrole