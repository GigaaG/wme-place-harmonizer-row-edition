# Whitelist en lokale uitzonderingen

De whitelist is bedoeld om specifieke meldingen voor een specifieke place lokaal te negeren. Dit is handig voor bekende uitzonderingen waarbij de configuratie in algemene zin klopt, maar een individuele place bewust afwijkt.

![Whitelist knop bij een melding](screenshots/06-whitelist-knop.png)

## Wanneer gebruik je de whitelist?

Gebruik de whitelist alleen wanneer je bewust besluit dat een melding voor deze specifieke place niet relevant is.

Voorbeelden:

- een place heeft bewust een afwijkende naam;
- een veld is volgens de algemene regel gewenst, maar in deze situatie niet zinvol;
- een Google Maps-melding is onterecht;
- een categorie-afspraak past niet goed op deze ene specifieke locatie;
- een ketenstandaard geldt niet voor deze vestiging.

Gebruik de whitelist liever niet wanneer de melding structureel verkeerd is. In dat geval moet waarschijnlijk de Nederlandse configuratie worden aangepast.

## Wat doet de whitelist?

Wanneer je een melding negeert, wordt die melding voor die place niet meer getoond zolang de whitelist-entry geldig is voor de actieve configuratie en data.

Het script verbergt dan ook de bijbehorende voorstellen die aan die melding gekoppeld zijn.

![Genegeerde melding](screenshots/06-genegeerde-melding.png)

## Lokaal opgeslagen

Belangrijk: de whitelist is lokaal opgeslagen in je browser.

Dat betekent:

- andere editors zien jouw whitelist niet;
- de whitelist wordt niet gedeeld met Waze;
- de whitelist wordt niet gedeeld met GitHub;
- de whitelist synchroniseert niet tussen browsers of computers;
- de whitelist kan verdwijnen als je browserdata wist.

Dit maakt de whitelist geschikt voor persoonlijke uitzonderingen, maar niet voor communitybrede afspraken.

## Geen vervanging voor configuratie

Als meerdere Country Managers dezelfde melding steeds moeten whitelisten, is dat een signaal dat de Nederlandse configuratie mogelijk aangepast moet worden.

Gebruik dan liever GitHub Issues of Slack om de regel te bespreken.

## Melding negeren

Werkwijze:

1. Selecteer een place.
2. Zoek de melding die je wilt negeren.
3. Klik op de knop om de melding voor deze venue te negeren.
4. Controleer of de melding verdwijnt of als pending actie wordt weergegeven.

![Melding negeren](screenshots/06-melding-negeren.png)

## Ongedaan maken

Na het negeren kan het script tijdelijk een optie tonen om de actie ongedaan te maken. Gebruik die optie direct als je per ongeluk de verkeerde melding hebt genegeerd.

![Whitelist ongedaan maken](screenshots/06-whitelist-ongedaan-maken.png)

## Geldigheid van whitelist-items

De whitelist houdt rekening met de actieve configuratie en ketendata. Als de configuratie of ketendata verandert, kan een oude whitelist-entry ongeldig worden.

Dat is bewust: een oude uitzondering mag niet stilletjes nieuwe of gewijzigde regels blijven onderdrukken.

## Advies voor Country Managers

Gebruik de whitelist tijdens het testen terughoudend. De whitelist is nuttig om individuele uitzonderingen te parkeren, maar voor de eerste Nederlandse validatie is het vaak belangrijker om te begrijpen waarom een melding ontstaat.

Stel jezelf bij elke whitelist-actie de vraag:

- Is dit echt een uitzondering op deze ene place?
- Of klopt de Nederlandse regel niet goed genoeg?
- Zou een minder ervaren editor deze melding begrijpen?
- Moet dit besproken worden voordat het script breder wordt uitgerold?

## Voorbeelden van goede feedback

Goede feedback bij whitelist/uitzonderingen bevat bij voorkeur:

- permalink naar de WME-place;
- screenshot van de melding;
- korte uitleg waarom de melding onterecht is;
- of het volgens jou een individuele uitzondering is of een configuratieprobleem;
- eventuele gewenste regelwijziging.

![Voorbeeld feedback bij uitzondering](screenshots/06-feedback-uitzondering.png)
