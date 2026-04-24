# Script Sidebar

De Script Sidebar is het centrale bedieningspaneel van de Place Harmonizer. Hier zie je de status van het script, kun je zichtbare places scannen, instellingen wijzigen en data opnieuw laden.

![Volledige Script Sidebar](../../screenshots/sidebar-overview.png)

## Status

Bovenin de sidebar staat de naam van het script en de actuele status. Deze status geeft bijvoorbeeld aan of het script klaar is, hoeveel places zijn gescand of dat data opnieuw is geladen.

Naast de titel staat een informatie-indicator. Deze toont technische context zoals het actieve datakanaal, manifestversie, runtime-configuratie en ketendata. Dit is vooral handig bij het testen of bij het melden van problemen.

![Status en informatie-indicator](../../screenshots/sidebar-status-info.png)

## Laatste scan

Na een scan toont de sidebar een korte samenvatting van de laatst gescande zichtbare places:

- totaal aantal gescande places;
- aantal zonder issues;
- aantal met waarschuwingen;
- aantal met fouten of ernstigere issues.

Deze aantallen zijn bedoeld als snelle indicatie. De inhoudelijke beoordeling gebeurt per geselecteerde place.

![Laatste scan samenvatting](../../screenshots/sidebar-last-scan.png)

## Highlights

Het script kan places op de kaart markeren op basis van de gevonden issues. Dit helpt om snel te zien waar mogelijk aandacht nodig is.

De markeringen zijn visuele hulpmiddelen en vervangen geen inhoudelijke controle.

### Natuurlijke gebieden uitsluiten

In de sidebar staat een optie om natural features, zoals bossen en watergebieden, uit te sluiten van highlighting. Dit kan handig zijn omdat zulke objecten vaak andere regels of verwachtingen hebben dan reguliere bedrijven, winkels of publieke locaties.

![Highlights en natural features optie](../../screenshots/sidebar-natural-features-toggle.png)

## Automatisch scannen

Met automatisch scannen kan het script opnieuw scannen wanneer je navigeert, inzoomt of uitzoomt in WME.

Dit is handig tijdens controlesessies, maar kan bij intensief kaartwerk ook afleiden. Zet automatisch scannen uit als je liever handmatig bepaalt wanneer de zichtbare places worden gecontroleerd.

![Automatisch scannen instelling](../../screenshots/sidebar-auto-scan-toggle.png)

## Google Maps-validatie

De sidebar bevat instellingen voor Google Maps-validatie. Voor de Nederlandse configuratie kan deze functionaliteit helpen bij het vergelijken van WME-data met Google Maps-data.

Je kunt Google Maps-validatie als geheel aan- of uitzetten. Afhankelijk van de Nederlandse configuratie kunnen ook individuele checks zichtbaar zijn, zoals:

- place niet gevonden;
- gesloten status;
- locatie-afwijking;
- naam komt niet overeen;
- categorie komt niet overeen;
- openingstijden komen niet overeen.

![Google Maps-validatie instellingen](../../screenshots/sidebar-google-maps-validation.png)

Meer uitleg hierover staat op [Validaties voor de Nederlandse configuratie](05-validaties-nederlandse-configuratie.md).

## Data opnieuw laden

Met de knop om data opnieuw te laden haalt het script de laatste beschikbare configuratie en validatiedata op.

Gebruik dit bijvoorbeeld wanneer:

- er net iets in de Nederlandse configuratie is aangepast;
- je vermoedt dat je nog oude data ziet;
- je test of een wijziging in de data goed doorkomt;
- je feedback wilt geven op de meest recente configuratie.

![Data opnieuw laden](../../screenshots/sidebar-reload-data.png)

## Zichtbare places scannen

Met de scan-knop kun je handmatig alle zichtbare places op de kaart laten controleren. Dit is vooral nuttig wanneer automatisch scannen uit staat.

Na de scan worden de resultaten verwerkt in de kaart-highlights en in de scan-samenvatting.

![Zichtbare places scannen](../../screenshots/sidebar-scan-visible-places.png)

## Advies voor Country Managers

Gebruik de sidebar vooral om snel gebieden te verkennen en te zien waar veel meldingen ontstaan. Let daarbij niet alleen op individuele fouten, maar ook op patronen:

- Zijn er categorieen die structureel veel meldingen geven?
- Zijn er meldingen die bij Nederlandse places vaak onterecht zijn?
- Zijn bepaalde Google Maps-checks te streng of juist nuttig?
- Worden natural features terecht of onterecht meegenomen?

Zulke patronen zijn waardevolle input voor het verbeteren van de Nederlandse configuratie.
