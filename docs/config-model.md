# WME Place Harmonizer ROW Edition — Configuration Model

## 1. Doel van dit document

Dit document beschrijft het configuratiemodel voor WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- Welke soorten configuratiebestanden bestaan
- Welke velden daarin voorkomen
- Hoe inheritance werkt
- Hoe merge-strategieën worden toegepast
- Hoe communities en landen aan elkaar gekoppeld worden
- Welke aannames de userscript-runtime over configuratie mag maken

Dit document beschrijft het model op functioneel en structureel niveau. De exacte machine-validatie wordt later vastgelegd in JSON schema’s.

---

## 2. Configuratiebestandstypen

Binnen de data-repository worden de volgende configuratietypen onderscheiden:

- `global-config`
- `community-config`
- `country-config`
- `state-config`

Niet elk niveau is verplicht aanwezig.

### 2.1 Global config

Het globale configuratiebestand bevat de basisdefaults voor alle communities en landen.

**Voorbeeldlocatie:**

`config/global.json`

### 2.2 Community config

Een community-config bevat regels en defaults die voor meerdere landen of een grotere community-groep gelden.

**Voorbeeldlocatie:**

`config/communities/dach.json`

### 2.3 Country config

Een country-config bevat land-specifieke regels, formattering en overrides.

**Voorbeeldlocatie:**

`config/countries/nl.json`

### 2.4 State config

Een state-config bevat optionele subnationale overrides, bijvoorbeeld voor een Duitse deelstaat of een regionale community.

**Voorbeeldlocatie:**

`config/states/de-bw.json`

State-config wordt in de architectuur voorbereid, maar is geen harde v1-eis voor runtime-gebruik.

## 3. Configuratiehiërarchie

De beoogde hiërarchie is:

```
global
→ community
→ country
→ state
```

Lagere niveaus kunnen hogere niveaus overschrijven of uitbreiden.

### 3.1 Resolutievolgorde

De runtime-resolutie verloopt in principe als volgt:

1. Laad global config
2. Laad community config indien van toepassing
3. Laad country config
4. Laad state config indien van toepassing
5. Merge alle configuraties in vaste volgorde

### 3.2 Leidend niveau

Voor v1 geldt:

- Place country is leidend indien beschikbaar
- Anders wordt map/editor-context gebruikt
- Bij onvoldoende zekerheid mag handmatige fallback plaatsvinden

## 4. Verplichte top-level velden

Elk configuratiebestand bevat minimaal de volgende top-level velden:

- `id`
- `type`
- `version`
- `meta`

### 4.1 id

Unieke identifier van het configuratiebestand.

**Voorbeelden:**

- `global`
- `dach`
- `nl`
- `de-bw`

### 4.2 type

Geeft het configuratietype aan.

**Toegestane waarden:**

- `global-config`
- `community-config`
- `country-config`
- `state-config`

### 4.3 version

Numerieke versie van de configuratiestructuur.

Voor v1 gebruiken we:

```json
{
  "version": 1
}
```

### 4.4 meta

Bevat beschrijvende metadata.

**Minimaal aanbevolen velden:**

- `name`
- `description`

**Voorbeeld:**

```json
{
  "meta": {
    "name": "Netherlands",
    "description": "Country-specific rules for the Netherlands"
  }
}
```

## 5. Optionele top-level velden

Een configuratiebestand kan daarnaast de volgende velden bevatten:

- `extends`
- `scope`
- `defaults`
- `formatting`
- `matching`
- `highlighting`
- `rules`
- `mergeStrategies`

Niet elk type config hoeft al deze velden te bevatten.

## 6. extends

### 6.1 Doel

Het `extends` veld geeft aan van welke bovenliggende configuratie het bestand erft.

### 6.2 Toegestane patronen

Voor v1 ondersteunen we functioneel de volgende vormen:

- `"global"`
- `"community:<id>"`
- `"country:<id>"`
- `"state:<id>"`

**Voorbeelden:**

```json
{
  "extends": "global"
}
{
  "extends": "community:dach"
}
```

### 6.3 Verwacht gebruik per type

Gebruik per type:

- `community-config` extends meestal `global`
- `country-config` extends meestal `global` of `community:<id>`
- `state-config` extends meestal `country:<id>`

### 6.4 Beperkingen

Voor v1 gelden de volgende beperkingen:

- Slechts één directe parent per configuratiebestand
- Geen meervoudige inheritance
- Geen circulaire inheritance
- Runtime moet een duidelijke fout tonen bij ongeldige inheritance

## 7. scope

### 7.1 Doel

Het scope veld beschrijft op welk geografisch of logisch domein de configuratie van toepassing is.

### 7.2 Voorbeelden

Community-config
```json
{
  "scope": {
    "countries": ["de", "at", "ch"]
  }
}
```

Country-config
```json
{
  "scope": {
    "country": "nl"
  }
}
```

State-config
```json
{
  "scope": {
    "country": "de",
    "state": "bw"
  }
}
```

### 7.3 Gebruik

Het script gebruikt scope voor:

- Config-resolutie
- Debug-weergave
- Validatie van inheritance en consistentie

## 8. defaults

### 8.1 Doel

Het defaults object bevat algemene standaardwaarden die door de runtime en UI gebruikt kunnen worden.

### 8.2 Voorbeelden van toegestane inhoud

- Standaard locale
- Country-resolution voorkeuren
- UI defaults
- Matching defaults

**Voorbeeld:**

```json
{
  "defaults": {
    "locale": "nl",
    "countryResolution": {
      "preferPlaceCountry": true,
      "fallbackToMapContext": true,
      "allowManualFallback": true
    },
    "ui": {
      "showDebugTab": false,
      "defaultChannel": "stable"
    }
  }
}
```

### 8.3 Richtlijn

Plaats alleen echt generieke defaults in dit veld.
Rule-specifieke instellingen horen onder rules.

## 9. formatting

### 9.1 Doel

Het formatting object bevat formatteringsconventies die per land of community kunnen verschillen.

### 9.2 Voorbeelden

- Telefoonnotatie
- URL-beleid
- Naamgevingsvoorkeuren
- Alias-beleid

**Voorbeeld:**

```json
{
  "formatting": {
    "phone": {
      "countryCode": "+31",
      "formatStyle": "national"
    }
  }
}
```

### 9.3 Richtlijn

formatting beschrijft hoe iets er idealiter uit moet zien, niet of een wijziging automatisch toegepast moet worden.

## 10. matching

### 10.1 Doel

Het matching object bevat instellingen die de matching engine kan gebruiken.

### 10.2 Voorbeelden

- Case-insensitive matching
- Whitespace normalisatie
- Punctuation stripping
- Synoniemen
- Matcher thresholds

**Voorbeeld:**

```json
{
  "matching": {
    "caseInsensitive": true,
    "normalizeWhitespace": true,
    "stripCommonPunctuation": true,
    "synonyms": ["centre", "center"]
  }
}
```

### 10.3 Richtlijn

Structurele matching-voorkeuren horen hier thuis.
Concrete chain-data hoort in de chain-datasets.

## 11. highlighting

### 11.1 Doel

Het highlighting object bevat logische statusinstellingen voor kaartmarkeringen.

**Voorbeeld:**

```json
{
  "highlighting": {
    "statuses": {
      "ok": "green",
      "warning": "orange",
      "error": "red",
      "whitelisted": "blue",
      "unknown": "gray"
    }
  }
}
```

### 11.2 Richtlijn

Gebruik stabiele statusnamen.
De uiteindelijke visuele vertaling naar kleuren kan later in code of config worden aangepast.

## 12. rules

### 12.1 Doel

Het rules object beschrijft welke validatie- en harmonisatieregels actief zijn en hoe ze zich gedragen.

### 12.2 Structuur

Elke rule-key verwijst naar een ruleconfig.

**Voorbeeld:**

```json
{
  "rules": {
    "nameNormalization": {
      "enabled": true,
      "severity": "warning"
    },
    "categoryValidation": {
      "enabled": true,
      "severity": "error"
    }
  }
}
```

### 12.3 Minimale rule-velden voor v1

Per rule zijn voor v1 minimaal de volgende velden voorzien:

- `enabled`
- `severity`

Later kunnen hier velden bijkomen zoals:

- `useGlobal`
- `override`
- `options`
- `scopes`

### 12.4 Severity

Aanbevolen severity-waarden voor v1:

- `info`
- `warning`
- `error`

### 12.5 Richtlijn

Rules bepalen of iets geëvalueerd en gerapporteerd wordt.
Rules bepalen niet zelfstandig dat iets automatisch moet worden opgeslagen.

## 13. mergeStrategies

### 13.1 Doel

mergeStrategies definieert hoe samengestelde objecten en arrays gemerged worden.

### 13.2 Waarom expliciet

Zonder expliciete merge-strategieën wordt gedrag onvoorspelbaar, vooral bij arrays en datasets zoals chains, exceptions en synoniemen.

### 13.3 Ondersteunde strategieën voor v1

- `replace`
- `appendUnique`
- `keyedMerge`

### 13.4 Voorbeelden
```json
{
  "mergeStrategies": {
    "chains.items": {
      "mode": "keyedMerge",
      "key": "id"
    },
    "exceptions.items": {
      "mode": "keyedMerge",
      "key": "id"
    },
    "matching.synonyms": {
      "mode": "appendUnique"
    }
  }
}
```

### 13.5 Richtlijn

Voor v1 geldt:

- Primitives: child overschrijft parent
- Objects: deep merge
- Arrays: alleen volgens expliciete strategie

## 14. Community ↔ country koppeling

### 14.1 Doel

Sommige communities beheren standaarden voor meerdere landen.
Het configuratiemodel moet dit ondersteunen zonder duplicatie.

### 14.2 Aanpak

Een country-config kan erven van een community-config.

**Voorbeeld:**

```json
{
  "id": "de",
  "type": "country-config",
  "extends": "community:dach"
}
```

### 14.3 Gevolg

Hierdoor kunnen gedeelde DACH-regels centraal worden onderhouden, terwijl Duitsland, Oostenrijk en Zwitserland daar elk beperkte land-specifieke overrides bovenop kunnen plaatsen.

### 14.4 Richtlijn

Gebruik een community-config alleen wanneer er daadwerkelijk gedeelde standaarden zijn.
Voorkom kunstmatige tussenlagen zonder inhoudelijke meerwaarde.

## 15. Voorbeeld globale config
```json
{
  "id": "global",
  "type": "global-config",
  "version": 1,
  "meta": {
    "name": "Global Default Configuration",
    "description": "Base defaults for WME Place Harmonizer ROW Edition"
  },
  "defaults": {
    "locale": "en"
  },
  "rules": {
    "nameNormalization": {
      "enabled": true,
      "severity": "warning"
    }
  }
}
```

## 16. Voorbeeld community-config
```json
{
  "id": "dach",
  "type": "community-config",
  "version": 1,
  "extends": "global",
  "meta": {
    "name": "DACH Community",
    "description": "Shared community rules for Germany, Austria and Switzerland"
  },
  "scope": {
    "countries": ["de", "at", "ch"]
  },
  "defaults": {
    "locale": "de"
  }
}
```

## 17. Voorbeeld country-config
```json
{
  "id": "nl",
  "type": "country-config",
  "version": 1,
  "extends": "global",
  "meta": {
    "name": "Netherlands",
    "description": "Country-specific rules for the Netherlands"
  },
  "scope": {
    "country": "nl"
  },
  "defaults": {
    "locale": "nl"
  },
  "formatting": {
    "phone": {
      "countryCode": "+31",
      "formatStyle": "national"
    }
  }
}
```

## 18. Wat v1 nog niet vereist

De volgende onderdelen zijn voorbereid, maar nog geen harde v1-verplichting:

- Volledige state/region runtime-ondersteuning
- Complexe per-rule override-objecten
- Geavanceerde conflictresolutie
- Multi-parent inheritance
- Conditionele config op basis van editorrol
- Server-side configuratiebeheer

## 19. Ontwerpregels voor maintainers

Bij het toevoegen van nieuwe configuratiebestanden gelden de volgende ontwerpregels:

- Houd inheritance zo eenvoudig mogelijk
- Gebruik community-config alleen bij echt gedeeld beheer
- Zet generieke defaults zo hoog mogelijk in de hiërarchie
- Zet land-specifieke formattering alleen in country-config
- Leg uitzonderingen niet vast in config als ze in exceptions thuishoren
- Gebruik stabiele IDs
- Documenteer afwijkende keuzes in docs/

## 20. Samenvatting

Het configuratiemodel van WME Place Harmonizer ROW Edition is ontworpen om:

- Voorspelbaar te zijn
- Herbruikbaar te zijn
- Verschillende community-structuren te ondersteunen
- Veilig te kunnen worden gevalideerd
- Geschikt te zijn voor een GitHub-managed config-first architectuur

De kern is een eenvoudige hiërarchie van:

global → community → country → state

met expliciete inheritance, duidelijke merge-regels en ruimte voor verdere uitbreiding in latere versies.
