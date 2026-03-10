# WME Place Harmonizer ROW Edition — Exceptions Model

## 1. Doel van dit document

Dit document beschrijft het datamodel voor exceptions binnen WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- Wat exceptions zijn
- Wanneer een uitzondering in exceptions hoort
- Hoe exceptions worden opgeslagen
- Hoe exceptions worden gescoped
- Hoe exceptions rules, issues en voorstellen kunnen beïnvloeden
- Hoe exceptions zich verhouden tot chains, config en lokale whitelist

Dit document beschrijft het functionele model. De technische validatie volgt later in JSON schema’s.

---

## 2. Wat is een exception?

Een exception is een expliciet vastgelegde uitzondering op de normale harmonisatie- of validatielogica.

Exceptions bestaan om situaties te modelleren waarin de standaardregels bewust niet of anders moeten gelden.

**Voorbeelden:**

- Een specifieke venue met afwijkende officiële naam
- Een chain-locatie met lokaal verplichte afwijkende categorie
- Een tijdelijke uitzondering wegens verbouwing, herbranding of overgangssituatie
- Een community-specifieke uitzondering op een globale standaard
- Een bekende edge case die niet generiek genoeg is voor een chain of config-regel

---

## 3. Wanneer hoort iets in exceptions?

### 3.1 Gebruik exceptions voor

- Venue-specifieke uitzonderingen
- Lokaal afwijkende situaties
- Tijdelijke uitzonderingen
- Edge cases die niet generiek genoeg zijn voor chains
- Uitzonderingen op rule-uitkomsten
- Uitzonderingen die door meerdere editors gedeeld moeten worden via GitHub

### 3.2 Gebruik géén exceptions voor

- Algemene formatteringsregels
- Standaard chain-herkenning
- Land- of community-brede standaarden
- Lokale persoonlijke voorkeuren van één editor
- Tijdelijke onderdrukking die alleen op één machine nodig is

### 3.3 Waar hoort het dan wel?

- **Algemene standaarden** → `config`
- **Ketenlogica** → `chains`
- **Lokale editor-specifieke suppressie** → `whitelist`
- **Venue- of case-specifieke gedeelde uitzondering** → `exceptions`

---

## 4. Dataset-structuur

Exceptions worden opgeslagen in aparte datasets.

**Voorbeeldlocaties:**

```text
exceptions/global.json
exceptions/communities/dach.json
exceptions/countries/nl.json
```

Elke dataset bevat:

- Top-level metadata
- Een lijst met items

### 4.1 Minimale datasetstructuur

**Voorbeeld:**

```json
{
  "id": "global-exceptions",
  "type": "exception-dataset",
  "version": 1,
  "items": []
}
```

---

## 5. Principes van het exceptionmodel

Het exceptionmodel is gebaseerd op de volgende principes:

- Exceptions zijn expliciet, niet impliciet
- Exceptions zijn zo specifiek mogelijk
- Exceptions vervuilen chains en config niet
- Exceptions zijn deelbaar via GitHub
- Exceptions mogen rules of voorstellen aanpassen, maar niet de basisarchitectuur omzeilen
- Exceptions zijn bedoeld voor community-kennis, niet voor persoonlijke editorvoorkeuren
- Lokale whitelist blijft een apart mechanisme

---

## 6. Soorten exceptions

Voor v1 onderscheiden we functioneel de volgende soorten:

- **place-exception**
- **chain-exception**
- **rule-exception**
- **temporary-exception**

Niet alle soorten hoeven direct anders geïmplementeerd te worden, maar ze helpen het model te structureren.

### 6.1 Place exception

Een uitzondering voor één specifieke place of venue.

### 6.2 Chain exception

Een uitzondering voor een specifieke chain binnen een bepaalde scope.

### 6.3 Rule exception

Een uitzondering die één of meer rules onderdrukt of aanpast.

### 6.4 Temporary exception

Een uitzondering met tijdelijke of review-gevoelige status.

---

## 7. Aanbevolen top-level velden van een exception record

Een exception record bevat idealiter:

- id
- type
- scope
- match
- effect
- meta

### 7.1 id

Stabiele unieke identifier van de uitzondering.

**Voorbeelden:**

- nl-amsterdam-shell-001
- dach-mcdonalds-rebrand-berlin
- global-special-case-001

### 7.2 type

Geeft het exceptiontype aan.

**Aanbevolen waarden voor v1:**

- place-exception
- chain-exception
- rule-exception
- temporary-exception

### 7.3 scope

Beschrijft waar de uitzondering geldt.

### 7.4 match

Beschrijft hoe de uitzondering wordt herkend.

### 7.5 effect

Beschrijft wat de uitzondering doet.

### 7.6 meta

Bevat beschrijvende en onderhoudsgerichte informatie.

---

## 8. Scope

### 8.1 Doel

De scope bepaalt op welk niveau een uitzondering geldig is.

### 8.2 Voorbeelden

- **Globale scope**
  ```json
  {
    "scope": {
      "level": "global"
    }
  }
  ```
- **Community-scope**
  ```json
  {
    "scope": {
      "level": "community",
      "communities": ["dach"]
    }
  }
  ```
- **Country-scope**
  ```json
  {
    "scope": {
      "level": "country",
      "countries": ["nl"]
    }
  }
  ```
- **Venue-gebonden scope**
  ```json
  {
    "scope": {
      "level": "country",
      "countries": ["nl"]
    }
  }
  ```

### 8.3 Richtlijn

Maak de scope nooit breder dan nodig.

---

## 9. Match

### 9.1 Doel

Het match object bepaalt wanneer een exception op een place van toepassing is.

### 9.2 Mogelijke matchvelden

Afhankelijk van het exceptiontype kunnen onder andere worden gebruikt:

- placeIds
- chainIds
- names
- aliases
- regex
- categories
- brands
- country
- state
- customTags

Niet alle velden hoeven in v1 direct ondersteund te worden, maar het model mag ze wel beschrijven.

### 9.3 Richtlijn

Gebruik de meest specifieke matchmethode die beschikbaar is.

**Voorkeursvolgorde:**

- placeIds
- chainIds gecombineerd met scope
- naam/regex-gebaseerde matching

### 9.4 Voorbeeld place match

```json
{
  "match": {
    "placeIds": ["123456789"]
  }
}
```

### 9.5 Voorbeeld chain match

```json
{
  "match": {
    "chainIds": ["mcdonalds"]
  }
}
```

---

## 10. Effect

### 10.1 Doel

Het effect object beschrijft wat de uitzondering doet wanneer deze matcht.

### 10.2 Mogelijke effecten

Voor v1 voorzien we functioneel de volgende soorten effecten:

- suppress rule
- suppress field proposal
- downgrade severity
- provide note
- override expected value
- mark as allowed deviation

### 10.3 Voorbeelden

- **Rule suppressie**
  ```json
  {
    "effect": {
      "suppressRules": ["phoneValidation"]
    }
  }
  ```
- **Veldvoorstel onderdrukken**
  ```json
  {
    "effect": {
      "suppressFields": ["phone"]
    }
  }
  ```
- **Severity aanpassen**
  ```json
  {
    "effect": {
      "severityOverrides": {
        "categoryValidation": "warning"
      }
    }
  }
  ```
- **Toegestane afwijking**
  ```json
  {
    "effect": {
      "allowDeviation": {
        "field": "name",
        "reason": "Official local branding differs from global standard"
      }
    }
  }
  ```

### 10.4 Richtlijn

Een exception moet zo weinig mogelijk doen om het gewenste resultaat te bereiken.

---

## 11. Meta

### 11.1 Doel

Het meta object bevat onderhouds- en contextinformatie.

### 11.2 Aanbevolen velden

- description
- reason
- notes
- createdBy
- reviewNeeded
- reviewAfter
- ticket
- source

### 11.3 Voorbeeld

```json
{
  "meta": {
    "description": "Official venue name differs from chain standard",
    "reason": "Local branding agreement",
    "reviewNeeded": true
  }
}
```

### 11.4 Richtlijn

Gebruik meta om uitzonderingen uitlegbaar en onderhoudbaar te maken.

---

## 12. Tijdelijke uitzonderingen

Sommige uitzonderingen zijn bewust tijdelijk.

### 12.1 Voorbeelden

- verbouwing
- rebranding in overgangsfase
- tijdelijke categorie-afwijking
- incomplete data die later wordt opgeschoond

### 12.2 Modellering

Voor tijdelijke uitzonderingen kan bijvoorbeeld worden gebruikt:

```json
{
  "type": "temporary-exception",
  "meta": {
    "reviewNeeded": true,
    "reviewAfter": "2026-06-01"
  }
}
```

### 12.3 Richtlijn

Gebruik tijdelijke uitzonderingen alleen wanneer duidelijk is dat herbeoordeling nodig is.

---

## 13. Relatie met whitelist

Exceptions en whitelist lijken op elkaar, maar hebben een ander doel.

### 13.1 Exceptions

- Gedeeld via GitHub
- Community-breed
- Onderdeel van de publieke dataset
- Bedoeld voor gedeelde standaarden en edge cases

### 13.2 Whitelist

- Lokaal opgeslagen
- Editor-specifiek
- Niet gedeeld via GitHub
- Bedoeld voor persoonlijke suppressie van waarschuwingen

### 13.3 Beslisregel

Als meerdere editors dezelfde uitzondering nodig hebben, hoort deze meestal in exceptions.

Als alleen één editor lokaal een waarschuwing wil verbergen, hoort dit in whitelist.

---

## 14. Relatie met chains

Exceptions mogen chain-logica aanvullen, maar moeten die niet vervangen.

### 14.1 Gebruik chains voor

- Canonieke ketendefinities
- Algemene herkenning
- Algemene standaardisatie
- Generiek policy-gedrag

### 14.2 Gebruik exceptions voor

- Venue-specifieke afwijking op een chain
- Lokaal uitzondering op een ketenstandaard
- Tijdelijke afwijking van een ketenstandaard

### 14.3 Richtlijn

Voorkom dat venue-specifieke afwijkingen in het chain-record zelf terechtkomen.

---

## 15. Relatie met config

Config definieert de standaardregels.
Exceptions definiëren wanneer die standaardregels bewust niet normaal moeten uitpakken.

### 15.1 Gebruik config voor

- Enabled/disabled rules
- Formatting standards
- Matching behavior defaults
- Highlighting defaults

### 15.2 Gebruik exceptions voor

- Uitzonderingen op deze standaard

---

## 16. Merge en overrides

Exceptions worden net als chains idealiter gemerged via:

- **keyedMerge**
- **key = id**

Hierdoor kunnen uitzonderingen per community of country worden aangevuld of verfijnd zonder volledige duplicatie van datasets.

### 16.1 Richtlijn

Gebruik unieke en stabiele IDs zodat merge-gedrag voorspelbaar blijft.

---

## 17. Voorbeeld exception record — place exception

```json
{
  "id": "nl-shell-amsterdam-official-name",
  "type": "place-exception",
  "scope": {
    "level": "country",
    "countries": ["nl"]
  },
  "match": {
    "placeIds": ["123456789"]
  },
  "effect": {
    "allowDeviation": {
      "field": "name",
      "reason": "Official legal venue name differs from normal chain format"
    },
    "suppressRules": ["nameNormalization"]
  },
  "meta": {
    "description": "Official venue-specific naming exception",
    "reviewNeeded": false
  }
}
```

---

## 18. Voorbeeld exception record — chain exception

```json
{
  "id": "dach-mcdonalds-phone-suppression",
  "type": "chain-exception",
  "scope": {
    "level": "community",
    "communities": ["dach"]
  },
  "match": {
    "chainIds": ["mcdonalds"]
  },
  "effect": {
    "suppressRules": ["phoneValidation"]
  },
  "meta": {
    "description": "Temporary suppression while DACH phone policy is under review",
    "reviewNeeded": true,
    "reviewAfter": "2026-07-01"
  }
}
```

---

## 19. Verwachte rol in runtime

In runtime wordt exception-data gebruikt voor:

- Controleren of een place of chain een bekende uitzondering heeft
- Suppressie van rules of voorstellen
- Aanpassen van severity
- Tonen van context in debug of UI
- Voorkomen dat gedeelde edge cases steeds lokaal gewhitelist moeten worden

De exceptionlaag wordt toegepast nadat de basisconfig en chain-match bekend zijn, maar vóór definitieve issue- en proposal-output aan de gebruiker wordt getoond.

---

## 20. Wat v1 nog niet volledig vereist

De volgende onderdelen mogen voorbereid zijn, maar zijn nog geen harde v1-verplichting:

- Complexe conditionele exceptions
- Datumgedreven automatische expiratie
- Geavanceerde prioritering tussen overlappende exceptions
- Negatieve exceptions op subveldniveau
- Automatische migratie van verlopen exceptions

---

## 21. Ontwerpregels voor maintainers

Bij het toevoegen van exceptions gelden de volgende regels:

- Maak exceptions zo specifiek mogelijk
- Gebruik place IDs waar mogelijk
- Gebruik chain-brede exceptions alleen als de afwijking echt breed geldt
- Houd tijdelijke uitzonderingen herkenbaar en reviewbaar
- Documenteer het waarom in meta
- Zet persoonlijke voorkeuren niet in exceptions
- Zet generieke regels niet in exceptions

---

## 22. Samenvatting

Het exceptionmodel van WME Place Harmonizer ROW Edition is ontworpen om gedeelde, expliciete uitzonderingen op de standaardlogica te modelleren.

De kern van een exception-record is:

- id + type + scope + match + effect + meta

Dit model zorgt ervoor dat:

- Chains schoon blijven
- Config generiek blijft
- Edge cases deelbaar worden
- Lokale whitelist een aparte rol behoudt
- Community-kennis beheersbaar en uitlegbaar blijft