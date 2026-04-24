# Validaties voor de Nederlandse configuratie

De Place Harmonizer controleert places op basis van de actieve configuratie. Voor deze eerste wiki gaan we uit van de Nederlandse configuratie.

Deze pagina beschrijft de soorten controles die je kunt tegenkomen. De exacte regels kunnen per categorie, keten of configuratieversie verschillen.

![Voorbeeld van meerdere validaties](screenshots/05-meerdere-validaties.png)

## Categoriebeleid

Veel controles zijn afhankelijk van de categorie van de place. Een tankstation, supermarkt, parkeerplaats, natuurgebied of restaurant heeft niet dezelfde verwachtingen.

De configuratie kan per categorie aangeven welke velden:

- verplicht zijn;
- aanbevolen zijn;
- afgeraden zijn;
- verboden zijn;
- extra toelichting of editor notes hebben.

Voor Country Managers is dit een belangrijk reviewpunt: als een categorie structureel verkeerde meldingen geeft, ligt de oplossing meestal in het verbeteren van de Nederlandse data.

![Categoriebeleid voorbeeld](screenshots/05-categoriebeleid.png)

## Naamgeving

Het script kan de naam van een place controleren op basis van algemene regels of ketenstandaarden.

Mogelijke meldingen:

- de naam wijkt af van een bekende standaardnaam;
- een plaatsnaam staat onnodig in de naam;
- een ketennaam is anders gespeld dan verwacht.

Voorbeeld: als een keten in de configuratie een standaardnaam heeft, kan het script melden dat de WME-naam daarvan afwijkt.

![Naamgevingsmelding](screenshots/05-naamgeving.png)

## Adresvelden

De configuratie kan controleren of adresvelden aanwezig of juist niet gewenst zijn.

Mogelijke velden:

- plaats;
- straat;
- huisnummer.

Afhankelijk van de categorie kan een adres verplicht, aanbevolen, afgeraden of verboden zijn. Een winkel heeft bijvoorbeeld vaak andere verwachtingen dan een natuurgebied.

![Adresvalidatie](screenshots/05-adresvalidatie.png)

## Telefoonnummer

Het script kan controleren of een telefoonnummer aanwezig moet zijn en of het formaat klopt volgens de ingestelde regels.

Mogelijke meldingen:

- telefoonnummer ontbreekt terwijl het verplicht of aanbevolen is;
- telefoonnummer is aanwezig terwijl het afgeraden of verboden is;
- telefoonnummer heeft een afwijkend formaat.

![Telefoonvalidatie](screenshots/05-telefoonvalidatie.png)

## Website / URL

Het script kan controleren of een website aanwezig moet zijn en of de URL correct is opgebouwd.

Bij ketens kan ook worden gecontroleerd of de URL overeenkomt met de bekende standaard voor die keten.

Mogelijke meldingen:

- website ontbreekt;
- website is niet gewenst;
- URL-formaat lijkt ongeldig;
- URL wijkt af van de ketenstandaard.

![URL-validatie](screenshots/05-url-validatie.png)

## Openingstijden

Openingstijden kunnen op meerdere manieren worden gecontroleerd:

- aanwezigheid van openingstijden;
- afwezigheid wanneer openingstijden niet gewenst zijn;
- vergelijking met een ketenspecifiek openingstijdensjabloon;
- vergelijking met Google Maps, als die check actief is.

Openingstijden vragen vaak om menselijke beoordeling. Google Maps of ketenstandaarden kunnen helpen, maar zijn niet altijd leidend.

![Openingstijden validatie](screenshots/05-openingstijden.png)

## Geometry

De configuratie kan aangeven of een place als punt of area/polygon verwacht wordt.

Mogelijke meldingen:

- place zou een punt moeten zijn;
- place zou een area moeten zijn;
- huidige geometrie wijkt af van de categorieverwachting.

Controleer dit altijd in de context van de lokale situatie.

![Geometry validatie](screenshots/05-geometry.png)

## Locklevel

Het script kan een aanbevolen minimum-locklevel tonen. Dit is bedoeld om belangrijke of gevoelige places beter te beschermen tegen ongewenste wijzigingen.

Een locklevel-melding betekent niet automatisch dat je direct moet locken; beoordeel dit volgens de Nederlandse community-afspraken.

![Locklevel melding](screenshots/05-locklevel.png)

## Services

Voor sommige categorieen of ketens kunnen services verplicht, aanbevolen, afgeraden of verboden zijn.

Mogelijke meldingen:

- verplichte service ontbreekt;
- aanbevolen service ontbreekt;
- afgeraden service is aanwezig;
- verboden service is aanwezig.

![Services validatie](screenshots/05-services.png)

## Aliases

Voor ketens kunnen aliases worden voorgesteld. Dit kan nuttig zijn wanneer gebruikers een bedrijf onder meerdere namen kennen of wanneer een keten verschillende schrijfwijzen heeft.

Aliases kunnen verplicht of optioneel zijn, afhankelijk van de data.

![Alias suggestie](screenshots/05-aliases.png)

## Externe provider-koppelingen

Het script kan controleren of externe providerinformatie aanwezig is of overeenkomt met de verwachtingen. In de praktijk gaat dit vaak over Google Maps-koppelingen.

Mogelijke meldingen:

- externe provider ontbreekt;
- gekoppelde provider lijkt niet overeen te komen;
- meerdere mogelijke provider-matches zijn gevonden;
- providerdata wijkt af van WME-data.

![Externe provider validatie](screenshots/05-externe-provider.png)

## Google Maps-validatie voor Nederland

Voor de Nederlandse configuratie mag Google Maps-validatie expliciet worden meegenomen in de beoordeling.

De volgende checks kunnen beschikbaar zijn:

### Place niet gevonden

Het script kan melden dat er geen passende Google Maps-vermelding is gevonden. Dit kan betekenen dat de WME-place niet of anders bekend is bij Google, maar het kan ook komen door naamverschillen of lokale bijzonderheden.

### Gesloten status

Als Google Maps aangeeft dat een locatie gesloten is, kan het script dit melden. Controleer altijd of dit klopt voordat je iets wijzigt in WME.

### Locatie-afwijking

Het script kan een verschil signaleren tussen de WME-locatie en de Google Maps-locatie. Dit is vooral een aandachtspunt bij grote afwijkingen, maar Google is niet automatisch leidend.

### Naam komt niet overeen

Als de naam in WME afwijkt van Google Maps, kan het script dit tonen. Beoordeel hierbij Nederlandse Waze-afspraken, lokale naamgeving en ketenstandaarden.

### Categorie komt niet overeen

Google Maps gebruikt andere categorieen dan WME. Een mismatch is dus niet altijd fout, maar kan wel helpen om verkeerde WME-categorieen te vinden.

### Openingstijden komen niet overeen

Openingstijden kunnen worden vergeleken met Google Maps. Dit is nuttig, maar gevoelig voor uitzonderingen, tijdelijke wijzigingen en foutieve externe data.

![Google Maps validatie detail](screenshots/05-google-maps-validatie-detail.png)

## Editor notes

De configuratie kan editor notes tonen voor categorieen of ketens. Dit zijn informatieve meldingen die context geven, bijvoorbeeld over specifieke Nederlandse afspraken.

Editor notes zijn bedoeld als hulp bij beoordeling, niet als automatische correctie.

![Editor note](screenshots/05-editor-note.png)

## Wat moet terug naar de configuratie?

Niet alle problemen zijn scriptproblemen. Veel feedback zal waarschijnlijk over de Nederlandse data gaan.

Geef vooral feedback wanneer:

- een regel voor Nederland inhoudelijk niet klopt;
- een categorie te streng of te ruim is ingesteld;
- een ketenstandaard ontbreekt;
- een ketenstandaard verouderd is;
- Google Maps-validatie te veel ruis geeft;
- een melding inhoudelijk klopt maar onduidelijk geformuleerd is.

Noteer bij voorkeur de place, categorie, melding, verwachte uitkomst en waarom je denkt dat de configuratie aangepast moet worden.
