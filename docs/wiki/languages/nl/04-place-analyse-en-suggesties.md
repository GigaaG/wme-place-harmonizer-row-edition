# Place-analyse en suggesties

Wanneer je een place selecteert in WME, toont de Place Harmonizer de analyse in het feature editor-paneel. Dit is de belangrijkste plek om individuele meldingen te beoordelen.

![Place-analyse in het feature editor-paneel](../../screenshots/feature-editor-analysis-overview.png)

## Wat zie je in het analysepaneel?

Het paneel toont per geselecteerde place onder andere:

- de naam van de place;
- eventueel herkende keten;
- het aantal bevindingen;
- meldingen per onderwerp of veld;
- huidige waarde;
- voorgestelde waarde;
- uitleg of reden van de melding;
- opties om voorgestelde fixes toe te passen;
- opties om meldingen lokaal te negeren.

## Severity: fout, waarschuwing en informatie

Meldingen kunnen verschillende ernstniveaus hebben.

### Fout

Een fout betekent dat de huidige waarde waarschijnlijk strijdig is met een harde regel of verplichte verwachting uit de configuratie.

Voorbeeldsituaties:

- een verplicht veld ontbreekt;
- een verboden veld is toch ingevuld;
- een verplichte service ontbreekt;
- een place voldoet niet aan een vereiste voor een categorie.

![Voorbeeld van een foutmelding](../../screenshots/issue-error.png)

### Waarschuwing

Een waarschuwing betekent dat iets waarschijnlijk beter of consistenter kan, maar dat context belangrijk blijft.

Voorbeeldsituaties:

- een aanbevolen veld ontbreekt;
- de naam wijkt af van een ketenstandaard;
- het locklevel is lager dan aanbevolen;
- openingstijden wijken af van een bekende standaard;
- Google Maps toont afwijkende informatie.

![Voorbeeld van een waarschuwing](../../screenshots/issue-warning.png)

### Informatie

Een informatiemelding is meestal bedoeld als aandachtspunt of editor note. Dit hoeft geen fout te zijn, maar kan relevante context geven bij een categorie of keten.

![Voorbeeld van een informatiemelding](../../screenshots/issue-info.png)

## Huidige en voorgestelde waarde

Bij veel meldingen toont het script:

- de huidige waarde in WME;
- de voorgestelde waarde volgens de configuratie of externe controle;
- eventueel een reden waarom die waarde wordt voorgesteld.

Gebruik dit als hulpmiddel, niet als blind te volgen opdracht. Controleer altijd of de voorgestelde waarde in de specifieke situatie klopt.

![Huidige en voorgestelde waarde](../../screenshots/current-and-suggested-value.png)

## Fixes toepassen

Sommige voorstellen kunnen door het script worden toegepast in het WME-formulier. In dat geval zie je een selectieveld bij de melding.

Werkwijze:

1. Selecteer de fixes die je wilt toepassen.
2. Klik op de knop om geselecteerde fixes toe te passen.
3. Controleer de gewijzigde velden in WME.
4. Sla pas daarna handmatig op in WME.

![Fix selecteren](../../screenshots/select-fix.png)

![Geselecteerde fixes toepassen](../../screenshots/apply-selected-fixes.png)

## Handmatige acties

Niet alle meldingen kunnen automatisch worden toegepast. Sommige meldingen vragen om handmatige beoordeling of aanpassing.

Dat kan bijvoorbeeld gelden voor:

- complexe openingstijden;
- categoriebeoordeling;
- locatie-afwijkingen;
- situaties waarbij meerdere externe bronnen mogelijk zijn;
- meldingen waarbij context belangrijker is dan een simpele veldwijziging.

![Handmatige actie vereist](../../screenshots/manual-action-required.png)

## Externe provider / Google Maps-suggesties

Als een place gekoppeld moet worden aan een externe provider of als Google Maps-validatie iets opvallends vindt, kan het script suggesties tonen. Soms zijn er meerdere mogelijke matches.

Bij meerdere keuzes moet je zelf beoordelen welke bron werkelijk bij de WME-place hoort.

Let daarbij op:

- naam;
- adres;
- locatie;
- type bedrijf of locatie;
- actuele status;
- eventuele duplicaten of verwarring met nabijgelegen locaties.

![Externe provider keuze](../../screenshots/external-provider-choice.png)

## Chain-herkenning

Als een place overeenkomt met een bekende keten uit de data, kan het script ketenspecifieke standaarden gebruiken. Denk aan naamgeving, URL, aliases, openingstijden, services of andere afspraken.

Voor de Nederlandse configuratie is dit een belangrijk onderwerp voor verdere validatie. Niet elke keten zal direct volledig of foutloos zijn opgenomen.

![Ketenherkenning in analysepaneel](../../screenshots/chain-detection.png)

## Geen bevindingen

Als het script geen meldingen vindt, betekent dit dat de place volgens de huidige configuratie geen opvallende issues heeft.

Dat betekent niet automatisch dat de place perfect is. Het betekent alleen dat er binnen de actieve controles niets is gevonden.

![Geen bevindingen](../../screenshots/no-findings.png)

## Waar moeten Country Managers op letten?

Bij het beoordelen van analyses is vooral nuttig om te letten op:

- meldingen die inhoudelijk onterecht zijn;
- voorgestelde waarden die niet aansluiten bij Nederlandse praktijk;
- regels die te veel ruis veroorzaken;
- categorieen waar juist extra controles nodig zijn;
- ketens waarvan de standaard nog ontbreekt of onvolledig is;
- teksten die voor minder ervaren editors onduidelijk zijn.

Gebruik concrete voorbeelden in feedback. Een GitHub Issue met een permalink, screenshot en korte toelichting is veel bruikbaarder dan alleen “de melding klopt niet”.
