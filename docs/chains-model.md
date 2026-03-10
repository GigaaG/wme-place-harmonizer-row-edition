# WME Place Harmonizer ROW Edition — Chains Model

## 1. Doel van dit document

Dit document beschrijft het datamodel voor chains binnen WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- Hoe chain records worden opgeslagen
- Hoe herkenning werkt
- Hoe standaardisatie en policy worden gemodelleerd
- Hoe global, community en country chain-data samenwerken
- Hoe lokale afwijkingen mogelijk zijn zonder duplicatie van de volledige chain-definitie

Dit document beschrijft het functionele model. De technische validatie volgt later in JSON schema’s.

---

## 2. Wat is een chain?

Een chain is een herkenbare merk- of ketendefinitie die door de community gebruikt wordt om Places consistent te analyseren en te harmoniseren.

**Voorbeelden van chains zijn:**

- McDonald's
- Shell
- IKEA
- Starbucks
- BP

Een chain kan gebruikt worden voor:

- Herkenning van fout gespelde of inconsistent ingevoerde namen
- Voorstellen voor canonieke naamgeving
- Voorstellen voor categorieën
- Formatteringsbeleid
- Chain-specifieke standaarden
- Aanbevelingen voor lock level of services
- Community-specifieke uitzonderingen

---

## 3. Dataset-structuur

Chain-data wordt opgeslagen in aparte datasets.

**Voorbeeldlocaties:**

```text
chains/global.json
chains/communities/dach.json
chains/countries/nl.json
```

Elke dataset bevat:

- Top-level metadata
- Een lijst met items
- Optioneel dataset-specifieke merge- of broninformatie

### 3.1 Minimale datasetstructuur

**Voorbeeld:**

```json
{
  "id": "global-chains",
  "type": "chain-dataset",
  "version": 1,
  "items": []
}
```

## 4. Principes van het chainmodel

Het chainmodel is gebaseerd op de volgende principes:

- Eén canonieke chain-identiteit per keten
- Scheiding tussen herkenning, standaardisatie en policy
- Globale herkenning mogelijk, lokale formattering toegestaan
- Community- en country-overrides zonder onnodige duplicatie
- Alle alternatieve schrijfwijzen worden in data vastgelegd, niet in scriptcode
- De matcher werkt config-driven
- Chain-data leidt tot voorstellen, niet tot automatische mutaties

## 5. Opbouw van een chain record

Een chain record bestaat conceptueel uit vijf delen:

- Identiteit
- Match-definitie
- Standaardisatie
- Policy
- Scope

## 6. Identiteit

De identiteit van een chain beschrijft welke keten het record representeert.

### 6.1 Verplichte velden

Minimaal aanbevolen:

- id
- canonicalName

### 6.2 Voorbeeld
```json
{
  "id": "mcdonalds",
  "canonicalName": "McDonald's"
}
```

### 6.3 Richtlijnen

- id moet stabiel blijven
- id moet machine-vriendelijk zijn
- canonicalName is de primaire naam zoals die idealiter door de community gebruikt wordt

## 7. Match-definitie

De match-definitie beschrijft hoe een place aan een chain gekoppeld kan worden.

### 7.1 Doel

De matcher moet tolerant kunnen zijn voor:

- Spelfouten
- Ontbrekende leestekens
- Verschillende schrijfwijzen
- Lokale spellingverschillen
- Afkortingen of alternatieve weergaven

### 7.2 Typische matchvelden

Binnen match kunnen onder andere de volgende velden voorkomen:

- names
- aliases
- regex
- contains
- startsWith
- endsWith
- brands
- categoryAnyOf
- categoryAllOf
- excludedTerms
- synonyms

Niet al deze velden hoeven in v1 al volledig te worden gebruikt, maar het model mag ze wel ondersteunen.

### 7.3 Voorbeeld
```json
{
  "match": {
    "aliases": [
      "mc donalds",
      "mcdonalds",
      "mcdonalds",
      "mcdonald's"
    ],
    "regex": [
      "^mc\\s?donald'?s$"
    ],
    "categoryAnyOf": [
      "FAST_FOOD",
      "RESTAURANT"
    ]
  }
}
```

### 7.4 Richtlijnen

- Gebruik aliases voor bekende varianten
- Gebruik regex alleen waar nodig
- Gebruik category hints om false positives te beperken
- Leg alle belangrijke alternatieve schrijfwijzen vast in data

## 8. Standaardisatie

De standaardisatie beschrijft hoe de place idealiter geformatteerd wordt als een chain-match is gevonden.

### 8.1 Doel

De standaardisatie levert de canonieke of gewenste waarden waartegen een place vergeleken kan worden.

### 8.2 Typische standaardisatievelden

Binnen standard kunnen onder andere voorkomen:

- name
- aliases
- categories
- description
- url
- services
- brand
- ev
- optionalAliases

### 8.3 Voorbeeld
```json
{
  "standard": {
    "name": "McDonald's",
    "categories": ["FAST_FOOD"],
    "brand": "McDonald's"
  }
}
```

### 8.4 Richtlijnen

- Zet alleen canonieke standaardwaarden in standard
- Landspecifieke formatteringsverschillen horen bij voorkeur in config/policy, niet in de globale standaardisatie
- Standard beschrijft het gewenste eindbeeld, niet de volledige apply-logica

## 9. Policy

De policy beschrijft community- of landafhankelijke normen die voor een chain gelden, zonder de canonieke chain-identiteit te veranderen.

### 9.1 Doel

Hiermee kan een community afspreken dat:

- Een chain meestal point of area moet zijn
- Een aanbevolen lock level geldt
- Services verwacht worden
- Bepaalde velden optioneel of verplicht zijn
- Formattering deels per land verschilt

### 9.2 Typische policyvelden

Binnen policy kunnen bijvoorbeeld voorkomen:

- geometry
- lockLevel
- requirePhone
- requireUrl
- aliasPolicy
- urlPolicy
- phonePolicy
- servicePolicy
- evPolicy

### 9.3 Voorbeeld
```json
{
  "policy": {
    "geometry": "point",
    "lockLevel": 3,
    "requirePhone": true,
    "requireUrl": false
  }
}
```

### 9.4 Richtlijnen

- Policy mag lokaal worden overschreven
- Policy beschrijft normen en verwachtingen
- Policy bepaalt niet dat een wijziging automatisch moet worden opgeslagen

## 10. Scope

De scope bepaalt waar een chain record van toepassing is.

### 10.1 Voorbeelden
```json
{
  "scope": {
    "level": "global"
  }
}
{
  "scope": {
    "level": "community",
    "communities": ["dach"]
  }
}
{
  "scope": {
    "level": "country",
    "countries": ["nl"]
  }
}
```

### 10.2 Gebruik

De scope wordt gebruikt om:

- Te bepalen welke chain-records relevant zijn
- Debug-info te tonen
- Globale records lokaal te overrulen
- Conflictsituaties op te lossen

## 11. Merge en overrides

### 11.1 Doel

Een globale chain moet kunnen worden herkend in alle landen, maar een community of land moet specifieke onderdelen kunnen aanpassen.

### 11.2 Aanpak

Chain-datasets worden bij voorkeur gemerged via:

- keyedMerge
- key = id

Daardoor kan een lokaal record met hetzelfde id alleen de relevante delen overschrijven.

### 11.3 Voorbeeld

Globaal record:

```json
{
  "id": "mcdonalds",
  "canonicalName": "McDonald's",
  "standard": {
    "name": "McDonald's"
  }
}
```

Lokale override:

```json
{
  "id": "mcdonalds",
  "policy": {
    "phonePolicy": {
      "countryFormat": "national"
    }
  }
}
```

### 11.4 Resultaat

De chain-identiteit blijft hetzelfde, maar de lokale community of het land kan aanvullende formattering of policy definiëren.

## 12. Global recognition, local formatting

Dit project gebruikt bewust een hybride model.

### 12.1 Principe

- Herkenning mag globaal plaatsvinden
- Formattering en policy mogen lokaal verschillen

### 12.2 Voorbeeld

Een globale chain-definitie herkent Shell in veel landen, maar:

- Telefoonformattering verschilt per land
- URL-structuren kunnen verschillen
- Lock levels kunnen per community verschillen
- Aliases kunnen lokaal aanvullend zijn

### 12.3 Ontwerpgevolg

Daarom moeten match, standard en policy los van elkaar gemodelleerd worden.

## 13. Aanbevolen top-level structuur van een chain record

Een chain record bevat idealiter:

- id
- canonicalName
- match
- standard
- policy
- scope
- meta

### 13.1 Voorbeeld
```json
{
  "id": "mcdonalds",
  "canonicalName": "McDonald's",
  "match": {
    "aliases": [
      "mc donalds",
      "mcdonalds",
      "mcdonalds"
    ],
    "regex": [
      "^mc\\s?donald'?s$"
    ],
    "categoryAnyOf": [
      "FAST_FOOD",
      "RESTAURANT"
    ]
  },
  "standard": {
    "name": "McDonald's",
    "categories": ["FAST_FOOD"],
    "brand": "McDonald's"
  },
  "policy": {
    "geometry": "point",
    "lockLevel": 3
  },
  "scope": {
    "level": "global"
  },
  "meta": {
    "description": "Global chain definition for McDonald's"
  }
}
```

## 14. Meta

Het meta object bevat beschrijvende en onderhoudsgerichte informatie.

Voorbeelden:

- description
- notes
- source
- maintainerHints

Voorbeeld:

```json
{
  "meta": {
    "description": "Shared global chain definition",
    "notes": "Local phone formatting should be handled in country policy"
  }
}
```

## 15. Gebruik van aliases

Aliases zijn essentieel voor dit project.

### 15.1 Richtlijnen

- Sla veelvoorkomende foutieve schrijfwijzen expliciet op
- Voeg lokale varianten toe waar relevant
- Gebruik aliases voor herkenning, niet automatisch als eindwaarde
- Canonieke output wordt bepaald door standard.name

### 15.2 Voorbeelden

Geschikt voor aliases:

- mc donalds
- mcdonalds
- ikea store
- Lokale merknotaties zonder leestekens

## 16. Gebruik van regex

Regex kan krachtig zijn, maar moet beperkt en gecontroleerd worden ingezet.

### 16.1 Richtlijnen

- Gebruik regex alleen voor herkenningspatronen die lastig als alias te modelleren zijn
- Houd regex leesbaar en onderhoudbaar
- Combineer regex waar mogelijk met category hints of excluded terms
- Voorkom brede regex die false positives veroorzaken

## 17. Category hints en false positives

Category hints helpen om verkeerde matches te voorkomen.

### 17.1 Voorbeeld

Een ketennaam kan generiek zijn of ook als los woord voorkomen.
Daarom kan een match-definitie bijvoorbeeld eisen dat de place minstens één relevante categorie bevat.

### 17.2 Voorbeeld
```json
{
  "match": {
    "aliases": ["shell"],
    "categoryAnyOf": ["GAS_STATION"]
  }
}
```

Dit voorkomt dat elk gebruik van het woord “shell” automatisch als tankstationketen wordt gezien.

## 18. Closed chains en inactieve chains

Sommige chains bestaan niet meer of zijn lokaal gesloten.

### 18.1 Aanpak

Voor v1 kunnen hiervoor twee patronen worden gebruikt:

- Opnemen in policy
- Opnemen in exceptions

### 18.2 Voorbeeld
```json
{
  "policy": {
    "status": "closed-chain"
  }
}
```

### 18.3 Richtlijn

Gebruik dit alleen wanneer de community daar expliciet regels voor wil afdwingen.

## 19. Relatie met exceptions

Niet elke afwijking hoort in de chain-definitie.

### 19.1 Gebruik chains voor

- Herkenning
- Canonieke standaard
- Generieke policy

### 19.2 Gebruik exceptions voor

- Specifieke venues
- Lokale uitzonderingen
- Tijdelijke afwijkingen
- Edge cases die niet generiek genoeg zijn voor de chain

### 19.3 Richtlijn

Voorkom dat chain-records vervuild raken met venue-specifieke uitzonderingen.

## 20. Verwachte rol in runtime

In runtime wordt chain-data gebruikt voor:

- Matcher input
- Voorstel voor canonieke naam
- Voorstel voor categorie- of brand-harmonisatie
- Policy checks zoals lock level of geometry-signalen
- Debug-info over matchbron en scope

## 21. Wat v1 nog niet volledig vereist

De volgende onderdelen mogen in het model voorbereid zijn, maar zijn nog geen harde v1-eis voor implementatie:

- Geavanceerde scorer of confidence tuning in data
- Complexe negatieve matchregels
- Conditionele chain-policy op subregionaal niveau
- Uitgebreide EV-specificaties
- Automatische conflictresolutie tussen meerdere sterke matches

## 22. Ontwerpregels voor maintainers

Bij het toevoegen van chain-data gelden de volgende regels:

- Gebruik stabiele id waarden
- Leg canonieke naam altijd expliciet vast
- Houd globale chain-definities zo generiek mogelijk
- Zet lokale afwijkingen in community- of country-datasets
- Gebruik aliases voor herkenning, niet als canonieke output
- Gebruik regex spaarzaam
- Gebruik category hints om false positives te beperken
- Zet venue-specifieke uitzonderingen in exceptions, niet in chains

## 23. Samenvatting

Het chainmodel van WME Place Harmonizer ROW Edition is ontworpen als een hybride model waarin:

- Chain-identiteit centraal en stabiel blijft
- Herkenning data-driven is
- Standaardisatie los staat van policy
- Globale herkenning gecombineerd kan worden met lokale formattering
- Community- en country-overrides mogelijk zijn zonder duplicatie van de volledige definitie

De kernstructuur van een chain-record is:

- identity + match + standard + policy + scope + meta

Dit model ondersteunt de ROW-behoefte om veel schrijfvarianten te herkennen, terwijl communities toch hun eigen formatterings- en beleidsregels kunnen hanteren.