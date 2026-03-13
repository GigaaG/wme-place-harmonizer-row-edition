# WME Place Harmonizer ROW Edition — Whitelist Model

## 1. Doel van dit document

Dit document beschrijft het whitelistmodel voor WME Place Harmonizer ROW Edition.

Het doel is om vast te leggen:

- Wat een lokale whitelist is
- Hoe whitelist verschilt van exceptions
- Welke structuur whitelist-data heeft
- Hoe whitelist-entries worden geïdentificeerd
- Hoe export, import en merge werken
- Hoe versioning van whitelist-data werkt
- Welke aannames de runtime over whitelist-data mag maken

Dit document beschrijft het functionele en structurele model. De technische implementatie volgt later in code.

---

## 2. Wat is de whitelist?

De whitelist is een lokaal, editor-specifiek mechanisme waarmee een gebruiker bepaalde issues of voorstellen kan onderdrukken zonder de gedeelde community-data te wijzigen.

De whitelist is bedoeld voor gevallen waarin:

- Een editor bewust een waarschuwing niet meer wil zien
- Een issue lokaal bekend en acceptabel is
- Een afwijking niet breed genoeg is om als GitHub exception vast te leggen
- Tijdelijke persoonlijke suppressie gewenst is

De whitelist is dus geen vervanging van exceptions, maar een aanvullend lokaal mechanisme.

---

## 3. Verschil tussen whitelist en exceptions

### 3.1 Whitelist

- Lokaal opgeslagen
- Editor-specifiek
- Niet gedeeld via GitHub
- Bedoeld voor persoonlijke suppressie
- Onderdeel van de runtime-instellingen van de gebruiker

### 3.2 Exceptions

- Gedeeld via GitHub
- Community-breed
- Onderdeel van de publieke dataset
- Bedoeld voor gedeelde standaarden en edge cases

### 3.3 Beslisregel

Gebruik whitelist wanneer een suppressie alleen lokaal nodig is.

Gebruik exceptions wanneer meerdere editors of een hele community dezelfde uitzondering nodig hebben.

---

## 4. Opslaglocatie

Voor v1 wordt whitelist-data lokaal opgeslagen in `localStorage`.

De whitelist staat los van:

- GitHub-config
- Manifest-data
- Chains
- Exceptions

De whitelist hoort bij de editor/runtime-omgeving van de gebruiker.

---

## 5. Ontwerpprincipes

Het whitelistmodel is gebaseerd op de volgende principes:

- Lokaal en editor-specifiek
- Voldoende specifiek om overmatige suppressie te voorkomen
- Exporteerbaar en importeerbaar
- Mergebaar
- Versieerbaar
- Robuust tegen toekomstige uitbreiding
- Bruikbaar zonder backend
- Losgekoppeld van gedeelde community-data

---

## 6. Wat wordt gewhitelist?

Een whitelist-entry onderdrukt idealiter een specifieke combinatie van:

- place
- rule
- field

Hiermee wordt voorkomen dat een editor per ongeluk te brede suppressie toepast.

### 6.1 Waarom niet alleen place?

Omdat dat te grof is. Een editor wil meestal niet alle waarschuwingen voor een hele place negeren.

### 6.2 Waarom niet alleen rule?

Omdat dat te breed is. Dan zou een rule mogelijk overal verdwijnen.

### 6.3 Voorkeursniveau

Voor v1 is het aanbevolen specificiteitsniveau:

```text
place + rule + field
```

---

## 7. Identiteit van een whitelist-entry

Een whitelist-entry moet stabiel en eenduidig identificeerbaar zijn.

### 7.1 Aanbevolen kernvelden

- `placeId`
- `ruleId`
- `field`

### 7.2 Optionele aanvullende velden

- `chainId`
- `country`
- `reason`
- `createdAt`
- `updatedAt`
- `expiresAt`
- `notes`

### 7.3 Unieke sleutel

De runtime behandelt de combinatie van:

`placeId + ruleId + field`

als primaire unieke sleutel voor v1.

---

## 8. Datastructuur van de whitelist

De whitelist wordt als versieerbaar object opgeslagen.

### 8.1 Aanbevolen top-level structuur

```json
{
  "version": 1,
  "items": []
}
```

### 8.2 Waarom een top-level object?

Zodat later uitbreiding mogelijk blijft, zoals:

- metadata
- migratiestatus
- exportformaat
- checksums
- profile-informatie

---

## 9. Structuur van een whitelist-entry

Een whitelist-entry bevat idealiter:

- `placeId`
- `ruleId`
- `field`
- `scope`
- `createdAt`
- `reason`

### 9.1 Voorbeeld

```json
{
  "placeId": "123456789",
  "ruleId": "phoneValidation.required",
  "field": "phone",
  "scope": "place",
  "createdAt": "2026-03-10T10:00:00Z",
  "reason": "Known local exception for this editor"
}
```

### 9.2 Betekenis van scope

Voor v1 is scope vooral informatief en mag deze standaard "place" zijn.

Later kan dit uitbreiden naar andere vormen, maar dat is nog geen harde v1-eis.

---

## 10. Gedrag in runtime

Wanneer een issue of voorstel wordt gegenereerd, controleert de runtime of hiervoor een passende whitelist-entry bestaat.

Indien een match wordt gevonden, dan wordt het issue of voorstel:

- onderdrukt in de normale weergave
- optioneel gemarkeerd als whitelisted in UI of debug
- niet als actieve waarschuwing getoond

### 10.1 Toepassingsmoment

Whitelist-checking vindt plaats nadat:

- config is geladen
- chains zijn gematcht
- exceptions zijn toegepast
- issues en voorstellen zijn opgebouwd

Whitelist is dus de laatste suppressielaag vóór presentatie aan de gebruiker.

---

## 11. Export

De whitelist moet exporteerbaar zijn als JSON-bestand.

### 11.1 Doel

Export is bedoeld voor:

- back-up
- migratie naar een andere browser of machine
- handmatige inspectie
- lokaal archiveren

### 11.2 Formaat

Het exportformaat is gelijk aan de interne datastructuur, zodat import en export eenvoudig blijven.

Voorbeeld:

```json
{
  "version": 1,
  "items": [
    {
      "placeId": "123456789",
      "ruleId": "phoneValidation.required",
      "field": "phone",
      "scope": "place",
      "createdAt": "2026-03-10T10:00:00Z",
      "reason": "Known local exception for this editor"
    }
  ]
}
```

---

## 12. Import

Whitelist-data moet importeerbaar zijn vanuit een eerder geëxporteerd JSON-bestand.

### 12.1 Validatie

Bij import moet de runtime minimaal controleren:

- geldig JSON-formaat
- aanwezig top-level `version`
- aanwezig `items`
- per item geldige kernvelden

### 12.2 Ongeldige import

Bij ongeldige import moet de runtime:

- duidelijke foutmelding tonen
- bestaande whitelist niet overschrijven
- niet crashen

---

## 13. Merge bij import

### 13.1 Doel

Import moet whitelist-data kunnen samenvoegen met bestaande lokale data zonder onnodige duplicatie.

### 13.2 Merge-sleutel

Voor v1 wordt gemerged op:

`placeId + ruleId + field`

### 13.3 Gedrag

Bij import:

- nieuwe entries worden toegevoegd
- bestaande entries met dezelfde sleutel worden bijgewerkt of behouden
- duplicaten worden niet dubbel opgeslagen

### 13.4 Richtlijn

De runtime mag bij identieke sleutel de meest recente of meest complete entry behouden.

---

## 14. Verwijderen en beheren

De whitelist-UI moet gebruikers in staat stellen om:

- individuele entries te verwijderen
- alle entries te bekijken
- whitelist per place of rule te inspecteren
- volledige whitelist te exporteren
- whitelist te importeren

Bulkbeheer mag later uitgebreider worden, maar is geen harde v1-eis.

---

## 15. Versioning

Whitelist-data moet versieerbaar zijn zodat toekomstige migraties mogelijk blijven.

### 15.1 Voor v1

Gebruik:

```json
{
  "version": 1
}
```

### 15.2 Toekomstig gebruik

Bij latere versies kan de runtime migraties uitvoeren van oudere whitelist-formaten naar nieuwere.

Voor v1 is dit nog niet nodig, maar het model moet het wel mogelijk maken.

---

## 16. Expiratie

Voor v1 is expiratie optioneel voorbereid, maar nog geen harde eis.

### 16.1 Mogelijk toekomstig veld

`expiresAt`

### 16.2 Mogelijk toekomstig gedrag

Een whitelist-entry kan in de toekomst automatisch vervallen wanneer de ingestelde datum verstreken is.

Voor v1 hoeft dit nog niet actief afgedwongen te worden.

---

## 17. Debug en UI

Whitelisted issues moeten voor maintainers of in debug zichtbaar kunnen blijven als onderdrukte items.

De whitelist-UI moet minimaal tonen:

- `placeId`
- `ruleId`
- `field`
- `createdAt`
- `reason`

Optioneel kan ook getoond worden:

- `chainId`
- `country`
- `notes`

---

## 18. Voorbeeld volledig whitelistbestand

```json
{
  "version": 1,
  "items": [
    {
      "placeId": "123456789",
      "ruleId": "phoneValidation.required",
      "field": "phone",
      "scope": "place",
      "createdAt": "2026-03-10T10:00:00Z",
      "reason": "Known local exception for this editor"
    },
    {
      "placeId": "987654321",
      "ruleId": "nameNormalization",
      "field": "name",
      "scope": "place",
      "createdAt": "2026-03-10T10:05:00Z",
      "reason": "Temporarily accepted until local review"
    }
  ]
}
```

---

## 19. Wat v1 nog niet volledig vereist

De volgende onderdelen mogen voorbereid zijn, maar zijn nog geen harde v1-verplichting:

- expiratie afdwingen
- meerdere whitelist-profielen
- synchronisatie tussen apparaten
- cloud-opslag
- geavanceerde metadata zoals tags
- complexe rule-group suppressie
- automatische deduplicatie over place-fingerprints heen

---

## 20. Ontwerpregels voor gebruikers en maintainers

Bij het gebruik van whitelist gelden de volgende regels:

- whitelist alleen wat lokaal echt nodig is
- gebruik exceptions voor gedeelde uitzonderingen
- maak whitelist-entries zo specifiek mogelijk
- gebruik export als back-up
- verwijder verouderde entries regelmatig
- vermijd brede suppressie als één veldspecifieke suppressie voldoende is

---

## 21. Samenvatting

Het whitelistmodel van WME Place Harmonizer ROW Edition is ontworpen als een lokaal, versieerbaar en veilig suppressiemechanisme voor editor-specifieke uitzonderingen.

De kern van een whitelist-entry is:

`placeId + ruleId + field`

Dit model zorgt ervoor dat:

- lokale suppressie mogelijk is
- community-data schoon blijft
- exceptions en whitelist een duidelijke eigen rol houden
- import/export eenvoudig blijft
- toekomstige uitbreiding mogelijk blijft
