# Doel en uitgangspunten

## Wat is WME Place Harmonizer?

WME Place Harmonizer ROW Edition is een userscript voor de Waze Map Editor. Het script analyseert geselecteerde places en vergelijkt deze met community-afspraken, categoriebeleid, ketenstandaarden en aanvullende controles.

Voor Nederland betekent dit dat het script helpt om WME-places consistenter te maken volgens de Nederlandse configuratie.

![Voorbeeld van een geanalyseerde place](screenshots/01-geanalyseerde-place.png)

## Waarom dit script?

Binnen WME worden veel places handmatig onderhouden. Daardoor ontstaan verschillen in naamgeving, categoriegebruik, adresvelden, websites, telefoonnummers, openingstijden, services, locklevels en gekoppelde externe bronnen.

De Place Harmonizer is bedoeld om:

- afwijkingen sneller zichtbaar te maken;
- Country Managers en ervaren editors een gedeeld controlebeeld te geven;
- terugkerende discussies over place-standaarden te ondersteunen met concrete meldingen;
- minder ervaren editors later beter te begeleiden;
- Nederlandse richtlijnen en praktijkafspraken beter toepasbaar te maken in WME.

## Voorzichtig uitrollen

Deze documentatie is in eerste instantie bedoeld voor Country Managers. Het doel is om eerst op hoog niveau te toetsen of:

- de Nederlandse regels inhoudelijk kloppen;
- het aantal meldingen werkbaar is;
- de uitleg duidelijk genoeg is;
- suggesties geen ongewenste bijwerkingen hebben;
- de configuratie geschikt is om later breder uit te rollen.

Pas daarna is publicatie richting lagere levels logisch.

## Het script is adviserend

Het belangrijkste uitgangspunt: **het script beslist niet voor de editor**.

Het script kan:

- een place analyseren;
- meldingen tonen;
- voorgestelde waarden tonen;
- sommige wijzigingen klaarzetten in het WME-formulier;
- issues lokaal negeren via een whitelist.

Het script doet niet:

- automatisch opslaan in WME;
- zonder controle wijzigingen publiceren;
- community-afspraken afdwingen buiten de configuratie om;
- uitzonderingen delen met andere editors via de lokale whitelist.

De editor blijft verantwoordelijk voor de uiteindelijke beoordeling en het opslaan van wijzigingen.

## Nederlandse configuratie

De huidige focus ligt op Nederland. De Nederlandse configuratie bepaalt welke controles actief zijn en welke standaarden worden gehanteerd.

Omdat het script flexibel is opgezet, kan dezelfde basis later ook in andere communities worden gebruikt. Daarvoor is wel lokale configuratie, lokale validatie en draagvlak nodig.

## Wat betekent dit voor Country Managers?

Country Managers worden gevraagd om niet alleen te kijken of het script technisch werkt, maar vooral of het gedrag inhoudelijk klopt:

- Zijn de meldingen terecht?
- Zijn de voorgestelde waarden wenselijk?
- Zijn er categorieen waarvoor de regels te streng of juist te ruim zijn?
- Zijn er Nederlandse uitzonderingen die in de configuratie thuishoren?
- Moeten bepaalde controles alleen voor specifieke situaties gelden?

## Terminologie

In deze wiki worden de termen **place**, **plaats** en **venue** door elkaar gebruikt. Dat sluit aan bij hoe binnen de community en in WME vaak over hetzelfde object wordt gesproken.

Wanneer het gaat over de gebruikersinterface van WME of het script, wordt zoveel mogelijk de Nederlandse benaming gebruikt zoals die in het script zichtbaar is.
