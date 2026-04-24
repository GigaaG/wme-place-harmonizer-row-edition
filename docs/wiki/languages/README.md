# Meertalige wiki-structuur

De wiki is voorbereid op meerdere talen. De Nederlandse documentatie is op dit moment de inhoudelijke bron, omdat de eerste uitrol en validatie gericht zijn op de Nederlandse community.

## Structuur

```text
docs/wiki/
├── Home.md                         # Taalkeuze / hoofdindex
├── screenshots/                    # Gedeelde, taalneutrale screenshots
└── languages/
    ├── README.md                   # Uitleg over talen
    ├── nl/                         # Nederlandse wiki-pagina's, huidige bronversie
    ├── en/                         # Engelse wiki-pagina's
    └── fr/                         # Franse wiki-pagina's
```

## Taalbeleid

Voorlopig geldt:

- Nederlands is de leidende versie.
- Engelse en Franse pagina's zijn voorbereid, maar nog niet inhoudelijk vertaald.
- Nieuwe talen kunnen worden toegevoegd onder `docs/wiki/languages/<taalcode>/`.
- Gebruik bij voorkeur ISO-taalcodes, bijvoorbeeld `en`, `fr`, `de`, `nl-BE`.
- Houd de pagina-opbouw per taal zoveel mogelijk gelijk, zodat vertalingen makkelijk te onderhouden zijn.

## Screenshots

Screenshots staan centraal in `docs/wiki/screenshots/` en worden gedeeld door alle talen.

Gebruik daarom zoveel mogelijk taalneutrale bestandsnamen, bijvoorbeeld:

```text
sidebar-overview.png
feature-editor-analysis.png
google-maps-validation-detail.png
```

Dat voorkomt dubbele afbeeldingen per taal. Als later blijkt dat screenshots per taal nodig zijn, bijvoorbeeld omdat de interface in verschillende talen zichtbaar is, kan alsnog per taal een eigen map worden toegevoegd:

```text
docs/wiki/languages/en/screenshots/
docs/wiki/languages/fr/screenshots/
```

## Aanpak voor toekomstige vertalingen

Aanbevolen werkwijze:

1. Gebruik `docs/wiki/languages/nl/` als bron.
2. Kopieer de pagina naar de nieuwe taalmap.
3. Vertaal de inhoud naar de nieuwe taal.
4. Pas communityspecifieke details aan waar nodig.
5. Laat de gedeelde screenshot-links naar `../../screenshots/` staan, tenzij er taalspecifieke screenshots nodig zijn.
6. Laat minimaal een native of ervaren communitylid meelezen.

## Let op bij communityspecifieke inhoud

Niet elke tekst moet letterlijk worden vertaald. Sommige inhoud is specifiek Nederlands, zoals:

- Nederlandse configuratie;
- Nederlandse Country Managers;
- Nederlandse categorieafspraken;
- Nederlandse Slack-afspraken;
- lokale validatie van Google Maps-data.

Bij uitrol naar andere communities moet zulke tekst worden aangepast aan de lokale situatie.
