# Meertalige wiki-structuur

De wiki is voorbereid op meerdere talen. De Nederlandse documentatie is op dit moment de inhoudelijke bron, omdat de eerste uitrol en validatie gericht zijn op de Nederlandse community.

## Structuur

```text
docs/wiki/
├── Home.md                         # Nederlandse startpagina / hoofdindex
├── 01-...md                        # Nederlandse inhoudspagina's
├── screenshots/                    # Gedeelde screenshots
└── languages/
    ├── README.md                   # Uitleg over talen
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

Screenshots staan voorlopig centraal in `docs/wiki/screenshots/`.

Dat voorkomt dubbele afbeeldingen per taal. Als later blijkt dat screenshots per taal nodig zijn, bijvoorbeeld omdat de interface in verschillende talen zichtbaar is, kan per taal een eigen map worden toegevoegd:

```text
docs/wiki/languages/en/screenshots/
docs/wiki/languages/fr/screenshots/
```

## Aanpak voor toekomstige vertalingen

Aanbevolen werkwijze:

1. Gebruik de Nederlandse pagina als bron.
2. Vertaal de inhoud naar de nieuwe taal.
3. Pas communityspecifieke details aan waar nodig.
4. Controleer of screenshot-links nog kloppen.
5. Laat minimaal een native of ervaren communitylid meelezen.

## Let op bij communityspecifieke inhoud

Niet elke tekst moet letterlijk worden vertaald. Sommige inhoud is specifiek Nederlands, zoals:

- Nederlandse configuratie;
- Nederlandse Country Managers;
- Nederlandse categorieafspraken;
- Nederlandse Slack-afspraken;
- lokale validatie van Google Maps-data.

Bij uitrol naar andere communities moet zulke tekst worden aangepast aan de lokale situatie.
