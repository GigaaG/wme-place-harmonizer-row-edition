# Feedback, problemen en vervolgstappen

Deze eerste Nederlandse opzet is bedoeld om feedback te verzamelen van Country Managers voordat de Place Harmonizer breder beschikbaar wordt gemaakt voor lagere levels.

Feedback is welkom op zowel het script zelf als op de Nederlandse configuratie.

![Feedbackproces overzicht](../../screenshots/feedback-process.png)

## Waar meld je feedback?

Gebruik bij voorkeur **GitHub Issues** wanneer je daarmee bekend bent. Dat maakt het makkelijker om meldingen, voorbeelden, screenshots en opvolging bij elkaar te houden.

Voor wie minder bekend is met GitHub, kan feedback ook via **Slack** worden gedeeld.

## Scriptprobleem of configuratieprobleem?

Probeer bij feedback onderscheid te maken tussen twee soorten problemen.

### Scriptprobleem

Een scriptprobleem gaat over de werking van de Place Harmonizer zelf.

Voorbeelden:

- het script laadt niet;
- de sidebar verschijnt niet;
- een knop werkt niet;
- het analysepaneel blijft leeg;
- een fix wordt verkeerd toegepast in WME;
- het script geeft een technische foutmelding;
- de browserconsole toont fouten met betrekking tot het script.

### Configuratieprobleem

Een configuratieprobleem gaat over de Nederlandse regels of data waarop het script controleert.

Voorbeelden:

- een melding is inhoudelijk onterecht;
- een categorie heeft verkeerde eisen;
- een ketenstandaard ontbreekt of klopt niet;
- een lockleveladvies is niet passend;
- een Google Maps-check geeft te veel ruis;
- een tekst of vertaling is onduidelijk.

Voor Country Managers zal veel feedback waarschijnlijk configuratiegericht zijn. Dat is juist waardevol in deze fase.

## Wat zet je in een goede melding?

Een goede melding bevat bij voorkeur:

- korte titel;
- permalink naar de WME-place of het gebied;
- screenshot van de melding;
- wat je verwachtte;
- wat er daadwerkelijk gebeurde;
- of het volgens jou om scriptgedrag of configuratie gaat;
- browser en scriptversie, als het om een technisch probleem gaat.

![Voorbeeld van een goede GitHub Issue](../../screenshots/github-issue-example.png)

## Technische fouten melden

Bij technische fouten is extra context belangrijk.

Voeg indien mogelijk toe:

- browsernaam en versie;
- scriptversie;
- of je de productieversie of een testversie gebruikt;
- stappen om het probleem te reproduceren;
- consolemeldingen uit de browser.

Consolemeldingen vind je meestal via F12 of via de ontwikkelaarstools van je browser. Zoek daarbij naar meldingen die met de Place Harmonizer te maken hebben.

![Consolemelding voorbeeld](../../screenshots/browser-console-example.png)

## Inhoudelijke feedback op Nederlandse regels

Bij inhoudelijke feedback gaat het vooral om de vraag of de Nederlandse configuratie klopt.

Beschrijf zo concreet mogelijk:

- om welke categorie of keten het gaat;
- welke melding je krijgt;
- waarom die melding volgens jou niet klopt;
- wat de gewenste regel zou moeten zijn;
- of dit een individuele uitzondering is of een algemene Nederlandse afspraak.

Voorbeeld:

> Bij categorie X wordt een website als verplicht gemeld, maar in Nederland is dat volgens mij alleen aanbevolen. Dit geeft veel ruis bij kleine lokale locaties. Voorstel: website voor deze categorie aanpassen van verplicht naar aanbevolen.

## Feedback op Google Maps-validatie

Google Maps-validatie is nuttig, maar kan ook ruis geven. Geef daarom vooral feedback op patronen:

- worden te veel correcte WME-places als afwijkend gemeld?
- zijn locatie-afwijkingen te gevoelig?
- zijn Google-categorieen bruikbaar voor Nederlandse WME-categorieen?
- worden gesloten locaties betrouwbaar herkend?
- zijn openingstijden bruikbaar genoeg als vergelijkingspunt?

Een individuele Google Maps-afwijking kan een uitzondering zijn. Veel vergelijkbare afwijkingen wijzen mogelijk op een configuratie- of drempelprobleem.

## Vervolgstappen voor de Nederlandse community

Mogelijke vervolgstappen:

1. Country Managers testen de huidige Nederlandse configuratie.
2. Bevindingen worden verzameld via GitHub Issues en Slack.
3. De Nederlandse data wordt aangescherpt.
4. Enkele editors kunnen eventueel meedenken over configuratiebeheer.
5. Daarna kan worden besloten of en hoe het script breder wordt uitgerold.
6. Later kan worden gekeken of andere communities interesse hebben in een eigen configuratie.

## Meedenken over configuratie

Voor verdere groei is hulp bij de Nederlandse data welkom. Daarbij gaat het niet alleen om technische kennis, maar vooral om inhoudelijke WME-kennis:

- categorieafspraken;
- ketenstandaarden;
- Nederlandse uitzonderingen;
- lockbeleid;
- services;
- naamgeving;
- externe bronvalidatie.

Technische kennis helpt, maar is niet de enige vereiste. Een goed gevoel voor Nederlandse WME-praktijk is minstens zo belangrijk.
