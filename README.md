# Do Nothing Island

Een kleine beschaving. Absoluut geen verantwoordelijkheid.

Een eiland groeit vanzelf: van één huisje en een kleine akker naar een stad met haar eigen gewoonten, plannen en geschiedenis. Je mag kijken. Je kunt ook ingrijpen — en ontdekken wat daarvan blijft hangen.

De [afvinkbare planning voor Ronde 2 en 3](TODO.md) wordt één onderdeel per commit en testmoment uitgevoerd.

**Huizen verschillen van elkaar.** Elk huis krijgt vanuit zijn plek een eigen gevelkleur, dakkleur, kleur luiken en eigen verhoudingen; sommige hebben bloembakken, andere geen schoorsteen. Een straat ziet er daardoor nooit gekopieerd uit, en hetzelfde huis houdt altijd hetzelfde uiterlijk.

**De vuurtoren** verschijnt vanaf jaar 400 zodra het eiland een steiger of haven heeft, op het meest blootgestelde vrije punt van de kust. Overdag is het een rood-witte toren; 's nachts zwaait een lichtbundel over het water. Verdwijnt hij door overstroming of verbouwing, dan bouwen de bewoners hem verderop opnieuw op.

**Dag, nacht en seizoenen** geven het eiland een eigen ritme. Een dag duurt op 1× tweeënhalve minuut (op hogere snelheden tot vier keer zo snel) en elk seizoen twee dagen. 's Avonds kleurt het licht warm, 's nachts branden ramen, kampvuren en later straatlantaarns, in de herfst verkleuren de bomen en in de winter ligt er sneeuw op de grond, de heuvels en de dennen. Het weerbericht op het eiland vertelt mee. Dit is alleen sfeer: de simulatie en haar uitkomsten veranderen er niet door. In de instellingen kun je het uitzetten; dan blijft het een zomerse middag.

**Het eilandboek** bundelt alles wat je terugleest op één plek: de knop **Eilandboek ↗** op het eiland opent tabbladen voor Kroniek, Familie, Wensen, Uitdagingen en Verzameling. Het boek onthoudt het laatst gelezen tabblad, pauzeert het eiland zolang het open is en markeert het tabblad Wensen met een stipje als iemand iets vraagt. Pijltjestoetsen wisselen tussen tabbladen.

Het tabblad **Familie** volgt de familie van het eerste huis. Elke 32 jaar gaat de sleutel naar een volgende generatie, met een vaste naam, tijdpassend beroep en eigenaardigheid. De generaties blijven in de save bewaard en laten berichten in het logboek achter. Bestaande eilanden krijgen een gereconstrueerde vroege familielijn, zonder dat hun kaart of voortgang wordt teruggezet. Wat er tijdens hun leven gebeurt, wordt een herinnering in hun eigen woorden: regen of een brand bij het eerste huis, een beving, hoog water, het huis dat een landhuis wordt, of een wens die wel of juist niet uitkwam. Iedere sleutelhouder bewaart maximaal vier herinneringen, de belangrijkste eerst. Bij de overdracht vertelt de vorige generatie nog over haar grootste herinnering (‘…die nog altijd vertelt over de brand in jaar 143’), en het tabblad toont welke verhalen aan tafel blijven terugkomen. Elke eigenaardigheid komt pas na 32 generaties terug.

**Wensen** verschijnen af en toe als een klein wegklikbaar wolkje. In het tabblad Wensen lees je de vraag terug en kun je de plek opzoeken. Wolkjes zijn ook helemaal uit te zetten. Regen, een boomfeest, een vreugdevuur, hulp bij brand of een bron openen kunnen het vertrouwen vergroten; wie vaak helpt maakt het eiland ook afhankelijker. Afwachten laat ruimte voor eigen oplossingen. Wensen worden met je eiland opgeslagen.

Het tabblad **Uitdagingen** bevat één tot drie vrijblijvende doelen per seed. Ze worden stil bijgehouden en zijn alleen zichtbaar als je het tabblad zelf opent. Bijvoorbeeld: een vroeg landhuis, de Renaissance zonder ingreep, een bibliotheek of een vuurtraditie. Ze geven geen bonus of straf. Behaalde doelen blijven bewaard; een oudere save krijgt geen achteraf verzonnen uitslagen.

Het tabblad **Verzameling** bewaart eindes, bijzondere momenten en voltooide uitdagingen over al je eilanden heen. Onbekende items tonen een silhouet en een vage hint. Alleen zelf openen toont je voortgang; er verschijnen geen verzamelmeldingen over het eiland. De verzameling blijft in dezelfde browser bewaard bij Nieuw eiland, Herstel vorig eiland en herladen. Aantoonbare vondsten uit oude saves worden meegenomen.

**Geheimen** ontstaan door experimenten. Drie gerichte regenbuien geven de oude boom blijvende bloesem. Een beving bij een vulkaan, bewegen van natte grond en vuur op een feestende vuurplaats hebben eigen gevolgen. Alle acht ontdekkingen komen stil in de verzameling, met de seed en het vastgelegde jaar. De onbekende vakjes verklappen alleen een hint. Ook bestaande ontdekkingen uit oude saves tellen mee.

**Terwijl je weg was…** verschijnt na minstens een minuut afwezigheid. Het eiland haalt met de bewaarde snelheid maximaal drie eeuwen in en vertelt wat werkelijk gebeurde: verstreken jaren, overstromingen en de familielijn. Laat zien brengt je naar de plek van het grootste moment. De samenvatting is wegklikbaar. Pauze en open vensters worden gerespecteerd; in instellingen kun je voortgang tijdens afwezigheid uitzetten. Een einde tijdens afwezigheid opent geen automatische eindscène.

**De kroniek** groepeert het logboek per tijdperk, met kleine illustraties en knoppen om tussen hoofdstukken te springen. Familie en jouw ingrepen vallen op. Elk bericht heeft Laat zien: een vastgelegde plek opent op het huidige eiland; bij een oud bericht zonder precieze plek zie je het eiland als geheel. De kroniek bewaart maximaal 350 berichten en geeft grote momenten voorrang.

## Spelen

Open **`start.html`** rechtstreeks in een moderne browser. Dit bestand bevat het volledige spel; installatie en een server zijn niet nodig. De interface is Nederlands. De eerste keer verschijnen drie korte introschermen, waarna het eiland op **1×** begint.

- **Help:** klik op een inwoner met een hartje of open Wensen in het eilandboek. Met de knop Help geef je precies de gevraagde hulp. Een klik op andere gebouwen toont hun bewoners en geschiedenis, zonder ingreep.
- **Bouw:** help een bouwplaats, geef een huis een aanbouw of verbeter een akker.
- **Regen:** vul de voedselvoorraad aan, verbeter de oogst of blus brand.
- **Beving:** beschadig bebouwing en verander, afhankelijk van de plek, het landschap.
- **Vuur:** maak een vuurplaats of steek een gewone bebouwde plek in brand.

De pauzeknop, snelheden **1× / 2× / 3× / 10×** en het eilandboek staan op het eiland. Automatische verhaalkaarten staan standaard uit; in instellingen kun je ze aanzetten. Gebeurtenissen blijven altijd in het logboek. Kaarten pauzeren of verplaatsen de camera niet automatisch. Iedere kaart heeft een sluitknop; ook intro, eindscène en naschrift zijn meteen met × of Escape te verbergen.

Op **1×** duurt een jaar in het begin bijna twee seconden, zodat elke generatie van de familie ongeveer een minuut meegaat. In latere tijdperken gaat het rustig naar ruim een seconde per jaar. Een heel eiland duurt op 1× zo'n vijftig minuten; 2×, 3× en 10× zijn er voor wie sneller wil. Zonder ‘Steeds wat sneller’ duurt elk jaar anderhalve seconde.

Spatie pauzeert. Scroll of +/− zoomt; sleep om de rest van het eiland te verkennen. Open vensters zoals het eilandboek, de handleiding en instellingen pauzeren de wereld.

De bewoners kunnen zonder wegen door het landschap lopen, ook naar het achterland en de zijkanten. Vlakke zandwegen verbinden echte bouwplaatsen en gebouwen. Later worden ze straten met een grijs wegdek en markering. Bos, strand en uitzichtpunten veroorzaken geen automatisch wegennet. Karren, fietsen en auto's gebruiken de aangelegde wegen.

Je voortgang wordt lokaal bewaard. **Nieuw groot eiland** begint meteen opnieuw en biedt tien seconden lang **Herstel vorig eiland**. Nieuwe eilanden hebben ongeveer de helft meer natuurlijke landtegels en nieuwe huizen zoeken eerst plekken met ruimte tussen de buren. Ook geplande huizen tellen mee. Bestaande eilanden behouden hun kust en bebouwing; begin een nieuw eiland om de grotere kaart te zien.

## Een wereld die iets onthoudt

Het landschap bevat per eiland ongeveer 350–400 natuurlijke landtegels binnen een begrensde wereld van 25 × 25 tegels. Er zijn verschillende kusten, bossen, stranden, heuvels, bergen en vulkanen. Bouwen en landbouw gebruiken echte ruimte. Inpoldering volgt dijkbouw, omsluiting, droogmalen, modder en droging. Alleen droog land kan bebouwd worden. Instellingen begrenzen de groei op 320, 480 of 625 tegels.

Brand verdwijnt niet zonder gevolgen:

- Houten buren kunnen vlam vatten; natte grond en stenen gebouwen beperken verspreiding.
- Ongebluste gebouwen worden ruïnes en krijgen later een sterkere, stenen herbouw.
- Herhaalde branden leiden tot stenen gevels, brandveiligheid en een brandweerkazerne. De brandweer beperkt verspreiding en blust sneller.
- As verhoogt blijvend de opbrengst van akkers. Een uitgebrand bos laat bebouwbare open grond achter.
- Vuurplaatsen kunnen onderdeel worden van een terugkerende traditie.

Bevingen kunnen nieuw kustland omhoogdrukken, een blijvende bron openen, een kloof veroorzaken of via een aardverschuiving gesteente blootleggen. Een kloof kan overbrugd worden; een steengroeve levert steen. Het resultaat hangt af van de plaats en eerdere gebeurtenissen. Sommige opeenvolgende ingrepen hebben bijzondere combinaties. Het spel legt die niet vooraf uit: ontdekkingen komen in de geschiedenis terecht.

Bewoners onthouden branden, bevingen, regen, irrigatie, herstel en overstromingen. **Toen en nu** vergelijkt oude kustlijnen; het begin blijft bewaard. Het archief bevat hoogstens zestien kaartmomenten. Ook de oudste woning blijft op haar oorspronkelijke plaats en groeit uiteindelijk uit tot een landhuis en paleis.

## Tijdperken en het einde

Onderzoek kan de kalender niet overslaan. De architectuur doorloopt de eerste nederzetting, klassieke tijd, middeleeuwen, renaissance, stoomtijd, moderne tijd, hedendaagse tijd en nabije toekomst. Oudere gebouwen behouden hun stijl tot een verbouwing. De wereld krijgt onderwijs, handel, industrie, energie, openbaar groen en recreatie zodra tijd en middelen dat toelaten.

Rond 2100 begint het laatste hoofdstuk; een gewoon eiland eindigt uiterlijk in 2240. Jouw invloed verandert de timing en uitkomst. Er zijn zeven eindes:

- **Ze hebben het zelf uitgevogeld:** een zelfstandige beschaving.
- **Een beetje ruimte voor niets:** een groene samenleving die genoeg heeft.
- **Blijf vooral aanraken:** een samenleving die op jouw wonderen rekent.
- **Het bijzonder voorzichtige koninkrijk:** een eiland dat zich na bevingen heeft versterkt.
- **De Feniksstad:** een stad die na branden steeds sterker terugkomt.
- **De zee krijgt iets terug:** hogere grond, kleinere ambities en een veilige kust.
- **De laatste druppel:** een zeldzame poging om de oceaan volledig op te heffen. Hiervoor zijn de maximale wereldruimte, toekomstige techniek en een ongewone ambitie nodig. Pas bij minstens 94,5% werkelijk droog land is het project geslaagd.

Elke uitkomst heeft een eigen geanimeerd eindscherm. De scène duurt 24 seconden, kan gepauzeerd en opnieuw afgespeeld worden en biedt na acht seconden een knop naar het naschrift. Je kunt het scherm ook direct sluiten zonder een nieuw venster opgedrongen te krijgen. Het echte eiland krijgt geen extra eindscène-versieringen zoals kronen, paraplu's of zwevende monumenten.

Het naschrift toont kaarten, oorzaken en een **eilandscore van 0–100**, het gemiddelde van vijf onderdelen: leefbaarheid, natuur, zelfstandigheid, veerkracht en cultuur. De scores volgen de werkelijke toestand en geschiedenis. Ze blijven samen met het oorspronkelijke naschrift bewaard wanneer je vrij verder speelt. Er is meer dan één manier om een geslaagd eiland te maken.

## Ontwikkelen

Node.js 22 of nieuwer. Er zijn geen pakketafhankelijkheden.

```sh
npm run dev       # http://127.0.0.1:5173
npm test          # bouw start.html opnieuw en draai alle regressietests
npm run build     # actualiseer start.html en dist/ voor statische hosting
```

Bewerk `index.html`, `styles.css` en `src/`; bouw daarna opnieuw. `start.html` is de zelfstandige speelbare distributie. `dist/`, lokale hostinginstellingen en gegenereerde afbeeldingen staan buiten Git.

De tests controleren complete beschavingen, opslaan en herstellen, blijvende gevolgen, combinaties, grenzen, wegen en wandelroutes, alle eindes, intro en pauzeren, Nederlandse presentatie, inspectie, bevroren eindscores en labelplaatsing. De app-tests voeren ook de werkelijk gebouwde zelfstandige versie uit.

Visuele voorbeelden van de echte tekencode:

```sh
node scripts/visual-proof.mjs beginning beach-party
node scripts/visual-proof.mjs finale-fortress finale-phoenix finale-mobile
```

Op macOS kun je de SVG's naar PNG omzetten:

```sh
swift -module-cache-path /tmp/dni-swift-cache scripts/render-proof.swift artifacts/*.svg
```

Deze afbeeldingen controleren de renderer. Ze vervangen geen volledige interactiecontrole in een browser.

## Broncode

- `chronicle.js`: hoofdstukken per tijdperk, illustraties en eerlijke verwijzingen naar opgeslagen plekken.
- `away.js`: begrensde voortgang tijdens afwezigheid en een terugkomsamenvatting op basis van echte gebeurtenissen.
- `collection.js`: stille, blijvende vondsten per eiland en de aparte verzameling over eilanden heen.
- `family.js`, `wishes.js` en `challenges.js`: de opgeslagen familielijn, vragen van inwoners en stille optionele doelen.
- `simulation.js`: wereld, economie, bouw, wegen, verkeer en opslag.
- `story.js`: geschiedenis, hervormingen, archief en eindregels.
- `consequences.js`: brandverspreiding, herbouw, brandweer, terreingevolgen en ontdekkingen.
- `spectacle.js` en `pageants.js`: feesten, leven op het eiland en scènes in de wereld.
- `finale.js`: aparte eindanimaties en scores.
- `inspection.js`: bewoners, bouwjaren en plaatselijke herinneringen.
- `language.js`: Nederlandse presentatie, ook voor de Engelse geschiedenis in oudere saves.
- `renderer.js`: isometrisch canvas, camera, bebouwing, bewoners en begrensde labels.
- `app.js`: intro, bediening, vensters, inspectie, geluid en lokale opslag.
