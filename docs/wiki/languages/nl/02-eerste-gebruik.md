# Eerste gebruik

Deze pagina beschrijft de eerste gebruikersflow nadat je het script hebt geinstalleerd via de link die is gedeeld met de Nederlandse Country Managers.

Installatie-instructies staan bewust niet in deze wiki. De productieversie wordt apart gedeeld. Eventuele beta-instructies volgen apart.

## 1. Open Waze Map Editor

Open WME zoals je gewend bent. Het script start automatisch zodra WME en de WME SDK beschikbaar zijn.

Als het script geladen is, verschijnt in de zijbalk een paneel voor de Place Harmonizer.

![Script zichtbaar in de WME sidebar](../../screenshots/sidebar-visible.png)

## 2. Controleer of de juiste context actief is

Het script probeert automatisch te bepalen in welk land je werkt. Voor deze eerste Nederlandse opzet is vooral de Nederlandse configuratie relevant.

Werk je in Nederland, dan hoort het script de Nederlandse configuratie en data te gebruiken. In de sidebar kun je via de informatie-indicator controleren welke runtime-configuratie en data actief zijn.

![Informatie over actieve configuratie](../../screenshots/active-configuration-info.png)

## 3. Scan zichtbare places

Het script kan zichtbare places op de kaart scannen. Afhankelijk van je instellingen gebeurt dit automatisch of handmatig via de knop in de sidebar.

Na een scan worden places visueel gemarkeerd:

- groen: geen opvallende issues gevonden;
- geel: waarschuwingen of aandachtspunten gevonden;
- rood: ernstigere issues gevonden.

Deze kleuren zijn bedoeld als indicatie. Open altijd de place zelf om de details te bekijken.

![Gescande places met markering](../../screenshots/scanned-places-highlights.png)

## 4. Selecteer een place

Wanneer je een place selecteert, toont het script de analyse in het feature editor-paneel. Je ziet daar onder andere:

- de naam van de place;
- eventueel herkende keteninformatie;
- het aantal bevindingen;
- meldingen per veld of onderwerp;
- huidige en voorgestelde waarden;
- opties om bepaalde voorstellen toe te passen;
- opties om meldingen lokaal te negeren.

![Analyse in het feature editor-paneel](../../screenshots/feature-editor-analysis.png)

## 5. Beoordeel de bevindingen

Lees de meldingen inhoudelijk. Niet elke melding betekent automatisch dat de place fout is. Sommige meldingen zijn waarschuwingen of informatiepunten die afhankelijk zijn van context.

Voor Country Managers is juist deze beoordeling belangrijk: als veel meldingen onterecht of onduidelijk zijn, moet de Nederlandse configuratie mogelijk worden aangepast.

## 6. Pas eventueel voorstellen toe

Sommige voorstellen kunnen door het script in het WME-formulier worden klaargezet. Selecteer daarvoor de gewenste fixes en gebruik de knop om de geselecteerde voorstellen toe te passen.

Controleer daarna altijd zelf de velden in WME voordat je opslaat.

![Geselecteerde fixes toepassen](../../screenshots/apply-selected-fixes.png)

## 7. Sla handmatig op in WME

Het script slaat wijzigingen niet automatisch op. Nadat een voorstel is toegepast, moet je zelf beoordelen of de wijziging klopt en vervolgens normaal opslaan in WME.

## 8. Geef feedback

Kom je meldingen tegen die volgens jou niet kloppen, onduidelijk zijn of discussie vragen? Leg dit dan vast via GitHub Issues of Slack. Zie ook [Feedback, problemen en vervolgstappen](07-feedback-problemen-en-vervolgstappen.md).
